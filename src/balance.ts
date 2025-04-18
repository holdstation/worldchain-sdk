import { ethers } from "ethers";
import { ERC20_ABI } from "./abi/erc20";
import { MULTICALL3_ABI } from "./abi/multicall3";
import { config } from "./config";

export const erc20Interface = new ethers.utils.Interface(ERC20_ABI);

export type MulticallRequest = {
  target: string;
  callData: string;
};

type MulticallBalanceResponse = {
  balance: string;
  decimals: number;
  symbol: string;
  name: string;
};

export async function balanceOf(
  wallet: string,
  ...tokenAddresses: string[]
): Promise<Record<string, MulticallBalanceResponse>> {
  const multicallContract = new ethers.Contract(
    config.multicall3Address,
    MULTICALL3_ABI,
    config.getProvider()
  );

  const calls: MulticallRequest[] = [];

  for (const tokenAddress of tokenAddresses) {
    if (!ethers.utils.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    calls.push(
      {
        target: tokenAddress,
        callData: erc20Interface.encodeFunctionData("balanceOf", [wallet]),
      },
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

  const result: Record<string, MulticallBalanceResponse> = {};

  for (let i = 0; i < data.length; i += 4) {
    const tokenAddress = tokenAddresses[i / 4];
    const balance = data[i];
    const decimals = data[i + 1];
    const symbol = data[i + 2];
    const name = data[i + 3];

    result[tokenAddress] = {
      balance: balance.toString(),
      decimals: Number(decimals.toString()),
      symbol: erc20Interface.decodeFunctionResult("symbol", symbol).toString(),
      name: erc20Interface.decodeFunctionResult("name", name).toString(),
    };
  }

  return result;
}
