import BigNumber from "bignumber.js";

export function isStableCoin(address: string, stableCoins: string[]) {
  return stableCoins.find((v) => v.toLowerCase() === address.toLowerCase()) !== undefined;
}

export function isNativeToken(address: string) {
  if (
    address === "0x0000000000000000000000000000000000000000" ||
    address.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  ) {
    return true;
  }

  return false;
}

/**
 * Determines the fee type (in or out) based on token types.
 * @param tokenIn - The input token address.
 * @param tokenOut - The output token address.
 */
export function getFeeDirect(tokenIn: string, tokenOut: string, stableCoins: string[], priotizeAddress?: string) {
  if (isNativeToken(tokenIn)) {
    return 0;
  }

  if (isNativeToken(tokenOut)) {
    return 0;
  }

  if (isStableCoin(tokenIn, stableCoins)) {
    return 0;
  }

  if (isStableCoin(tokenOut, stableCoins)) {
    return 1;
  }

  if (!priotizeAddress) {
    return 0;
  }

  if (tokenOut.toLowerCase() === priotizeAddress.toLowerCase()) {
    return 1;
  }

  return 0;
}

/**
 * Calculates the fee for a given input amount.
 * @param tokenOut - The output token address.
 * @param amountIn - The input amount in Wei.
 * @param fee - The fee percentage.
 */
export function getFeeWithAmountIn(tokenOut: string, amountIn: BigNumber, fee: number) {
  if (isNativeToken(tokenOut)) {
    return {
      feePercent: `0x${new BigNumber(fee / 100).multipliedBy(Math.pow(10, 18)).toString(16)}`,
    };
  }

  return {
    feeAmount: `0x${amountIn
      .multipliedBy(fee / 100)
      .integerValue(BigNumber.ROUND_FLOOR)
      .toString(16)}`,
    feeToken: 0,
  };
}

/**
 * Calculates the fee for a given output amount.
 * @param amountOut - The output amount in Wei.
 * @param fee - The fee percentage.
 */
export function getFeeWithAmountOut(amountOut: string, fee: number) {
  return {
    feeAmount: `0x${new BigNumber(amountOut)
      .multipliedBy(fee / 100)
      .integerValue(BigNumber.ROUND_FLOOR)
      .toString(16)}`,
    feeToken: 1,
  };
}
