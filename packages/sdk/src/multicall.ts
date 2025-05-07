export type Aggregate = {
  request: {
    target: string;
    callData: string;
  };
  response: [blockNumber: number, returnData: string[]];
};

export type Aggregate3 = {
  request: {
    target: string;
    allowFailure: boolean;
    callData: string;
  };
  response: {
    returnData: string;
    success: boolean;
  };
};

export interface Multicall3 {
  aggregate(calls: Aggregate["request"][]): Promise<Aggregate["response"]>;
  aggregate3(calls: Aggregate3["request"][]): Promise<Aggregate3["response"][]>;
}
