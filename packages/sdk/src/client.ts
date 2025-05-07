import { AbiCodec } from "./codec";

export type FilterLogs = {
  request: {
    address: string;
    topics: Array<string | Array<string> | null>;
    fromBlock: string | number;
    toBlock: string | number;
  };
  response: {
    blockNumber: number;
    blockHash: string;
    transactionIndex: number;

    removed: boolean;

    address: string;
    data: string;

    topics: Array<string>;

    transactionHash: string;
    logIndex: number;
  };
};

export type OnchainTransaction = {
  hash?: string;
  to?: string;
  from?: string;
  nonce: number;

  gasLimit: string;
  gasPrice?: string;

  data: string;
  value: string;

  // Only if a transaction has been mined
  blockNumber?: number;
  blockHash?: string;
  timestamp?: number;

  // The raw transaction
  raw?: string;
};

export interface Result extends ReadonlyArray<any> {
  readonly [key: string]: any;
}

export interface Client {
  name(): string;

  // ----------- validate, helper functions -----------

  isValidAddress(address: string): boolean;
  hexZeroPad(value: string, length: number): string;

  // ----------- network functions -----------

  getBlockNumber: () => Promise<number>;
  getChainId: () => number;
  getLogs(filter: Partial<FilterLogs["request"]>): Promise<FilterLogs["response"][]>;
  getTransaction(hash: string): Promise<OnchainTransaction>;

  // ----------- encode/decode functions -----------

  codec(abi: any): AbiCodec;
}
