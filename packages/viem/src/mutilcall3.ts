import { Aggregate, Aggregate3, Multicall3, abi, config } from '@holdstation/worldchain-sdk'
import { type PublicClient } from 'viem'

export class ViemMulticall3 implements Multicall3 {
  private readonly address: `0x${string}`

  constructor(private publicClient: PublicClient) {
    this.address = config.multicall3Address as `0x${string}`
  }

  async aggregate(calls: Aggregate['request'][]): Promise<Aggregate['response']> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: abi.MULTICALL3_JSONABI,
      functionName: 'aggregate',
      args: [calls],
    })

    // Cast the result to the expected tuple type
    const resultArray = result as [bigint, string[]]
    const blockNumber = Number(resultArray[0])
    const returnStructs = resultArray[1]

    return [blockNumber, returnStructs]
  }

  async aggregate3(calls: Aggregate3['request'][]): Promise<Aggregate3['response'][]> {
    const results = (await this.publicClient.readContract({
      address: this.address,
      abi: abi.MULTICALL3_JSONABI,
      functionName: 'aggregate3',
      args: [calls],
    })) as { success: boolean; returnData: string }[]

    return results.map((item) => ({
      blockNumber: 0n, // No block number from aggregate3
      returnData: item.returnData,
      success: item.success,
      error: item.success ? undefined : 'Call failed',
    }))
  }
}
