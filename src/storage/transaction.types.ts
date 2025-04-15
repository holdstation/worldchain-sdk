type ExtractedTransaction = {
  // Main fields extracted from the evm transaction

  hash: string; // Primary key
  to: string;
  block: number;
  success: boolean;
};

type Transfer = {
  tokenAddress: string;
  amount: string;
};

type CalculatedTransactionField = {
  // Calculated fields

  date?: Date;
  method: string;
  protocol: string;

  transfers: Transfer[];
};

export type Transaction = ExtractedTransaction & CalculatedTransactionField;

export interface TransactionStorage {
  save(transaction: Transaction): Promise<void>;
  find(offset: number, limit: number): Promise<Transaction[]>;
  findByHash(hash: string): Promise<Transaction>;
  findLastBlock(): Promise<number>;
  findMinBlock(): Promise<number>;
}
