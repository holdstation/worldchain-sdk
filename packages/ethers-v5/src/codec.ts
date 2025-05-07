import { AbiCodec } from "@holdstation/worldchain-sdk";
import { ethers } from "ethers";

export class EthersCodec implements AbiCodec {
  private iface: ethers.utils.Interface;

  constructor(abi: any[]) {
    this.iface = new ethers.utils.Interface(abi);
  }

  encodeFunctionData(fnName: string, args: unknown[] = []): string {
    return this.iface.encodeFunctionData(fnName, args);
  }

  decodeFunctionResult(fnName: string, data: string) {
    return this.iface.decodeFunctionResult(fnName, data);
  }
}
