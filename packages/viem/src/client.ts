import { AbiCodec, Client, FilterLogs, logger, OnchainTransaction, Result } from '@holdstation/worldchain-sdk'
import type { PublicClient } from 'viem'
import {
  parseAbi,
  decodeFunctionResult as viemDecodeFunctionResult,
  encodeFunctionData as viemEncodeFunctionData,
} from 'viem'
import { isAddress } from 'viem/utils'
import { ViemCodec } from './codec'

export class ViemClient implements Client {
  private _chainId: number = 0

  constructor(private publicClient: PublicClient) {
    this.publicClient
      .getChainId()
      .then((chainId) => (this._chainId = chainId))
      .catch((error) => logger.error('Error getting chain ID:', error))
  }

  codec(abi: any): AbiCodec {
    return new ViemCodec(abi)
  }

  name(): string {
    return 'ViemClient'
  }

  isValidAddress(address: string): boolean {
    return isAddress(address)
  }

  hexZeroPad(value: string, length: number): string {
    if (value.length > length) {
      throw new Error(`Value length exceeds the specified length of ${length}`)
    }
    return value.padStart(length, '0')
  }

  async getBlockNumber() {
    const block = await this.publicClient.getBlock({ blockTag: 'latest' })
    return Number(block.number)
  }

  getChainId() {
    return this._chainId
  }

  getLogs(filter: Partial<FilterLogs['request']>): Promise<FilterLogs['response'][]> {
    throw new Error('Method not implemented.')
  }

  async getTransaction(hash: string): Promise<OnchainTransaction> {
    const tx = await this.publicClient.getTransaction({
      hash: hash as `0x${string}`,
    })

    if (!tx) {
      throw new Error(`Transaction with hash ${hash} not found`)
    }

    return {
      hash: tx.hash,
      to: tx.to ?? undefined,
      from: tx.from,
      nonce: tx.nonce,
      gasLimit: tx.gas.toString(),
      gasPrice: tx.gasPrice?.toString(),
      data: '',
      value: tx.value.toString(),
      blockNumber: Number(tx.blockNumber),
      blockHash: tx.blockHash,
      timestamp: undefined,
    }
  }

  encodeFunctionData(abi: string[], functionFragment: string, values?: any[]): string {
    const parsedAbi = parseAbi(abi)

    const encodedData = viemEncodeFunctionData({
      abi: parsedAbi,
      functionName: functionFragment,
      args: values ?? [],
    })

    return encodedData.toString()
  }

  decodeFunctionResult(abiFragments: string[], method: string, data: string): Result {
    const abi = parseAbi(abiFragments)

    const result = viemDecodeFunctionResult({
      abi,
      functionName: method,
      data: data as `0x${string}`,
    })

    if (result === undefined) {
      throw new Error(`Failed to decode function result for method: ${method}`)
    }

    // Normalize result into your Result shape
    const output: Result = Array.isArray(result) ? Object.assign([...result], result) : Object.assign([], { 0: result })

    return output
  }
}
