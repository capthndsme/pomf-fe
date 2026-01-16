import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

/**
 * Copy Button Component
 * Copies text to clipboard with visual feedback
 */
export const CopyButton = ({ text, size = "md" }: { text: string; size?: "sm" | "md" }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const sizeClasses = size === "sm" ? "p-2" : "p-3";
    const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

    return (
        <button
            onClick={handleCopy}
            className={cn(
                "shrink-0 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white",
                sizeClasses
            )}
            title="Copy link"
        >
            {copied ? <Check className={cn(iconSize, "text-emerald-400")} /> : <Copy className={iconSize} />}
        </button>
    );
};
