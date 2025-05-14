import { AbiCodec, Client, FilterLogs, logger, OnchainTransaction, Result } from "@holdstation/worldchain-sdk";
import { ethers } from "ethers";
import { EthersCodec } from "./codec";

export class EthersClient implements Client {
  private _chainId: number = 0;

  constructor(private readonly provider: ethers.JsonRpcProvider) {
    if (!provider?._network?.chainId) {
      logger.warn("ChainId is not set, please set it by using `ethers.JsonRpcProvider`");

      this.provider
        .getNetwork()
        .then((n) => (this._chainId = Number(n.chainId)))
        .catch((e) => logger.error("Error getting chainId", e));
    } else {
      this._chainId = Number(provider._network.chainId);
    }
  }

  name(): string {
    return "ethers-client";
  }

  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  hexZeroPad(value: string, length: number): string {
    // In ethers v6, hexZeroPad is now in the ethers.zeroPadValue function
    // The signature has changed to take a BytesLike and return a "0x"-prefixed string
    let hexValue = value;

    // Make sure the value has '0x' prefix
    if (!hexValue.startsWith("0x")) {
      hexValue = "0x" + hexValue;
    }

    return ethers.zeroPadValue(value, length);
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
    const logs = await this.provider.getLogs(filter);

    return logs.map((log) => ({
      blockNumber: log.blockNumber,
      blockHash: log.blockHash,
      transactionIndex: log.transactionIndex,
      removed: log.removed,
      address: log.address,
      data: log.data,

      // ya, this a bit weird, but ethers v6 has a new type for topics
      // which is `Array<string | null>`, but we need to convert it to `Array<string>`
      // so we need map it to string
      topics: log.topics.map((o) => o.toString()),

      transactionHash: log.transactionHash,
      logIndex: log.index,
    }));
  }

  async getTransaction(hash: string): Promise<OnchainTransaction> {
    const tx = await this.provider.getTransaction(hash);
    if (!tx) {
      throw new Error(`Transaction with hash ${hash} not found`);
    }

    return {
      hash: tx.hash,
      to: tx.to ?? undefined,
      from: tx.from,
      nonce: tx.nonce,
      gasLimit: tx.gasLimit.toString(),
      gasPrice: tx.gasPrice?.toString(),
      data: tx.data,
      value: tx.value.toString(),
      blockNumber: tx.blockNumber ?? undefined,
      blockHash: tx.blockHash ?? undefined,
      timestamp: undefined,
    };
  }

  encodeFunctionData(abi: string[], method: string, values?: any[]): string {
    const iface = new ethers.Interface(abi);
    return iface.encodeFunctionData(method, values);
  }

  decodeFunctionResult(abi: string[], method: string, data: string): Result {
    const iface = new ethers.Interface(abi);
    return iface.decodeFunctionResult(method, data);
  }

  codec(abi: any): AbiCodec {
    // TODO: cached codec
    return new EthersCodec(abi);
  }
}
