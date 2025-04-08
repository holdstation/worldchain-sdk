import { tokenOf } from "./token";

describe("call get token of address onchain", () => {
  it("get user has only 1 token", async () => {
    const result = await tokenOf("0x67e022256e5de118994476a621d709d658b65f04");
    console.log(77, result);
  });
});
