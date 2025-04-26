import { ethers } from "ethers";
import { Token, TokenStorage } from "../storage";

/**
 * Interface defining the parameters required for a token swap operation.
 *
 * @property from - The address of the token to swap from.
 * @property to - The address of the token to swap to.
 * @property amount - The amount of the token to swap.
 * @property slippage - The acceptable percentage of slippage for the swap (e.g., 0.3 for 0.3%).
 * @property fee - (Optional) The fee percentage for the swap (e.g., 0.1 for 0.1%).
 */
export interface SwapParams {
  from: string;
  to: string;
  amount: string;
  slippage?: number;
  fee?: number;
}

/**
 * Represents the response structure for an estimated token swap.
 *
 * This interface contains details about the estimated output of a token swap,
 * including the output amount, swap rate, USD values, minimum received amount,
 * and fee details.
 */
export interface QuoteResponse {
  /**
   * The estimated output token amount after the swap.
   */
  outAmount: string;

  /**
   * The swap rate between the input and output tokens.
   */
  rateSwap: string;

  /**
   * The input token amount in USD.
   */
  amountInUsd: string;

  /**
   * The output token amount in USD.
   */
  amountOutUsd: string;

  /**
   * The minimum output amount after considering slippage and fees.
   */
  minReceived: string;

  /**
   * The fee amount deducted from the output in hexadecimal format.
   */
  feeAmountOut: string;

  /**
   * The populated transaction object ready for execution.
   */
  populatedTx: ethers.PopulatedTransaction;

  /**
   * The version of uniswap
   */
  version: string;
}

export type SwapConfig = {
  popular: {
    weth: string;
    wld: string;
    eth: Token;
  };

  uniswap: {
    router: {
      v2: string;
      v3: string;
    };
    quoter: {
      v2: string;
    };
  };

  stableCoins: string[];

  spender: string;

  tokenStorage?: TokenStorage;
};
