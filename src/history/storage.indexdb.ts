import { IDBPDatabase, openDB } from "idb";

// Interface for EVM transaction data
interface EvmTransaction {
  hash: string;
  from: string;
  to?: string;
  value?: string | number | bigint;
  gasPrice?: string | number | bigint;
  gasLimit?: string | number | bigint;
  nonce?: number;
  data?: string;
  timestamp?: number;
  blockNumber?: number;
  chainId?: number;
  method?: string;
  protocol?: string;
  transferAmounts?: Record<string, string>;
}

// Interface for stored transaction (normalized)
interface StoredTransaction extends EvmTransaction {
  walletAddress: string[];
  value: string;
  gasPrice?: string;
  gasLimit?: string;
  timestamp: number;
  method?: string;
  protocol?: string;
  transferAmounts?: Record<string, string>;
}

// Interface for query options
interface QueryOptions {
  limit?: number;
  skip?: number;
}

// Interface for response types
interface SaveResponse {
  success: boolean;
  hash?: string;
  error?: string;
}

interface QueryResponse {
  success: boolean;
  transactions: StoredTransaction[];
  total: number;
  error?: string;
}

class TransactionStore {
  private dbPromise: Promise<IDBPDatabase<unknown>>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  // Initialize IndexedDB
  private async initDB(): Promise<IDBPDatabase<unknown>> {
    return openDB("evmTransactionsDB", 1, {
      upgrade(db) {
        const store = db.createObjectStore("transactions", { keyPath: "hash" });
        store.createIndex("walletAddress", "walletAddress", {
          multiEntry: true,
        });
        store.createIndex("timestamp", "timestamp");
      },
    });
  }

  // Save a transaction
  async saveTransaction(tx: EvmTransaction): Promise<SaveResponse> {
    try {
      const db = await this.dbPromise;

      // Normalize transaction data
      const normalizedTx: StoredTransaction = {
        hash: tx.hash,
        from: tx.from.toLowerCase(),
        to: tx.to?.toLowerCase(),
        value: tx.value?.toString() ?? "0",
        gasPrice: tx.gasPrice?.toString(),
        gasLimit: tx.gasLimit?.toString(),
        nonce: tx.nonce,
        data: tx.data,
        timestamp: tx.timestamp ?? Date.now(),
        blockNumber: tx.blockNumber,
        chainId: tx.chainId,
        walletAddress: [tx.from.toLowerCase(), tx.to?.toLowerCase()].filter(
          Boolean
        ) as string[],
        method: tx.method,
        protocol: tx.protocol,
        transferAmounts: tx.transferAmounts,
      };

      await db.put("transactions", normalizedTx);
      return { success: true, hash: tx.hash };
    } catch (error: any) {
      console.error("Error saving transaction:", error);
      return { success: false, error: error.message };
    }
  }

  // Get transactions filtered by wallet address, ordered by time
  async getTransactionsByWallet(
    walletAddress: string,
    options: QueryOptions = {}
  ): Promise<QueryResponse> {
    const db = await this.dbPromise;
    const { limit = 100, skip = 0 } = options;
    const normalizedWallet = walletAddress.toLowerCase();

    // Query transactions by walletAddress index
    const txs = await db.getAllFromIndex(
      "transactions",
      "walletAddress",
      normalizedWallet
    );

    // Sort by timestamp (descending, newest first)
    const sortedTxs = txs.sort(
      (a: StoredTransaction, b: StoredTransaction) => b.timestamp - a.timestamp
    );

    // Apply pagination
    const paginatedTxs = sortedTxs.slice(skip, skip + limit);

    return {
      success: true,
      transactions: paginatedTxs,
      total: sortedTxs.length,
    };
  }
}

export default TransactionStore;
