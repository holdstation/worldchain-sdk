import * as sdk from "@holdstation/worldchain-sdk";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { walletHistory } from "../components/history";

const managerHistory = new sdk.Manager(
  new ethers.providers.JsonRpcProvider("https://worldchain-mainnet.gateway.tenderly.co"),
  480
);

export default function HistoryPage() {
  const address = "0x138021392da7fdff698a453c94bf914b5045c3a0"; // Replace with the address you want to watch
  const [refetch, setRefetch] = useState(false);

  useEffect(() => {
    let stopRef: any = undefined;
    const fetchTransactionHistory = async () => {
      const { start, stop } = await managerHistory.watch(address, () => {});

      stopRef = stop;
      await start();
    };

    fetchTransactionHistory()
      .then(() => setRefetch((v) => !v))
      .catch((e) => console.error("Error fetching transaction history", e));

    return () => {
      if (stopRef) {
        stopRef();
      }
    };
  }, [address]);

  useEffect(() => {
    console.debug("refetch", refetch);
    const fetchAllTransactions = async () => {
      try {
        const offset = 0;
        const limit = 100; // Adjust limit as needed
        const fetchedTransactions = await walletHistory.find(offset, limit);
        console.log("fetchedTransactions:", fetchedTransactions);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      }
    };

    fetchAllTransactions();
  }, [address, refetch]);
  return <></>;
}
