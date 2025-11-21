import { getAssetPath } from "../lib/assets";

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  className?: string;
}

export function ImageWithFallback({ src, alt, className = "" }: ImageWithFallbackProps) {
  const fallbackSrc = getAssetPath("/flame-logo.svg");
  
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = fallbackSrc;
    e.currentTarget.onerror = null;
  };

  return (
    <img
      src={src || fallbackSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
}

interface TokenIconProps {
  name: string;
  imageUrl?: string;
  className?: string;
  type?: string; // full type string to determine if coin or NFT
}

export function TokenIcon({ name, imageUrl, className = "w-12 h-12", type = "" }: TokenIconProps) {
  if (imageUrl) {
    return <ImageWithFallback src={imageUrl} alt={name} className={className} />;
  }

  // Determine if this is a coin or NFT
  const isCoin = type.includes("::coin::Coin");
  
  // Fallback: Show first letter with red background
  const firstLetter = name.charAt(0).toUpperCase();
  
  // Coins: rounded, NFTs: square
  const shapeClass = isCoin ? "rounded-full" : "rounded-sm";

  return (
    <div
      className={`${className} ${shapeClass} bg-red-600 flex items-center justify-center text-white font-bold text-lg border-2 border-zinc-800`}
    >
      {firstLetter}
    </div>
  );
}

// Helper to get coin icon URL from a registry
export function getCoinIconUrl(coinType: string): string | undefined {
  const coinRegistry: Record<string, string> = {
    "0x2::sui::SUI": "https://cryptologos.cc/logos/sui-sui-logo.svg",
    // Add more coins as needed
  };

  return coinRegistry[coinType];
}

