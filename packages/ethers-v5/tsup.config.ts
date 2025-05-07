import { defineConfig } from "tsup";
import pkg from "./package.json";

export default defineConfig({
  entry: ["src/index.ts"],
  clean: true,
  format: ["cjs", "esm"],
  dts: true,
  minify: true,
  sourcemap: true,
  splitting: true,
  treeshake: true,
  external: [
    ...Object.keys(pkg.peerDependencies || {}),
    /^@ethersproject\//,
    /^@uniswap\//,
    /^@worldcoin\//,
    "ethers",
    "async-mutex",
    "idb",
  ],

  // "@ethersproject/*", "@uniswap/*", "ethers", "@worldcoin/minikit-js", "async-mutex", "idb"
});
