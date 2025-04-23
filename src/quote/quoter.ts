import { Percent, Token, TradeType } from "@uniswap/sdk-core";
import { AlphaRouter, parseAmount, SwapRoute, SwapType } from "@uniswap/smart-order-router";
import { UniversalRouterVersion } from "@uniswap/universal-router-sdk";
import { ethers } from "ethers";
import { MULTICALL3_ABI } from "../abi/multicall3";
import { viewQuoterv3ABI } from "../abi/view-quoter-v3";
import { config } from "../config";
import { TokenProvider } from "../token";
import { getQuoteToken, initializeAlphaRouter, parseDeadline, ROUTING_CONFIG } from "./alpha-router";

type Options = {
  viewQuoterv3: string;
  stableToken: string;
  tokenProvider: TokenProvider;
};

export class Quoter {
  private quoterV3Address = "0x70a6c708c07a8f309d345cf8edb959e5f805d79f";

  private readonly stableToken: string;
  private readonly viewQuoterV3: ethers.Contract;
  private readonly multicallContract: ethers.Contract;
  private readonly tokenProvider: TokenProvider;
  private readonly alphaRouter: AlphaRouter;
  private softcache: Record<string, { data: { quote: string; raw: SwapRoute }; createdAt: number }> = {};

  constructor(private readonly provider: ethers.providers.JsonRpcProvider, options?: Partial<Options>) {
    // default fallback to usdc.e
    this.stableToken = options?.stableToken || "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1";
    this.quoterV3Address = options?.viewQuoterv3 || "0x70a6c708c07a8f309d345cf8edb959e5f805d79f";

    this.viewQuoterV3 = new ethers.Contract(this.quoterV3Address, viewQuoterv3ABI, config.getProvider());
    this.multicallContract = new ethers.Contract(config.multicall3Address, MULTICALL3_ABI, config.getProvider());

    this.tokenProvider = options?.tokenProvider ?? new TokenProvider({ provider });

    this.alphaRouter = initializeAlphaRouter(provider);
  }

  async simple(tokenIn: string, tokenOut: string) {
    const token = await this.tokenProvider.details(tokenIn, tokenOut);
    if (!token || !token[tokenIn]) {
      throw new Error(`Token not found: ${tokenIn}`);
    }

    const feeAmounts = [500, 3_000, 10_000];
    const calls = feeAmounts.map((fee) => ({
      target: this.quoterV3Address,
      allowFailure: true,
      callData: this.viewQuoterV3.interface.encodeFunctionData("quoteExactInputSingle", [
        {
          tokenIn,
          tokenOut,
          amountIn: ethers.utils.parseUnits("1", token[tokenIn].decimals),
          fee,
          sqrtPriceLimitX96: 0,
        },
      ]),
    }));

    // Use aggregate3 for allowFailure support
    const resultsRaw = await this.multicallContract.aggregate3(calls);

    const results: {
      fee: string;
      error: string | undefined;
      rate: number;
    }[] = resultsRaw.map((result: { success: boolean; returnData: string }, i: number) => {
      if (!result.success) {
        return {
          fee: feeAmounts[i].toString(),
          error: "Call failed",
          rate: "0",
        };
      }

      const decoded = this.viewQuoterV3.interface.decodeFunctionResult("quoteExactInputSingle", result.returnData);

      const amountReceived = ethers.BigNumber.from(decoded[0]);

      return {
        fee: feeAmounts[i].toString(),
        rate: amountReceived.toString(),
      };
    });

    // Find the best result (highest rate)
    const best = results
      .filter((r) => r.rate > 0)
      .reduce((prev, curr) => (ethers.BigNumber.from(curr.rate).gt(prev.rate) ? curr : prev), results[0]);

    return {
      best: ethers.utils.formatUnits(best.rate, token[tokenOut].decimals),
      all: results,
    };
  }

  /**
   * This function is used to get the best rate for a token on the chain using @uniswap/smart-order-router
   * They find the best route with price, but much more slower than the simple quote
   *
   * @param tokenAddress the token you want to get quote
   */
  async smart(
    tokenAddress: string,
    {
      slippage = 3,
      deadline = 360,
      cacheTTL = 60_000,
    }: Partial<{
      slippage: number;
      deadline: number;
      cacheTTL: number;
    }>
  ) {
    const key = `${tokenAddress}-${slippage}-${deadline}`;
    if (this.softcache[key]) {
      const cached = this.softcache[key];

      // only cache for 1 min
      if (Date.now() - cached.createdAt < cacheTTL) {
        return cached.data;
      }
    }

    const chainId = await this.provider.getNetwork().then((n) => n.chainId);

    const details = await this.tokenProvider.details(tokenAddress, this.stableToken);
    if (!details || !details[tokenAddress] || !details[this.stableToken]) {
      throw new Error(`Token not found: ${tokenAddress}`);
    }

    const token = details[tokenAddress];

    const tokenIn = new Token(chainId, token.address, token.decimals, token.symbol, token.name);

    const tokenOut = new Token(
      chainId,
      this.stableToken,
      details[this.stableToken].decimals,
      details[this.stableToken].symbol,
      details[this.stableToken].name
    );

    const tradeType = TradeType.EXACT_INPUT;
    const slippageTolerance = new Percent(slippage, 100); // 3%

    const swap = await this.alphaRouter.route(
      parseAmount("1", tokenIn),
      getQuoteToken(tokenIn, tokenOut, tradeType),
      tradeType,
      {
        type: SwapType.UNIVERSAL_ROUTER,
        version: UniversalRouterVersion.V1_2,
        slippageTolerance,
        deadlineOrPreviousBlockhash: parseDeadline(deadline),
      },
      ROUTING_CONFIG
    );

    if (!swap) {
      throw new Error("No swap found");
    }

    const finalData = {
      quote: swap.quote.toFixed(6),
      raw: swap,
    };

    // save to softcache
    this.softcache[key] = {
      data: finalData,
      createdAt: Date.now(),
    };

    return finalData;
  }
}
