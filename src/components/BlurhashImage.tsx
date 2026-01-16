import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Blurhash } from "react-blurhash";

const BlurhashImage = ({
    src,
    blurhash,
    alt,
    className,
    trueSrc,
    onClick,
    ...props
}: {
    src: string;
    trueSrc: string
    blurhash: string;
    alt: string;
    className?: string;
    onClick?: () => void;
} & React.ImgHTMLAttributes<HTMLImageElement>) => {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            setLoaded(true);
        };
    }, [src]);

    return (
        <div onClick={onClick} className="cursor-pointer rounuded-lg  overflow-clip">
            <div className={cn("relative w-full h-full", className)}>
                <div
                    className={cn(
                        "absolute top-0 left-0 w-full h-full transition-opacity",
                        loaded ? "opacity-0" : "opacity-100"
                    )}
                >
                    <Blurhash
                        hash={blurhash}
                        width="100%"
                        height="100%"
                        className="rounded-lg overflow-clip"
                        resolutionX={32}
                        resolutionY={32}
                        punch={1}
                    />
                </div>
                <img
                    {...props}
                    src={src}
                    alt={alt}
                    className={cn(
                        "w-full h-full transition-opacity rounded-lg",
                        loaded ? "opacity-100" : "opacity-0"
                    )}
                />
            </div>
        </div>
    );
};

export default BlurhashImage;