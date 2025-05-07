import type { Config } from "@jest/types";
// Sync object
const config: Config.InitialOptions = {
  verbose: false,
  // noStackTrace: true,
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  // ... other config
  moduleNameMapper: {
    "^react$": "<rootDir>/node_modules/react",
    // "^react-dom$": "<rootDir>/node_modules/react-dom",
  },
  modulePathIgnorePatterns: [
    "<rootDir>/package.json", // Ignore the root package.json for module resolution
  ],
  // For Node.js environment

  testEnvironment: "node",
};
export default config;
