import inquirer from "inquirer";
import { estimateSwap, getTokenDetail, getTokenInfo, swap } from "./functions.js";

async function main() {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Get Token Details", value: "tokenDetail" },
        { name: "Get Token Info", value: "tokenInfo" },
        { name: "Estimate Swap", value: "estimateSwap" },
        { name: "Execute Swap", value: "swap" },
        { name: "Exit", value: "exit" },
      ],
    },
  ]);

  if (action === "exit") {
    console.log("Goodbye!");
    process.exit(0);
  }

  try {
    switch (action) {
      case "tokenDetail":
        await getTokenDetail();
        break;
      case "tokenInfo":
        await getTokenInfo();
        break;
      case "estimateSwap":
        await estimateSwap();
        break;
      case "swap":
        await swap();
        break;
    }
    console.log(`\n${action} completed successfully.`);
  } catch (error) {
    console.error(`\nError executing ${action}:`, error);
  }

  // Ask if the user wants to perform another action
  const { again } = await inquirer.prompt([
    {
      type: "confirm",
      name: "again",
      message: "Would you like to perform another action?",
      default: true,
    },
  ]);

  if (again) {
    await main();
  } else {
    console.log("Goodbye!");
  }
}

main().catch(console.error);
