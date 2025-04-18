import { tokenInfo, tokenOf } from "./token";

describe("call get token of address onchain", () => {
  it("get user has only 1 token", async () => {
    const result = await tokenOf("0x67e022256e5de118994476a621d709d658b65f04");
    console.log(77, result);
  });
});

describe("call get token info onchain", () => {
  it("get token info wld", async () => {
    const result = await tokenInfo(
      "0x2cFc85d8E48F8EAB294be644d9E25C3030863003",
      "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1"
    );
    console.log(14, result);
  });
});
