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
  uniswapQuoterV2ABI,
  uniswapRouterV3ABI,
} from "@holdstation/worldchain-sdk";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { Quoter } from "../quote";

type UniswapV3Options = {
  provider: ethers.providers.JsonRpcProvider;
  quoter: Quoter;
  tokenProvider: TokenProvider;
  tokenStorage: TokenStorage;
  config?: Partial<SwapConfig>;
};

export class UniswapV3 implements SwapModule {
  private config: SwapConfig = defaultWorldchainConfig;
  private readonly provider: ethers.providers.JsonRpcProvider;
  private readonly quoter: Quoter;
  private readonly tokenProvider: TokenProvider;
  private readonly tokenStorage: TokenStorage;

  constructor(options: UniswapV3Options) {
    this.provider = options.provider;
    this.quoter = options.quoter;
    this.tokenProvider = options.tokenProvider;
    this.tokenStorage = options.tokenStorage;

    this.config = Object.assign(this.config, options.config ?? {});
  }

  name(): string {
    return "uniswap-v3";
  }

  enabled(chainId: number): boolean {
    return chainId === 480;
  }

  async estimate(params: SwapParams["quoteInput"]): Promise<SwapParams["quoteOutput"]> {
    // Placeholder for actual Uniswap V3 swap estimation logic
    const { tokenIn: fromToken, tokenOut: toToken, fee: rawFee = "0.2", slippage: rawSlippage = "3" } = params;
    const { weth } = this.config.tokens;

    const amount = new BigNumber(params.amountIn);

    // Retrieve token details for input and output tokens
    const tokenIn = await this.findToken(fromToken);
    const tokenOut = await this.findToken(toToken);

    // Convert the input amount to Wei
    let amountInWei = new BigNumber(amount).multipliedBy(10 ** tokenIn.decimals || 18);

    const fee = parseFloat(rawFee);
    if (isNaN(fee)) {
      throw new Error(`Invalid fee value: ${rawFee}`);
    }

    //Adjust the input amount if a fee is applicable
    if (
      getFeeDirect(tokenIn.address, tokenOut.address, this.config.stableCoins, this.config.tokens.wld.address) === 0
    ) {
      amountInWei = amountInWei.minus(getFeeWithAmountIn(tokenOut.address, amountInWei, fee)?.feeAmount ?? 0);
    }

    // Determine the swap path and pool tokens
    let paths: string[] = [tokenIn.address, tokenOut.address];
    let tokenInPool = tokenIn.address;
    let tokenOutPool = tokenOut.address;
    if (isNativeToken(tokenOut.address)) {
      paths = [tokenIn.address, weth.address];
      tokenOutPool = weth.address;
    }

    if (isNativeToken(tokenIn.address)) {
      paths = [weth.address, tokenOut.address];
      tokenInPool = weth.address;
    }

    // Fetch the best rate for the swapFetch the best rate for the swap
    const rate = await this.quoter.simple(tokenInPool, tokenOutPool);
    const bestRate = rate.all
      .filter((r) => r.rate > 0)
      .reduce((prev, curr) => (ethers.BigNumber.from(curr.rate).gt(prev.rate) ? curr : prev), rate.all[0]);

    // Encode the swap path for Uniswap V3
    const pathsEnconde = this.encodePath(paths, Number(bestRate.fee));

    // Get the output amount for the swap
    const quoterV2 = new ethers.Contract(this.config.uniswap.quoter.v2, uniswapQuoterV2ABI, this.provider);
    const quote = await quoterV2.quoteExactInput(pathsEnconde, amountInWei.toFixed());

    const amountOut = quote[0];

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
      .multipliedBy(new BigNumber(1).minus(Number(slippage) / 10000))
      .integerValue(BigNumber.ROUND_DOWN)
      .minus(feeOut);

    const router = new ethers.Contract(this.config.uniswap.router.v3, uniswapRouterV3ABI, this.provider);

    let ppx = await router.populateTransaction.exactInputSingle(
      {
        tokenIn: tokenInPool,
        tokenOut: tokenOutPool,
        fee: Number(bestRate.fee),
        recipient: this.config.spender,
        amountIn: amountInWei.toFixed(),
        amountOutMinimum: `0x${amountOutMin.toString(16)}`,
        sqrtPriceLimitX96: 0,
      },
      { value: isNativeToken(tokenIn.address) ? amountInWei.toFixed() : "0" },
    );

    if (isNativeToken(tokenOut.address)) {
      const exactInputCalldata = router.interface.encodeFunctionData("exactInputSingle", [
        {
          tokenIn: tokenInPool,
          tokenOut: tokenOutPool,
          fee: Number(bestRate.fee),
          recipient: this.config.uniswap.router.v3,
          amountIn: amountInWei.toFixed(),
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
