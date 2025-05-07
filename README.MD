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
import { ethers } from 'ethers';
import { Client, Multicall3 } from '@holdstation/worldchain-ethers-v5';
import { TokenProvider } from '@holdstation/worldchain-sdk';

// Initialize provider
const provider = new ethers.providers.JsonRpcProvider('RPC_URL');
const client = new Client(provider);
const multicall = new Multicall3(provider);

// Use the TokenProvider for token operations
const tokenProvider = new TokenProvider({ client, multicall });
const tokenInfo = await tokenProvider.details('0x123...'); // Get token details
```

### Using with viem

```typescript
import { createPublicClient, http } from 'viem';
import { worldchain } from 'viem/chains';
import { Client, Multicall3 } from '@holdstation/worldchain-viem';
import { TokenProvider } from '@holdstation/worldchain-sdk';

// Initialize provider
const publicClient = createPublicClient({
  chain: worldchain,
  transport: http('RPC_URL')
});

const client = new Client(publicClient);
const multicall = new Multicall3(publicClient);

// Use the TokenProvider
const tokenProvider = new TokenProvider({ client, multicall });
const tokenInfo = await tokenProvider.details('0x123...'); // Get token details
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
const abi = ['function balanceOf(address) view returns (uint256)'];
const codec = client.codec(abi);
const data = codec.encodeFunctionData('balanceOf', ['0xAddress']);
```

### Multicall3

```typescript
// Batch multiple calls
const calls = [
  {
    target: tokenAddress,
    callData: codec.encodeFunctionData('balanceOf', [userAddress])
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

## Advanced Usage

### Creating Custom Implementations

You can implement the interfaces from the core package to create custom providers:

```typescript
import { Client } from '@holdstation/worldchain-sdk';

class CustomClient implements Client {
  // Implement the required methods
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT