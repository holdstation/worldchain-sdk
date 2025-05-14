export interface ZeroXRequestParams {
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount: string; // Hoặc number, tuỳ thuộc vào dữ liệu thực tế
  taker: string;
  swapFeeRecipient?: string;
  swapFeeBps?: number; // 0 - > 1000 : 0% - > 10%
  swapFeeToken?: string;
  tradeSurplusRecipient?: string;
  slippageBps?: number; // 0 - > 1000 : 0% - > 10%
  gasPrice?: string;
}

export type ZeroXResponse = {
  blockNumber: string;
  buyAmount: string;
  buyToken: string;
  fees: {
    integratorFee: string | null;
    zeroExFee: {
      amount: string;
      token: string;
      type: string;
    };
    gasFee: string | null;
  };
  issues: {
    allowance: {
      actual: string;
      spender: string;
    };
    balance: {
      token: string;
      actual: string;
      expected: string;
    };
    simulationIncomplete: boolean;
    invalidSourcesPassed: string[];
  };
  liquidityAvailable: boolean;
  minBuyAmount: string;
  permit2: {
    type: string;
    hash: string;
    eip712: {
      types: {
        PermitTransferFrom: Array<{ name: string; type: string }>;
        TokenPermissions: Array<{ name: string; type: string }>;
        EIP712Domain: Array<{ name: string; type: string }>;
      };
      domain: {
        name: string;
        chainId: number;
        verifyingContract: string;
      };
      message: {
        permitted: {
          token: string;
          amount: string;
        };
        spender: string;
        nonce: string;
        deadline: string;
      };
      primaryType: string;
    };
  };
  route: {
    fills: Array<{
      from: string;
      to: string;
      source: string;
      proportionBps: string;
    }>;
    tokens: Array<{
      address: string;
      symbol: string;
    }>;
  };
  sellAmount: string;
  sellToken: string;
  tokenMetadata: {
    buyToken: {
      buyTaxBps: string;
      sellTaxBps: string;
    };
    sellToken: {
      buyTaxBps: string;
      sellTaxBps: string;
    };
  };
  totalNetworkFee: string;
  transaction: {
    to: string;
    data: string;
    gas: string;
    gasPrice: string;
    value: string;
  };
  zid: string;
};
