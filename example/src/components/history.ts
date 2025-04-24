import { IndexedDBTransactionStorageImpl, Transaction } from "@holdstation/worldchain-sdk";
import { ethers } from "ethers";

interface TxRaw extends Transaction {
  dateTime: number;
}

export class WalletHistory {
  private transactionDb: IndexedDBTransactionStorageImpl;
  private provider: ethers.providers.JsonRpcProvider;

  constructor() {
    this.transactionDb = new IndexedDBTransactionStorageImpl("TransactionDB");
    this.provider = new ethers.providers.JsonRpcProvider("https://worldchain-mainnet.gateway.tenderly.co");
  }

  async getBlockTime(...blockNumbers: number[]) {
    const blocks = await Promise.all(blockNumbers.map((v) => this.provider.getBlock(v)));
    return blocks.map((v) => v.timestamp);
  }

  public async find(offset: number, limit: number) {
    const txs = await this.transactionDb.find(offset, limit);
    // TODO: maybe bottleneck here
    const timestamps = await this.getBlockTime(...txs.map((v) => v.block));
    const transactions = txs.map<TxRaw>((tx, index) => ({
      ...tx,
      dateTime: timestamps[index] * 1000,
    }));

    return transactions;
  }
}

export const walletHistory = new WalletHistory();
