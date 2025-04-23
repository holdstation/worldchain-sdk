import { ethers } from "ethers";
import { Quoter } from "./quoter";

describe("get quoter on chain", () => {
  const provider = new ethers.providers.StaticJsonRpcProvider("https://worldchain-mainnet.g.alchemy.com/public", {
    chainId: 480,
    name: "worldchain",
  });
  const quoter = new Quoter(provider);

  const WETH = "0x4200000000000000000000000000000000000006";
  const USDCe = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1";
  const WLD = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";

  it("simple quote onchain - WETH -> USDCe", async () => {
    const result = await quoter.simple(WETH, USDCe);

    expect(result).toBeDefined();
    expect(result.best).toBeDefined();
    expect(Number(result.best)).toBeGreaterThan(1000);
    expect(Number(result.best)).toBeLessThan(2000);
  });

  it("simple quote onchain - WLD -> USDCe", async () => {
    const result = await quoter.simple(WLD, USDCe);

    expect(result).toBeDefined();
    expect(result.best).toBeDefined();
    expect(Number(result.best)).toBeGreaterThan(0);
    expect(Number(result.best)).toBeLessThan(1);
  });

  it("smart quote onchain - WETH -> USDCe", async () => {
    const result = await quoter.smart(WETH, {
      slippage: 3,
      deadline: 10,
    });

    console.debug("quote", result.quote);

    expect(result).toBeDefined();
    expect(result.quote).toBeDefined();
    expect(Number(result.quote)).toBeGreaterThan(1000);
    expect(Number(result.quote)).toBeLessThan(2000);
  }, 60_000);
});
