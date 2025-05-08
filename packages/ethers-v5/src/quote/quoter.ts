import { TokenProvider, abi } from "@holdstation/worldchain-sdk";
import { Percent, Token, TradeType } from "@uniswap/sdk-core";
import { AlphaRouter, SwapRoute, SwapType, parseAmount } from "@uniswap/smart-order-router";
import { UniversalRouterVersion } from "@uniswap/universal-router-sdk";
import { ethers } from "ethers";
import { Client, Multicall3 } from "..";
import { ROUTING_CONFIG, getQuoteToken, initializeAlphaRouter, parseDeadline } from "./alpha-router";

type Options = {
  viewQuoterv3: string;
  stableToken: string;
  tokenProvider: TokenProvider;
};

type SmartQuoterOptions = {
  /**
   * The allowed slippage percentage for the trade (e.g., 3 for 3%).
   */
  slippage: number;

  /**
   * The deadline for the trade in seconds (e.g., 360 for 6 minutes).
   */
  deadline: number;

  /**
   * The time-to-live for the cache in milliseconds (e.g., 60000 for 1 minute).
   */
  cacheTTL: number;

  /**
   * The destination address for the trade (e.g., the stable token address).
   */
  destinationAddress: string;
};

export class Quoter {
  private quoterV3Address = "0x70a6c708c07a8f309d345cf8edb959e5f805d79f";

  private readonly stableToken: string;
  private readonly tokenProvider: TokenProvider;
  private readonly alphaRouter: AlphaRouter;
  private readonly multicall3: Multicall3;
  private softcache: Record<string, { data: { quote: string; raw: SwapRoute }; createdAt: number }> = {};

  constructor(private readonly client: Client, options?: Partial<Options>) {
    // default fallback to usdc.e
    this.stableToken = options?.stableToken || "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1";
    this.quoterV3Address = options?.viewQuoterv3 || "0x70a6c708c07a8f309d345cf8edb959e5f805d79f";
    const provider = this.client.getProvider();
    this.multicall3 = new Multicall3(provider);

    this.tokenProvider =
      options?.tokenProvider ?? new TokenProvider({ client: this.client, multicall3: this.multicall3 });
    this.alphaRouter = initializeAlphaRouter(provider);
  }

  /**
   * This function provides a simple quote for swapping one token to another using Uniswap V3.
   * It calculates the rates for different fee tiers (500, 3000, 10000) and determines the best rate.
   *
   * @param tokenIn - The address of the input token.
   * @param tokenOut - The address of the output token.
   * @returns An object containing the best rate and all calculated rates for the given token pair.
   *
   * Steps:
   * 1. Fetch token details for the input and output tokens.
   * 2. Encode calls for each fee tier using the `quoteExactInputSingle` function.
   * 3. Use the multicall contract to execute all calls with `allowFailure` support.
   * 4. Decode the results and calculate rates for each fee tier.
   * 5. Identify the best rate among the successful calls.
   */
  async simple(tokenIn: string, tokenOut: string) {
    const token = await this.tokenProvider.details(tokenIn, tokenOut);
    if (!token || !token[tokenIn]) {
      throw new Error(`Token not found: ${tokenIn}`);
    }

    const feeAmounts = [500, 3_000, 10_000];
    const calls = feeAmounts.map((fee) => ({
      target: this.quoterV3Address,
      allowFailure: true,
      callData: this.client.codec(abi.viewQuoterv3ABI).encodeFunctionData("quoteExactInputSingle", [
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
    const resultsRaw = await this.multicall3.aggregate3(calls);
    const results: {
      fee: string;
      error?: string;
      rate: number;
    }[] = resultsRaw.map((result: { success: boolean; returnData: string }, i: number) => {
      if (!result.success) {
        return {
          fee: feeAmounts[i].toString(),
          error: "Call failed",
          rate: 0,
        };
      }

      const decoded = this.client
        .codec(abi.viewQuoterv3ABI)
        .decodeFunctionResult("quoteExactInputSingle", result.returnData);

      const amountReceived = ethers.BigNumber.from(decoded[0]);

      return {
        fee: feeAmounts[i].toString(),
        rate: amountReceived.toNumber(),
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
   * @param options optional parameters for slippage, deadline, cacheTTL, and destinationAddress
   *                - If not provided, defaults are used:
   *                  - slippage: 3 (3%)
   *                  - deadline: 360 seconds (6 minutes)
   *                  - cacheTTL: 60,000 milliseconds (1 minute)
   *                  - destinationAddress: stableToken address
   */
  async smart(tokenAddress: string, options?: Partial<SmartQuoterOptions>) {
    const { slippage = 3, deadline = 360, cacheTTL = 60_000, destinationAddress = this.stableToken } = options || {};
    const key = `${tokenAddress}-${slippage}-${deadline}-${destinationAddress}`;
    if (this.softcache[key]) {
      const cached = this.softcache[key];

      // only cache for 1 min
      if (Date.now() - cached.createdAt < cacheTTL) {
        return cached.data;
      }
    }

    const chainId = this.client.getChainId();

    const details = await this.tokenProvider.details(tokenAddress, destinationAddress);
    if (!details || !details[tokenAddress] || !details[destinationAddress]) {
      throw new Error(`Token not found: ${tokenAddress}`);
    }

    const token = details[tokenAddress];

    const tokenIn = new Token(chainId, token.address, token.decimals, token.symbol, token.name);

    const tokenOut = new Token(
      chainId,
      destinationAddress,
      details[destinationAddress].decimals,
      details[destinationAddress].symbol,
      details[destinationAddress].name
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
