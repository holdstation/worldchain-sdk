import { runClientTests } from "./client.test";
import { runCodecTests } from "./codec.test";
import { runMulticall3Tests } from "./multicall3.test";
import { TestProvider } from "./setup";

export * as constants from "./constant";
export { TestProvider } from "./setup";

export function runAllTests(provider: TestProvider) {
  runClientTests(provider);
  runCodecTests(provider);
  runMulticall3Tests(provider);
}
