import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useEffect } from "react";
import { WalletScanner } from "./components/WalletScanner";
import { ActionPanel } from "./components/ActionPanel";
import { TrashBin } from "./components/TrashBin";
import { createRestoreTransaction } from "./lib/transactions";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { getAssetPath } from "./lib/assets";

function App() {
  const account = useCurrentAccount();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Clear selection when wallet changes
  useEffect(() => {
    setSelectedItems(new Set());
    setRefreshTrigger((prev) => prev + 1);
  }, [account?.address]);

  const toggleSelection = (objectId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(objectId)) {
      newSelection.delete(objectId);
    } else {
      newSelection.add(objectId);
    }
    setSelectedItems(newSelection);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const handleSuccess = () => {
    clearSelection();
    // Trigger refresh of trash bin
    setTimeout(() => setRefreshTrigger((prev) => prev + 1), 2000);
  };

  const handleRestore = (objectId: string, objectType: string) => {
    setRestoreError(null);
    const tx = createRestoreTransaction(objectId, objectType);
    
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          console.log("Item restored successfully");
          // Trigger refresh of trash bin
          setTimeout(() => setRefreshTrigger((prev) => prev + 1), 2000);
        },
        onError: (err) => {
          setRestoreError(err.message);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-red-500 selection:text-white">
      <header className="border-b border-zinc-800 p-6 flex justify-between items-center bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={getAssetPath("/flame-logo.svg")} alt="Purgatory" className="w-10 h-10" />
          <h1 className="text-2xl font-bold tracking-wider uppercase text-red-600">Purgatory</h1>
        </div>
        <ConnectButton />
      </header>

      <main className="container mx-auto p-6 max-w-5xl space-y-12">
        <section className="space-y-4">
          <h2 className="text-4xl font-bold text-red-500 uppercase tracking-widest">
            Asset Disposal System
          </h2>
          <p className="text-zinc-400 max-w-2xl text-lg">
            Permanently remove unwanted NFTs and tokens from your wallet with a 90-day recovery period.
          </p>
        </section>

        {restoreError && (
          <div className="bg-red-900/20 border border-red-800/50 rounded-sm p-4 text-red-400 text-sm">
            <div className="font-bold uppercase mb-1">Restore Failed</div>
            <div>{restoreError}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wallet Scanner */}
          <div className="lg:col-span-1">
            <WalletScanner onSelectItem={toggleSelection} selectedItems={selectedItems} />
          </div>

          {/* Action Panel */}
          <div className="lg:col-span-1">
            <ActionPanel
              selectedItems={selectedItems}
              onSuccess={handleSuccess}
              onClear={clearSelection}
            />
          </div>

          {/* Trash Bin */}
          <div className="lg:col-span-1">
            <TrashBin onRestore={handleRestore} refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 p-6 text-center text-zinc-600 text-sm">
        <div className="flex items-center justify-center gap-4">
          <span className="uppercase tracking-widest">Purgatory</span>
          <span className="text-zinc-800">•</span>
          <a 
            href={`https://suiscan.xyz/testnet/object/${import.meta.env.VITE_PURGATORY_PACKAGE_ID || "0xda37e846ff23a56de6e21606778edd9974357b9e830bdd2fa46c3024fbfb131f"}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-red-500 transition-colors text-xs"
          >
            View Contract
          </a>
          <span className="text-zinc-800">•</span>
          <a 
            href="https://github.com/emreglnk/purgatory"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-red-500 transition-colors text-xs"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
