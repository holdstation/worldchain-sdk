import { Client, Multicall3, Quoter, SwapHelper, SwapParams } from "@holdstation/worldchain-ethers-v5";
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
    "0xdCe053d9ba0Fa2c5f772416b64F191158Cbcc32E"
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
const quoter = new Quoter(client);
async function getSimpleQuote() {
  const WETH = "0x4200000000000000000000000000000000000006";
  const USDCe = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1";
  const quote = await quoter.simple(WETH, USDCe);

  console.log("Quote:", quote.best);
}

getSimpleQuote()
  .then(() => console.log("Quote fetched successfully."))
  .catch((error) => console.error("Error fetching quote:", error));

async function getSmartQuote() {
  const WETH = "0x4200000000000000000000000000000000000006";
  const quote = await quoter.smart(WETH, {
    slippage: 3,
    deadline: 10,
  });

  console.log("Quote:", quote.quote);
}

getSmartQuote()
  .then(() => console.log("Quote fetched successfully."))
  .catch((error) => console.error("Error fetching quote:", error));

// Swap exmaple
const swapHelper = new SwapHelper(client);

async function estimateSwap() {
  const params: SwapParams = {
    from: "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1",
    to: "0x4200000000000000000000000000000000000006",
    amount: "2",
    slippage: 0.3,
    fee: 0.2,
  };

  // Call the function
  const result = await swapHelper.quote(params);
  console.log("Swap estimate result:", result);
}

estimateSwap()
  .then(() => console.log("Swap estimate fetched successfully."))
  .catch((error) => console.error("Error fetching swap estimate:", error));

async function swap() {
  const params: SwapParams = {
    from: "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1",
    to: "0x4200000000000000000000000000000000000006",
    amount: "2",
    slippage: 0.3,
    fee: 0.2,
  };

  // Call the function
  const quoteResponse = await swapHelper.quote(params);
  const result = await swapHelper.swap(params, quoteResponse);
  console.log("Swap result:", result);
}

swap()
  .then(() => console.log("Swap executed successfully."))
  .catch((error) => console.error("Error executing swap:", error));
