import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { Blurhash } from "react-blurhash";
import { Loader2 } from "lucide-react";

/**
 * Validates if a blurhash string is valid
 * A valid blurhash must be at least 6 characters
 */
const isValidBlurhash = (hash: string | null | undefined): boolean => {
    if (!hash || typeof hash !== 'string') return false;
    // Basic validation: blurhash should be at least 6 chars
    return hash.length >= 6;
};

interface BlurhashImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    trueSrc: string;
    blurhash: string;
    alt: string;
    className?: string;
    onClick?: () => void;
}

const BlurhashImage = ({
    src,
    blurhash,
    alt,
    className,
    trueSrc,
    onClick,
    style,
    ...props
}: BlurhashImageProps) => {
    const [displaySrc, setDisplaySrc] = useState(src);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    const hasValidBlurhash = useMemo(() => isValidBlurhash(blurhash), [blurhash]);

    useEffect(() => {
        // Progressive load: show `src` quickly, then swap to `trueSrc` once it loads.
        let cancelled = false;
        setDisplaySrc(src);
        setLoaded(false);
        setError(false);

        const low = new Image();
        low.src = src;

        low.onload = () => {
            if (cancelled) return;
            setLoaded(true);
        };

        low.onerror = () => {
            if (cancelled) return;
            setError(true);
            // If low-res fails, try the high-res directly.
            if (trueSrc && trueSrc !== src) {
                setDisplaySrc(trueSrc);
            }
        };

        // Kick off hi-res load in background (don’t block low-res render).
        if (trueSrc && trueSrc !== src) {
            const hi = new Image();
            hi.src = trueSrc;
            hi.onload = () => {
                if (cancelled) return;
                setDisplaySrc(trueSrc);
                setLoaded(true);
            };
        }

        return () => {
            cancelled = true;
        };
    }, [src, trueSrc]);

    return (
        <div
            onClick={onClick}
            className={cn(
                "cursor-pointer rounded-lg overflow-hidden",
                onClick && "hover:ring-2 hover:ring-blue-500/50 transition-all"
            )}
        >
            <div className={cn("relative w-full h-full", className)} style={style}>
                {/* Placeholder layer - shows blurhash or loading spinner */}
                <div
                    className={cn(
                        "absolute inset-0 transition-opacity duration-300",
                        loaded ? "opacity-0 pointer-events-none" : "opacity-100"
                    )}
                >
                    {hasValidBlurhash ? (
                        <Blurhash
                            hash={blurhash}
                            width="100%"
                            height="100%"
                            className="rounded-lg"
                            resolutionX={32}
                            resolutionY={32}
                            punch={1}
                        />
                    ) : (
                        // Fallback for no blurhash - subtle loading state
                        <div className="w-full h-full bg-slate-800/50 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                        </div>
                    )}
                </div>

                {/* Actual image */}
                <img
                    {...props}
                    src={displaySrc}
                    alt={alt}
                    loading="lazy"
                    className={cn(
                        "w-full h-full object-contain transition-opacity duration-300 rounded-lg",
                        loaded ? "opacity-100" : "opacity-0"
                    )}
                    onLoad={() => setLoaded(true)}
                    onError={() => {
                        if (!error && trueSrc && trueSrc !== src) {
                            setError(true);
                        }
                    }}
                />
            </div>
        </div>
    );
};

export default BlurhashImage;