import { Client, Multicall3 } from "@holdstation/worldchain-ethers-v5";
import { TokenProvider, config } from "@holdstation/worldchain-sdk";
import { ethers } from "ethers";

const RPC_URL = "https://worldchain-mainnet.g.alchemy.com/public";
const provider = new ethers.providers.StaticJsonRpcProvider(RPC_URL, {
  chainId: 480,
  name: "worldchain",
});

const client = new Client(provider);
config.client = client;
config.multicall3 = new Multicall3(provider);

const tokenProvider = new TokenProvider();

// Alternative
// const tokenProvider = new TokenProvider({
//   client: config.client,
//   multicall3: config.multicall3,
//   storage: inmemoryTokenStorage
// })

// Token example
async function getTokenDetail() {
  const tokens = await tokenProvider.details(
    "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1",
    "0xEd10C200aFc35AF91A45E8BE53cd5a299F93F32F",
    "0xdCe053d9ba0Fa2c5f772416b64F191158Cbcc32E",
  );

  console.log("Token Info:", tokens);
}
async function getTokenInfo() {
  const tokenInfo = await tokenProvider.details("0x79A02482A880bCE3F13e09Da970dC34db4CD24d1");

  console.log("Token Info:", tokenInfo);
}

getTokenInfo()
  .then(() => console.log("Token info fetched successfully."))
  .catch((error) => console.error("Error fetching token info:", error));

// Quoter example
