import { Aggregate, Aggregate3, Multicall3, abi, config } from "@holdstation/worldchain-sdk";
import { ethers } from "ethers";

export class EthersMulticall3 implements Multicall3 {
  private readonly contract: ethers.Contract;

  constructor(provider: ethers.JsonRpcProvider) {
    this.contract = new ethers.Contract(config.multicall3Address, abi.MULTICALL3_JSONABI, provider);
  }

  async aggregate(calls: Aggregate["request"][]): Promise<Aggregate["response"]> {
    const [block, data] = await this.contract.aggregate(calls);
    return [Number(block), data];
  }

  async aggregate3(calls: Aggregate3["request"][]): Promise<Aggregate3["response"][]> {
    // Multicall3.aggregate3 only returns the results array, not a block number
    const results = await this.contract.aggregate3(calls);

    return results.map((item: any) => {
      return {
        returnData: item.returnData,
        success: item.success,
      };
    });
  }
}
