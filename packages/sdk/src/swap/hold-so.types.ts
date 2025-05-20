export interface HoldSoSwapRequestParams {
  src: string;
  dst: string;
  amount: string; // Hoặc number, tuỳ thuộc vào dữ liệu thực tế
  receiver: string;
  slippage?: number;
  protocols?: string;
  minReceive?: string;
}
export type SwapsItem = {
  amount: string;
  from: string;
  pool: string;
  protocol: string;
  to: string;
};

export type ProtocolsItem = {
  amount: string;
  swaps: SwapsItem[];
};

export type SwapData = {
  amount: string;
  amountUsd: string;
  dst: string;
  feePercent: string;
  feeUsd: string;
  minReceive: string;
  protocols: ProtocolsItem[];
  src: string;
  toAmount: string;
  toAmountUsd: string;
};
export interface HoldSoSwapResponse {
  quote: SwapData;
  tx: {
    data: string;
  };
}
