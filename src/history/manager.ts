import { Mutex } from "async-mutex";
import { ethers } from "ethers";

type TokenTransfer = {
  tokenAddress: string;
  amount: string;
  from: string;
  to: string;
};

export class Manager {
  private listeners: Record<string, Runner> = {};
  private readonly mutex = new Mutex();

  constructor(private readonly provider: ethers.JsonRpcProvider) {}

  watch = async (address: string, listenner: any) => {
    const mutex = this.mutex;

    const release = await mutex.acquire();

    try {
      if (this.listeners[address.toLowerCase()]) {
        throw new Error(
          `Already listening to ${address}, please stop it first`
        );
      }

      this.listeners[address.toLowerCase()] = new Runner(
        address,
        this.provider
      );

      return {
        start: async () => {
          const release = await mutex.acquire();

          try {
            const runner = this.listeners[address.toLowerCase()];

            runner
              .run()
              .then(() => {
                console.debug(`Runner started for ${address}`);
              })
              .catch((e: any) =>
                console.error(`Error starting runner for ${address}`, e)
              );
          } finally {
            release();
          }
        },
        stop: async () => {
          const runner = this.listeners[address.toLowerCase()];
          if (runner) {
            runner.stop();
          }
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

  constructor(
    private readonly walletAddress: string,
    private readonly provider: ethers.JsonRpcProvider
  ) {}

  run = async () => {
    this.lastBlock = await this.provider.getBlockNumber();
    this.minBlock = this.lastBlock;

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
    // while (!this.aborted) {
    if (this.minBlock < this.lastBlock - 100_000) {
      console.debug(
        `MinBlock ${this.minBlock} is too far from lastBlock ${this.lastBlock}`
      );
      return;
    }

    await this.queryLogs(this.minBlock - 10_000, this.minBlock)
      .then(() => {
        // Update minBlock to avoid duplicated query
        this.minBlock = this.minBlock - 10_000;
      })
      .catch((e: any) => {
        // This is tricky step to avoid missing data
        console.error("Error in sideMinBlock", e);
      });

    // Delay to avoid rate limit
    await new Promise((resolve) => {
      setTimeout(() => resolve(null), this.delay);
    });
    // }
  }

  private async queryLogs(from: number, to: number) {
    const topicAddress = ethers
      .zeroPadValue(this.walletAddress, 32)
      .toLowerCase();

    // our rpc allow upto 2000 block

    for (let i = to; i >= from; i -= this.blockstep) {
      if (this.aborted) {
        console.debug("Aborted");
        break;
      }

      const logs = await Promise.all([
        // transfer from this address
        this.provider.getLogs({
          fromBlock: Math.max(i - this.blockstep, from),
          toBlock: i,
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            [topicAddress],
          ],
        }),

        // transfer to this address
        this.provider.getLogs({
          fromBlock: Math.max(i - this.blockstep, from),
          toBlock: i,
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            null,
            [topicAddress],
          ],
        }),
      ]);

      const txsummary: Record<string, TokenTransfer[]> = {};
      const combinedLogs = [...logs[0], ...logs[1]];

      for (let log of combinedLogs) {
        if (!txsummary[log.transactionHash]) {
          txsummary[log.transactionHash] = [];
        }

        txsummary[log.transactionHash].push({
          tokenAddress: log.address,
          amount: ethers.toBigInt(log.data).toString(),
          from: log.topics[1],
          to: log.topics[2],
        });
      }

      const txs = await Promise.all(
        Array.from(Object.keys(txsummary)).map(async (tx) => {
          const txData = await this.provider.getTransaction(tx);

          return txData;
        })
      );

      for (const tx of txs) {
        console.log(14888, "tx", tx);
      }
    }
  }
}
