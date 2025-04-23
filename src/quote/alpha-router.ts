import { Protocol } from "@uniswap/router-sdk";
import { Currency, CurrencyAmount as CurrencyAmountRaw, TradeType } from "@uniswap/sdk-core";
import {
  AlphaRouter,
  AlphaRouterConfig,
  CachingV3PoolProvider,
  CachingV4PoolProvider,
  NodeJSCache,
  TokenPropertiesProvider,
  UniswapMulticallProvider,
  V2PoolProvider,
  V3PoolProvider,
  V4PoolProvider,
} from "@uniswap/smart-order-router";
import { OnChainTokenFeeFetcher } from "@uniswap/smart-order-router/build/main/providers/token-fee-fetcher";
import { ethers } from "ethers";
import NodeCache from "node-cache";

export const ROUTING_CONFIG: AlphaRouterConfig = {
  v2PoolSelection: {
    topN: 3,
    topNDirectSwaps: 1,
    topNTokenInOut: 5,
    topNSecondHop: 2,
    topNWithEachBaseToken: 2,
    topNWithBaseToken: 6,
  },
  v3PoolSelection: {
    topN: 2,
    topNDirectSwaps: 2,
    topNTokenInOut: 2,
    topNSecondHop: 1,
    topNWithEachBaseToken: 3,
    topNWithBaseToken: 3,
  },
  v4PoolSelection: {
    topN: 2,
    topNDirectSwaps: 2,
    topNTokenInOut: 2,
    topNSecondHop: 1,
    topNWithEachBaseToken: 3,
    topNWithBaseToken: 3,
  },
  maxSwapsPerPath: 3,
  minSplits: 1,
  maxSplits: 7,
  distributionPercent: 10,
  forceCrossProtocol: false,

  protocols: [Protocol.V3, Protocol.V4, Protocol.V2, Protocol.MIXED],
  saveTenderlySimulationIfFailed: false,
};

export class CurrencyAmount extends CurrencyAmountRaw<Currency> {}

export function parseDeadline(deadlineOrPreviousBlockhash: number): number {
  return Math.floor(Date.now() / 1000) + deadlineOrPreviousBlockhash;
}

export const getQuoteToken = (tokenIn: Currency, tokenOut: Currency, tradeType: TradeType): Currency => {
  return tradeType == TradeType.EXACT_INPUT ? tokenOut : tokenIn;
};

export function initializeAlphaRouter(provider: ethers.providers.JsonRpcProvider) {
  const chainId = provider.network.chainId;

  const tokenFeeFetcher = new OnChainTokenFeeFetcher(chainId, provider);
  const tokenPropertiesProvider = new TokenPropertiesProvider(
    chainId,
    new NodeJSCache(new NodeCache({ stdTTL: 360, useClones: false })),
    tokenFeeFetcher
  );

  const multicall2Provider = new UniswapMulticallProvider(chainId, provider);
  const v2PoolProvider = new V2PoolProvider(chainId, multicall2Provider, tokenPropertiesProvider);
  const v3PoolProvider = new CachingV3PoolProvider(
    chainId,
    new V3PoolProvider(chainId, multicall2Provider),
    new NodeJSCache(new NodeCache({ stdTTL: 360, useClones: false }))
  );
  const v4PoolProvider = new CachingV4PoolProvider(
    chainId,
    new V4PoolProvider(chainId, multicall2Provider),
    new NodeJSCache(new NodeCache({ stdTTL: 360, useClones: false }))
  );

  const alphaRouter = new AlphaRouter({
    chainId,
    provider,
    multicall2Provider,
    v2PoolProvider,
    v3PoolProvider,
    v4PoolProvider,
    // simulator,
  });

  return alphaRouter;
}
