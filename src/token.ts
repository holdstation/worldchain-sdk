import { ethers } from "ethers";
import { config } from "./config";

// Transfer event topic (keccak256 hash of Transfer(address,address,uint256))
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const iface = new ethers.Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

export async function tokenOf(
  wallet: string,
  options?: {
    blockPerRequest: number;
    toBlock?: number;
    fromBlock?: number;
  }
) {
  const blockPerRequest = options?.blockPerRequest ?? 10_000;
  const latestBlock = await config.getProvider().getBlockNumber();
  const toBlock = options?.toBlock ?? latestBlock;
  const fromBlock = options?.fromBlock ?? toBlock - 10 * blockPerRequest;

  const chunked: number[][] = [];
  for (let i = fromBlock; i <= toBlock; i += blockPerRequest) {
    const end = Math.min(i + blockPerRequest - 1, toBlock);
    chunked.push([i, end]);
  }

  const tokenList = await Promise.all(
    chunked.map(async ([startBlock, endBlock]) => {
      const logs = await config.getProvider().getLogs({
        topics: [[TRANSFER_TOPIC], [], [ethers.zeroPadValue(wallet, 32)]],
        fromBlock: startBlock,
        toBlock: endBlock,
      });

      const parsedLogs = logs.map((log) => log.address);

      return parsedLogs;
    })
  );

  const tokenSet = new Set<string>();
  for (const tokens of tokenList) {
    for (const token of tokens) {
      tokenSet.add(token);
    }
  }

  return Array.from(tokenSet);
}
