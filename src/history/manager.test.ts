import { ethers } from "ethers";
import { Runner } from "./manager";

describe("HistoryManager", () => {
  it("fetch transaction hash", async () => {
    const provider = new ethers.JsonRpcProvider(
      "https://worldchain-mainnet.g.alchemy.com/public"
    );
    const runner = new Runner(
      "0xd92144D6bF421Aa038f872545AAF07b4328dB279",
      provider
    );

    await runner.run();

    console.log("Done");
  });
});
