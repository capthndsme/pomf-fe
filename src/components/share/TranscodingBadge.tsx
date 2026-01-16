
import { Sparkles, Loader2, Clock, AlertCircle } from "lucide-react";

/**
 * Transcoding Status Badge
 * Shows the current transcoding state of a file
 */
export const TranscodingBadge = ({ status }: { status: string | null }) => {
    if (status === 'finished') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                Optimized
            </span>
        );
    }

    if (status === 'pending') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing
            </span>
        );
    }

    if (status === 'invalid-file') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                Failed
            </span>
        );
    }

    // null = not started yet
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Clock className="w-3.5 h-3.5" />
            Queued
        </span>
    );
};
