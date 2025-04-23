import { ethers } from "ethers";
import { erc20 } from "../abi/erc20";
import { MULTICALL3_ABI } from "../abi/multicall3";
import { config } from "../config";
import { MulticallRequest } from "../multicall/types";
import { Token, TokenStorage } from "../storage";
import { inmemoryTokenStorage } from "../storage/token.storage.inmemory";

// Transfer event topic (keccak256 hash of Transfer(address,address,uint256))
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

type BalanceOfWalletTokens = {
  wallet: string;
  tokens: string[];
};

type BalanceOfTokenWallets = {
  token: string;
  wallets: string[];
};

export class TokenProvider {
  private readonly provider: ethers.providers.JsonRpcProvider;
  private readonly multicall3: ethers.Contract;
  private readonly storage: TokenStorage;

  constructor(params: {
    provider: ethers.providers.JsonRpcProvider;
    multicall3?: ethers.Contract;
    storage?: TokenStorage;
  }) {
    this.provider = params.provider;
    this.multicall3 = params.multicall3 || new ethers.Contract(config.multicall3Address, MULTICALL3_ABI, this.provider);
    this.storage = params.storage ?? inmemoryTokenStorage;
  }

  async details(...tokenAddresses: string[]) {
    const result: Record<string, Token> = {};

    const cachedTokens = await this.storage.find(tokenAddresses);
    for (const token of cachedTokens) {
      result[token.address] = token;
    }

    const missingTokens = tokenAddresses.filter((address) => !result[address]);
    if (missingTokens.length === 0) {
      return result;
    }

    const calls: MulticallRequest[] = [];

    for (const tokenAddress of missingTokens) {
      if (!ethers.utils.isAddress(tokenAddress)) {
        throw new Error(`Invalid token address: ${tokenAddress}`);
      }

      calls.push(
        {
          target: tokenAddress,
          callData: erc20.encodeFunctionData("decimals"),
        },
        {
          target: tokenAddress,
          callData: erc20.encodeFunctionData("symbol"),
        },
        {
          target: tokenAddress,
          callData: erc20.encodeFunctionData("name"),
        }
      );
    }

    const [_, data] = await this.multicall3.aggregate(calls);

    for (let i = 0; i < data.length; i += 3) {
      const tokenAddress = missingTokens[i / 3];
      const decimals = data[i];
      const symbol = data[i + 1];
      const name = data[i + 2];

      result[tokenAddress] = {
        address: tokenAddress,
        chainId: this.provider.network.chainId,
        decimals: Number(decimals.toString()),
        symbol: erc20.decodeFunctionResult("symbol", symbol).toString(),
        name: erc20.decodeFunctionResult("name", name).toString(),
      };
    }

    // save to storage
    await Promise.all(Object.keys(result).map((tokenAddress) => this.storage.save(result[tokenAddress])));

    return result;
  }

  async tokenOf(
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
          topics: [[TRANSFER_TOPIC], [], [ethers.utils.hexZeroPad(wallet, 32)]],
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

  async balanceOf(params: BalanceOfTokenWallets | BalanceOfWalletTokens) {
    if ("token" in params && Array.isArray(params.wallets)) {
      return this.balanceOfTokenWallets(params);
    }

    if ("wallet" in params && Array.isArray(params.tokens)) {
      return this.balanceOfWalletTokens(params);
    }

    throw new Error("Invalid parameters for balanceOf");
  }

  private async balanceOfWalletTokens({ wallet, tokens }: BalanceOfWalletTokens) {
    const calls: MulticallRequest[] = [];
    for (const token of tokens) {
      if (!ethers.utils.isAddress(token)) {
        throw new Error(`Invalid token address: ${token}`);
      }

      calls.push({
        target: token,
        callData: erc20.encodeFunctionData("balanceOf", [wallet]),
      });
    }

    const [_, data] = await this.multicall3.aggregate(calls);

    const result: Record<string, string> = {};

    for (let i = 0; i < data.length; i++) {
      const token = tokens[i];
      const balance = data[i];
      result[token] = erc20.decodeFunctionResult("balanceOf", balance).toString();
    }

    return result;
  }

  private async balanceOfTokenWallets({ token, wallets }: BalanceOfTokenWallets) {
    const calls: MulticallRequest[] = [];

    for (const wallet of wallets) {
      if (!ethers.utils.isAddress(wallet)) {
        throw new Error(`Invalid wallet address: ${wallet}`);
      }

      calls.push({
        target: token,
        callData: erc20.encodeFunctionData("balanceOf", [wallet]),
      });
    }

    const [_, data] = await this.multicall3.aggregate(calls);

    const result: Record<string, string> = {};
    for (let i = 0; i < data.length; i++) {
      const wallet = wallets[i];
      const balance = data[i];
      result[wallet] = erc20.decodeFunctionResult("balanceOf", balance).toString();
    }

    return result;
  }
}
