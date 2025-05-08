import { Client } from "..";
import { EstimatedData, Estimator, OverrideParams, SwapParams, Swapper, Writer } from "./types";

export class Dispatcher implements Writer {
  estimate: Estimator;

  private swapper: Record<string, Swapper> = {};

  constructor(private readonly client: Client) {
    this.estimate = {
      swap: this._estimateSwap.bind(this),
    };
  }

  async swap(params: EstimatedData) {
    return "";
  }

  async load(swapper: Swapper): Promise<void> {
    if (this.swapper[swapper.name()]) {
      throw new Error(`Swapper already loaded. ${swapper.name()}`);
    }

    this.swapper[swapper.name()] = swapper;
  }

  private async _estimateSwap(params: SwapParams, override?: Partial<OverrideParams>) {
    let preferredRouters = params.preferRouters || Object.keys(this.swapper);
    if (preferredRouters.length === 0) {
      throw new Error("No router available");
    }

    let lastError: any = undefined;

    for (const router of preferredRouters) {
      const swapper = this.swapper[router];
      if (!swapper) {
        continue;
      }

      if (!swapper.enabled(this.client.getChainId())) {
        continue;
      }

      try {
        const result = await Promise.race<EstimatedData>([
          swapper.estimate(params, override),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 30_000)),
        ]);

        return result;
      } catch (e: any) {
        lastError = e;
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error("No router available");
  }
}
