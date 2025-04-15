import { DBSchema, IDBPDatabase, openDB } from "idb";
import { Token, TokenStorage } from "./token.types";

interface TokenDB extends DBSchema {
  tokens: {
    key: string; // address
    value: Token;
  };
}

export class IndexedDBStorageImpl implements TokenStorage {
  private db: Promise<IDBPDatabase<TokenDB>>;

  constructor(dbName: string) {
    this.db = openDB<TokenDB>(dbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("tokens")) {
          db.createObjectStore("tokens", { keyPath: "address" });
        }
      },
    });
  }

  async save(token: Token): Promise<void> {
    const db = await this.db;
    await db.put("tokens", token);
  }

  async findByAddress(address: string): Promise<Token> {
    const db = await this.db;
    const token = await db.get("tokens", address);

    if (!token) {
      throw new Error(`Token not found for address: ${address}`);
    }

    return token;
  }

  async find(addresses: string[]): Promise<Token[]> {
    const db = await this.db;
    const tx = db.transaction("tokens");
    const store = tx.objectStore("tokens");

    const results: Token[] = [];
    for (const address of addresses) {
      const token = await store.get(address);
      if (token) {
        results.push(token);
      }
    }

    return results;
  }
}
