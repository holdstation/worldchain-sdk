import { balanceOf } from "./balance";

describe("call onchain function", () => {
  it("should return the balance of a wallet", async () => {
    const wallet = "0x1AB4973a48dc892Cd9971ECE8e01DcC7688f8F23";
    const tokenAddresses = [
      "0x2cfc85d8e48f8eab294be644d9e25c3030863003", // WLD
      "0x79a02482a880bce3f13e09da970dc34db4cd24d1", // USDC.e
    ];

    const result = await balanceOf(wallet, ...tokenAddresses);

    expect(result["0x2cfc85d8e48f8eab294be644d9e25c3030863003"]).toBeDefined();
    expect(result["0x79a02482a880bce3f13e09da970dc34db4cd24d1"]).toBeDefined();

    expect(
      result["0x2cfc85d8e48f8eab294be644d9e25c3030863003"].balance
    ).toBeDefined();
  });
});
