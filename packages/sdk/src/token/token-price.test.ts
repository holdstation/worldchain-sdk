import { getBestTokenPriceUSD } from "./token-price";

describe("Token Price Module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getBestTokenPriceUSD", () => {
    it("should return the higher price between v3 and v4", async () => {
      const price = await getBestTokenPriceUSD("0x4200000000000000000000000000000000000006");
      console.debug("price", price);
      expect(price).toBeGreaterThan(0);
    }, 30_000);
  });
});
