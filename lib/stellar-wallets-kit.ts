import {
    FreighterModule,
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
    modules: [new FreighterModule()],
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
      // Comprehensive debugging
      if (typeof window !== "undefined") {
        console.log("=== FREIGHTER DEBUGGING ===");
        console.log("1. Window object available:", !!window);
        console.log("2. Freighter API available:", !!(window as any).freighterApi);
        console.log("3. Freighter version:", (window as any).freighterApi?.version);
        console.log("4. Current network:", "Test SDF Network ; September 2015");
        console.log("5. User agent:", navigator.userAgent);
        console.log("6. Protocol:", window.location.protocol);
        console.log("7. Hostname:", window.location.hostname);
        console.log("8. Kit modules:", kit);
        console.log("==========================");
        
        // Test Freighter API directly
        if ((window as any).freighterApi) {
          try {
            const isConnected = await (window as any).freighterApi.isConnected();
            console.log("9. Freighter connected:", isConnected);
          } catch (e) {
            console.log("9. Freighter connection test failed:", e);
          }
        }
      }
      
      await kit.openModal({
        onWalletSelected: async (option) => {
          try {
            console.log("Selected wallet:", option.id);
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