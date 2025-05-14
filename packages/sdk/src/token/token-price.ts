import { logger } from "../logger";

interface TokenData {
  data: {
    token: {
      id: string;
      symbol: string;
      name: string;
      derivedETH: string;
      txCount: string;
      totalSupply: string;
      poolCount: string;
      whitelistPools:
        | {
            id: string;
            token0Price: string;
            token1Price: string;
            token0: {
              id: string;
              derivedETH: string;
            };
            token1: {
              id: string;
              derivedETH: string;
            };
          }[]
        | null;
    };
    bundle: {
      ethPriceUSD: string;
    };
  };
}

/**
 * Fetches token data from the Uniswap V3, V4 WorldChain subgraph
 * @param tokenId The token address to query
 * @returns The GraphQL response with token data
 */
export async function fetchTokenData(tokenId: string, version: string) {
  const url = `https://graph.capybera.xyz/subgraphs/name/uniswap-${version}-worldchain-mainnet`;

  const query = `
    query GetTokenData($id: ID!) {
      token(id: $id) {
        id
        symbol
        name
        derivedETH
        txCount
        totalSupply
        poolCount
        whitelistPools(orderBy: txCount, orderDirection: desc, first: 1) {
          id
          token0Price
          token1Price
          token0 {
            id
            derivedETH
          }
          token1 {
            id
            derivedETH
          }
        }
      }
      bundle(id: "1") {
        ethPriceUSD
      }
    }
  `;

  const variables = {
    id: tokenId.toLowerCase(), // GraphQL queries typically expect lowercase addresses
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/graphql-response+json, application/json",
        Origin: "https://graph.capybera.xyz",
        Referer: `https://graph.capybera.xyz/subgraphs/name/uniswap-${version}-worldchain-mainnet/graphql`,
      },
      body: JSON.stringify({
        query,
        variables,
        operationName: "GetTokenData",
        extensions: {},
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Error fetching token data:", error);
    throw error;
  }
}

/**
 * Gets token price in USD
 * @param tokenId The token address to get price for
 * @returns The token price in USD
 */
export async function getTokenPriceUSD(tokenId: string, version: string): Promise<number> {
  try {
    const result = (await fetchTokenData(tokenId, version)) as TokenData;

    if (!result.data || !result.data.token) {
      throw new Error(`No data found for token ${tokenId}`);
    }

    const { token, bundle } = result.data;
    if (token.derivedETH !== "0") {
      const derivedETH = parseFloat(token.derivedETH || "0");
      const ethPriceUSD = parseFloat(bundle?.ethPriceUSD || "0");
      return derivedETH * ethPriceUSD;
    }

    // Calculate token price in USD using derivedETH * ETH price in USD
    if (token.whitelistPools && token.whitelistPools.length > 0) {
      const pool = token.whitelistPools[0];
      const token0Price = parseFloat(pool.token0Price || "0");
      const token1Price = parseFloat(pool.token1Price || "0");
      const token0DerivedETH = parseFloat(pool.token0.derivedETH || "0");
      const token1DerivedETH = parseFloat(pool.token1.derivedETH || "0");
      const ethPriceUSD = parseFloat(bundle?.ethPriceUSD || "0");

      const token0PriceUSD = token0DerivedETH * ethPriceUSD;
      const token1PriceUSD = token1DerivedETH * ethPriceUSD;
      if (pool.token0.id.toLowerCase() === tokenId.toLowerCase()) {
        if (token0PriceUSD > 0) {
          return token0PriceUSD;
        }
        return token1PriceUSD * token1Price;
      }

      if (token1PriceUSD > 0) {
        return token1PriceUSD;
      }
      return token0PriceUSD * token0Price;
    }

    return 0;
  } catch (error) {
    logger.error(`Failed to get USD price for token ${tokenId}:`, error);
    return 0;
  }
}

export async function getBestTokenPriceUSD(tokenId: string): Promise<number> {
  try {
    // Try to get price from both V3 and V4
    const [priceV3, priceV4] = await Promise.allSettled([
      getTokenPriceUSD(tokenId, "v3"),
      getTokenPriceUSD(tokenId, "v4"),
    ]);

    const v3Price = priceV3.status === "fulfilled" ? priceV3.value : 0;
    const v4Price = priceV4.status === "fulfilled" ? priceV4.value : 0;
    return Math.max(v3Price, v4Price);
  } catch (error) {
    logger.error(`Failed to get best USD price for token ${tokenId}:`, error);
    return 0;
  }
}
