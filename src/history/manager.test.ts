import { ethers } from "ethers";
import { Runner } from "./manager";
jest.setTimeout(0);

describe("HistoryManager", () => {
  let provider: ethers.JsonRpcProvider;

  beforeAll(() => {
    provider = new ethers.JsonRpcProvider(
      "https://worldchain-mainnet.g.alchemy.com/public"
    );
  });

  it("get txs", async () => {
    const runner = new Runner(
      "0x138021392da7fdff698a453c94bf914b5045c3a0",
      provider,
      480
    );
    await runner.run();
  }, 60000);

  it("manual filter logs", async () => {
    const topicAddress = ethers
      .zeroPadValue("0x138021392da7fdff698a453c94bf914b5045c3a0", 32)
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
  }, 60000);
});
