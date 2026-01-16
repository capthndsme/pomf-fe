import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { BRANDING } from "@/constants";
import { axiosInstanceAuthOptional } from "@/api/axios";
import {
    Folder,
    File,
    Image as ImageIcon,
    Video,
    FileText,
    Music,
    Download,
    Lock,
    Loader2,
    AlertCircle,
    Clock,
    User
} from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { buildPublicUrl } from "@/lib/fileViewUrls";

interface FileItem {
    id: string;
    name: string;
    isFolder: boolean;
    fileType?: string;
    mimeType?: string;
    fileKey?: string;
    previewKey?: string;
    fileSize?: number;
    serverShard?: {
        domain: string;
    };
}

interface ShareData {
    share: {
        id: string;
        name: string | null;
        shareType: string;
        expiresAt: string | null;
    };
    folder: {
        id: string;
        name: string;
    };
    files: FileItem[];
    displayMode: 'album' | 'list';
    imageRatio: number;
    owner?: {
        username: string;
        fullName: string | null;
    };
}

const getFileIcon = (fileType?: string, mimeType?: string) => {
    if (mimeType?.startsWith('image/') || fileType === 'IMAGE') return <ImageIcon size={24} className="text-pink-400" />;
    if (mimeType?.startsWith('video/') || fileType === 'VIDEO') return <Video size={24} className="text-purple-400" />;
    if (mimeType?.startsWith('audio/') || fileType === 'AUDIO') return <Music size={24} className="text-green-400" />;
    if (mimeType?.startsWith('text/') || fileType === 'PLAINTEXT') return <FileText size={24} className="text-yellow-400" />;
    return <File size={24} className="text-blue-400" />;
};

const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

const SharedFolder = ({ shareIdOverride }: { shareIdOverride?: string }) => {
    const params = useParams<{ shareId?: string; id?: string }>();
    const shareId = shareIdOverride ?? params.shareId ?? params.id;

    const [shareData, setShareData] = useState<ShareData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);

    // Password protection
    const [needsPassword, setNeedsPassword] = useState(false);
    const [password, setPassword] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);

    // Lightbox for album view
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Fetch share data
    useEffect(() => {
        const fetchShare = async () => {
            if (!shareId) return;

            setIsLoading(true);
            setError(null);
            setErrorCode(null);

            try {
                const response = await axiosInstanceAuthOptional.get(`/file/share/${shareId}`);

                if (response.data?.status === 'success') {
                    setShareData(response.data.data);
                    setNeedsPassword(false);
                } else {
                    throw new Error(response.data?.message || 'Failed to load share');
                }
            } catch (err: any) {
                const code = err?.response?.data?.status;
                if (code === 'password-required') {
                    setNeedsPassword(true);
                } else if (code === 'share-expired') {
                    setError('This share has expired');
                    setErrorCode('expired');
                } else if (code === 'share-not-found') {
                    setError('Share not found');
                    setErrorCode('not-found');
                } else {
                    setError(err?.response?.data?.message || err?.message || 'Failed to load share');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchShare();
    }, [shareId]);

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password) return;

        setIsVerifying(true);
        setError(null);

        try {
            const response = await axiosInstanceAuthOptional.post(`/file/share/${shareId}/verify`, {
                password,
            });

            if (response.data?.status === 'success') {
                setShareData(response.data.data);
                setNeedsPassword(false);
            } else {
                throw new Error(response.data?.message || 'Invalid password');
            }
        } catch (err: any) {
            if (err?.response?.data?.status === 'invalid-password') {
                setError('Incorrect password');
            } else {
                setError(err?.response?.data?.message || 'Verification failed');
            }
        } finally {
            setIsVerifying(false);
        }
    };

    // Get image files for lightbox
    const imageFiles = shareData?.files.filter(f =>
        !f.isFolder && (f.mimeType?.startsWith('image/') || f.fileType === 'IMAGE')
    ) || [];

        const lightboxSlides = imageFiles.map(file => ({
        src: buildPublicUrl(file.serverShard?.domain, file.fileKey) ?? '',
        title: file.name,
    }));

    const openLightbox = (file: FileItem) => {
        const index = imageFiles.findIndex(f => f.id === file.id);
        if (index !== -1) {
            setLightboxIndex(index);
            setLightboxOpen(true);
        }
    };

    return (
        <>
            <Helmet>
                <title>{shareData?.share?.name || shareData?.folder?.name || 'Shared Folder'} - {BRANDING ?? "pomfd"}</title>
            </Helmet>

            <div className="min-h-screen pt-20 pb-8">
                {/* Loading */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-white" size={32} />
                    </div>
                )}

                {/* Error */}
                {!isLoading && error && !needsPassword && (
                    <div className="max-w-md mx-auto p-4">
                        <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-8 text-center">
                            {errorCode === 'expired' ? (
                                <Clock className="mx-auto text-red-400 mb-4" size={48} />
                            ) : (
                                <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
                            )}
                            <h2 className="text-xl font-semibold text-white mb-2">{error}</h2>
                            <p className="text-white/60">
                                {errorCode === 'expired' ? 'The owner may need to create a new share.' : 'Please check the link and try again.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Password form */}
                {!isLoading && needsPassword && (
                    <div className="max-w-md mx-auto p-4">
                        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-2xl p-8 shadow-2xl border border-white/10">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                                    <Lock className="text-indigo-400" size={32} />
                                </div>
                                <h2 className="text-xl font-semibold text-white mb-2">Password Protected</h2>
                                <p className="text-white/60">Enter the password to view this shared folder</p>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handlePasswordSubmit}>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all mb-4"
                                    placeholder="Enter password"
                                    autoFocus
                                    disabled={isVerifying}
                                />
                                <button
                                    type="submit"
                                    disabled={isVerifying || !password}
                                    className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isVerifying ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Verifying...
                                        </>
                                    ) : (
                                        "Unlock"
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Share content */}
                {!isLoading && shareData && (
                    <div className="max-w-5xl mx-auto p-4">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-2">
                                <Folder className="text-yellow-400" size={32} />
                                <h1 className="text-2xl font-bold text-white">
                                    {shareData.share.name || shareData.folder.name}
                                </h1>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-white/60">
                                {shareData.owner && (
                                    <span className="flex items-center gap-1">
                                        <User size={14} />
                                        Shared by {shareData.owner.fullName || shareData.owner.username}
                                    </span>
                                )}
                                <span>{shareData.files.length} items</span>
                                {shareData.displayMode === 'album' && (
                                    <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-xs">
                                        Album ({Math.round(shareData.imageRatio * 100)}% images)
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Empty state */}
                        {shareData.files.length === 0 && (
                            <div className="text-center py-20">
                                <Folder size={64} className="mx-auto text-white/20 mb-4" />
                                <h2 className="text-xl font-medium text-white mb-2">This folder is empty</h2>
                            </div>
                        )}

                        {/* Album view */}
                        {shareData.displayMode === 'album' && shareData.files.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {shareData.files.filter(f => !f.isFolder).map((file) => {
                                    const isImage = file.mimeType?.startsWith('image/') || file.fileType === 'IMAGE';
                                    const imageUrl =
                                        buildPublicUrl(file.serverShard?.domain, file.previewKey) ??
                                        buildPublicUrl(file.serverShard?.domain, file.fileKey) ??
                                        '';

                                    return (
                                        <div
                                            key={file.id}
                                            className={`aspect-square rounded-xl overflow-hidden bg-white/5 ${isImage ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                                            onClick={() => isImage && openLightbox(file)}
                                        >
                                            {isImage ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                                    {getFileIcon(file.fileType, file.mimeType)}
                                                    <p className="mt-2 text-sm text-white/60 truncate max-w-full">{file.name}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* List view */}
                        {shareData.displayMode === 'list' && shareData.files.length > 0 && (
                            <div className="space-y-2">
                                {shareData.files.map((file) => {
                                    const downloadUrl = buildPublicUrl(file.serverShard?.domain, file.fileKey) ?? '';

                                    return (
                                        <div
                                            key={file.id}
                                            className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {file.isFolder ? (
                                                    <Folder className="text-yellow-400 flex-shrink-0" size={24} />
                                                ) : (
                                                    <span className="flex-shrink-0">
                                                        {getFileIcon(file.fileType, file.mimeType)}
                                                    </span>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-medium text-white truncate">{file.name}</p>
                                                    <p className="text-sm text-white/40">{formatFileSize(file.fileSize)}</p>
                                                </div>
                                            </div>

                                            {!file.isFolder && downloadUrl && (
                                                <a
                                                    href={downloadUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                                    title="Download"
                                                >
                                                    <Download size={18} />
                                                </a>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                index={lightboxIndex}
                slides={lightboxSlides}
            />
        </>
    );
};

export default SharedFolder;
