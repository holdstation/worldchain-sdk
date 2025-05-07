import { Client } from "./client";
import { logger } from "./logger";
import { Multicall3 } from "./multicall";

class Config {
  multicall3Address: string;

  private _client: Client | undefined;
  private _multicall3: Multicall3 | undefined;

  constructor() {
    // this.jsonrpc = "https://worldchain-mainnet.g.alchemy.com/public";
    this.multicall3Address = "0xcA11bde05977b3631167028862bE2a173976CA11";
  }

  get client(): Client {
    if (!this._client) {
      throw new Error("Client is not set");
    }

    return this._client;
  }

  set client(client: Client) {
    logger.debug("Set new client", client.name());

    this._client = client;
  }

  get multicall3(): Multicall3 {
    if (!this._multicall3) {
      throw new Error("Multicall3 is not set");
    }

    return this._multicall3;
  }

  set multicall3(multicall3: Multicall3) {
    logger.debug("Set new multicall3", multicall3);

    this._multicall3 = multicall3;
  }
}

export const config = new Config();
