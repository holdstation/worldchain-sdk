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

const provider = new ethers.providers.StaticJsonRpcProvider("https://worldchain-mainnet.g.alchemy.com/public", {
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

```typescript
const result = await quoter.smart(WETH, {
  slippage: 3,    // percent
  deadline: 10,   // seconds
});

console.log("Best smart route:", result.best); // e.g., ~1797
console.log("Raw swap object:", result.raw);
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

---

## License

MIT