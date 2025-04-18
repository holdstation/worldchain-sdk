import { ethers } from "ethers";
import { MULTICALL3_ABI } from "./abi/multicall3";
import { MulticallRequest, erc20Interface } from "./balance";
import { config } from "./config";

// Transfer event topic (keccak256 hash of Transfer(address,address,uint256))
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const iface = new ethers.Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

type MulticallTokenInfoResponse = {
  decimals: number;
  symbol: string;
  name: string;
};

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

export async function tokenInfo(
  ...tokenAddresses: string[]
): Promise<Record<string, MulticallTokenInfoResponse>> {
  const multicallContract = new ethers.Contract(
    config.multicall3Address,
    MULTICALL3_ABI,
    config.getProvider()
  );

  const calls: MulticallRequest[] = [];

  for (const tokenAddress of tokenAddresses) {
    if (!ethers.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    calls.push(
      {
        target: tokenAddress,
        callData: erc20Interface.encodeFunctionData("decimals"),
      },
      {
        target: tokenAddress,
        callData: erc20Interface.encodeFunctionData("symbol"),
      },
      {
        target: tokenAddress,
        callData: erc20Interface.encodeFunctionData("name"),
      }
    );
  }

  const [_, data] = await multicallContract.aggregate(calls);

  const result: Record<string, MulticallTokenInfoResponse> = {};

  for (let i = 0; i < data.length; i += 3) {
    const tokenAddress = tokenAddresses[i / 3];
    const decimals = data[i];
    const symbol = data[i + 1];
    const name = data[i + 2];

    result[tokenAddress] = {
      decimals: Number(ethers.toBigInt(decimals).valueOf()),
      symbol: erc20Interface.decodeFunctionResult("symbol", symbol).toString(),
      name: erc20Interface.decodeFunctionResult("name", name).toString(),
    };
  }

  return result;
}
