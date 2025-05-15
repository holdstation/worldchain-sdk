import {
  defaultWorldchainConfig,
  getFeeDirect,
  getFeeWithAmountIn,
  getFeeWithAmountOut,
  isNativeToken,
  SwapConfig,
  SwapModule,
  SwapParams,
  Token,
  TokenProvider,
  TokenStorage,
  uniswapRouterV2ABI,
} from "@holdstation/worldchain-sdk";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { Quoter } from "../quote";

type UniswapV2Options = {
  provider: ethers.providers.JsonRpcProvider;
  quoter: Quoter;
  tokenProvider: TokenProvider;
  tokenStorage: TokenStorage;
  config?: Partial<SwapConfig>;
};

export class UniswapV2 implements SwapModule {
  private config: SwapConfig = defaultWorldchainConfig;
  private readonly provider: ethers.providers.JsonRpcProvider;
  private readonly quoter: Quoter;
  private readonly tokenProvider: TokenProvider;
  private readonly tokenStorage: TokenStorage;

  constructor(options: UniswapV2Options) {
    this.provider = options.provider;
    this.quoter = options.quoter;
    this.tokenProvider = options.tokenProvider;
    this.tokenStorage = options.tokenStorage;

    this.config = Object.assign(this.config, options.config ?? {});
  }

  name(): string {
    return "uniswap-v2";
  }

  enabled(chainId: number): boolean {
    return chainId === 480;
  }

  async estimate(params: SwapParams["quoteInput"]): Promise<SwapParams["quoteOutput"]> {
    const { weth } = this.config.tokens;
    const { tokenIn: fromToken, tokenOut: toToken, fee: rawFee = "0.2", slippage: rawSlippage = "3" } = params;

    const amount = new BigNumber(params.amountIn);

    // Find token details for input and output tokens
    const tokenIn = await this.findToken(fromToken);
    const tokenOut = await this.findToken(toToken);

    // Convert the input amount to Wei (smallest unit of the token)
    let amountInWei = new BigNumber(amount).multipliedBy(new BigNumber(10 ** tokenIn.decimals));

    const fee = parseFloat(rawFee);
    if (isNaN(fee)) {
      throw new Error(`Invalid fee value: ${rawFee}`);
    }

    // Adjust the input amount if there is a fee
    if (
      getFeeDirect(tokenIn.address, tokenOut.address, this.config.stableCoins, this.config.tokens.wld.address) === 0
    ) {
      amountInWei = amountInWei.minus(getFeeWithAmountIn(tokenOut.address, amountInWei, fee)?.feeAmount ?? 0);
    }

    // Determine the swap path based on token types
    let paths: string[] = [tokenIn.address, weth.address, tokenOut.address];
    if (isNativeToken(tokenIn.address)) {
      paths = [weth.address, tokenOut.address];
    }

    if (isNativeToken(tokenOut.address)) {
      paths = [tokenIn.address, weth.address];
    }

    if (
      tokenIn.address.toLowerCase() === weth.address.toLowerCase() ||
      tokenOut.address.toLowerCase() === weth.address.toLowerCase()
    ) {
      paths = [tokenIn.address, tokenOut.address];
    }

    // Initialize the Uniswap V2 router contract
    const router = new ethers.Contract(this.config.uniswap.router.v2, uniswapRouterV2ABI, this.provider);

    // Get the output amount for the swap
    const amountsOut = await router.getAmountsOut(`0x${amountInWei.toString(16)}`, paths);
    const amountOut: ethers.BigNumber = amountsOut[amountsOut.length - 1];

    // Calculate the fee for the output amount if applicable
    let feeOut = new BigNumber(0);
    if (
      getFeeDirect(tokenIn.address, tokenOut.address, this.config.stableCoins, this.config.tokens.wld.address) === 1
    ) {
      feeOut = new BigNumber(getFeeWithAmountOut(amountOut.toHexString(), fee)?.feeAmount ?? "0");
    }

    const slippage = parseFloat(rawSlippage);
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
    if (isNativeToken(tokenIn.address)) {
      ppx = await router.populateTransaction.swapExactETHForTokens(
        `0x${amountOutMin.toString(16)}`,
        paths,
        this.config.spender,
        Math.floor(Date.now() / 1000) + 60 * 20,
        { value: `0x${amountInWei.toString(16)}` },
      );
    } else {
      const fn: ethers.ContractFunction<ethers.PopulatedTransaction> = isNativeToken(tokenOut.address)
        ? router.populateTransaction.swapExactTokensForETH
        : router.populateTransaction.swapExactTokensForTokens;

      ppx = await fn(
        `0x${amountInWei.toString(16)}`,
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
      isNativeToken(tokenOut.address) ? weth.address : tokenOut.address,
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
}
