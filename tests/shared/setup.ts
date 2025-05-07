import { AbiCodec, Client, Multicall3 } from "@holdstation/worldchain-sdk";

export interface TestProvider {
  name: string;
  getClient: () => Client;
  getMulticall3: () => Multicall3;
  getAbiCodec: (abi: any) => AbiCodec;
}
