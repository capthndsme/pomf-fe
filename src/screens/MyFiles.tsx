import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { BRANDING } from "@/constants";
import { useAuth } from "@/providers/AuthProvider";
import { axiosInstanceAuth } from "@/api/axios";
import {
    Folder,
    File,
    Image,
    Video,
    FileText,
    Music,
    Plus,
    Share2,
    ChevronRight,
    Home,
    Loader2,
    Upload,
    MoreVertical,
    Lock,
    Link as LinkIcon,
    Check
} from "lucide-react";
import CreateFolderModal from "@/components/CreateFolderModal";
import ShareFolderModal from "@/components/ShareFolderModal";
import ShareFileModal from "@/components/ShareFileModal";
import UploadQueue from "@/components/UploadQueue";
import { useUploader } from "@/providers/UploaderProvider";
import { useAttachmentViewer } from "@/providers/AttachmentViewerProvider";
import type FileItem from "../../types/response/FileItem";
import { toSharedFileUrl } from "@/lib/shareLinks";

interface Breadcrumb {
    id: string | null;
    name: string;
}

const getFileIcon = (fileType?: string | null, mimeType?: string | null) => {
    if (mimeType?.startsWith('image/') || fileType === 'IMAGE') return <Image size={24} className="text-pink-400" />;
    if (mimeType?.startsWith('video/') || fileType === 'VIDEO') return <Video size={24} className="text-purple-400" />;
    if (mimeType?.startsWith('audio/') || fileType === 'AUDIO') return <Music size={24} className="text-green-400" />;
    if (mimeType?.startsWith('text/') || fileType === 'PLAINTEXT') return <FileText size={24} className="text-yellow-400" />;
    return <File size={24} className="text-blue-400" />;
};

const formatFileSize = (bytes?: number | null): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

const MyFiles = () => {
    const { folderId } = useParams<{ folderId: string }>();
    const navigate = useNavigate();
    const { } = useAuth();
    const { uploadFile, isUploading, sessions, clearCompletedSessions } = useUploader();
    const { previewFile } = useAttachmentViewer();

    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: 'My Files' }]);
    const [isBreadcrumbsLoading, setIsBreadcrumbsLoading] = useState(false);

    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showShareFileModal, setShowShareFileModal] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<FileItem | null>(null);
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Fetch breadcrumbs when folder changes
    const fetchBreadcrumbs = useCallback(async () => {
        if (!folderId) {
            setBreadcrumbs([{ id: null, name: 'My Files' }]);
            return;
        }

        setIsBreadcrumbsLoading(true);
        try {
            const response = await axiosInstanceAuth.get(`/file/breadcrumbs/${folderId}`);
            if (response.data?.status === 'success') {
                setBreadcrumbs(response.data.data);
            }
        } catch (err) {
            // Fallback to basic breadcrumb
            console.error('Failed to fetch breadcrumbs:', err);
            setBreadcrumbs([
                { id: null, name: 'My Files' },
                { id: folderId, name: 'Current Folder' }
            ]);
        } finally {
            setIsBreadcrumbsLoading(false);
        }
    }, [folderId]);

    // Fetch files
    useEffect(() => {
        const fetchFiles = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const endpoint = folderId
                    ? `/file/list/${folderId}`
                    : '/file/my-root';

                const response = await axiosInstanceAuth.get(endpoint);

                if (response.data?.status === 'success') {
                    // Handle paginated response
                    const data = response.data.data;
                    setFiles(Array.isArray(data) ? data : data.data || []);
                } else {
                    throw new Error(response.data?.message || 'Failed to load files');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load files');
            } finally {
                setIsLoading(false);
            }
        };

        fetchFiles();
        fetchBreadcrumbs();
    }, [folderId, fetchBreadcrumbs]);

    // Refresh list when uploads complete
    useEffect(() => {
        const completedSessions = sessions.filter(s => s.status === 'completed');
        if (completedSessions.length > 0) {
            // Add newly uploaded files to the list
            const newFiles = completedSessions.flatMap(s => s.uploadedFiles);
            setFiles(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const filesToAdd = newFiles.filter(f => !existingIds.has(f.id));
                if (filesToAdd.length === 0) return prev;
                return [...filesToAdd, ...prev];
            });
            clearCompletedSessions();
        }
    }, [sessions, clearCompletedSessions]);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesToUpload = Array.from(e.target.files);
            uploadFile(filesToUpload, { folderId: folderId ?? null, isPrivate: true });
            // Reset input
            e.target.value = '';
        }
    };

    const handleFolderClick = (folder: FileItem) => {
        navigate(`/my-files/${folder.id}`);
    };

    const handleFileClick = (file: FileItem) => {
        // Open in previewer
        previewFile(file);
    };

    const handleCopyLink = async (e: React.MouseEvent, file: FileItem) => {
        e.stopPropagation();
        if (file.id) {
            const url = toSharedFileUrl(file.id);
            try {
                await navigator.clipboard.writeText(url);
                setCopiedId(file.id);
                setTimeout(() => setCopiedId(null), 2000);
            } catch (err) {
                console.error("Failed to copy", err);
            }
        }
    };

    const handleShareClick = (item: FileItem) => {
        if (item.isFolder) {
            setSelectedFolder(item);
            setShowShareModal(true);
        } else {
            setSelectedFile(item);
            setShowShareFileModal(true);
        }
    };

    const handleFolderCreated = (newFolder: FileItem) => {
        setFiles(prev => [newFolder, ...prev]);
        setShowCreateFolderModal(false);
    };

    return (
        <>
            <Helmet>
                <title>{BRANDING ?? "pomfd"} - My Files</title>
            </Helmet>

            <div className="w-full max-w-5xl mx-auto p-4 pt-20">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">My Files</h1>

                        {/* Breadcrumbs */}
                        <nav className="flex items-center gap-1 text-sm text-white/60 flex-wrap">
                            {isBreadcrumbsLoading ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                breadcrumbs.map((crumb, index) => (
                                    <span key={crumb.id ?? 'root'} className="flex items-center gap-1">
                                        {index > 0 && <ChevronRight size={14} className="flex-shrink-0" />}
                                        <button
                                            onClick={() => crumb.id ? navigate(`/my-files/${crumb.id}`) : navigate('/my-files')}
                                            className={`hover:text-white transition-colors flex items-center gap-1 ${index === breadcrumbs.length - 1 ? 'text-white font-medium' : ''
                                                }`}
                                        >
                                            {index === 0 && <Home size={14} className="flex-shrink-0" />}
                                            <span className="truncate max-w-[150px]">{crumb.name}</span>
                                        </button>
                                    </span>
                                ))
                            )}
                        </nav>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowCreateFolderModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <Plus size={18} />
                            <span className="hidden sm:inline">New Folder</span>
                        </button>
                        <button
                            onClick={() => document.getElementById('file-upload')?.click()}
                            disabled={isUploading}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                            <span className="hidden sm:inline">{isUploading ? 'Uploading...' : 'Upload'}</span>
                        </button>
                        <input
                            type="file"
                            id="file-upload"
                            multiple
                            className="hidden"
                            onChange={handleUpload}
                        />
                    </div>
                </div>

                {/* Loading state */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-white" size={32} />
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200">
                        {error}
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && !error && files.length === 0 && (
                    <div className="text-center py-20">
                        <Folder size={64} className="mx-auto text-white/20 mb-4" />
                        <h2 className="text-xl font-medium text-white mb-2">No files yet</h2>
                        <p className="text-white/60 mb-6">
                            Upload files or create a folder to get started
                        </p>
                        <button
                            onClick={() => setShowCreateFolderModal(true)}
                            className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-500 hover:to-indigo-500 transition-all"
                        >
                            Create your first folder
                        </button>
                    </div>
                )}

                {/* File grid */}
                {!isLoading && !error && files.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {files.map((file) => (
                            <div
                                key={file.id}
                                className="group bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all cursor-pointer border border-white/5 hover:border-white/10"
                                onClick={() => file.isFolder ? handleFolderClick(file) : handleFileClick(file)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {file.isFolder ? (
                                            <Folder size={24} className="text-yellow-400 flex-shrink-0" />
                                        ) : (
                                            <span className="flex-shrink-0">
                                                {getFileIcon(file.fileType, file.mimeType)}
                                            </span>
                                        )}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-white truncate">{file.name}</p>
                                                {file.isPrivate && (
                                                    <span title="Private">
                                                        <Lock size={12} className="text-yellow-400 flex-shrink-0" />
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-white/40">
                                                {file.isFolder ? 'Folder' : formatFileSize(file.fileSize)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!file.isFolder && !file.isPrivate && (
                                            <button
                                                onClick={(e) => handleCopyLink(e, file)}
                                                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                                title="Copy public link"
                                            >
                                                {copiedId === file.id ? <Check size={16} className="text-green-400" /> : <LinkIcon size={16} />}
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleShareClick(file);
                                            }}
                                            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                            title={file.isFolder ? "Share folder" : "Share file"}
                                        >
                                            <Share2 size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                        >
                                            <MoreVertical size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Upload Queue */}
            <UploadQueue />

            {/* Modals */}
            {showCreateFolderModal && (
                <CreateFolderModal
                    parentId={folderId ?? null}
                    onClose={() => setShowCreateFolderModal(false)}
                    onCreated={handleFolderCreated}
                />
            )}

            {showShareModal && selectedFolder && (
                <ShareFolderModal
                    folder={selectedFolder}
                    onClose={() => {
                        setShowShareModal(false);
                        setSelectedFolder(null);
                    }}
                />
            )}

            {showShareFileModal && selectedFile && (
                <ShareFileModal
                    file={{
                        id: selectedFile.id,
                        name: selectedFile.name,
                        isPrivate: selectedFile.isPrivate ?? undefined
                    }}
                    onClose={() => {
                        setShowShareFileModal(false);
                        setSelectedFile(null);
                    }}
                />
            )}
        </>
    );
};

export default MyFiles;
