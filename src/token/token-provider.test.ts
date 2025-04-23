import { Contract, ethers } from "ethers";
import { TokenProvider } from "./token-provider";

describe("call to get token on chain", () => {
  const provider = new ethers.providers.JsonRpcProvider("https://worldchain-mainnet.g.alchemy.com/public");
  const tokenProvider = new TokenProvider({ provider });
  const WETH = "0x4200000000000000000000000000000000000006";
  const USDCe = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1";
  const WLD = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";

  const balanceabi = ["function balanceOf(address) view returns (uint256)"];

  it("get balance of multiple token onchain", async () => {
    const target = "0x14a028cC500108307947dca4a1Aa35029FB66CE0";

    const wethBalance = await new Contract(WETH, balanceabi, provider).balanceOf(target);

    const balance = await tokenProvider.balanceOf({
      wallet: target,
      tokens: [WETH, USDCe, WLD],
    });

    expect(balance).toBeDefined();
    expect(balance[WETH].toString()).toEqual(wethBalance.toString());
    expect(balance[USDCe]).toBeDefined();
    expect(balance[WLD]).toBeDefined();
  });

  it("get balance of multiple token onchain with multicall", async () => {
    const holder1 = "0x14a028cC500108307947dca4a1Aa35029FB66CE0";
    const holder2 = "0xc57B9e6f74d393504b7e43C09A6089aEc6f8D6d0";

    const balance = await tokenProvider.balanceOf({
      token: WLD,
      wallets: [holder1, holder2],
    });

    const wldBalance = await new Contract(WLD, balanceabi, provider).balanceOf(holder1);

    expect(balance).toBeDefined();
    expect(balance[holder1].toString()).toEqual(wldBalance.toString());
    expect(balance[holder2]).toBeDefined();
  });
});
