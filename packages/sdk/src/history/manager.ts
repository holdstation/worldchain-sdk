import { Mutex } from "async-mutex";
import { BigNumber } from "bignumber.js";
import { Client } from "../client";
import { config } from "../config";
import {
  inmemoryTokenStorage,
  inmemoryTransactionStorage,
  Token,
  TokenStorage,
  Transaction,
  TransactionStatus,
  TransactionStorage,
} from "../storage";
import { TokenProvider } from "../token";

type TokenTransfer = {
  tokenAddress: string;
  amount: string;
  from: string;
  to: string;
};

export class Manager {
  private listeners: Record<string, Runner> = {};
  private readonly mutex = new Mutex();
  private readonly client: Client;
  private readonly tokenProvider: TokenProvider;
  private readonly tokenStorage: TokenStorage;
  private readonly transactionStorage: TransactionStorage;

  constructor(
    private readonly blockToWatch: number = 100_000,
    options?: Partial<{
      client: Client;
      tokenProvider: TokenProvider;
      storage: Partial<{
        token: TokenStorage;
        tx: TransactionStorage;
      }>;
    }>
  ) {
    this.client = options?.client ?? config.client;

    this.tokenProvider =
      options?.tokenProvider ??
      new TokenProvider({
        client: this.client,
        multicall3: config.multicall3,
        storage: inmemoryTokenStorage,
      });

    this.tokenStorage = options?.storage?.token ?? inmemoryTokenStorage;
    this.transactionStorage = options?.storage?.tx ?? inmemoryTransactionStorage;
  }

  watch = async (address: string) => {
    const mutex = this.mutex;
    const release = await mutex.acquire();

    try {
      if (this.listeners[address.toLowerCase()]) {
        const runner = this.listeners[address.toLowerCase()];
        if (runner) {
          runner.stop();
        }

        delete this.listeners[address.toLowerCase()];
      }

      this.listeners[address.toLowerCase()] = new Runner(address, {
        client: this.client,
        tokenProvider: this.tokenProvider,
        storage: {
          token: this.tokenStorage,
          tx: this.transactionStorage,
        },
      });

      return {
        start: async () => {
          const release = await mutex.acquire();

          try {
            const runner = this.listeners[address.toLowerCase()];

            runner
              .run(this.blockToWatch)
              .then(() => {
                console.debug(`Runner started for ${address}`);
              })
              .catch((e: any) => console.error(`Error starting runner for ${address}`, e));
          } finally {
            release();
          }
        },
        stop: async () => {
          const runner = this.listeners[address.toLowerCase()];
          if (runner) {
            runner.stop();
          }

          delete this.listeners[address.toLowerCase()];
        },
      };
    } finally {
      release();
    }
  };
}

export class Runner {
  private lastBlock: number = 0;
  private minBlock: number = 0;
  private readonly blockstep = 2_000;
  private aborted = false;

  // delay between range scan
  private delay = 1000;

  private readonly client: Client;
  private readonly tokenStorage: TokenStorage;
  private readonly transactionStorage: TransactionStorage;
  private readonly tokenProvider: TokenProvider;

  constructor(
    private readonly walletAddress: string,
    options: {
      client: Client;
      tokenProvider: TokenProvider;
      storage: {
        token: TokenStorage;
        tx: TransactionStorage;
      };
    }
  ) {
    this.client = options.client;
    this.tokenStorage = options.storage.token;
    this.transactionStorage = options.storage.tx;
    this.tokenProvider = options.tokenProvider;
  }

  run = async (blockToWatch: number) => {
    this.lastBlock = await this.client.getBlockNumber();
    const latestBlock = await this.transactionStorage.findLastBlock();
    const minBlock = Math.max(latestBlock, this.lastBlock - blockToWatch); // get first 100_000 block
    this.minBlock = minBlock;

    console.debug("Block", { last: this.lastBlock, min: this.minBlock });

    // Run in two side
    // from minBlock to minBlock - 10_000
    // from lastBlock to latestBlock
    await this.loop();
  };

  stop = async () => {
    this.aborted = true;
  };

  private async loop() {
    while (!this.aborted) {
      if (this.lastBlock < this.minBlock) {
        console.debug(`MinBlock ${this.minBlock} is too far from lastBlock ${this.lastBlock}`);
        return;
      }

      await this.queryLogs(this.lastBlock - 10_000, this.lastBlock)
        .then(() => {
          // Update minBlock to avoid duplicated query
          this.lastBlock = this.lastBlock - 10_000;
        })
        .catch((e: any) => {
          // This is tricky step to avoid missing data
          console.error("Error in sideMinBlock", e);
        });

      // Delay to avoid rate limit
      await new Promise((resolve) => {
        setTimeout(() => resolve(null), this.delay);
      });
    }
  }

  getMethodId(data: string) {
    const methodId = data.slice(0, 10);
    return methodId;
  }

  private async retry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        return await fn();
      } catch (error) {
        attempts++;
        console.error(`Attempt ${attempts} failed:`, error);
        if (attempts >= maxRetries) {
          console.error(`Failed after ${maxRetries} attempts.`);
          throw error; // Optionally rethrow the error
        }
      }
    }
    throw new Error("Retry logic failed unexpectedly."); // Fallback error
  }

  private async queryLogs(from: number, to: number) {
    const topicAddress = this.client.hexZeroPad(this.walletAddress, 32).toLowerCase();

    // our rpc allow upto 2000 block

    for (let i = to; i >= from; i -= this.blockstep) {
      if (this.aborted) {
        console.debug("Aborted");
        break;
      }

      const logs = await this.retry(
        () =>
          Promise.all([
            // transfer from this address
            this.client.getLogs({
              fromBlock: Math.max(i - this.blockstep, from),
              toBlock: i,
              topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", [topicAddress]],
            }),

            // transfer to this address
            this.client.getLogs({
              fromBlock: Math.max(i - this.blockstep, from),
              toBlock: i,
              topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", null, [topicAddress]],
            }),
          ]),
        3
      );

      const txsummary: Record<string, TokenTransfer[]> = {};
      const combinedLogs = [...logs[0], ...logs[1]];
      for (let log of combinedLogs) {
        if (!txsummary[log.transactionHash]) {
          txsummary[log.transactionHash] = [];
        }

        let token: Token;
        try {
          token = await this.tokenStorage.findByAddress(log.address);
        } catch (error) {
          const tokens = await this.tokenProvider.details(log.address);

          token = {
            ...tokens[log.address],
            address: log.address,
            chainId: this.client.getChainId(),
          };

          await this.tokenStorage.save(token);
        }

        txsummary[log.transactionHash].push({
          tokenAddress: log.address,
          amount: new BigNumber(log.data).toString(),
          from: log.topics[1],
          to: log.topics[2],
        });
      }

      const txs = await Promise.all(
        Array.from(Object.keys(txsummary)).map(async (hash) => {
          const txData = await this.client.getTransaction(hash);
          return txData;
        })
      );

      const transactions: Transaction[] = [];
      for (const tx of txs) {
        if (!tx || !tx.hash) {
          continue;
        }

        transactions.push({
          hash: tx.hash,
          block: tx.blockNumber ?? 0,
          to: tx.to ?? "",
          success: TransactionStatus.NotDefined,
          date: new Date((tx.blockNumber ?? 0) * 1000),
          method: this.getMethodId(tx.data),
          protocol: "", // TODO
          transfers: txsummary[tx.hash].map((transfer) => ({
            tokenAddress: transfer.tokenAddress,
            amount: transfer.amount,
            from: transfer.from,
            to: transfer.to,
          })),
        });
      }

      // Save transaction to storage
      await this.transactionStorage.saveMultiple(
        txs
          .map<Transaction | undefined>((tx) => {
            if (!tx || !tx.hash) {
              return undefined;
            }

            return {
              hash: tx.hash,
              block: tx.blockNumber ?? 0,
              to: tx.to ?? "",
              success: TransactionStatus.NotDefined,
              date: new Date((tx.blockNumber ?? 0) * 1000),
              method: this.getMethodId(tx.data),
              protocol: "", // TODO
              transfers: txsummary[tx.hash].map((transfer) => ({
                tokenAddress: transfer.tokenAddress,
                amount: transfer.amount,
                from: transfer.from,
                to: transfer.to,
              })),
            };
          })
          .filter((tx) => typeof tx !== "undefined")
      );
    }
  }
}
