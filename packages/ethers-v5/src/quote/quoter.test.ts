import { ethers } from "ethers";
import { Client } from "..";
import { Quoter } from "./quoter";

describe("get quoter on chain", () => {
  const RPC_URL = "https://worldchain-mainnet.g.alchemy.com/public";
  const provider = new ethers.providers.StaticJsonRpcProvider(RPC_URL, {
    chainId: 480,
    name: "worldchain",
  });

  const client = new Client(provider);
  const quoter = new Quoter(client);

  const WETH = "0x4200000000000000000000000000000000000006";
  const USDCe = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1";
  const WLD = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";
  const USDT0 = "0x102d758f688a4C1C5a80b116bD945d4455460282";

  it("simple quote onchain - WETH -> USDCe", async () => {
    const result = await quoter.simple(WETH, USDCe);
    console.debug("quote", result.best);

    expect(result).toBeDefined();
    expect(result.best).toBeDefined();
    expect(Number(result.best)).toBeGreaterThan(1000);
    expect(Number(result.best)).toBeLessThan(2000);
  });

  it("simple quote onchain - WLD -> USDCe", async () => {
    const result = await quoter.simple(WLD, USDCe);
    console.debug("quote", result.best);

    expect(result).toBeDefined();
    expect(result.best).toBeDefined();
    expect(Number(result.best)).toBeGreaterThan(0);
    expect(Number(result.best)).toBeLessThan(1);
  });

  it("simple quote onchain - USDT0 -> USDCe", async () => {
    const result = await quoter.simple(USDT0, USDCe);
    console.debug("quote", result.best);

    expect(result).toBeDefined();
    expect(result.best).toBeDefined();
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
