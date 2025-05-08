import {
  IdbTokenStorage,
  SwapParams,
  Swapper,
  Token,
  TokenProvider,
  TokenStorage,
  abi,
  logger,
} from "@holdstation/worldchain-sdk";
import { MiniKit } from "@worldcoin/minikit-js";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { Client, Multicall3 } from "..";
import { Quoter } from "../quote";
import { Quote0xResponse, SwapConfig } from "./swap.types";

export class SwapHelper implements Swapper {
  private readonly tokenProvider: TokenProvider;
  private quoter: Quoter;
  private tokenStorage: TokenStorage;
  // WORLDCHAIN
  private config: SwapConfig = {
    popular: {
      weth: "0x4200000000000000000000000000000000000006",
      wld: "0xB4f7332F3A7C8D5E1F9a6b8c4d7e5c2f3d4e5f6f",
      eth: {
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        symbol: "ETH",
        decimals: 18,
        name: "Ether",
        chainId: 480,
      },
    },

    uniswap: {
      router: {
        v2: "0x541aB7c31A119441eF3575F6973277DE0eF460bd",
        v3: "0x091AD9e2e6e5eD44c1c66dB50e49A601F9f36cF6",
      },
      quoter: {
        v2: "0x10158D43e6cc414deE1Bd1eB0EfC6a5cBCfF244c",
      },
    },

    spender: "0x297eea7f0e6216aeed83651804d091b65c3a8e9c",
    stableCoins: ["0x79A02482A880bCE3F13e09Da970dC34db4CD24d1"],
  };

  constructor(
    private readonly client: Client,
    config?: Partial<SwapConfig>,
  ) {
    const provider = this.client.getProvider();
    const multicall3 = new Multicall3(provider);
    this.tokenProvider = new TokenProvider({ client, multicall3 });
    this.quoter = new Quoter(this.client);
    this.tokenStorage = config?.tokenStorage ?? new IdbTokenStorage("TokenDB");
    this.config = Object.assign(this.config, config ?? {});
  }

  /**
   * Executes a token swap using Uniswap V2.
   * @param params - The parameters for the swap operation.
   */
  private async uniswapV2(params: SwapParams["quoteInput"]): Promise<SwapParams["quoteOutput"]> {
    const { weth } = this.config.popular;
    const { tokenIn: from, tokenOut: to, fee: feeRaw = "0.2", slippage: slippageRaw = "3" } = params;
    const amount = new BigNumber(params.amountIn);

    // Find token details for input and output tokens
    const tokenIn = await this.findToken(from);
    const tokenOut = await this.findToken(to);

    // Convert the input amount to Wei (smallest unit of the token)
    let amountInWei = `0x${new BigNumber(amount)
      .multipliedBy(new BigNumber(Math.pow(10, tokenIn.decimals || 18)))
      .toString(16)}`;

    const fee = parseFloat(feeRaw);
    if (isNaN(fee) || fee < 0) {
      throw new Error("Invalid fee value. It must be a positive number.");
    }
    // Adjust the input amount if there is a fee
    if (this.getFeeDirect(tokenIn.address, tokenOut.address) === 0) {
      amountInWei = `0x${new BigNumber(amountInWei)
        .minus(this.getFeeWithAmountIn(tokenOut.address, amountInWei, fee)?.feeAmount ?? 0)
        .toString(16)}`;
    }

    // Determine the swap path based on token types
    let paths: string[] = [tokenIn.address, weth, tokenOut.address];
    if (this.isNativeToken(tokenIn.address)) {
      paths = [weth, tokenOut.address];
    }

    if (this.isNativeToken(tokenOut.address)) {
      paths = [tokenIn.address, weth];
    }

    if (tokenIn.address.toLowerCase() === weth.toLowerCase() || tokenOut.address.toLowerCase() === weth.toLowerCase()) {
      paths = [tokenIn.address, tokenOut.address];
    }

    // Initialize the Uniswap V2 router contract
    const router = new ethers.Contract(
      this.config.uniswap.router.v2,
      abi.uniswapRouterV2ABI,
      this.client.getProvider(),
    );

    // Get the output amount for the swap
    const amountsOut = await router.getAmountsOut(amountInWei, paths);
    const amountOut: ethers.BigNumber = amountsOut[amountsOut.length - 1];

    // Calculate the fee for the output amount if applicable
    let feeOut = new BigNumber(0);
    if (this.getFeeDirect(tokenIn.address, tokenOut.address) === 1) {
      feeOut = new BigNumber(this.getFeeWithAmountOut(amountOut.toHexString(), fee)?.feeAmount ?? "0");
    }

    const slippage = parseFloat(slippageRaw);
    // Validate slippage to ensure it is within a safe range (0% to 100%)
    if (isNaN(slippage) || slippage < 0 || slippage > 100) {
      throw new Error("Invalid slippage value. It must be between 0 and 100.");
    }

    // Calculate the minimum output amount after slippage and fees
    const amountOutMin = new BigNumber(amountOut.toHexString())
      .multipliedBy(new BigNumber(1).minus(Number(slippage) / 100))
      .integerValue(BigNumber.ROUND_DOWN)
      .minus(feeOut);

    let ppx: ethers.PopulatedTransaction;

    // Populate the transaction based on token types
    if (this.isNativeToken(tokenIn.address)) {
      ppx = await router.populateTransaction.swapExactETHForTokens(
        `0x${amountOutMin.toString(16)}`,
        paths,
        this.config.spender,
        Math.floor(Date.now() / 1000) + 60 * 20,
        { value: amountInWei },
      );
    } else {
      const fn: ethers.ContractFunction<ethers.PopulatedTransaction> = this.isNativeToken(tokenOut.address)
        ? router.populateTransaction.swapExactTokensForETH
        : router.populateTransaction.swapExactTokensForTokens;

      ppx = await fn(
        amountInWei,
        `0x${amountOutMin.toString(16)}`,
        paths,
        this.config.spender,
        Math.floor(Date.now() / 1000) + 60 * 20,
      );
    }

    // rateSwap = amountIn / (amountOut / 10^decimals)
    const rateSwap = amount //
      .dividedBy(new BigNumber(amountOut.toHexString()))
      .multipliedBy(10 ** tokenOut.decimals);

    let rateTokenOut = await this.quoter.simple(
      this.isNativeToken(tokenOut.address) ? this.config.popular.weth : tokenOut.address,
      this.config.stableCoins[0],
    );
    if (tokenOut.address.toLowerCase() === this.config.stableCoins[0].toLowerCase()) {
      rateTokenOut = {
        best: "1",
        all: [],
      };
    }

    const minmumReceived = amountOutMin.div(Math.pow(10, tokenOut.decimals));

    // amountUsd = tokenAmount / 10^decimals * rateUsdPerToken
    const amountOutUsd = new BigNumber(amountOut.toHexString())
      .div(10 ** tokenOut.decimals)
      .multipliedBy(rateTokenOut.best);

    // Return the response with calculated values and populated transaction
    const resp: SwapParams["quoteOutput"] = {
      data: ppx.data ?? "",
      value: ppx.value?.toHexString() ?? "0",
      to: ppx.to ?? "",
      addons: {
        outAmount: new BigNumber(amountOut.toHexString()).div(10 ** tokenOut.decimals).toString(),
        rateSwap: rateSwap.toString(),
        amountOutUsd: amountOutUsd.toString(),
        minReceived: minmumReceived.toString(),
        feeAmountOut: `0x${feeOut.toString(16)}`,
      },
    };

    return resp;
  }

  private async uniswapV3(params: SwapParams["quoteInput"]): Promise<SwapParams["quoteOutput"]> {
    const { tokenIn: from, tokenOut: to, fee: feeRaw = "0.2", slippage: slippageRaw = "3" } = params;
    const { weth } = this.config.popular;
    const amount = new BigNumber(params.amountIn);

    // Retrieve token details for input and output tokens
    const tokenIn = await this.findToken(from);
    const tokenOut = await this.findToken(to);

    // Convert the input amount to Wei
    let amountInWei = `0x${new BigNumber(amount)
      .multipliedBy(new BigNumber(Math.pow(10, tokenIn.decimals || 18)))
      .toString(16)}`;

    const fee = parseFloat(feeRaw);
    if (isNaN(fee) || fee < 0) {
      throw new Error("Invalid fee value. It must be a positive number.");
    }
    //Adjust the input amount if a fee is applicable
    if (this.getFeeDirect(tokenIn.address, tokenOut.address) === 0) {
      amountInWei = `0x${new BigNumber(amountInWei)
        .minus(this.getFeeWithAmountIn(tokenOut.address, amountInWei, fee)?.feeAmount ?? 0)
        .toString(16)}`;
    }

    // Determine the swap path and pool tokens
    let paths: string[] = [tokenIn.address, tokenOut.address];
    let tokenInPool = tokenIn.address;
    let tokenOutPool = tokenOut.address;
    if (this.isNativeToken(tokenOut.address)) {
      paths = [tokenIn.address, weth];
      tokenOutPool = weth;
    }

    if (this.isNativeToken(tokenIn.address)) {
      paths = [weth, tokenOut.address];
      tokenInPool = weth;
    }

    // Fetch the best rate for the swapFetch the best rate for the swap
    const rate = await this.quoter.simple(tokenInPool, tokenOutPool);
    const bestRate = rate.all
      .filter((r) => r.rate > 0)
      .reduce((prev, curr) => (ethers.BigNumber.from(curr.rate).gt(prev.rate) ? curr : prev), rate.all[0]);

    // Encode the swap path for Uniswap V3
    const pathsEnconde = this.encodePath(paths, Number(bestRate.fee));

    // Get the output amount for the swap
    const quoterV2 = new ethers.Contract(
      this.config.uniswap.quoter.v2,
      abi.uniswapQuoterV2ABI,
      this.client.getProvider(),
    );
    const quote = await quoterV2.quoteExactInput(pathsEnconde, amountInWei);

    const amountOut = quote[0];

    let feeOut = new BigNumber(0);
    if (this.getFeeDirect(tokenIn.address, tokenOut.address) === 1) {
      feeOut = new BigNumber(this.getFeeWithAmountOut(amountOut.toHexString(), fee)?.feeAmount ?? "0");
    }

    const slippage = parseFloat(slippageRaw);
    // Validate slippage to ensure it is within a safe range (0% to 100%)
    if (isNaN(slippage) || slippage < 0 || slippage > 100) {
      throw new Error("Invalid slippage value. It must be between 0 and 100.");
    }

    // Calculate the minimum output amount after slippage and fees
    const amountOutMin = new BigNumber(amountOut.toHexString())
      .multipliedBy(new BigNumber(1).minus(Number(slippage) / 10000))
      .integerValue(BigNumber.ROUND_DOWN)
      .minus(feeOut);

    const router = new ethers.Contract(
      this.config.uniswap.router.v3,
      abi.uniswapRouterV3ABI,
      this.client.getProvider(),
    );

    let ppx = await router.populateTransaction.exactInputSingle(
      {
        tokenIn: tokenInPool,
        tokenOut: tokenOutPool,
        fee: Number(bestRate.fee),
        recipient: this.config.spender,
        amountIn: amountInWei,
        amountOutMinimum: `0x${amountOutMin.toString(16)}`,
        sqrtPriceLimitX96: 0,
      },
      { value: this.isNativeToken(tokenIn.address) ? amountInWei : "0" },
    );

    if (this.isNativeToken(tokenOut.address)) {
      const exactInputCalldata = router.interface.encodeFunctionData("exactInputSingle", [
        {
          tokenIn: tokenInPool,
          tokenOut: tokenOutPool,
          fee: Number(bestRate.fee),
          recipient: this.config.uniswap.router.v3,
          amountIn: amountInWei,
          amountOutMinimum: `0x${amountOutMin.toString(16)}`,
          sqrtPriceLimitX96: 0,
        },
      ]);

      const unwrapCalldata = router.interface.encodeFunctionData(
        "unwrapWETH9",
        [`0x${amountOutMin.toString(16)}`, this.config.spender], // minAmountOut, recipient of ETH
      );

      ppx = await router.populateTransaction["multicall(uint256,bytes[])"](
        Math.floor(Date.now() / 1000) + 300, // deadline
        [exactInputCalldata, unwrapCalldata],
      );
    }

    // rateSwap = amountIn / (amountOut / 10^decimals)
    const rateSwap = amount //
      .dividedBy(new BigNumber(amountOut.toHexString()))
      .multipliedBy(10 ** tokenOut.decimals);

    let rateTokenOut = await this.quoter.simple(tokenOutPool, this.config.stableCoins[0]);
    if (tokenOut.address.toLowerCase() === this.config.stableCoins[0].toLowerCase()) {
      rateTokenOut = {
        best: "1",
        all: [],
      };
    }

    const minmumReceived = amountOutMin.div(Math.pow(10, tokenOut.decimals));

    // amountUsd = tokenAmount / 10^decimals * rateUsdPerToken
    const amountOutUsd = new BigNumber(amountOut.toHexString())
      .div(10 ** tokenOut.decimals)
      .multipliedBy(rateTokenOut.best);

    // Return the response with calculated values and populated transaction
    const resp: SwapParams["quoteOutput"] = {
      data: ppx.data ?? "",
      value: ppx.value?.toHexString() ?? "0",
      to: ppx.to ?? "",
      addons: {
        outAmount: new BigNumber(amountOut.toHexString()).div(10 ** tokenOut.decimals).toString(),
        rateSwap: rateSwap.toString(),
        amountOutUsd: amountOutUsd.toString(),
        minReceived: minmumReceived.toString(),
        feeAmountOut: `0x${feeOut.toString(16)}`,
      },
    };

    return resp;
  }
  private async swap0x(params: SwapParams["quoteInput"]): Promise<SwapParams["quoteOutput"]> {
    const { tokenIn: from, tokenOut: to, fee: feeRaw = "0.2", slippage: slippageRaw = "3" } = params;
    const { weth } = this.config.popular;
    const amount = new BigNumber(params.amountIn);

    // Retrieve token details for input and output tokens
    const tokenIn = await this.findToken(from);
    const tokenOut = await this.findToken(to);

    // Convert the input amount to Wei
    let amountInWei = `0x${new BigNumber(amount)
      .multipliedBy(new BigNumber(Math.pow(10, tokenIn.decimals || 18)))
      .toString(16)}`;

    const fee = parseFloat(feeRaw);
    if (isNaN(fee) || fee < 0) {
      throw new Error("Invalid fee value. It must be a positive number.");
    }

    //Adjust the input amount if a fee is applicable
    if (this.getFeeDirect(tokenIn.address, tokenOut.address) === 0) {
      amountInWei = `0x${new BigNumber(amountInWei)
        .minus(this.getFeeWithAmountIn(tokenOut.address, amountInWei, fee)?.feeAmount ?? 0)
        .toString(16)}`;
    }

    // Fetch the best rate for the swapFetch the best rate for the swap
    const url = `https://routing.capybera.xyz/wrapper/zerox/allowance-holder/quote`;
    const body = {
      sellToken: tokenIn.address,
      buyToken: tokenOut.address,
      sellAmount: new BigNumber(amountInWei).toFixed(),
      taker: this.config.spender,
    };
    // console.log(47, url);
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as Quote0xResponse;

    const amountOut = new BigNumber(data.buyAmount);

    let feeOut = new BigNumber(0);
    if (this.getFeeDirect(tokenIn.address, tokenOut.address) === 1) {
      feeOut = new BigNumber(this.getFeeWithAmountOut(`0x${amountOut.toString(16)}`, fee)?.feeAmount ?? "0");
    }

    const slippage = parseFloat(slippageRaw);
    // Validate slippage to ensure it is within a safe range (0% to 100%)
    if (isNaN(slippage) || slippage < 0 || slippage > 100) {
      throw new Error("Invalid slippage value. It must be between 0 and 100.");
    }

    // Calculate the minimum output amount after slippage and fees
    const amountOutMin = amountOut
      .multipliedBy(new BigNumber(1).minus(Number(slippage) / 10000))
      .integerValue(BigNumber.ROUND_DOWN)
      .minus(feeOut);

    const ppx: ethers.PopulatedTransaction = {
      data: data.transaction.data,
      to: data.transaction.to,
      value: this.isNativeToken(tokenIn.address) ? ethers.BigNumber.from(amountInWei) : ethers.BigNumber.from(0),
    };

    // rateSwap = amountIn / (amountOut / 10^decimals)
    const rateSwap = amount //
      .dividedBy(amountOut)
      .multipliedBy(10 ** tokenOut.decimals);

    let rateTokenOut = await this.quoter.simple(
      this.isNativeToken(tokenOut.address) ? weth : tokenOut.address,
      this.config.stableCoins[0],
    );
    if (tokenOut.address.toLowerCase() === this.config.stableCoins[0].toLowerCase()) {
      rateTokenOut = {
        best: "1",
        all: [],
      };
    }

    const minmumReceived = amountOutMin.div(Math.pow(10, tokenOut.decimals));

    // amountUsd = tokenAmount / 10^decimals * rateUsdPerToken
    const amountOutUsd = new BigNumber(amountOut).div(10 ** tokenOut.decimals).multipliedBy(rateTokenOut.best);

    // Return the response with calculated values and populated transaction
    const resp: SwapParams["quoteOutput"] = {
      data: ppx.data ?? "",
      value: ppx.value?.toHexString() ?? "0",
      to: ppx.to ?? "",
      addons: {
        outAmount: amountOut.div(10 ** tokenOut.decimals).toString(),
        rateSwap: rateSwap.toString(),
        amountOutUsd: amountOutUsd.toString(),
        minReceived: minmumReceived.toString(),
        feeAmountOut: `0x${feeOut.toString(16)}`,
      },
    };

    return resp;
  }

  /**
   * Fallback function to handle unexpected scenarios or errors during the swap process.
   * This function can be used to log errors, retry operations, or provide alternative solutions.
   */
  private async fallback<T>(...args: T[]) {
    for (let index = 0; index < args.length; index++) {
      const ele = args[index];
      if (typeof ele !== "function") {
        logger.error("Element is not a valid function");
        continue;
      }

      try {
        const result = await ele();
        return result;
      } catch (error) {
        if (index === args.length - 1) {
          throw error;
        }

        continue;
      }
    }

    return undefined;
  }

  /**
   * Estimates the output of a token swap operation.
   * This function calculates the expected output amount, swap rate, and other details
   * based on the input parameters without actually executing the swap.
   *
   * @param params - The parameters for the swap operation.
   * @returns A promise resolving to an object containing the estimated swap details.
   */
  async quote(params: SwapParams["quoteInput"]): Promise<SwapParams["quoteOutput"]> {
    return this.fallback(
      () => this.swap0x(params),
      () => this.uniswapV3(params),
      () => this.uniswapV2(params),
    );
  }

  async swap(params: SwapParams["input"]): Promise<SwapParams["output"]> {
    if (this.isNativeToken(params.tokenIn)) {
      return await this.submitSwapETHForTokens(params);
    }

    if (this.isNativeToken(params.tokenOut)) {
      return await this.submitSwapTokensForETH(params);
    }

    return await this.submitSwapTokensForTokens(params);
  }

  private async submitSwapTokensForTokens(params: SwapParams["input"]): Promise<SwapParams["output"]> {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      fee = "0.2",
      feeReceiver = ethers.constants.AddressZero,
      feeAmountOut,
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
    if (this.getFeeDirect(tokenIn, tokenOut) === 0) {
      feeAmount = this.getFeeWithAmountIn(tokenOut, sellAmount, Number(fee))?.feeAmount ?? "0";
      feeToken = "0";
    } else {
      feeAmount = feeAmountOut ?? "0";
      feeToken = "1";
    }

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
            feeAmount,
            feeReceiver,
            [permitTransfer.nonce, permitTransfer.deadline, "PERMIT2_SIGNATURE_PLACEHOLDER_0"],
          ],
          value: ethers.BigNumber.from(0).toHexString(),
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
    const { tokenIn, tokenOut, amountIn, fee = "0.2", feeReceiver = ethers.constants.AddressZero } = params;
    const { data, to } = params.tx;
    const fromToken = await this.findToken(tokenIn);
    const amountInWei = `0x${new BigNumber(amountIn).multipliedBy(Math.pow(10, fromToken.decimals)).toString(16)}`;

    const feeAmount = this.getFeeWithAmountIn(tokenOut, amountInWei, Number(fee))?.feeAmount ?? "0";

    const rawData = {
      transaction: [
        {
          address: this.config.spender,
          abi: abi.DEX_ABI,
          functionName: "fillQuoteEthToToken",
          args: [tokenOut, to, data, feeAmount, feeReceiver],
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
    const { tokenIn, tokenOut, amountIn, fee = "0.2", feeReceiver = ethers.constants.AddressZero } = params;
    const { data, to } = params.tx;
    const fromToken = await this.findToken(tokenIn);

    const sellAmount = new BigNumber(amountIn).multipliedBy(Math.pow(10, fromToken.decimals)).toFixed();
    const deadline = Math.floor((Date.now() + 5 * 60 * 1000) / 1000).toString();
    const feePercent = this.getFeeWithAmountIn(tokenOut, sellAmount, Number(fee))?.feePercent ?? "0";
    const permitTransfer = {
      permitted: {
        token: tokenIn,
        amount: sellAmount,
      },
      nonce: Date.now().toString(),
      deadline,
    };
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
            feePercent,
            feeReceiver,
            [permitTransfer.nonce, permitTransfer.deadline, "PERMIT2_SIGNATURE_PLACEHOLDER_0"],
          ],
          value: ethers.BigNumber.from(0).toHexString(),
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
   * Checks if the given address is a native token (e.g., ETH).
   * @param address - The token address to check.
   */
  private isNativeToken(address: string) {
    if (
      address === ethers.constants.AddressZero ||
      address.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    ) {
      return true;
    }

    return false;
  }

  /**
   * Finds token details by its address, either from storage or by fetching from the provider.
   * @param tokenAddress - The address of the token.
   */
  private async findToken(tokenAddress: string) {
    let token: Token;
    if (this.isNativeToken(tokenAddress)) {
      return this.config.popular.eth;
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

  /**
   * Checks if the given address belongs to a stablecoin.
   * @param address - The token address to check.
   */
  private isStableCoin(address: string) {
    return this.config.stableCoins.find((v) => v.toLowerCase() === address.toLowerCase()) !== undefined;
  }

  /**
   * Determines the fee type (in or out) based on token types.
   * @param tokenIn - The input token address.
   * @param tokenOut - The output token address.
   */
  private getFeeDirect(tokenIn: string, tokenOut: string) {
    if (this.isNativeToken(tokenIn)) {
      return 0;
    }

    if (this.isNativeToken(tokenOut)) {
      return 0;
    }

    if (this.isStableCoin(tokenIn)) {
      return 0;
    }

    if (this.isStableCoin(tokenOut)) {
      return 1;
    }

    if (tokenIn.toLowerCase() === this.config.popular.wld.toLowerCase()) {
      return 0;
    }

    if (tokenOut.toLowerCase() === this.config.popular.wld.toLowerCase()) {
      return 1;
    }

    return 0;
  }

  /**
   * Calculates the fee for a given input amount.
   * @param tokenOut - The output token address.
   * @param amountIn - The input amount in Wei.
   * @param fee - The fee percentage.
   */
  private getFeeWithAmountIn(tokenOut: string, amountIn: string, fee: number) {
    if (this.isNativeToken(tokenOut)) {
      return {
        feePercent: `0x${new BigNumber(fee / 100).multipliedBy(Math.pow(10, 18)).toString(16)}`,
      };
    }

    return {
      feeAmount: `0x${new BigNumber(amountIn)
        .multipliedBy(fee / 100)
        .integerValue(BigNumber.ROUND_FLOOR)
        .toString(16)}`,
      feeToken: 0,
    };
  }

  /**
   * Calculates the fee for a given output amount.
   * @param amountOut - The output amount in Wei.
   * @param fee - The fee percentage.
   */
  private getFeeWithAmountOut(amountOut: string, fee: number) {
    return {
      feeAmount: `0x${new BigNumber(amountOut)
        .multipliedBy(fee / 100)
        .integerValue(BigNumber.ROUND_FLOOR)
        .toString(16)}`,
      feeToken: 1,
    };
  }

  /**
   * Encodes the swap path for Uniswap V3.
   *
   * The path includes a sequence of token addresses and pool fees, which are used to define the route
   * for the swap. The encoded path is required for Uniswap V3's `exactInput` and `exactOutput` functions.
   *
   * @param tokens - An array of token addresses representing the swap path.
   * @param fee - The fee tier (e.g., 500, 3000, 10000) for the Uniswap V3 pool between each token pair.
   * @returns A hex-encoded string representing the swap path.
   */
  private encodePath(tokens: string[], fee: number) {
    const encoded = [];
    for (let i = 0; i < tokens.length - 1; i++) {
      encoded.push(tokens[i].toLowerCase().slice(2)); // remove 0x
      encoded.push(fee.toString(16).padStart(6, "0"));
    }
    encoded.push(tokens[tokens.length - 1].toLowerCase().slice(2));
    return "0x" + encoded.join("");
  }
}
