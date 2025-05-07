import { BigNumber } from "bignumber.js";
import { ERC20_ABI } from "../abi";
import { Client } from "../client";
import { config } from "../config";
import { Aggregate, Multicall3 } from "../multicall";
import { Token, TokenStorage, inmemoryTokenStorage } from "../storage";

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
  private readonly client: Client;
  private readonly multicall3: Multicall3;
  private readonly storage: TokenStorage;

  constructor(params?: Partial<{ client: Client; multicall3: Multicall3; storage: TokenStorage }>) {
    this.storage = params?.storage ?? inmemoryTokenStorage;
    this.multicall3 = params?.multicall3 ?? config.multicall3;
    this.client = params?.client ?? config.client;
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

    const calls: Aggregate["request"][] = [];

    for (const tokenAddress of missingTokens) {
      if (!this.client.isValidAddress(tokenAddress)) {
        throw new Error(`Invalid token address: ${tokenAddress}`);
      }

      calls.push(
        {
          target: tokenAddress,
          callData: this.client.codec(ERC20_ABI).encodeFunctionData("decimals"),
        },
        {
          target: tokenAddress,
          callData: this.client.codec(ERC20_ABI).encodeFunctionData("symbol"),
        },
        {
          target: tokenAddress,
          callData: this.client.codec(ERC20_ABI).encodeFunctionData("name"),
        }
      );
    }

    const dmm = await this.multicall3.aggregate(calls);
    const [_, data] = dmm;

    for (let i = 0; i < data.length; i += 3) {
      const tokenAddress = missingTokens[i / 3];
      const decimals = data[i];
      const symbol = data[i + 1];
      const name = data[i + 2];

      result[tokenAddress] = {
        address: tokenAddress,
        chainId: this.client.getChainId(),
        decimals: new BigNumber(decimals).toNumber(),
        symbol: this.client.codec(ERC20_ABI).decodeFunctionResult("symbol", symbol).toString(),
        name: this.client.codec(ERC20_ABI).decodeFunctionResult("name", name).toString(),
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
    const latestBlock = await this.client.getBlockNumber();

    const toBlock = options?.toBlock ?? latestBlock;
    const fromBlock = options?.fromBlock ?? toBlock - 10 * blockPerRequest;

    const chunked: number[][] = [];
    for (let i = fromBlock; i <= toBlock; i += blockPerRequest) {
      const end = Math.min(i + blockPerRequest - 1, toBlock);
      chunked.push([i, end]);
    }

    const tokenList = await Promise.all(
      chunked.map(async ([startBlock, endBlock]) => {
        const logs = await this.client.getLogs({
          // topics: [[TRANSFER_TOPIC], [], [ethers.utils.hexZeroPad(wallet, 32)]],
          topics: [[TRANSFER_TOPIC], [], [wallet]],
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
    const calls: Aggregate["request"][] = [];
    for (const token of tokens) {
      if (!this.client.isValidAddress(token)) {
        throw new Error(`Invalid token address: ${token}`);
      }

      calls.push({
        target: token,
        callData: this.client.codec(ERC20_ABI).encodeFunctionData("balanceOf", [wallet]),
      });
    }

    const [_, data] = await this.multicall3.aggregate(calls);

    const result: Record<string, string> = {};

    for (let i = 0; i < data.length; i++) {
      const token = tokens[i];
      const balance = data[i];
      result[token] = this.client.codec(ERC20_ABI).decodeFunctionResult("balanceOf", balance).toString();
    }

    return result;
  }

  private async balanceOfTokenWallets({ token, wallets }: BalanceOfTokenWallets) {
    const calls: Aggregate["request"][] = [];

    for (const wallet of wallets) {
      if (!this.client.isValidAddress(wallet)) {
        throw new Error(`Invalid wallet address: ${wallet}`);
      }

      calls.push({
        target: token,
        callData: this.client.codec(ERC20_ABI).encodeFunctionData("balanceOf", [wallet]),
      });
    }

    const [_, data] = await this.multicall3.aggregate(calls);

    const result: Record<string, string> = {};
    for (let i = 0; i < data.length; i++) {
      const wallet = wallets[i];
      const balance = data[i];
      result[wallet] = this.client.codec(ERC20_ABI).decodeFunctionResult("balanceOf", balance).toString();
    }

    return result;
  }
}
