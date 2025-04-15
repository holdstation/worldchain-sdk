import { ethers } from "ethers";

describe("HistoryManager", () => {
  let provider: ethers.JsonRpcProvider;

  beforeAll(() => {
    provider = new ethers.JsonRpcProvider(
      "https://worldchain-mainnet.g.alchemy.com/public"
    );
  });

  it("manual filter logs", async () => {
    const topicAddress = ethers
      .zeroPadValue("0xd92144D6bF421Aa038f872545AAF07b4328dB279", 32)
      .toLowerCase();

    const logs = await provider.getLogs({
      fromBlock: 12689153,
      toBlock: 12689153,
      topics: [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        [topicAddress],
        // [topicAddress],
      ],
    });

    console.log("Logs", logs);
    console.log("Logs length", logs.length);
  });
});
