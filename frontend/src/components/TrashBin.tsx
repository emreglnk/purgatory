import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { GLOBAL_PURGATORY_ID, PURGATORY_PACKAGE_ID } from "../config/constants";
import { useState, useEffect } from "react";
import { TokenIcon } from "./TokenIcon";

interface TrashBinProps {
  onRestore: (objectId: string, objectType: string) => void;
  refreshTrigger?: number;
}

interface PurgatoryItem {
  objectId: string;
  objectType: string;
  depositTime: number;
  daysRemaining: number;
}

export function TrashBin({ onRestore, refreshTrigger }: TrashBinProps) {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const [items, setItems] = useState<PurgatoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!account) {
      setItems([]);
      return;
    }

    const fetchPurgatoryItems = async () => {
      try {
        setIsLoading(true);

        // Query events to find items thrown by this user
        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${PURGATORY_PACKAGE_ID}::core::ItemThrown`,
          },
          limit: 50,
        });

        const userItems: PurgatoryItem[] = [];
        const now = Date.now();

        for (const event of events.data) {
          const { item_id, original_owner, timestamp } = event.parsedJson as any;

          // Only show items owned by current user
          if (original_owner !== account.address) continue;

          // Check if item was restored
          const restoredEvents = await suiClient.queryEvents({
            query: {
              MoveEventType: `${PURGATORY_PACKAGE_ID}::core::ItemRestored`,
            },
            limit: 50,
          });

          const wasRestored = restoredEvents.data.some(
            (e: any) => e.parsedJson.item_id === item_id
          );

          if (wasRestored) continue;

          // Check if item was purged
          const purgedEvents = await suiClient.queryEvents({
            query: {
              MoveEventType: `${PURGATORY_PACKAGE_ID}::core::ItemPurged`,
            },
            limit: 50,
          });

          const wasPurged = purgedEvents.data.some(
            (e: any) => e.parsedJson.item_id === item_id
          );

          if (wasPurged) continue;

          // Try to get object type (might fail if already purged)
          try {
            const obj = await suiClient.getObject({
              id: item_id,
              options: { showType: true },
            });

            if (obj.data?.type) {
              const depositTime = parseInt(timestamp);
              const retentionPeriod = 90 * 24 * 60 * 60 * 1000; // 90 days in ms
              const expiryTime = depositTime + retentionPeriod;
              const daysRemaining = Math.max(
                0,
                Math.ceil((expiryTime - now) / (24 * 60 * 60 * 1000))
              );

              userItems.push({
                objectId: item_id,
                objectType: obj.data.type,
                depositTime,
                daysRemaining,
              });
            }
          } catch {
            // Object might be purged or deleted, skip
            continue;
          }
        }

        setItems(userItems);
      } catch (error) {
        console.error("Error fetching purgatory items:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurgatoryItems();
  }, [account, suiClient, refreshTrigger]);

  if (!account) {
    return (
      <div className="border-2 border-zinc-800 rounded-lg bg-zinc-900/20 flex flex-col h-[600px]">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/80">
          <h3 className="font-bold uppercase tracking-wider text-red-500">Trash Bin</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
          <span className="text-xl font-bold uppercase">Connect Wallet</span>
          <span className="text-sm mt-2">View items in purgatory</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-zinc-800 rounded-lg bg-zinc-900/20 flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 flex justify-between items-center">
        <h3 className="font-bold uppercase tracking-wider text-red-500">Trash Bin</h3>
        <span className="text-xs text-zinc-500 uppercase">{items.length} Items</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-zinc-500 animate-pulse uppercase tracking-widest text-sm">
              Scanning...
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
            <img src="/flame-logo.svg" alt="Flame" className="w-24 h-24 opacity-20" />
            <div className="text-center space-y-2">
              <p className="uppercase tracking-widest text-sm">Empty</p>
              <p className="text-xs">No items in purgatory</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const typeName = item.objectType.split("::").pop() || "Unknown";
              return (
                <div
                  key={item.objectId}
                  className="group flex gap-3 p-3 border border-zinc-800 rounded-sm bg-zinc-900/50 hover:border-zinc-600 transition-colors"
                >
                  {/* Icon */}
                  <div className="shrink-0">
                    <TokenIcon name={typeName} type={item.objectType} className="w-10 h-10" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <div className="text-sm text-zinc-300 font-bold truncate">
                        {typeName}
                      </div>
                      <div className="text-xs text-zinc-600 font-mono truncate">
                        {item.objectId}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {item.daysRemaining} days remaining
                      </div>
                    </div>

                    <button
                      onClick={() => onRestore(item.objectId, item.objectType)}
                      className="w-full py-2 text-xs uppercase tracking-widest border border-zinc-700 text-zinc-400 hover:border-red-500 hover:text-red-500 transition-colors"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800 text-center text-zinc-600 text-xs">
        {items.length > 0
          ? "Click restore to reclaim items"
          : "Disposed items will appear here"}
      </div>
    </div>
  );
}

