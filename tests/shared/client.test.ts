import { Client } from "@holdstation/worldchain-sdk";
import { addresses } from "./constant";
import { TestProvider } from "./setup";

export function runClientTests(provider: TestProvider) {
  describe(`${provider.name} Client tests`, () => {
    let client: Client;

    beforeAll(() => {
      client = provider.getClient();
    });

    test("should report chain id", () => {
      const chainId = client.getChainId();
      expect(chainId).toBeGreaterThan(0);
    });

    test("should check address validity", () => {
      expect(client.isValidAddress(addresses.TEST_USER_ADDRESS)).toBe(true);
      expect(client.isValidAddress("0xinvalid")).toBe(false);
    });

    test("should get block number", async () => {
      const blockNumber = await client.getBlockNumber();
      expect(blockNumber).toBeGreaterThan(0);
    });

    test("should pad hex values", () => {
      const padded = client.hexZeroPad("0x1", 32);
      expect(padded.length).toBe(66); // 0x + 64 characters
      expect(padded.startsWith("0x")).toBe(true);
    });
  });
}
