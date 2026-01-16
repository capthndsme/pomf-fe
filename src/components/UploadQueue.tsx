import { useState } from "react";
import {
    X,
    ChevronDown,
    ChevronUp,
    Upload,
    CheckCircle2,
    XCircle,
    Loader2,
    Trash2,
    Minimize2,
    Maximize2
} from "lucide-react";
import { useUploader, type UploadSession } from "@/providers/UploaderProvider";

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const SessionItem = ({
    session,
    onCancel,
    onRemove
}: {
    session: UploadSession;
    onCancel: (id: string) => void;
    onRemove: (id: string) => void;
}) => {
    const getStatusIcon = () => {
        switch (session.status) {
            case 'uploading':
                return <Loader2 size={16} className="animate-spin text-blue-400" />;
            case 'completed':
                return <CheckCircle2 size={16} className="text-green-400" />;
            case 'error':
            case 'cancelled':
                return <XCircle size={16} className="text-red-400" />;
            default:
                return <Upload size={16} className="text-white/40" />;
        }
    };

    const getStatusText = () => {
        switch (session.status) {
            case 'uploading':
                return `${session.progress.toFixed(0)}%`;
            case 'completed':
                return 'Completed';
            case 'error':
                return session.error || 'Failed';
            case 'cancelled':
                return 'Cancelled';
            case 'pending':
                return 'Pending';
            default:
                return '';
        }
    };

    return (
        <div className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3">
                {getStatusIcon()}

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                        {session.fileName || 'Unknown file'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-white/50">
                        <span>{formatBytes(session.totalSize)}</span>
                        <span>•</span>
                        <span>{getStatusText()}</span>
                    </div>
                </div>

                {session.status === 'uploading' && (
                    <button
                        onClick={() => onCancel(session.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-red-400 transition-colors"
                        title="Cancel upload"
                    >
                        <X size={16} />
                    </button>
                )}

                {(session.status === 'completed' || session.status === 'error' || session.status === 'cancelled') && (
                    <button
                        onClick={() => onRemove(session.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        title="Remove from list"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Progress bar for uploading */}
            {session.status === 'uploading' && (
                <div className="mt-2">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${session.progress}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const UploadQueue = () => {
    const {
        sessions,
        cancelSession,
        removeSession,
        clearCompletedSessions,
        uploadSpeed,
        estimatedTimeRemaining,
        activeSessionCount
    } = useUploader();

    const [isMinimized, setIsMinimized] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);

    // Don't show if no sessions
    if (sessions.length === 0) return null;

    const completedCount = sessions.filter(s => s.status === 'completed').length;
    const errorCount = sessions.filter(s => s.status === 'error' || s.status === 'cancelled').length;

    if (isMinimized) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={() => setIsMinimized(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-indigo-900 to-blue-900 rounded-full shadow-2xl border border-white/20 hover:border-white/30 transition-all"
                >
                    {activeSessionCount > 0 && (
                        <Loader2 size={16} className="animate-spin text-blue-400" />
                    )}
                    <span className="text-white text-sm font-medium">
                        {activeSessionCount > 0
                            ? `Uploading ${activeSessionCount} file${activeSessionCount > 1 ? 's' : ''}...`
                            : `${sessions.length} upload${sessions.length > 1 ? 's' : ''}`
                        }
                    </span>
                    <Maximize2 size={14} className="text-white/60" />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-gradient-to-br from-indigo-900/95 to-blue-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Upload size={18} className="text-blue-400" />
                    <h3 className="text-white font-semibold">Uploads</h3>
                    {activeSessionCount > 0 && (
                        <span className="px-2 py-0.5 bg-blue-500/30 rounded-full text-xs text-blue-200">
                            {activeSessionCount} active
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        <Minimize2 size={16} />
                    </button>
                </div>
            </div>

            {/* Stats */}
            {isExpanded && activeSessionCount > 0 && (
                <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs text-white/60">
                    <span>{formatBytes(uploadSpeed)}/s</span>
                    {estimatedTimeRemaining > 0 && (
                        <span>{formatTime(estimatedTimeRemaining)} remaining</span>
                    )}
                </div>
            )}

            {/* Sessions list */}
            {isExpanded && (
                <div className="p-3 max-h-80 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    {sessions.map((session) => (
                        <SessionItem
                            key={session.id}
                            session={session}
                            onCancel={cancelSession}
                            onRemove={removeSession}
                        />
                    ))}
                </div>
            )}

            {/* Footer actions */}
            {isExpanded && (completedCount > 0 || errorCount > 0) && (
                <div className="p-3 border-t border-white/10">
                    <button
                        onClick={clearCompletedSessions}
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
                    >
                        <Trash2 size={14} />
                        Clear completed
                    </button>
                </div>
            )}
        </div>
    );
};

export default UploadQueue;
