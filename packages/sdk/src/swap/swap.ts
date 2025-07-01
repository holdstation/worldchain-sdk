import { Token, TokenStorage } from "..";

export const defaultWorldchainConfig: SwapConfig = {
  tokens: {
    weth: {
      address: "0x4200000000000000000000000000000000000006",
      symbol: "WETH",
      decimals: 18,
      name: "Wrapped Ether",
      chainId: 480,
    },
    wld: {
      address: "0x2cFc85d8E48F8EAB294be644d9E25C3030863003",
      symbol: "WLD",
      decimals: 18,
      name: "Worldcoin",
      chainId: 480,
    },
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

  spender: "0x43222f934ea5c593a060a6d46772fdbdc2e2cff0",
  stableCoins: ["0x79A02482A880bCE3F13e09Da970dC34db4CD24d1"],
  tradeSurplusRecipient: "0x8d61d7fe817efc69a2169f0d5f39b41ed5c89409",
};

export type SwapParams = {
  quoteInput: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippage?: string;
    fee?: string;
    feeReceiver?: string;
    preferRouters?: string[];
    timeout?: number;
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
    partnerCode?: string;
  };
  output: {
    success: boolean;
    errorCode?: string;
    transactionId?: string;
  };
};

export type SwapConfig = {
  tokens: {
    weth: Token;
    wld: Token;
    eth: Token;
  };

  uniswap: {
    router: {
      v2: string;
      v3: string;
    };
    quoter: {
      v2: string;
    };
  };

  stableCoins: string[];

  spender: string;

  tokenStorage?: TokenStorage;

  tradeSurplusRecipient?: string;
};

export interface Estimator {
  quote(input: SwapParams["quoteInput"]): Promise<SwapParams["quoteOutput"]>;
}

export interface Swapper {
  swap(input: SwapParams["input"]): Promise<SwapParams["output"]>;
  estimate: Estimator;
  load(swapModule: SwapModule): Promise<void>;
}

export interface SwapModule {
  estimate: Estimator["quote"];
  name(): string;
  enabled(chainId: number): boolean;
}
