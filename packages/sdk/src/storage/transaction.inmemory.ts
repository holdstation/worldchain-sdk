import { Transaction, TransactionStorage } from "./transaction.types";

// TODO: add more methods to find transactions by different criteria
class InmemoryTransactionStorageImpl implements TransactionStorage {
  saveMultiple(transactions: Transaction[]): Promise<void> {
    throw new Error("Method not implemented.");
  }
  save(transaction: Transaction): Promise<void> {
    throw new Error("Method not implemented.");
  }
  find(offset: number, limit: number): Promise<Transaction[]> {
    throw new Error("Method not implemented.");
  }
  findByHash(hash: string): Promise<Transaction> {
    throw new Error("Method not implemented.");
  }
  findLastBlock(): Promise<number> {
    throw new Error("Method not implemented.");
  }
  findMinBlock(): Promise<number> {
    throw new Error("Method not implemented.");
  }
}

export const inmemoryTransactionStorage = new InmemoryTransactionStorageImpl();
