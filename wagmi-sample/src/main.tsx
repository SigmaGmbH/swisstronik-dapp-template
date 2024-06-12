import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Chain } from "wagmi/chains";

const {
  VITE_NODE_HTTP_URL: NODE_RPC_URL,
  VITE_WALLETCONNECT_PROJECT_ID: PROJECT_ID,
} = import.meta.env;

const queryClient = new QueryClient();

const testnet: Chain = {
  id: 1291,
  name: "Swisstronik Testnet",
  nativeCurrency: {
    name: "SWTR",
    symbol: "SWTR",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [NODE_RPC_URL as string],
    },
  },
  blockExplorers: {
    default: {
      name: "Swisstronik Explorer",
      url: "https://explorer-evm.testnet.swisstronik.com/",
    },
  },
};

const metadata = {
  name: "Web3Modal",
  description: "Web3Modal Example",
  url: "https://web3modal.com", // origin must match your domain & subdomain
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

const wagmiConfig = defaultWagmiConfig({
  chains: [testnet],
  projectId: PROJECT_ID,
  metadata,
});

createWeb3Modal({
  wagmiConfig,
  projectId: PROJECT_ID,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
