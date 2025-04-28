import { ethers } from "ethers";
import { inmemoryTokenStorage } from "../storage/token.storage.inmemory";
import { SwapHelper } from "./swap-helper"; // Adjust the import path as needed
import { SwapParams } from "./swap.types";

describe("SwapHelper - quote", () => {
  let swapHelper: SwapHelper;
  beforeEach(() => {
    const provider = new ethers.providers.StaticJsonRpcProvider("https://worldchain-mainnet.gateway.tenderly.co", {
      chainId: 480,
      name: "WorldChain",
    });
    swapHelper = new SwapHelper(provider, {
      tokenStorage: inmemoryTokenStorage,
    });
  });

  it("should return the correct estimated swap response v3", async () => {
    // Mock input parameters
    const params: SwapParams = {
      from: "0xb0505e5a99abd03d94a1169e638b78edfed26ea4",
      to: "0x4200000000000000000000000000000000000006",
      amount: "1",
      slippage: 0.3,
      fee: 0,
    };

    // Call the function
    const result = await swapHelper.quote(params);
    // Assertions
    console.debug(result);

    expect(result).toBeDefined();
    expect(result.outAmount).toBeDefined();
    expect(Number(result.outAmount)).toBeGreaterThan(0); // Ensure output amount is greater than 0
    expect(result.rateSwap).toBeDefined();
    expect(Number(result.rateSwap)).toBeGreaterThan(0); // Ensure swap rate is valid
    expect(result.amountInUsd).toBeDefined();
    expect(Number(result.amountInUsd)).toBeGreaterThanOrEqual(0); // Ensure input amount in USD is valid
    expect(result.amountOutUsd).toBeDefined();
    expect(Number(result.amountOutUsd)).toBeGreaterThanOrEqual(0); // Ensure output amount in USD is valid
    expect(result.minReceived).toBeDefined();
    expect(Number(result.minReceived)).toBeLessThanOrEqual(Number(result.outAmount)); // Ensure minReceived is <= outAmount
    expect(result.feeAmountOut).toBeDefined();
    expect(Number(result.feeAmountOut)).toBeGreaterThanOrEqual(0); // Ensure fee amount is non-negative
    expect(result.populatedTx).toBeDefined(); // Ensure populated transaction is defined
    expect(result.version).toEqual("v3"); // Ensure populated transaction is defined
  }, 30000);

  it("should return the correct estimated swap response v2", async () => {
    // Mock input parameters
    const params: SwapParams = {
      from: "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1",
      to: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      amount: "2",
      slippage: 0.3,
      fee: 0.2,
    };

    // Call the function
    const result = await swapHelper.quote(params);
    // Assertions
    console.debug(result);

    expect(result).toBeDefined();
    expect(result.outAmount).toBeDefined();
    expect(Number(result.outAmount)).toBeGreaterThan(0); // Ensure output amount is greater than 0
    expect(result.rateSwap).toBeDefined();
    expect(Number(result.rateSwap)).toBeGreaterThan(0); // Ensure swap rate is valid
    expect(result.amountInUsd).toBeDefined();
    expect(Number(result.amountInUsd)).toBeGreaterThanOrEqual(0); // Ensure input amount in USD is valid
    expect(result.amountOutUsd).toBeDefined();
    expect(Number(result.amountOutUsd)).toBeGreaterThanOrEqual(0); // Ensure output amount in USD is valid
    expect(result.minReceived).toBeDefined();
    expect(Number(result.minReceived)).toBeLessThanOrEqual(Number(result.outAmount)); // Ensure minReceived is <= outAmount
    expect(result.feeAmountOut).toBeDefined();
    expect(Number(result.feeAmountOut)).toBeGreaterThanOrEqual(0); // Ensure fee amount is non-negative
    expect(result.populatedTx).toBeDefined(); // Ensure populated transaction is defined
    expect(result.version).toEqual("v2"); // Ensure populated transaction is defined
  }, 30000);

  it("should fail when slippage is out of range", async () => {
    // Mock input parameters with invalid slippage
    const params: SwapParams = {
      from: "0xb0505e5a99abd03d94a1169e638b78edfed26ea4",
      to: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      amount: "1",
      slippage: 101, // Invalid slippage (e.g., 5% is out of range if the range is 0-1%)
      fee: 0,
    };

    // Call the function and expect it to throw an error
    await expect(swapHelper.quote(params)).rejects.toThrowError(
      "Invalid slippage value. It must be between 0 and 100."
    );
  }, 30000);
});
