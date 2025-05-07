type EvmAddressLike = string;

export type Address = EvmAddressLike;

export type OverrideParams = { from: Address; gasLimit: string; gasPrice: string };

export type SwapParams = {
  fromToken: Address;
  toToken: Address;
  amount: string;
  slippage: string;
  fee?: string;
  preferRouters?: string[];
};

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

export type EstimatedData = {
  // router name: hold.so, kyberswap, etc...
  to: string;

  // swap data
  data: string;

  value?: string;

  addons?: Partial<{
    amountOut: string;
    amountOutUsd: string;
    minAmountOut: string;
    feeAmountOut: string;
    protocols: ProtocolsItem[];
  }>;
};

export interface Estimator {
  swap(params: SwapParams, override?: Partial<OverrideParams>): Promise<EstimatedData>;
}

export interface Writer {
  swap(params: EstimatedData): Promise<string>;
  estimate: Estimator;
}

export interface Swapper {
  estimate: Estimator["swap"];
  name(): string;
  enabled(chainId: number): boolean;
}
