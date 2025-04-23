export type MulticallRequest = {
  target: string;
  callData: string;
};

export type MulticallBalanceResponse = {
  balance: string;
  decimals: number;
  symbol: string;
  name: string;
};
