import { ethers } from "ethers";

class Config {
  jsonrpc: string;
  multicall3Address: string;

  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.jsonrpc = "https://worldchain-mainnet.g.alchemy.com/public";
    this.multicall3Address = "0xcA11bde05977b3631167028862bE2a173976CA11";
    this.provider = new ethers.JsonRpcProvider(this.jsonrpc);
  }

  getProvider() {
    return this.provider;
  }

  setProvider = async (jsonrpc: string) => {
    const newprovider = new ethers.JsonRpcProvider(jsonrpc);
    const chainId = await newprovider.getNetwork();

    console.debug(`Switching provider to: ${jsonrpc} - ${chainId}`);

    this.jsonrpc = jsonrpc;
  };
}

export const config = new Config();
