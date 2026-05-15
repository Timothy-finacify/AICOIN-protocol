import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, localhost } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "AICOIN",
  projectId: "aicoin-protocol",
  chains: [sepolia, localhost],
  ssr: true,
});