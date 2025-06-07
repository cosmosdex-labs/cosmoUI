import React, { useEffect, useRef } from "react";
import { getPublicKey, connect, disconnect } from "../lib/stellar-wallets-kit";
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"

export default function ConnectWallet() {
  const ellipsisRef = useRef<HTMLDivElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const disconnectButtonRef = useRef<HTMLButtonElement>(null);

  // Show disconnected state
  const showDisconnected = () => {
    if (ellipsisRef.current && connectButtonRef.current && disconnectButtonRef.current) {
      ellipsisRef.current.innerHTML = "";
      ellipsisRef.current.removeAttribute("title");
      connectButtonRef.current.style.removeProperty("display");
      disconnectButtonRef.current.style.display = "none";
    }
  };

  // Show connected state
  const showConnected = async () => {
    if (ellipsisRef.current && connectButtonRef.current && disconnectButtonRef.current) {
      const publicKey = await getPublicKey();
      if (publicKey) {
        ellipsisRef.current.innerHTML = `Signed in as ${publicKey}`;
        ellipsisRef.current.title = publicKey ?? "";
        connectButtonRef.current.style.display = "none";
        disconnectButtonRef.current.style.removeProperty("display");
      } else {
        showDisconnected();
      }
    }
  };

  // Set up event listeners and initial state
  useEffect(() => {
    const connectHandler = async () => {
      await connect(showConnected);
    };
    const disconnectHandler = async () => {
      disconnect(async () => showDisconnected());
    };

    const connectBtn = connectButtonRef.current;
    const disconnectBtn = disconnectButtonRef.current;

    if (connectBtn) connectBtn.addEventListener("click", connectHandler);
    if (disconnectBtn) disconnectBtn.addEventListener("click", disconnectHandler);

    // Set initial state
    (async () => {
      if (await getPublicKey()) {
        showConnected();
      } else {
        showDisconnected();
      }
    })();

    // Cleanup
    return () => {
      if (connectBtn) connectBtn.removeEventListener("click", connectHandler);
      if (disconnectBtn) disconnectBtn.removeEventListener("click", disconnectHandler);
    };
    // eslint-disable-next-line
  }, []);

  return (
    <>
      <div id="connect-wrap" className="wrap" aria-live="polite">
        &nbsp;
        <div className="ellipsis" ref={ellipsisRef}></div>
        <Button
          style={{ display: "none" }}
          data-connect
          aria-controls="connect-wrap"
          ref={connectButtonRef}
          className="bg-green-500 hover:bg-green-600 text-black font-semibold"
        >
          <Wallet className="mr-2 h-4 w-4" />
          Connect
        </Button>
        <Button
          style={{ display: "none" }}
          data-disconnect
          aria-controls="connect-wrap"
          ref={disconnectButtonRef}
        >
          Disconnect
        </Button>
      </div>
      <style>{`
        .wrap {
          text-align: center;
          display: flex;
          width: 18em;
          margin: auto;
          justify-content: center;
          line-height: 2.7rem;
          gap: 0.5rem;
        }
        .ellipsis {
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
          white-space: nowrap;
        }
      `}</style>
    </>
  );
}