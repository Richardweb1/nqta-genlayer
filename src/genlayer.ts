import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0xC0288FFC38e7Dd4C576e2CDde7314Ba83F9b8411") as `0x${string}`;

export const EXPLORER_URL = "https://explorer-bradbury.genlayer.com";
export const TASK_ID = "one-page-product-site";
export const TASK_BRIEF =
  "Build a responsive one-page product landing page with a clear product headline, one visible primary call to action, and a working mobile layout.";

export const readClient = createClient({ chain: testnetBradbury });

export async function ensureBradburyNetwork() {
  if (!window.ethereum) throw new Error("Install MetaMask to continue.");
  const chainId = "0x107d";
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? Number((error as { code: unknown }).code)
      : 0;
    if (code !== 4902 && !/unrecognized|unknown chain/i.test(errorMessage(error))) throw error;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId,
        chainName: "GenLayer Bradbury Testnet",
        nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
        rpcUrls: ["https://rpc-bradbury.genlayer.com"],
        blockExplorerUrls: [EXPLORER_URL],
      }],
    });
  }
}

export function createWriteClient(account: `0x${string}`) {
  if (!window.ethereum) throw new Error("Install MetaMask to continue.");
  return createClient({
    chain: testnetBradbury,
    account,
    provider: window.ethereum,
  });
}

export const shortAddress = (value: string) =>
  `${value.slice(0, 6)}…${value.slice(-4)}`;

export const errorMessage = (error: unknown) => {
  if (error instanceof Error) {
    if (/user rejected|denied/i.test(error.message)) return "The wallet request was cancelled.";
    return error.message.split("\n")[0];
  }
  return "Something went wrong. Please try again.";
};
