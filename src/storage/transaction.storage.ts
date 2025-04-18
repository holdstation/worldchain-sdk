import { DBSchema, IDBPDatabase, openDB } from "idb";
import { Transaction, TransactionStorage } from "./transaction.types";

interface TransactionDB extends DBSchema {
  transactions: {
    key: string; // hash
    value: Transaction;
    indexes: {
      block: number;
    };
  };
}

export class IndexedDBTransactionStorageImpl implements TransactionStorage {
  private db: Promise<IDBPDatabase<TransactionDB>>;

  constructor(dbName: string) {
    this.db = openDB<TransactionDB>(dbName, 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("transactions")) {
          const store = db.createObjectStore("transactions", {
            keyPath: "hash",
          });
          // Create an index on block number for efficient querying
          store.createIndex("block", "block");
        }
      },
    });
  }

  async save(transaction: Transaction): Promise<void> {
    const db = await this.db;
    await db.put("transactions", transaction);
  }

  async saveMultiple(transactions: Transaction[]): Promise<void> {
    const db = await this.db;

    // Start a transaction for the "transactions" object store
    const tx = db.transaction("transactions", "readwrite");
    const store = tx.objectStore("transactions");

    // Add each transaction to the store
    for (const transaction of transactions) {
      await store.put(transaction);
    }

    // Commit the transaction
    await tx.done;
  }

  async find(offset: number, limit: number): Promise<Transaction[]> {
    const db = await this.db;
    // Use index to get transactions sorted by block in descending order
    const index = db
      .transaction("transactions", "readonly")
      .objectStore("transactions")
      .index("block");

    // Get cursor to traverse in descending order
    const transactions: Transaction[] = [];
    let cursor = await index.openCursor(null, "prev");

    // Skip offset
    let currentOffset = 0;
    while (cursor && currentOffset < offset) {
      cursor = await cursor.continue();
      currentOffset++;
    }

    // Collect limit items
    while (cursor && transactions.length < limit) {
      transactions.push(cursor.value);
      cursor = await cursor.continue();
    }

    return transactions;
  }

  async findByHash(hash: string): Promise<Transaction> {
    const db = await this.db;
    const transaction = await db.get("transactions", hash);

    if (!transaction) {
      throw new Error(`Transaction not found for hash: ${hash}`);
    }

    return transaction;
  }

  async findLastBlock(): Promise<number> {
    const db = await this.db;
    const index = db
      .transaction("transactions", "readonly")
      .objectStore("transactions")
      .index("block");

    // Get the highest block using the index
    const cursor = await index.openCursor(null, "prev");

    // If no transactions exist, return 0
    if (!cursor) {
      return 0;
    }

    // Return the highest block number
    return cursor.value.block;
  }

  async findMinBlock(): Promise<number> {
    const db = await this.db;
    const index = db
      .transaction("transactions", "readonly")
      .objectStore("transactions")
      .index("block");

    // Get the lowest block using the index
    const cursor = await index.openCursor(null, "next");

    // If no transactions exist, return 0
    if (!cursor) {
      return 0;
    }

    // Return the lowest block number
    return cursor.value.block;
  }
}
