import { EstimatedData, OverrideParams, SwapParams, Swapper } from "./types";

export class UniswapV3 implements Swapper {
  name(): string {
    return "uniswap-v3";
  }

  enabled(chainId: number): boolean {
    return chainId === 480;
  }

  async estimate(params: SwapParams, override?: Partial<OverrideParams>): Promise<EstimatedData> {
    // Placeholder for actual Uniswap V3 swap estimation logic
    const estimatedData: EstimatedData = {
      to: this.name(),
      data: "0x", // Placeholder for actual swap data
      value: params.amount,
      addons: {
        amountOut: "0",
        amountOutUsd: "0",
        minAmountOut: "0",
        feeAmountOut: "0",
        protocols: [],
      },
    };

    return estimatedData;
  }
}
