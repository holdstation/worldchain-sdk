# @holdstation/worldchain-viem

> Viem integration for Worldchain SDK

[![NPM](https://img.shields.io/npm/v/@holdstation/worldchain-viem.svg)](https://www.npmjs.com/package/@holdstation/worldchain-viem)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This package provides viem integration for interacting with the Worldchain blockchain. It implements the interfaces defined in `@holdstation/worldchain-sdk` using viem as the underlying provider.

## Installation

```bash
npm install @holdstation/worldchain-viem viem
```

## Simple Example

```typescript
import { createPublicClient, http } from 'viem'
import { worldchain } from 'viem/chains'
import { Client, Multicall3 } from '@holdstation/worldchain-viem'

const publicClient = createPublicClient({
  chain: worldchain,
  transport: http('RPC_URL'),
})

const client = new Client(publicClient)
```

## Documentation & Usage

For detailed documentation and more examples, please visit:

📚 [Worldchain SDK Documentation](https://www.npmjs.com/package/@holdstation/worldchain-sdk)

## License

MIT
