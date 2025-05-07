import { AbiCodec, abi } from "@holdstation/worldchain-sdk";
import { addresses } from "./constant";
import { TestProvider } from "./setup";

export function runCodecTests(provider: TestProvider) {
  describe(`${provider.name} AbiCodec tests`, () => {
    let codec: AbiCodec;

    beforeAll(() => {
      codec = provider.getAbiCodec(abi.ERC20_ABI);
    });

    test("should encode function data", () => {
      const data = codec.encodeFunctionData("balanceOf", [addresses.TEST_USER_ADDRESS]);
      expect(data).toMatch(/^0x/);
    });

    test("should decode function result", () => {
      // Mock result from balanceOf call
      const mockData = "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000"; // 1 ETH
      const result = codec.decodeFunctionResult("balanceOf", mockData);

      // All implementations should return the same structure
      expect(result.length).toBe(1);
      expect(result[0].toString()).toBe("1000000000000000000");
    });
  });
}
