import { useState, type FormEvent } from "react";
import { X, Loader2, FolderPlus } from "lucide-react";
import { axiosInstanceAuth } from "@/api/axios";

interface CreateFolderModalProps {
    parentId: string | null;
    onClose: () => void;
    onCreated: (folder: any) => void;
}

const CreateFolderModal = ({ parentId, onClose, onCreated }: CreateFolderModalProps) => {
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError("Folder name is required");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await axiosInstanceAuth.post('/file/mkdir', {
                name: name.trim(),
                parentId,
            });

            if (response.data?.status === 'success') {
                onCreated(response.data.data);
            } else {
                throw new Error(response.data?.message || 'Failed to create folder');
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Failed to create folder');
        } finally {
            setIsLoading(false);
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
                        <FolderPlus className="text-yellow-400" size={24} />
                        <h2 className="text-xl font-semibold text-white">New Folder</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <label htmlFor="folderName" className="block text-sm font-medium text-blue-200 mb-2">
                            Folder name
                        </label>
                        <input
                            id="folderName"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Enter folder name"
                            autoFocus
                            disabled={isLoading}
                        />
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
                            disabled={isLoading || !name.trim()}
                            className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Creating...
                                </>
                            ) : (
                                "Create Folder"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFolderModal;
