import { AbiCodec, Multicall3, abi } from "@holdstation/worldchain-sdk";
import { TestProvider } from "./setup";

export function runMulticall3Tests(provider: TestProvider) {
  describe(`${provider.name} Multicall3 tests`, () => {
    let multicall3: Multicall3;
    let codec: AbiCodec;

    const erc20TokenAddr = "0x";
    const userToTest = "0x";

    beforeAll(() => {
      multicall3 = provider.getMulticall3();
      codec = provider.getAbiCodec(abi.ERC20_ABI);
    });

    test("should perform aggregate call", async () => {
      const calls = [
        {
          target: erc20TokenAddr,
          callData: codec.encodeFunctionData("balanceOf", [userToTest]),
        },
        {
          target: erc20TokenAddr,
          callData: codec.encodeFunctionData("decimals"),
        },
      ];

      const result = await multicall3.aggregate(calls);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toBeGreaterThan(0); // Block number
      expect(result[1].length).toBe(2); // Two results
    });

    test("should perform aggregate3 call", async () => {
      const calls = [
        {
          target: erc20TokenAddr,
          callData: codec.encodeFunctionData("balanceOf", [userToTest]),
          allowFailure: true,
        },
        {
          target: erc20TokenAddr,
          callData: codec.encodeFunctionData("decimals"),
          allowFailure: true,
        },
      ];

      const result = await multicall3.aggregate3(calls);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(true);
    });
  });
}
