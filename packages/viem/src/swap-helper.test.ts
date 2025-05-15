import {
  config,
  inmemoryTokenStorage,
  SwapHelper,
  SwapParams,
  Swapper,
  TokenProvider,
  ZeroX,
} from '@holdstation/worldchain-sdk'
import { worldchain } from 'viem/chains'
import { Multicall3 } from '.'

import { createPublicClient, http, PublicClient } from 'viem'
import { ViemClient } from './client'

describe('SwapHelper - quote', () => {
  let swapHelper: Swapper

  beforeEach(() => {
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
    config.client = client
    config.multicall3 = new Multicall3(publicClient as PublicClient)
    swapHelper = new SwapHelper(client, {
      tokenStorage: inmemoryTokenStorage,
    })

    const tokenProvider = new TokenProvider({ client, multicall3: config.multicall3 })
    const zeroX = new ZeroX(tokenProvider, inmemoryTokenStorage)

    swapHelper.load(zeroX)
  })

  // Helper function to validate quote result
  const validateQuoteResult = (result: SwapParams['quoteOutput']) => {
    expect(result).toBeDefined()

    // Check the core transaction properties
    expect(result.data).toBeDefined()
    expect(result.to).toBeDefined()

    // Check the addons object that contains swap details
    expect(result.addons).toBeDefined()

    // Validate the swap details in the addons object
    const addons = result.addons
    expect(addons?.outAmount).toBeDefined()
    expect(Number(addons?.outAmount)).toBeGreaterThan(0) // Ensure output amount is greater than 0
    expect(addons?.rateSwap).toBeDefined()
    expect(Number(addons?.rateSwap)).toBeGreaterThan(0) // Ensure swap rate is valid
    expect(addons?.amountOutUsd).toBeDefined()
    expect(Number(addons?.amountOutUsd)).toBeGreaterThanOrEqual(0) // Ensure output amount in USD is valid
    expect(addons?.minReceived).toBeDefined()
    expect(Number(addons?.minReceived)).toBeLessThanOrEqual(Number(addons?.outAmount)) // Ensure minReceived is <= outAmount
    expect(addons?.feeAmountOut).toBeDefined()
    expect(Number(addons?.feeAmountOut)).toBeGreaterThanOrEqual(0) // Ensure fee amount is non-negative
  }

  it('should return the correct estimated swap response 0x', async () => {
    const params: SwapParams['quoteInput'] = {
      tokenIn: '0xb0505e5a99abd03d94a1169e638b78edfed26ea4',
      tokenOut: '0x4200000000000000000000000000000000000006',
      amountIn: '1',
      slippage: '0.3',
      fee: '0',
      preferRouters: ['0x'],
    }

    const result = await swapHelper.estimate.quote(params)
    validateQuoteResult(result)
  }, 30000)

  it('should return the correct estimated swap response ETH', async () => {
    const params: SwapParams['quoteInput'] = {
      tokenIn: '0xb0505e5a99abd03d94a1169e638b78edfed26ea4',
      tokenOut: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Native ETH
      amountIn: '1',
      slippage: '0.3',
      fee: '0',
      preferRouters: ['0x'],
    }

    const result = await swapHelper.estimate.quote(params)
    validateQuoteResult(result)
  }, 30000)

  it('should return the correct estimated swap response with token pairs', async () => {
    const params: SwapParams['quoteInput'] = {
      tokenIn: '0x2cFc85d8E48F8EAB294be644d9E25C3030863003', // Token A
      tokenOut: '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1', // Token B
      amountIn: '100',
      slippage: '0.3',
      fee: '0',
      preferRouters: ['0x'],
    }

    const result = await swapHelper.estimate.quote(params)
    validateQuoteResult(result)
  }, 30000)

  it('should return the correct estimated swap response with stablecoin', async () => {
    const params: SwapParams['quoteInput'] = {
      tokenIn: '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1', // Stablecoin
      tokenOut: '0x4200000000000000000000000000000000000006', // WETH
      amountIn: '2',
      slippage: '0.3',
      fee: '0.2',
      preferRouters: ['0x'],
    }

    const result = await swapHelper.estimate.quote(params)
    validateQuoteResult(result)
  }, 30000)
})
