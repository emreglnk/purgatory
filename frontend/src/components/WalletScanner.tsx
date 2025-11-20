import { useCurrentAccount, useSuiClientInfiniteQuery } from "@mysten/dapp-kit";
import { useEffect } from "react";
import { TokenIcon, getCoinIconUrl } from "./TokenIcon";

interface WalletScannerProps {
  onSelectItem: (objectId: string) => void;
  selectedItems: Set<string>;
}

export function WalletScanner({ onSelectItem, selectedItems }: WalletScannerProps) {
  const account = useCurrentAccount();

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useSuiClientInfiniteQuery(
      "getOwnedObjects",
      {
        owner: account?.address || "",
        options: {
          showDisplay: true,
          showType: true,
          showContent: true,
        },
      },
      {
        enabled: !!account,
        staleTime: 5000,
      }
    );

  // Refetch when account changes
  useEffect(() => {
    if (account) {
      refetch();
    }
  }, [account, refetch]);

  // Flatten all pages into a single list of objects
  const allObjects = data?.pages.flatMap((page) => page.data) || [];

  // Filter out SUI coins and system objects
  const filteredObjects = allObjects.filter((obj) => {
    const type = obj.data?.type || "";
    // Exclude SUI coins and UpgradeCap
    if (type.includes("0x2::coin::Coin<0x2::sui::SUI>")) return false;
    if (type.includes("::package::UpgradeCap")) return false;
    return true;
  });

  if (!account) {
    return (
      <div className="border-2 border-dashed border-zinc-800 rounded-lg p-8 min-h-[400px] flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/20">
        <span className="text-xl font-bold uppercase">Wallet Disconnected</span>
        <span className="text-sm mt-2">Connect wallet to scan for junk</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border-2 border-zinc-800 rounded-lg p-8 min-h-[400px] flex flex-col items-center justify-center text-zinc-500 animate-pulse bg-zinc-900/20">
        <span className="text-xl font-bold uppercase">Scanning Sector...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border-2 border-red-900/50 rounded-lg p-8 min-h-[400px] flex flex-col items-center justify-center text-red-500 bg-red-900/10">
        <span className="text-xl font-bold uppercase">Scan Failed</span>
        <span className="text-sm mt-2">Error: {error?.message}</span>
      </div>
    );
  }

  return (
    <div className="border-2 border-zinc-800 rounded-lg bg-zinc-900/20 flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80">
        <h3 className="font-bold uppercase tracking-wider text-zinc-300">Wallet Inventory</h3>
        <span className="text-xs text-zinc-500 uppercase">{filteredObjects.length} Items</span>
      </div>

      {/* Object List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {filteredObjects.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600 uppercase tracking-widest text-sm">
            Sector Empty
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {filteredObjects.map((obj) => {
              const objectId = obj.data?.objectId || "";
              const type = obj.data?.type || "Unknown";
              const shortType = type.split("::").pop() || type;
              const display = obj.data?.display?.data;
              const name = display?.name || shortType;
              
              // Get image URL - prioritize display, then coin registry
              let imageUrl = display?.image_url;
              if (!imageUrl && type.includes("::coin::Coin")) {
                imageUrl = getCoinIconUrl(type.replace("0x2::coin::Coin<", "").replace(">", ""));
              }
              
              const isSelected = selectedItems.has(objectId);

              return (
                <div
                  key={objectId}
                  onClick={() => onSelectItem(objectId)}
                  className={`group flex items-center gap-4 p-3 border rounded-sm cursor-pointer transition-all ${
                    isSelected
                      ? "bg-red-900/20 border-red-500/50"
                      : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50"
                  }`}
                >
                  {/* Checkbox Indicator */}
                  <div
                    className={`w-5 h-5 border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-red-600 border-red-600"
                        : "border-zinc-700 group-hover:border-zinc-500"
                    }`}
                  >
                    {isSelected && <div className="w-3 h-3 bg-black" />}
                  </div>

                  {/* Image / Icon */}
                  <div className="shrink-0">
                    <TokenIcon name={name} imageUrl={imageUrl} type={type} className="w-12 h-12" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate text-zinc-200 group-hover:text-white">
                      {name}
                    </div>
                    <div className="text-xs text-zinc-500 truncate font-mono" title={type}>
                      {shortType}
                    </div>
                    <div className="text-[10px] text-zinc-600 font-mono truncate">
                      {objectId}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Load More Trigger */}
            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full py-3 text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 transition-colors"
              >
                {isFetchingNextPage ? "Scanning..." : "Load More"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

