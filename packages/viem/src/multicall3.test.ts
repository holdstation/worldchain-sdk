import { Aggregate, ERC20_ABI } from '@holdstation/worldchain-sdk'
import { createPublicClient, http, type PublicClient } from 'viem'
import { worldchain } from 'viem/chains'
import { ViemClient } from './client'
import { ViemMulticall3 } from './mutilcall3'

describe('viem/multicall3', () => {
  const RPC_URL = 'https://worldchain-mainnet.g.alchemy.com/public'

  const publicClient = createPublicClient({
    chain: worldchain,
    transport: http(RPC_URL),
    batch: {
      multicall: true, // Enable multicall batching
    },
    cacheTime: 300000, // Set cache time in milliseconds
  })

  const client = new ViemClient(publicClient as PublicClient)

  it('call balance on chain', async () => {
    const multicall = new ViemMulticall3(publicClient as PublicClient)

    const calls: Aggregate['request'][] = [
      {
        target: '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1',
        callData: client
          .codec(ERC20_ABI)
          .encodeFunctionData('balanceOf', ['0xEd10C200aFc35AF91A45E8BE53cd5a299F93F32F']),
      },
      {
        target: '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1',
        callData: client
          .codec(ERC20_ABI)
          .encodeFunctionData('balanceOf', ['0xdCe053d9ba0Fa2c5f772416b64F191158Cbcc32E']),
      },
    ]

    const result = await multicall.aggregate(calls)

    expect(result[0]).toBeGreaterThan(0)
    expect(result[1].length).toBe(2)
  })
})
