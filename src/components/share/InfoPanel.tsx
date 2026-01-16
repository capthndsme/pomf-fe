import { cn } from "@/lib/utils";
import { TouchableLink } from "@/components/TouchableLink";
import {
    Download,
    ExternalLink,
    FileIcon,
    HardDrive,
    Calendar,
    FileType,
    Sparkles,
    X,
    Share2
} from "lucide-react";
import type FileItem from "../../../types/response/FileItem";
import { TranscodingBadge } from "./TranscodingBadge";
import { CopyButton } from "./CopyButton";
import { MetaItem } from "./MetaItem";
import { formatFileSize, formatRelativeTime } from "./formatters";

/**
 * Info Panel (collapsible on mobile)
 * Shows file details, links, and actions
 */
export const InfoPanel = ({
    file,
    directUrl,
    shareUrl,
    isOpen,
    onClose,
    onShare,
}: {
    file: FileItem;
    directUrl: string | null;
    shareUrl?: string;
    isOpen: boolean;
    onClose: () => void;
    onShare?: () => void;
}) => {
    const canPreview = file.fileType === 'IMAGE' || file.fileType === 'VIDEO' || file.fileType === 'AUDIO';
    const displayShareUrl = shareUrl || window.location.href;

    return (
        <div className={cn(
            "fixed inset-x-0 bottom-0 z-50 lg:static lg:z-auto",
            "bg-slate-900/95 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none",
            "rounded-t-3xl lg:rounded-none border-t lg:border-t-0 border-slate-700/50 lg:border-none",
            "transition-transform duration-300 ease-out",
            "lg:transform-none",
            isOpen ? "translate-y-0" : "translate-y-full lg:translate-y-0"
        )}>
            {/* Mobile header with close */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800/50">
                <h2 className="text-lg font-semibold text-white">File Details</h2>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            <div className="max-h-[70vh] lg:max-h-none overflow-y-auto">
                {/* Header */}
                <div className="p-4 lg:p-6 border-b border-slate-800/50">
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 flex items-center justify-center shrink-0">
                            <FileIcon className="w-5 h-5 text-blue-400" />
                        </div>
                        {canPreview && <TranscodingBadge status={file.transcodeStatus} />}
                    </div>
                    <h1 className="text-lg lg:text-xl font-bold text-white leading-tight break-words mb-1">
                        {file.originalFileName || file.name || "Untitled"}
                    </h1>
                    <p className="text-xs text-slate-400">
                        Hosted on {file.serverShard?.domain || "cloud storage"}
                    </p>
                </div>

                {/* Content */}
                <div className="p-4 lg:p-6 space-y-4">
                    {/* Share Link */}
                    <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Share Link</p>
                        <div className="flex items-center gap-1">
                            <code className="flex-1 text-xs text-blue-400 font-mono break-all line-clamp-2">
                                {displayShareUrl}
                            </code>
                            <CopyButton text={displayShareUrl} size="sm" />
                        </div>
                    </div>

                    {/* Direct Link */}
                    {directUrl && (
                        <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Direct Link</p>
                            <div className="flex items-center gap-1">
                                <code className="flex-1 text-xs text-emerald-400 font-mono break-all line-clamp-2">
                                    {directUrl}
                                </code>
                                <CopyButton text={directUrl} size="sm" />
                            </div>
                        </div>
                    )}

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4 pt-1">
                        <MetaItem
                            icon={HardDrive}
                            label="File Size"
                            value={formatFileSize(file.fileSize)}
                        />
                        <MetaItem
                            icon={FileType}
                            label="File Type"
                            value={file.mimeType?.split('/')[1]?.toUpperCase() || file.fileType || "–"}
                        />
                        <MetaItem
                            icon={Calendar}
                            label="Uploaded"
                            value={formatRelativeTime(file.createdAt)}
                        />
                        {file.itemWidth && file.itemHeight && (
                            <MetaItem
                                icon={Sparkles}
                                label="Dimensions"
                                value={`${file.itemWidth} × ${file.itemHeight}`}
                            />
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 lg:p-6 border-t border-slate-800/50 bg-slate-900/30">
                    <div className="grid gap-2">
                        {directUrl && (
                            <TouchableLink
                                to={directUrl}
                                download={file.originalFileName || "file"}
                                className="flex items-center justify-center gap-2 w-full h-11 bg-white hover:bg-slate-200 text-slate-900 font-semibold rounded-xl transition-all shadow-lg active:scale-[0.98]"
                            >
                                <Download className="w-4 h-4" />
                                Download File
                            </TouchableLink>
                        )}
                        {onShare && (
                            <button
                                onClick={onShare}
                                className="flex items-center justify-center gap-2 w-full h-11 bg-slate-800/50 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl transition-all border border-slate-700/50"
                            >
                                <Share2 className="w-4 h-4" />
                                Share Link
                            </button>
                        )}
                        {directUrl && (
                            <a
                                href={directUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full h-11 bg-slate-800/50 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl transition-all border border-slate-700/50"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Open in Browser
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
