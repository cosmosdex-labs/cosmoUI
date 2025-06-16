import {
    allowAllModules,
    FREIGHTER_ID,
    StellarWalletsKit,
    WalletNetwork,
  } from "@creit.tech/stellar-wallets-kit";
  
  
  const SELECTED_WALLET_ID = "selectedWalletId";
  
  function getSelectedWalletId() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(SELECTED_WALLET_ID);
  }
  
  const kit = new StellarWalletsKit({
    modules: allowAllModules(),
    network: "Test SDF Network ; September 2015" as WalletNetwork,
    selectedWalletId: getSelectedWalletId() ?? FREIGHTER_ID
  });
  
  export const signTransaction = kit.signTransaction.bind(kit);
  
  export async function getPublicKey() {
    if (!getSelectedWalletId()) return null;
    try {
      const { address } = await kit.getAddress();
      return address;
    } catch (error) {
      console.error("Error getting public key:", error);
      return null;
    }
  }
  
  export async function setWallet(walletId: string) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(SELECTED_WALLET_ID, walletId);
        await kit.setWallet(walletId);
      } catch (error) {
        console.error("Error setting wallet:", error);
      }
    }
  }
  
  export async function disconnect(callback?: () => Promise<void>) {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(SELECTED_WALLET_ID);
        await kit.disconnect();
        if (callback) await callback();
      } catch (error) {
        console.error("Error disconnecting wallet:", error);
      }
    }
  }
  
  export async function connect(callback?: () => Promise<void>) {
    try {
      await kit.openModal({
        onWalletSelected: async (option) => {
          try {
            await setWallet(option.id);
            if (callback) await callback();
          } catch (e) {
            console.error("Error connecting wallet:", e);
          }
          return option.id;
        },
      });
    } catch (error) {
      console.error("Error opening wallet modal:", error);
    }
  }