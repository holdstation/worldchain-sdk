import { config, TokenProvider } from "@holdstation/worldchain-sdk";
import { Client, Multicall3 } from "@holdstation/worldchain-viem";
import { createPublicClient, http, type PublicClient } from "viem";
import { worldchain } from "viem/chains";

const RPC_URL = "https://worldchain-mainnet.g.alchemy.com/public";
const publicClient = createPublicClient({
  chain: worldchain,
  transport: http(RPC_URL),
  batch: {
    multicall: true, // Enable multicall batching
  },
  cacheTime: 300000, // Set cache time in milliseconds
});

config.client = new Client(publicClient as PublicClient);
config.multicall3 = new Multicall3(publicClient as PublicClient);

async function getTokenInfo() {
  const tokenProvider = new TokenProvider();

  // Alternative
  // const tokenProvider = new TokenProvider({
  //   client: config.client,
  //   multicall3: config.multicall3,
  //   storage: inmemoryTokenStorage
  // })

  const tokens = await tokenProvider.details(
    "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1",
    "0xEd10C200aFc35AF91A45E8BE53cd5a299F93F32F",
    "0xdCe053d9ba0Fa2c5f772416b64F191158Cbcc32E"
  );

  console.log("Token Info:", tokens);
}

getTokenInfo()
  .then(() => console.log("Token info fetched successfully."))
  .catch((error) => console.error("Error fetching token info:", error));
