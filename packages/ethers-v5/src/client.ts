import { AbiCodec, Client, FilterLogs, logger, OnchainTransaction, Result } from "@holdstation/worldchain-sdk";
import { ethers } from "ethers";
import { EthersCodec } from "./codec";

export class EthersClient implements Client {
  private _chainId: number = 0;

  constructor(private readonly provider: ethers.providers.JsonRpcProvider) {
    if (!provider.network.chainId) {
      logger.warn("ChainId is not set, please set it by using `ethers.providers.StaticJsonRpcProvider`");

      this.provider
        .getNetwork()
        .then((n) => (this._chainId = n.chainId))
        .catch((e) => logger.error("Error getting chainId", e));
    } else {
      this._chainId = provider.network.chainId;
    }
  }

  name(): string {
    return "ethers-client";
  }

  isValidAddress(address: string): boolean {
    return ethers.utils.isAddress(address);
  }

  hexZeroPad(value: string, length: number): string {
    return ethers.utils.hexZeroPad(value, length);
  }

  async getBlockNumber() {
    return this.provider.getBlockNumber();
  }

  getChainId() {
    return this._chainId;
  }

  getProvider() {
    return this.provider;
  }

  async getLogs(filter: Partial<FilterLogs["request"]>): Promise<FilterLogs["response"][]> {
    return await this.provider.getLogs(filter);
  }

  async getTransaction(hash: string): Promise<OnchainTransaction> {
    const tx = await this.provider.getTransaction(hash);

    return {
      hash: tx.hash,
      to: tx.to,
      from: tx.from,
      nonce: tx.nonce,
      gasLimit: tx.gasLimit.toString(),
      gasPrice: tx.gasPrice?.toString(),
      data: tx.data,
      value: tx.value.toString(),
      blockNumber: tx.blockNumber,
      blockHash: tx.blockHash,
      timestamp: tx.timestamp,
    };
  }

  encodeFunctionData(abi: string[], method: string, values?: any[]): string {
    const iface = new ethers.utils.Interface(abi);
    return iface.encodeFunctionData(method, values);
  }

  decodeFunctionResult(abi: string[], method: string, data: string): Result {
    const iface = new ethers.utils.Interface(abi);
    return iface.decodeFunctionResult(method, data);
  }

  codec(abi: any): AbiCodec {
    // TODO: cached codec
    return new EthersCodec(abi);
  }
}
