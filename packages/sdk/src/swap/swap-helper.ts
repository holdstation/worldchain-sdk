import { MiniKit } from "@worldcoin/minikit-js";
import { BigNumber } from "bignumber.js";
import { abi, getFeeDirect, getFeeWithAmountIn, isNativeToken, logger } from "..";
import { Client } from "../client";
import { IdbTokenStorage, Token, TokenStorage } from "../storage";
import { TokenProvider } from "../token";
import { getPartnerCode } from "./partner";
import { defaultWorldchainConfig, Estimator, SwapConfig, SwapModule, SwapParams, Swapper } from "./swap";

export class SwapHelper implements Swapper {
  private modules: Record<string, SwapModule> = {};
  private readonly tokenProvider: TokenProvider;
  private tokenStorage: TokenStorage;
  private defaultFee = "0.6";
  estimate: Estimator;

  // WORLDCHAIN
  private config: SwapConfig = defaultWorldchainConfig;

  constructor(
    private readonly client: Client,
    config?: Partial<SwapConfig>,
  ) {
    this.estimate = {
      quote: this._quote.bind(this),
    };

    this.tokenProvider = new TokenProvider({ client });
    this.tokenStorage = config?.tokenStorage ?? new IdbTokenStorage("TokenDB");
    this.config = Object.assign(this.config, config ?? {});
  }

  /**
   * Loads the necessary dependencies for the SwapHelper.
   * @param swapModule - The swap module containing dependencies to initialize.
   */
  async load(swapModule: SwapModule): Promise<void> {
    this.modules[swapModule.name()] = swapModule;
  }

  private async _quote(params: SwapParams["quoteInput"]): Promise<SwapParams["quoteOutput"]> {
    const { timeout = 30_000, preferRouters = ["hold-so", "0x"] } = params;
    const chainId = this.client.getChainId();

    // Use the default preferRouters from params, which is already set to ["holds-so", "0x"] if not provided
    const routersToUse = preferRouters;
    if (routersToUse.length === 0) {
      throw new Error("No router available");
    }

    const validModules = routersToUse
      .map((router) => this.modules[router])
      .filter((swapper) => swapper && swapper.enabled(chainId));

    if (validModules.length === 0) {
      throw new Error("No valid router available");
    }

    const startTime = Date.now();
    const errors: Array<{ router: string; error: unknown }> = [];

    // Try each router sequentially until one succeeds
    for (const swapper of validModules) {
      // Check if we've exceeded the timeout
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeout) {
        throw new Error(`Timeout after ${timeout}ms`);
      }

      try {
        const result = await swapper.estimate(params);
        if (result) {
          return result;
        }
      } catch (error) {
        logger.error(`Error estimating swap for router ${swapper.name()}:`, error);
        errors.push({ router: swapper.name(), error });
      }
    }

    // If we reach here, all routers failed
    const errorMessages = errors
      .map((e) => `${e.router}: ${e.error instanceof Error ? e.error.message : e.error}`)
      .join("; ");
    throw new Error(`All routers failed. Errors: ${errorMessages}`);
  }

  async swap(params: SwapParams["input"]): Promise<SwapParams["output"]> {
    if (isNativeToken(params.tokenIn)) {
      return await this.submitSwapETHForTokens(params);
    }

    if (isNativeToken(params.tokenOut)) {
      return await this.submitSwapTokensForETH(params);
    }

    return await this.submitSwapTokensForTokens(params);
  }

  private async submitSwapTokensForTokens(params: SwapParams["input"]): Promise<SwapParams["output"]> {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      fee = this.defaultFee,
      feeReceiver = "0x0000000000000000000000000000000000000000",
      feeAmountOut,
      partnerCode,
    } = params;
    const { data, to } = params.tx;
    const fromToken = await this.findToken(tokenIn);

    const sellAmount = new BigNumber(amountIn).multipliedBy(Math.pow(10, fromToken.decimals)).toFixed();
    const deadline = Math.floor((Date.now() + 5 * 60 * 1000) / 1000).toString();

    const permitTransfer = {
      permitted: {
        token: tokenIn,
        amount: sellAmount,
      },
      nonce: Date.now().toString(),
      deadline,
    };

    let feeToken = "0";
    let feeAmount = "0";
    if (getFeeDirect(tokenIn, tokenOut, this.config.stableCoins, this.config.tokens.wld.address) === 0) {
      feeAmount = getFeeWithAmountIn(tokenOut, new BigNumber(sellAmount), Number(fee))?.feeAmount ?? "0";
      feeToken = "0";
    } else {
      feeAmount = feeAmountOut ?? "0";
      feeToken = "1";
    }

    const partnerData = this.packPartnerData(partnerCode ?? getPartnerCode() ?? "0", feeAmount);

    const rawData = {
      transaction: [
        {
          address: this.config.spender,
          abi: abi.DEX_ABI,
          functionName: "fillQuoteTokenToToken",
          args: [
            tokenIn,
            tokenOut,
            to,
            data,
            sellAmount,
            feeToken,
            partnerData,
            feeReceiver,
            [permitTransfer.nonce, permitTransfer.deadline, "PERMIT2_SIGNATURE_PLACEHOLDER_0"],
          ],
          value: "0x0",
        },
      ],
      permit2: [
        {
          ...permitTransfer,
          spender: this.config.spender,
        },
      ],
    };
    logger.log("fillQuoteTokenToToken: ", rawData);

    const payload = await MiniKit.commandsAsync.sendTransaction(rawData);
    if (payload.finalPayload.status !== "success") {
      return {
        success: false,
        errorCode: payload.finalPayload.error_code,
      };
    }

    return {
      success: true,
      transactionId: payload.finalPayload.transaction_id,
    };
  }

  private async submitSwapETHForTokens(params: SwapParams["input"]): Promise<SwapParams["output"]> {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      fee = this.defaultFee,
      feeReceiver = "0x0000000000000000000000000000000000000000",
      partnerCode,
    } = params;
    const { data, to } = params.tx;
    const fromToken = await this.findToken(tokenIn);
    const amountInWei = `0x${new BigNumber(amountIn).multipliedBy(Math.pow(10, fromToken.decimals)).toString(16)}`;

    const feeAmount = getFeeWithAmountIn(tokenOut, new BigNumber(amountInWei), Number(fee))?.feeAmount ?? "0";

    const partnerData = this.packPartnerData(partnerCode ?? getPartnerCode() ?? "0", feeAmount);

    const rawData = {
      transaction: [
        {
          address: this.config.spender,
          abi: abi.DEX_ABI,
          functionName: "fillQuoteEthToToken",
          args: [tokenOut, to, data, partnerData, feeReceiver],
          value: amountInWei,
        },
      ],
    };

    logger.log("fillQuoteEthToToken: ", rawData);
    const payload = await MiniKit.commandsAsync.sendTransaction(rawData);

    if (payload.finalPayload.status !== "success") {
      return {
        success: false,
        errorCode: payload.finalPayload.error_code,
      };
    }

    return {
      success: true,
      transactionId: payload.finalPayload.transaction_id,
    };
  }

  private async submitSwapTokensForETH(params: SwapParams["input"]): Promise<SwapParams["output"]> {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      fee = this.defaultFee,
      feeReceiver = "0x0000000000000000000000000000000000000000",
      partnerCode,
    } = params;
    const { data, to } = params.tx;
    const fromToken = await this.findToken(tokenIn);

    const sellAmount = new BigNumber(amountIn).multipliedBy(Math.pow(10, fromToken.decimals)).toFixed();
    const deadline = Math.floor((Date.now() + 5 * 60 * 1000) / 1000).toString();
    const feePercent = getFeeWithAmountIn(tokenOut, new BigNumber(sellAmount), Number(fee))?.feePercent ?? "0";
    const permitTransfer = {
      permitted: {
        token: tokenIn,
        amount: sellAmount,
      },
      nonce: Date.now().toString(),
      deadline,
    };

    const partnerData = this.packPartnerData(partnerCode ?? getPartnerCode() ?? "0", feePercent);

    const rawData = {
      transaction: [
        {
          address: this.config.spender,
          abi: abi.DEX_ABI,
          functionName: "fillQuoteTokenToEth",
          args: [
            tokenIn,
            to,
            data,
            sellAmount,
            partnerData,
            feeReceiver,
            [permitTransfer.nonce, permitTransfer.deadline, "PERMIT2_SIGNATURE_PLACEHOLDER_0"],
          ],
          value: "0x0",
        },
      ],
      permit2: [
        {
          ...permitTransfer,
          spender: this.config.spender,
        },
      ],
    };
    logger.log("fillQuoteTokenToEth: ", rawData);

    const payload = await MiniKit.commandsAsync.sendTransaction(rawData);

    if (payload.finalPayload.status !== "success") {
      return {
        success: false,
        errorCode: payload.finalPayload.error_code,
      };
    }

    return {
      success: true,
      transactionId: payload.finalPayload.transaction_id,
    };
  }

  /**
   * Finds token details by its address, either from storage or by fetching from the provider.
   * @param tokenAddress - The address of the token.
   */
  private async findToken(tokenAddress: string) {
    let token: Token;
    if (isNativeToken(tokenAddress)) {
      return this.config.tokens.eth;
    }

    try {
      token = await this.tokenStorage.findByAddress(tokenAddress);
    } catch (error) {
      const tokens = await this.tokenProvider.details(tokenAddress);

      token = {
        ...tokens[tokenAddress],
        address: tokenAddress,
      };
      await this.tokenStorage.save(token);
    }

    return token;
  }

  private packPartnerData(partnerCode: string, fee: string): string {
    // Convert to JavaScript BigInts for bitwise operation
    const partnerCodeBigInt = BigInt(partnerCode);
    const feeBigInt = BigInt(fee);

    // Shift partner code left by 240 bits
    const shiftedPartnerCode = partnerCodeBigInt << 240n;

    // Perform bitwise OR
    const result = shiftedPartnerCode | feeBigInt;

    // Convert back to BigNumber
    return new BigNumber(result).toFixed();
  }
}
