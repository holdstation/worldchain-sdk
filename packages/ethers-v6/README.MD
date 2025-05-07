# @holdstation/worldchain-ethers-v6

> Ethers.js v6 integration for Worldchain SDK

[![NPM](https://img.shields.io/npm/v/@holdstation/worldchain-ethers-v6.svg)](https://www.npmjs.com/package/@holdstation/worldchain-ethers-v6)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This package provides ethers.js v6 integration for interacting with the Worldchain blockchain. It implements the interfaces defined in `@holdstation/worldchain-core` using ethers.js v6 as the underlying provider.

## Installation

```bash
npm install @holdstation/worldchain-ethers-v6 ethers@^6.0.0
```

## Simple Example

```typescript
import { ethers } from "ethers";
import { EthersClient, EthersMulticall3 } from "@holdstation/worldchain-ethers-v6";

const provider = new ethers.JsonRpcProvider("RPC_URL");
const client = new EthersClient(provider);
```

## Documentation & Usage

For detailed documentation and more examples, please visit:

📚 [Worldchain SDK Documentation](https://www.npmjs.com/package/@holdstation/worldchain-sdk)

## License

MIT

---

# @holdstation/worldchain-viem

> Viem integration for Worldchain SDK

[![NPM](https://img.shields.io/npm/v/@holdstation/worldchain-viem.svg)](https://www.npmjs.com/package/@holdstation/worldchain-viem)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This package provides viem integration for interacting with the Worldchain blockchain. It implements the interfaces defined in `@holdstation/worldchain-core` using viem as the underlying provider.

## Installation

```bash
npm install @holdstation/worldchain-viem viem
```

## Simple Example

```typescript
import { createPublicClient, http } from "viem";
import { worldchain } from "viem/chains";
import { ViemClient, ViemMulticall3 } from "@holdstation/worldchain-viem";

const publicClient = createPublicClient({
  chain: worldchain,
  transport: http("RPC_URL"),
});

const client = new ViemClient(publicClient);
```

## Documentation & Usage

For detailed documentation and more examples, please visit:

📚 [Worldchain SDK Documentation](https://www.npmjs.com/package/@holdstation/worldchain-sdk)

## License

MIT
