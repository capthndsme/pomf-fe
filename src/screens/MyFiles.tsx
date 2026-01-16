import { useState, useEffect } from "react";
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
    MoreVertical
} from "lucide-react";
import CreateFolderModal from "@/components/CreateFolderModal";
import ShareFolderModal from "@/components/ShareFolderModal";
import { useUploader } from "@/providers/UploaderProvider";
import type FileItem from "../../types/response/FileItem";

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
    const { uploadFile, isUploading, uploadedFiles, clearUploaded } = useUploader();

    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: 'My Files' }]);

    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<FileItem | null>(null);

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
    }, [folderId]);

    // Update breadcrumbs when folder changes
    useEffect(() => {
        if (!folderId) {
            setBreadcrumbs([{ id: null, name: 'My Files' }]);
        }
        // Note: For full breadcrumb support, we'd need to fetch parent folders
        // This is a simplified implementation
    }, [folderId]);

    // Refresh list when uploads complete
    useEffect(() => {
        if (uploadedFiles.length > 0) {
            setFiles(prev => {
                const newFiles = uploadedFiles.filter(uf => !prev.some(p => p.id === uf.id));
                if (newFiles.length === 0) return prev;
                // Add new files to the beginning of the list
                return [...newFiles, ...prev];
            });
            clearUploaded();
        }
    }, [uploadedFiles, clearUploaded]);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesToUpload = Array.from(e.target.files);
            uploadFile(filesToUpload, { folderId: folderId ?? null });
            // Reset input
            e.target.value = '';
        }
    };

    const handleFolderClick = (folder: FileItem) => {
        navigate(`/my-files/${folder.id}`);
    };

    const handleFileClick = (file: FileItem) => {
        // Open in share link view
        if (file.serverShard?.domain && file.id) {
            window.open(`/s/${file.id}`, '_blank');
        }
    };

    const handleShareClick = (folder: FileItem) => {
        setSelectedFolder(folder);
        setShowShareModal(true);
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
                        <nav className="flex items-center gap-1 text-sm text-white/60">
                            {breadcrumbs.map((crumb, index) => (
                                <span key={crumb.id ?? 'root'} className="flex items-center gap-1">
                                    {index > 0 && <ChevronRight size={14} />}
                                    <button
                                        onClick={() => crumb.id ? navigate(`/my-files/${crumb.id}`) : navigate('/my-files')}
                                        className="hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        {index === 0 && <Home size={14} />}
                                        {crumb.name}
                                    </button>
                                </span>
                            ))}
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
                                            <p className="font-medium text-white truncate">{file.name}</p>
                                            <p className="text-sm text-white/40">
                                                {file.isFolder ? 'Folder' : formatFileSize(file.fileSize)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {file.isFolder && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleShareClick(file);
                                                }}
                                                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                                title="Share folder"
                                            >
                                                <Share2 size={16} />
                                            </button>
                                        )}
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
        </>
    );
};

export default MyFiles;
