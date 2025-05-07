import { ethers } from "ethers";
import { TestProvider, constants, runAllTests } from "../../../tests/shared";
import { Client, Codec, Multicall3 } from "../src";

class TestSuiteProvider implements TestProvider {
  private provider = new ethers.JsonRpcProvider(constants.JSONRPC, {
    chainId: 480,
    name: "worldchain",
  });

  name: "ethers-v6";

  getClient() {
    return new Client(this.provider);
  }

  getMulticall3() {
    return new Multicall3(this.provider);
  }

  getAbiCodec(abi: any) {
    return new Codec(abi);
  }
}

runAllTests(new TestSuiteProvider());
