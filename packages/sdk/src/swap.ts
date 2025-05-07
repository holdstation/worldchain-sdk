export type SwapParams = {
  quoteInput: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippage?: string;
    fee?: string;
    feeReceiver?: string;
  };
  quoteOutput: {
    data: string;
    to: string;
    value?: string;
    addons?: {
      /**
       * The estimated output token amount after the swap.
       */
      outAmount: string;

      /**
       * The swap rate between the input and output tokens.
       */
      rateSwap: string;

      /**
       * The output token amount in USD.
       */
      amountOutUsd: string;

      /**
       * The minimum output amount after considering slippage and fees.
       */
      minReceived: string;

      /**
       * The fee amount deducted from the output in hexadecimal format.
       */
      feeAmountOut: string;
    };
  };
  input: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    tx: {
      data: string;
      to: string;
      value?: string;
    };
    feeAmountOut?: string;
    fee?: string;
    feeReceiver?: string;
  };
  output: {
    success: boolean;
    errorCode?: string;
    transactionId?: string;
  };
};

export interface Swapper {
  swap(input: SwapParams["input"]): Promise<SwapParams["output"]>;
  quote(input: SwapParams["quoteInput"]): Promise<SwapParams["quoteOutput"]>;
}
