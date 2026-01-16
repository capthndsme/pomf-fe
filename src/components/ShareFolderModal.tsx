import { useState, type FormEvent } from "react";
import { X, Loader2, Share2, Copy, Check, Globe, Link2, Lock } from "lucide-react";
import { axiosInstanceAuth } from "@/api/axios";

interface ShareFolderModalProps {
    folder: {
        id: string;
        name: string;
    };
    onClose: () => void;
}

type ShareType = 'public' | 'link-only' | 'password-protected';

const ShareFolderModal = ({ folder, onClose }: ShareFolderModalProps) => {
    const [shareType, setShareType] = useState<ShareType>('link-only');
    const [password, setPassword] = useState("");
    const [shareName, setShareName] = useState(folder.name);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (shareType === 'password-protected' && !password) {
            setError("Password is required for protected shares");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await axiosInstanceAuth.post('/file/share', {
                folderId: folder.id,
                shareType,
                password: shareType === 'password-protected' ? password : undefined,
                name: shareName || folder.name,
            });

            if (response.data?.status === 'success') {
                const shareId = response.data.data.id;
                // Use the canonical share surface so links are embeddable/stable.
                const url = `${window.location.origin}/s/${shareId}`;
                setShareUrl(url);
            } else {
                throw new Error(response.data?.message || 'Failed to create share');
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Failed to create share');
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

    const shareTypeOptions = [
        { value: 'public', icon: Globe, label: 'Public', description: 'Anyone can find and access' },
        { value: 'link-only', icon: Link2, label: 'Link Only', description: 'Only people with the link' },
        { value: 'password-protected', icon: Lock, label: 'Password', description: 'Requires password to view' },
    ] as const;

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
                            <h2 className="text-xl font-semibold text-white">Share Folder</h2>
                            <p className="text-sm text-white/60">{folder.name}</p>
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
                            <p className="text-white/60 text-sm">Copy the link below to share this folder</p>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-white/10 rounded-lg mb-6">
                            <input
                                type="text"
                                value={shareUrl}
                                readOnly
                                className="flex-1 bg-transparent text-white text-sm outline-none"
                            />
                            <button
                                onClick={handleCopy}
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-3 px-4 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    // Form state
                    <form onSubmit={handleSubmit} className="p-6">
                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Share Name */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-blue-200 mb-2">
                                Share Name
                            </label>
                            <input
                                type="text"
                                value={shareName}
                                onChange={(e) => setShareName(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="What should this share be called?"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Share Type */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-blue-200 mb-3">
                                Who can access?
                            </label>
                            <div className="space-y-2">
                                {shareTypeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setShareType(option.value)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${shareType === option.value
                                                ? 'bg-blue-600/30 border-blue-500'
                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                            }`}
                                        disabled={isLoading}
                                    >
                                        <option.icon size={20} className={shareType === option.value ? 'text-blue-400' : 'text-white/60'} />
                                        <div className="text-left">
                                            <p className="font-medium text-white">{option.label}</p>
                                            <p className="text-xs text-white/50">{option.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Password field (conditional) */}
                        {shareType === 'password-protected' && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-blue-200 mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="Enter share password"
                                    disabled={isLoading}
                                />
                            </div>
                        )}

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
                                        Creating...
                                    </>
                                ) : (
                                    "Create Share"
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ShareFolderModal;
