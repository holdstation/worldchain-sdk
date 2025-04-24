# @holdstation/worldchain-sdk

A JavaScript/TypeScript SDK for interacting with the WorldChain ecosystem. This SDK provides tools and utilities to simplify development with WorldChain, including quoting token swaps on-chain.

---

## Installation

Install the SDK using npm or yarn:

```bash
npm install @holdstation/worldchain-sdk

# or

yarn add @holdstation/worldchain-sdk
```

---

## Vite Users

`@holdstation/worldchain-sdk` uses `node-cache` for compatibility with `@uniswap/smart-order-router`. You may need polyfills for Vite projects.  
Update your `vite.config.ts` as follows:

```ts
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vite.dev/config/
export default defineConfig({
  define: {
    "process.env": process.env,
  },
  plugins: [react(), nodePolyfills()],
  resolve: {
    alias: {
      jsbi: path.resolve(__dirname, "node_modules/jsbi/dist/jsbi-cjs.js"),
    },
  },
  // Rest of your config
});
```

---

## Usage

### Quoter: Get On-Chain Quotes

#### Simple Quote

Returns the best price for a direct swap between two tokens using Uniswap V3 pools.

```typescript
import { ethers } from "ethers";
import { Quoter } from "@holdstation/worldchain-sdk";

const provider = new ethers.providers.StaticJsonRpcProvider("<YOUR_RPC_URL>", {
  chainId: 480,
  name: "worldchain",
});
const quoter = new Quoter(provider);

const WETH = "0x4200000000000000000000000000000000000006";
const USDCe = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1";

const result = await quoter.simple(WETH, USDCe);

console.log("Best rate:", result.best); // e.g., ~1797
console.log("All routes:", result.all);
```

#### Smart Quote

Finds the best route and price using Uniswap's smart order router (may be slower).

By default, the rate is quoted via **USDC.e** as the stable token.  
You can easily change the stable token to any other token address by passing the `stableToken` option to the `Quoter` constructor:

```typescript
const quoter = new Quoter(provider, {
  stableToken: "0xYourPreferredStableTokenAddress",
});
```

This allows you to get quotes against any stable token or asset you prefer, not just USDC.e.

Example usage:

```typescript
const result = await quoter.smart(WETH, {
  slippage: 3, // percent
  deadline: 10, // seconds
});

console.log("Best smart route:", result.best); // e.g., ~1797
console.log("Raw swap object:", result.raw);
```

---

## Usage

### Sender: Send Token On-Chain

Send Native

Example usage:

```typescript
import { ethers } from "ethers";
import { Sender } from "@holdstation/worldchain-sdk";

const provider = new ethers.providers.StaticJsonRpcProvider("<YOUR_RPC_URL>", {
  chainId: 480,
  name: "worldchain",
});
const sender = new Sender(provider);
const amount = 0.1; // 0.1 ETH
const receiver = "0xAddress";
const result = await sender.send({ amount, to: receiver });
console.log("result:", result);
```

Send Erc20

Example usage:

```typescript
const tokenAddress = "0xTokenAddress";
const amount = 10; // 10 Tokens
const receiver = "0xAddress";
const result = await sender.send({ amount, token: tokenAddress, to: receiver });
console.
```

---

## Token

The `TokenProvider` class allows you to fetch token metadata, balances, and discover tokens held by a wallet.

### Setup

```typescript
import { ethers } from "ethers";
import { TokenProvider } from "@holdstation/worldchain-sdk";

const provider = new ethers.providers.JsonRpcProvider("<YOUR_RPC_URL>");
const tokenProvider = new TokenProvider({ provider });
```

### Get Token Details

Fetch metadata (decimals, symbol, name, etc.) for one or more tokens:

```typescript
const WETH = "0x4200000000000000000000000000000000000006";
const USDCe = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1";

const details = await tokenProvider.details(WETH, USDCe);

console.log(details[WETH]); // { address, chainId, decimals, symbol, name }
console.log(details[USDCe]); // { address, chainId, decimals, symbol, name }
```

### Get All Tokens Held by a Wallet

Find all token contract addresses that have sent tokens to a wallet (using Transfer logs):

```typescript
const wallet = "0x14a028cC500108307947dca4a1Aa35029FB66CE0";
const tokens = await tokenProvider.tokenOf(wallet);

console.log(tokens); // Array of token contract addresses
```

### Get Balances

#### Get Balances of Multiple Tokens for a Wallet

```typescript
const wallet = "0x14a028cC500108307947dca4a1Aa35029FB66CE0";
const WETH = "0x4200000000000000000000000000000000000006";
const USDCe = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1";
const WLD = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";

const balances = await tokenProvider.balanceOf({
  wallet,
  tokens: [WETH, USDCe, WLD],
});

console.log(balances[WETH]); // string balance of WETH
console.log(balances[USDCe]); // string balance of USDCe
console.log(balances[WLD]); // string balance of WLD
```

#### Get Balances of a Token for Multiple Wallets

```typescript
const WLD = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";
const holder1 = "0x14a028cC500108307947dca4a1Aa35029FB66CE0";
const holder2 = "0xc57B9e6f74d393504b7e43C09A6089aEc6f8D6d0";

const balances = await tokenProvider.balanceOf({
  token: WLD,
  wallets: [holder1, holder2],
});

console.log(balances[holder1]); // string balance of WLD for holder1
console.log(balances[holder2]); // string balance of WLD for holder2
```

---

## Testing

### Example Test Cases

#### Region: Simple Quote

```typescript
it("simple quote onchain - WETH -> USDCe", async () => {
  const result = await quoter.simple(WETH, USDCe);

  expect(result).toBeDefined();
  expect(result.best).toBeDefined();
  expect(Number(result.best)).toBeGreaterThan(1000);
  expect(Number(result.best)).toBeLessThan(2000);
});
```

#### Region: Smart Quote

```typescript
it("smart quote onchain - WETH -> USDCe", async () => {
  const result = await quoter.smart(WETH, {
    slippage: 3,
    deadline: 10,
  });

  expect(result).toBeDefined();
  expect(result.best).toBeDefined();
  expect(Number(result.best)).toBeGreaterThan(1000);
  expect(Number(result.best)).toBeLessThan(2000);
}, 30_000);
```

#### Region: TokenProvider

```typescript
it("get balance of multiple token onchain", async () => {
  const target = "0x14a028cC500108307947dca4a1Aa35029FB66CE0";
  const WETH = "0x4200000000000000000000000000000000000006";
  const USDCe = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1";
  const WLD = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";

  const balance = await tokenProvider.balanceOf({
    wallet: target,
    tokens: [WETH, USDCe, WLD],
  });

  expect(balance).toBeDefined();
  expect(balance[WETH]).toBeDefined();
  expect(balance[USDCe]).toBeDefined();
  expect(balance[WLD]).toBeDefined();
});

it("get balance of multiple token onchain with multicall", async () => {
  const holder1 = "0x14a028cC500108307947dca4a1Aa35029FB66CE0";
  const holder2 = "0xc57B9e6f74d393504b7e43C09A6089aEc6f8D6d0";
  const WLD = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";

  const balance = await tokenProvider.balanceOf({
    token: WLD,
    wallets: [holder1, holder2],
  });

  expect(balance).toBeDefined();
  expect(balance[holder1]).toBeDefined();
  expect(balance[holder2]).toBeDefined();
});
```

---

## License

MIT
