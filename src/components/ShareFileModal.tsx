import { useState, type FormEvent } from "react";
import { X, Loader2, Share2, Copy, Check, Clock, Link2 } from "lucide-react";
import { axiosInstanceAuth } from "@/api/axios";

interface ShareFileModalProps {
    file: {
        id: string;
        name: string;
        isPrivate?: boolean;
    };
    onClose: () => void;
}

type ExpirationOption = '1h' | '24h' | '7d' | '30d' | 'never';

const expirationOptions: { value: ExpirationOption; label: string; seconds: number | null }[] = [
    { value: '1h', label: '1 Hour', seconds: 3600 },
    { value: '24h', label: '24 Hours', seconds: 86400 },
    { value: '7d', label: '7 Days', seconds: 604800 },
    { value: '30d', label: '30 Days', seconds: 2592000 },
    { value: 'never', label: 'Never', seconds: null },
];

const ShareFileModal = ({ file, onClose }: ShareFileModalProps) => {
    const [expiration, setExpiration] = useState<ExpirationOption>(file.isPrivate ? '24h' : 'never');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [directUrl, setDirectUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [copiedDirect, setCopiedDirect] = useState(false);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        setIsLoading(true);
        setError(null);

        try {
            const selectedOption = expirationOptions.find(o => o.value === expiration);
            const expiresIn = selectedOption?.seconds;

            const response = await axiosInstanceAuth.post('/file/share-file', {
                fileId: file.id,
                expiresIn,
            });

            if (response.data?.status === 'success') {
                const { url, shareUrl, directUrl, directExpiresIn } = response.data.data;
                setShareUrl(shareUrl || url);
                setDirectUrl(directUrl || null);

                if (directExpiresIn) {
                    setExpiresAt(new Date(Date.now() + directExpiresIn * 1000));
                }
            } else {
                throw new Error(response.data?.message || 'Failed to create share link');
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Failed to create share link');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async () => {
        if (shareUrl) {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleCopyDirect = async () => {
        if (directUrl) {
            await navigator.clipboard.writeText(directUrl);
            setCopiedDirect(true);
            setTimeout(() => setCopiedDirect(false), 2000);
        }
    };

    const handleWebShare = async () => {
        if (shareUrl && navigator.share) {
            try {
                await navigator.share({
                    title: file.name,
                    text: `Check out this file: ${file.name}`,
                    url: shareUrl,
                });
            } catch (err) {
                // User cancelled or error
                console.log('Share cancelled or failed');
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-gradient-to-br from-indigo-900 to-blue-900 rounded-2xl shadow-2xl border border-white/10">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <Share2 className="text-blue-400" size={24} />
                        <div>
                            <h2 className="text-xl font-semibold text-white">Share File</h2>
                            <p className="text-sm text-white/60 truncate max-w-[200px]">{file.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                {shareUrl ? (
                    // Success state - show share link
                    <div className="p-6">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                                <Check className="text-green-400" size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">Share link created!</h3>
                            <p className="text-white/60 text-sm">Copy the link below to share this file</p>
                        </div>

                        {expiresAt && (
                            <div className="flex items-center justify-center gap-2 mb-4 text-sm text-yellow-300/80">
                                <Clock size={14} />
                                <span>Expires {expiresAt.toLocaleString()}</span>
                            </div>
                        )}

                        <div className="mb-4">
                            <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-2">Share Link</p>
                            <div className="flex items-center gap-2 p-3 bg-white/10 rounded-lg">
                                <input
                                    type="text"
                                    value={shareUrl}
                                    readOnly
                                    className="flex-1 bg-transparent text-white text-sm outline-none"
                                />
                                <button
                                    onClick={handleCopy}
                                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    title="Copy share link"
                                >
                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>

                        {directUrl && (
                            <div className="mb-4">
                                <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-2">
                                    Direct Link {expiresAt ? "(expires)" : ""}
                                </p>
                                <div className="flex items-center gap-2 p-3 bg-white/10 rounded-lg">
                                    <input
                                        type="text"
                                        value={directUrl}
                                        readOnly
                                        className="flex-1 bg-transparent text-white text-sm outline-none"
                                    />
                                    <button
                                        onClick={handleCopyDirect}
                                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                        title="Copy direct link"
                                    >
                                        {copiedDirect ? <Check size={18} /> : <Copy size={18} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                                <button
                                    onClick={handleWebShare}
                                    className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2"
                                >
                                    <Share2 size={18} />
                                    Share
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 px-4 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    // Form state
                    <form onSubmit={handleSubmit} className="p-6">
                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
                                {error}
                            </div>
                        )}

                        {file.isPrivate && (
                            <div className="mb-4 p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 text-sm flex items-center gap-2">
                                <Clock size={16} />
                                <span>Share Link uses the /s share surface. Direct Link is an expiring URL.</span>
                            </div>
                        )}

                        {/* Expiration selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-blue-200 mb-3">
                                Link expiration
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {expirationOptions.map((option) => {
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setExpiration(option.value)}
                                            className={`p-3 rounded-lg border transition-all ${expiration === option.value
                                                ? 'bg-blue-600/30 border-blue-500'
                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            <p className="font-medium text-white text-sm">{option.label}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 px-4 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Link2 size={18} />
                                        Generate Link
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ShareFileModal;
