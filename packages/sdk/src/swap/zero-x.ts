import BigNumber from "bignumber.js";
import { Token, TokenStorage } from "../storage";
import { TokenProvider } from "../token";
import { getFeeDirect, getFeeWithAmountIn, getFeeWithAmountOut, isNativeToken } from "./fee";
import { defaultWorldchainConfig, SwapConfig, SwapModule, SwapParams } from "./swap";
import { ZeroXRequestParams, ZeroXResponse } from "./zero-x.types";

export class ZeroX implements SwapModule {
  private config: SwapConfig = defaultWorldchainConfig;

  constructor(
    private readonly tokenProvider: TokenProvider,
    private readonly tokenStorage: TokenStorage,

    config?: Partial<SwapConfig>,
  ) {
    this.config = Object.assign(this.config, config ?? {});
  }

  name(): string {
    return "0x";
  }

  enabled(chainId: number): boolean {
    return chainId === 480;
  }

  private async zeroXRequest(data: ZeroXRequestParams): Promise<ZeroXResponse> {
    // Build query parameters string
    const url = `https://bridge.holdstation.com/0x/swap/allowance-holder/quote`;

    const queryParams = new URLSearchParams();

    // Add all parameters from the data object
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    // Make the fetch request
    const response = await fetch(`${url}?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        "X-Bridge-Purpose": "worldchain-app",
        "Content-Type": "application/json",
      },
    });

    if (response.status < 200 || response.status >= 400) {
      throw new Error(`${response.status}`);
    }

    const result = await response.json();
    // Parse and return the JSON response
    return result as ZeroXResponse;
  }

  private async tokenRateUsd(token: Token): Promise<number> {
    if (token.address === this.config.stableCoins[0]) {
      return 1;
    }

    // Build query parameters string
    const data = await this.zeroXRequest({
      chainId: 480,
      sellToken: token.address,
      buyToken: this.config.stableCoins[0],
      sellAmount: new BigNumber(1).multipliedBy(10 ** token.decimals).toFixed(0),
      taker: this.config.spender,
      slippageBps: 0,
    });
    // Parse and return the JSON response
    return new BigNumber(data.buyAmount).dividedBy(10 ** 6).toNumber(); // usdc decimals
  }

  async estimate(params: SwapParams["quoteInput"]): Promise<SwapParams["quoteOutput"]> {
    const { tokenIn: fromToken, tokenOut: toToken, fee: rawFee = "0.2", slippage: rawSlippage = "3" } = params;
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

    const slippage = parseFloat(rawSlippage);
    // Validate slippage to ensure it is within a safe range (0% to 100%)
    if (isNaN(slippage) || slippage < 0 || slippage > 100) {
      throw new Error("Invalid slippage value. It must be between 0 and 100.");
    }

    // Fetch the best rate for the swapFetch the best rate for the swap
    const data = await this.zeroXRequest({
      chainId: 480,
      sellToken: tokenIn.address,
      buyToken: tokenOut.address,
      sellAmount: new BigNumber(amountInWei).toFixed(0),
      taker: this.config.spender,
      slippageBps: slippage * 100, // 0 - > 1000 : 0% - > 10%
      tradeSurplusRecipient: this.config.tradeSurplusRecipient,
    });

    const amountOut = new BigNumber(data.buyAmount);

    let feeOut = new BigNumber(0);
    if (
      getFeeDirect(tokenIn.address, tokenOut.address, this.config.stableCoins, this.config.tokens.wld.address) === 1
    ) {
      feeOut = new BigNumber(getFeeWithAmountOut(`0x${amountOut.toString(16)}`, fee)?.feeAmount ?? "0");
    }

    // Calculate the minimum output amount after slippage and fees
    const amountOutMin = amountOut
      .multipliedBy(new BigNumber(1).minus(Number(slippage) / 10000))
      .integerValue(BigNumber.ROUND_DOWN)
      .minus(feeOut);

    // rateSwap = amountIn / (amountOut / 10^decimals)
    const rateSwap = amount //
      .dividedBy(amountOut)
      .multipliedBy(10 ** tokenOut.decimals);

    const rateTokenOut = await this.tokenRateUsd(tokenOut);

    const minmumReceived = amountOutMin.div(Math.pow(10, tokenOut.decimals));

    // amountUsd = tokenAmount / 10^decimals * rateUsdPerToken
    const amountOutUsd = new BigNumber(amountOut).div(10 ** tokenOut.decimals).multipliedBy(rateTokenOut);

    // Return the response with calculated values and populated transaction
    const resp: SwapParams["quoteOutput"] = {
      data: data.transaction.data ?? "",
      value: isNativeToken(tokenIn.address) ? amountInWei.toFixed() : "0",
      to: data.transaction.to ?? "",
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
