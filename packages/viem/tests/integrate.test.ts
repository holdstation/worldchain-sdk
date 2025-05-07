import { createPublicClient, http, PublicClient } from 'viem'
import { worldchain } from 'viem/chains'
import { constants, runAllTests, TestProvider } from '../../../tests/shared'
import { Client, Codec, Multicall3 } from '../src'

class TestSuiteProvider implements TestProvider {
  private pubclient = createPublicClient({
    chain: worldchain,
    transport: http(constants.JSONRPC),
    batch: {
      multicall: true, // Enable multicall batching
    },
    cacheTime: 300000, // Set cache time in milliseconds
  })
  name: 'ethers-v5'

  getClient() {
    return new Client(this.pubclient as PublicClient)
  }

  getMulticall3() {
    return new Multicall3(this.pubclient as PublicClient)
  }

  getAbiCodec(abi: any) {
    return new Codec(abi)
  }
}

runAllTests(new TestSuiteProvider())
