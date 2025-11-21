import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useState } from "react";
import { DISPOSAL_REASONS } from "../config/constants";
import { createBatchThrowAwayTransaction } from "../lib/transactions";
import { getAssetPath } from "../lib/assets";

interface ActionPanelProps {
  selectedItems: Set<string>;
  onSuccess: () => void;
  onClear: () => void;
}

export function ActionPanel({ selectedItems, onSuccess, onClear }: ActionPanelProps) {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<number>(0); // Default: JUNK

  const handleThrowAway = async () => {
    if (selectedItems.size === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      // First, we need to fetch the full type of each object
      const itemsArray = Array.from(selectedItems);
      const objectDetails = await Promise.all(
        itemsArray.map((id) => suiClient.getObject({ id, options: { showType: true } }))
      );

      const items = objectDetails
        .filter((obj) => obj.data?.type)
        .map((obj, i) => ({
          id: itemsArray[i],
          type: obj.data!.type!,
        }));

      if (items.length === 0) {
        throw new Error("No valid objects found");
      }

      // Create transaction with reason
      const tx = createBatchThrowAwayTransaction(items, reason);

      // Execute transaction
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log("Transaction successful:", result);
            setIsProcessing(false);
            onSuccess();
            onClear();
          },
          onError: (err) => {
            console.error("Transaction failed:", err);
            setError(err.message || "Transaction failed");
            setIsProcessing(false);
          },
        }
      );
    } catch (err: any) {
      console.error("Error preparing transaction:", err);
      setError(err.message || "Failed to prepare transaction");
      setIsProcessing(false);
    }
  };

  return (
    <div className="border-2 border-zinc-800 rounded-lg bg-zinc-900/20 flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/80">
        <h3 className="font-bold uppercase tracking-wider text-red-500">Incinerator</h3>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
        {selectedItems.size === 0 ? (
          <>
            <img src={getAssetPath("/flame-logo.svg")} alt="Flame" className="w-32 h-32 opacity-20" />
            <div className="text-center space-y-2">
              <p className="text-zinc-500 uppercase tracking-widest text-sm">
                Ready for Disposal
              </p>
              <p className="text-zinc-700 text-xs">Select items from your inventory</p>
            </div>
          </>
        ) : (
          <>
            <div className="text-center space-y-4 w-full max-w-sm">
              <div className="text-7xl font-black text-red-500">{selectedItems.size}</div>
              <div className="text-zinc-400 uppercase tracking-widest text-sm">
                Items Selected
              </div>

              {/* Disposal Reason Selector */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-sm p-4 space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Why are you disposing?
                </label>
                <select
                  name="disposal-reason"
                  title="Disposal Reason"
                  value={reason}
                  onChange={(e) => setReason(Number(e.target.value))}
                  className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-sm text-zinc-300 font-mono text-sm focus:border-red-500 focus:outline-none"
                >
                  {DISPOSAL_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} - {r.description}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-600 italic">
                  Your choice creates an immutable on-chain reputation record
                </p>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-sm p-3 text-red-400 text-xs">
                  <div className="font-bold uppercase mb-1">Error</div>
                  <div className="font-mono">{error}</div>
                </div>
              )}

              <div className="space-y-2 w-full">
                <button
                  type="button"
                  onClick={handleThrowAway}
                  disabled={isProcessing}
                  className="w-full px-8 py-4 bg-red-600 text-black font-bold uppercase tracking-widest hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? "Processing..." : "Throw Away"}
                </button>

                <button
                  type="button"
                  onClick={onClear}
                  disabled={isProcessing}
                  className="w-full px-4 py-2 border border-zinc-700 text-zinc-400 text-xs uppercase tracking-widest hover:border-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Note */}
      <div className="p-4 border-t border-zinc-800 text-center text-zinc-600 text-xs">
        90-day retention period • Restore anytime
      </div>
    </div>
  );
}

