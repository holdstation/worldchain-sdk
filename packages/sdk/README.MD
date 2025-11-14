# Worldchain SDK

> 🔗 TypeScript-powered library for interacting with Worldchain blockchain with multiple provider options

[![NPM](https://img.shields.io/npm/v/@holdstation/worldchain-sdk.svg)](https://www.npmjs.com/package/@holdstation/worldchain-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🛠 **Multiple Provider Integration**: Choose between ethers.js v5/v6 or viem
- 🔄 **Unified API**: Same interface regardless of the underlying provider
- 📦 **Tree-shakable**: Import only what you need
- 🔒 **Type-safe**: Full TypeScript support with complete typings
- 🚀 **Multicall Support**: Batch multiple calls for efficient interactions
- 🧩 **Modular Design**: Core functionality is provider-agnostic

## Installation

```bash
# Core package only
npm install @holdstation/worldchain-sdk

# With ethers.js v5 support
npm install @holdstation/worldchain-ethers-v5 ethers@^5.0.0

# With ethers.js v6 support
npm install @holdstation/worldchain-ethers-v6 ethers@^6.0.0

# With viem support
npm install @holdstation/worldchain-viem viem
```

## Quick Start

### Using with ethers.js v5

```typescript
import { ethers } from "ethers";
import { Client, Multicall3 } from "@holdstation/worldchain-ethers-v5";
import { TokenProvider } from "@holdstation/worldchain-sdk";

// Initialize provider
const provider = new ethers.providers.JsonRpcProvider("RPC_URL");
const client = new Client(provider);
const multicall = new Multicall3(provider);

// Use the TokenProvider for token operations
const tokenProvider = new TokenProvider({ client, multicall });
const tokenInfo = await tokenProvider.details("0x123..."); // Get token details
```

### Using with viem

```typescript
import { createPublicClient, http } from "viem";
import { worldchain } from "viem/chains";
import { Client, Multicall3 } from "@holdstation/worldchain-viem";
import { TokenProvider } from "@holdstation/worldchain-sdk";

// Initialize provider
const publicClient = createPublicClient({
  chain: worldchain,
  transport: http("RPC_URL"),
});

const client = new Client(publicClient);
const multicall = new Multicall3(publicClient);

// Use the TokenProvider
const tokenProvider = new TokenProvider({ client, multicall });
const tokenInfo = await tokenProvider.details("0x123..."); // Get token details
```

## Packages

- `@holdstation/worldchain-sdk`: Core interfaces and utilities
- `@holdstation/worldchain-ethers-v5`: Integration with ethers.js v5
- `@holdstation/worldchain-ethers-v6`: Integration with ethers.js v6
- `@holdstation/worldchain-viem`: Integration with viem

## API Reference

### Client

```typescript
// Example with AbiCodec
const abi = ["function balanceOf(address) view returns (uint256)"];
const codec = client.codec(abi);
const data = codec.encodeFunctionData("balanceOf", ["0xAddress"]);
```

### Multicall3

```typescript
// Batch multiple calls
const calls = [
  {
    target: tokenAddress,
    callData: codec.encodeFunctionData("balanceOf", [userAddress]),
  },
  // More calls...
];

const [blockNumber, results] = await multicall.aggregate(calls);
```

### TokenProvider

```typescript
// Get token information
const token = await tokenProvider.details(tokenAddress);
console.log(token.name, token.symbol, token.decimals);

// Get token balance
const balance = await tokenProvider.balanceOf(tokenAddress, userAddress);
```

## Important: Setting Your Partner Code

> ⚠️ **REQUIRED**: You must set a partner code when using the SDK for swaps.

### How to Get a Partner Code

Contact the Holdstation team to get your unique partner code:

- Telegram: @HoldstationW_EN

### Setting Your Partner Code

Set your partner code as early as possible in your application:

```typescript
import { setPartnerCode } from "@holdstation/worldchain-sdk";

// Set your partner code at app initialization
setPartnerCode("YOUR_PARTNER_CODE"); // Replace with your actual code
```

If you don't set a partner code, you'll see warning messages in the console when using swap functionality.

### Additional Partner Code Options

#### Setting Per Transaction

You can also specify the partner code for individual swap transactions:

```typescript
import { SwapParams } from "@holdstation/worldchain-sdk";

// When making a swap
const swapInput: SwapParams["input"] = {
  tokenIn: "0x...",
  tokenOut: "0x...",
  amountIn: "1000000000000000000", // 1 token with 18 decimals
  partnerCode: "YOUR_PARTNER_CODE", // Set partner code here
  tx: {
    data: "0x...",
    to: "0x...",
    value: "0",
  },
};

const result = await swapper.swap(swapInput);
```

#### Checking Current Partner Code

You can check the currently set partner code:

```typescript
import { getPartnerCode } from "@holdstation/worldchain-sdk";

const currentCode = getPartnerCode(); // Returns the code or null if not set
```

#### Clearing Partner Code

If needed, you can clear the partner code:

```typescript
import { clearPartnerCode } from "@holdstation/worldchain-sdk";

clearPartnerCode();
```

## Next.js / Webpack Configuration

If you're using this SDK in a Next.js or Webpack project and encounter errors like "Can't find Browser variable", "browser is not defined", or similar Node.js module errors, you need to configure Webpack to handle Node.js polyfills properly.

### Next.js Configuration

Add the following to your `next.config.js`:

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add fallbacks for Node.js modules - only for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
        buffer: false,
        process: false,
        util: false,
        assert: false,
        url: false,
      };

      // Provide empty stubs for Node.js-only packages
      config.resolve.alias = {
        ...config.resolve.alias,
        encoding: false,
      };
    }

    // Ensure proper handling of ES modules
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };

    // Ignore specific warnings from @uniswap packages
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/@uniswap/ },
      { module: /node_modules\/brotli/ },
    ];

    return config;
  },

  // Transpile the SDK packages to ensure compatibility
  transpilePackages: [
    "@holdstation/worldchain-sdk",
    "@holdstation/worldchain-ethers-v5",
    "@holdstation/worldchain-ethers-v6",
    "@holdstation/worldchain-viem",
  ],
};

module.exports = nextConfig;
```

### For Next.js 13+ with App Router (ESM format)

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
        buffer: false,
        process: false,
        util: false,
        assert: false,
        url: false,
      };

      config.resolve.alias = {
        ...config.resolve.alias,
        encoding: false,
      };
    }

    config.externals = [...(config.externals || []), "encoding"];

    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };

    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/@uniswap/ },
      { module: /node_modules\/brotli/ },
    ];

    return config;
  },

  transpilePackages: [
    "@holdstation/worldchain-sdk",
    "@holdstation/worldchain-ethers-v5",
    "@holdstation/worldchain-ethers-v6",
    "@holdstation/worldchain-viem",
  ],
};

export default nextConfig;
```

### Additional Dependencies

You may also need to install polyfills if you encounter specific errors:

```bash
npm install buffer process
```

### Using the SDK in Client Components

When using the SDK in Next.js, make sure to use it only in client components by adding the `'use client'` directive at the top of your file:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Client, Multicall3 } from '@holdstation/worldchain-ethers-v5';
import { TokenProvider, setPartnerCode } from '@holdstation/worldchain-sdk';

export default function TokenInfo() {
  const [tokenInfo, setTokenInfo] = useState(null);

  useEffect(() => {
    // Set partner code when component mounts (only runs on client-side)
    setPartnerCode('YOUR_PARTNER_CODE');

    async function fetchTokenInfo() {
      const provider = new ethers.providers.JsonRpcProvider('RPC_URL');
      const client = new Client(provider);
      const multicall = new Multicall3(provider);

      const tokenProvider = new TokenProvider({ client, multicall });
      const info = await tokenProvider.details('0x...');
      setTokenInfo(info);
    }

    fetchTokenInfo();
  }, []);

  return <div>{/* Render token info */}</div>;
}
```

### Important: Server-Side Rendering (SSR) Considerations

The SDK is designed to work in browser environments. If you need to use it in API routes or server components:

1. **For API Routes**: The SDK will work in API routes since they run on the server with full Node.js environment
2. **For Server Components**: Create a separate client component that uses the SDK and import it into your server component

Example:

```typescript
// app/page.tsx (Server Component)
import TokenInfoClient from './TokenInfoClient';

export default function Page() {
  return (
    <div>
      <h1>Token Information</h1>
      <TokenInfoClient />
    </div>
  );
}

// app/TokenInfoClient.tsx (Client Component)
'use client';

import { useEffect, useState } from 'react';
// ... rest of the implementation
```

### Common Issues and Solutions

1. **"Can't resolve 'fs'" error**: Add `fs: false` to `resolve.fallback` in webpack config

2. **"Can't resolve 'crypto'" error**: Add `crypto: false` to `resolve.fallback`

3. **"browser is not defined" error**:

   - Add `transpilePackages` configuration to next.config.js
   - Use `'use client'` directive at the top of your component file
   - Avoid importing SDK modules at the top level of server components

4. **"Buffer is not defined"**:

   - Install the `buffer` package: `npm install buffer`
   - Add it to webpack config or use `buffer: false` in fallbacks

5. **"process is not defined"**:

   - Add `process: false` to `resolve.fallback`
   - Or install process: `npm install process`

6. **Webpack warnings about @uniswap packages**:
   - Add `ignoreWarnings` configuration to suppress these warnings (as shown above)
7. **Module not found errors in production build**:
   - Ensure all packages are in `dependencies` (not `devDependencies`)
   - Clear `.next` folder and rebuild: `rm -rf .next && npm run build`

Example using SDK in API route:

```typescript
// app/api/swap/route.ts
import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { Client, Multicall3 } from "@holdstation/worldchain-ethers-v5";
import { SwapHelper } from "@holdstation/worldchain-sdk";

export async function POST(request: Request) {
  const body = await request.json();

  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const client = new Client(provider);
  const swapHelper = new SwapHelper(client);

  // Perform swap operations here
  const result = await swapHelper.estimate.quote(body);

  return NextResponse.json(result);
}
```

Then call this API from your client component:

```typescript
'use client';

export default function SwapComponent() {
  const handleSwap = async () => {
    const response = await fetch('/api/swap', {
      method: 'POST',
      body: JSON.stringify({ /* swap params */ }),
    });
    const result = await response.json();
    // Handle result
  };

  return <button onClick={handleSwap}>Swap</button>;
}
```

## Advanced Usage

### Creating Custom Implementations

You can implement the interfaces from the core package to create custom providers:

```typescript
import { Client } from "@holdstation/worldchain-sdk";

class CustomClient implements Client {
  // Implement the required methods
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
