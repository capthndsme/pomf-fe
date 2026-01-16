import { createContext, useContext, type ReactNode, useState, useMemo, useCallback, useRef } from "react";
import { useUpload } from "../hooks/useUpload";
import FileItem from "../../types/response/FileItem";

export interface UploadSession {
   id: string;
   files: File[];
   totalSize: number;
   uploadedSize: number;
   progress: number;
   status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
   error?: string;
   uploadedFiles: FileItem[];
   startTime: number;
   chunkSize?: number;
   maxConcurrency?: number;
   useChunkedUpload?: boolean;
   folderId?: string | null;
   isPrivate?: boolean;
   saveToHistory?: boolean;
   fileName?: string; // Primary file name for display
}

export interface UploadOptions {
   chunkSize?: number;
   maxConcurrency?: number;
   useChunkedUpload?: boolean;
   chunkThreshold?: number;
   folderId?: string | null;
   isPrivate?: boolean;
   saveToHistory?: boolean;
}

type UploaderContextType = {
   // All active upload sessions
   sessions: UploadSession[];

   // Convenience getters
   isUploading: boolean;
   activeSessionCount: number;
   totalProgress: number; // Overall progress across all sessions

   // Upload methods
   uploadFile: (files: File[], options?: UploadOptions) => string; // Returns session ID
   uploadFileChunked: (file: File, options?: UploadOptions) => string;

   // Session management
   cancelSession: (sessionId: string) => void;
   cancelAllSessions: () => void;
   removeSession: (sessionId: string) => void;
   clearCompletedSessions: () => void;

   // Upload stats (for current/active sessions)
   uploadSpeed: number; // bytes per second
   estimatedTimeRemaining: number; // seconds

   // History
   uploadHistory: UploadSession[];
   clearHistory: () => void;

   // For backward compatibility
   error?: unknown;
   progress: number;
   uploadedFiles: FileItem[];
   currentSession: UploadSession | null;
   cancelUpload: () => void;
   clearUploaded: () => void;
};

const UploaderContext = createContext<UploaderContextType | undefined>(undefined);

// Generate unique session ID
const generateSessionId = (): string => {
   return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const UploaderProvider = ({ children }: { children: ReactNode }) => {
   const [sessions, setSessions] = useState<UploadSession[]>([]);
   const [uploadHistory, setUploadHistory] = useState<UploadSession[]>([]);
   const [uploadSpeed, setUploadSpeed] = useState(0);
   const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);

   const uploadMutation = useUpload();
   const lastProgressUpdate = useRef<number>(0);
   const lastProgressValue = useRef<number>(0);
   const activeUploadRef = useRef<Map<string, boolean>>(new Map());

   // Calculate upload speed and ETA
   const updateUploadStats = useCallback((progress: number, session: UploadSession) => {
      const now = Date.now();
      const timeDiff = now - lastProgressUpdate.current;
      const progressDiff = progress - lastProgressValue.current;

      if (timeDiff > 1000 && progressDiff > 0) {
         // Update every second
         const bytesUploaded = (progressDiff / 100) * session.totalSize;
         const speed = bytesUploaded / (timeDiff / 1000);

         setUploadSpeed(speed);

         const remainingBytes = session.totalSize - (progress / 100) * session.totalSize;
         const eta = speed > 0 ? remainingBytes / speed : 0;

         setEstimatedTimeRemaining(eta);

         lastProgressUpdate.current = now;
         lastProgressValue.current = progress;
      }
   }, []);

   // Progress handler that updates session and stats
   const handleProgress = useCallback(
      (sessionId: string, progress: number) => {
         setSessions((prev) =>
            prev.map((session) => {
               if (session.id !== sessionId) return session;

               const updatedSession = {
                  ...session,
                  progress,
                  uploadedSize: (progress / 100) * session.totalSize,
               };

               updateUploadStats(progress, updatedSession);

               return updatedSession;
            })
         );
      },
      [updateUploadStats]
   );

   // Determine optimal upload settings based on file characteristics
   const getOptimalUploadSettings = useCallback((files: File[]): UploadOptions => {
      const largestFile = Math.max(...files.map((f) => f.size));

      // Use chunked upload for large files or when beneficial
      const shouldUseChunked = files.length === 1 && largestFile >= 8 * 1024 * 1024; // 8MB threshold

      let chunkSize = 5 * 1024 * 1024; // 5MB default
      let maxConcurrency;

      // Adjust settings based on file size
      if (largestFile >= 500 * 1024 * 1024) {
         // 500MB+
         chunkSize = 20 * 1024 * 1024; // 20mb in bigger sizes reducing ram use as well
         maxConcurrency = 16;
      } else if (largestFile >= 100 * 1024 * 1024) {
         // 100MB+
         chunkSize = 8 * 1024 * 1024; // 10mb
         maxConcurrency = 12;
      } else if (largestFile >= 50 * 1024 * 1024) {
         // 50MB+
         chunkSize = 6 * 1024 * 1024; // 5mb
         maxConcurrency = 10;
      } else if (largestFile >= 25 * 1024 * 1024) {
         // 25MB+
         chunkSize = 3 * 1024 * 1024; // 5mb
         maxConcurrency = 8;
      } // 5 mb to 25 mb
      else if (files.length === 1 && largestFile < 25 * 1024 * 1024 && largestFile >= 10 * 1024 * 1024) {
         chunkSize = 1.25 * 1024 * 1024; // 2mb
         maxConcurrency = 4;
      } else {
         maxConcurrency = 1; // Smaller files don't need as many threads
      }

      return {
         chunkSize,
         maxConcurrency,
         useChunkedUpload: shouldUseChunked,
         chunkThreshold: 8 * 1024 * 1024,
      };
   }, []);

   // Main upload function - now supports multiple concurrent uploads
   const uploadFile = useCallback(
      (files: File[], options?: UploadOptions): string => {
         if (files.length === 0) return '';

         const sessionId = generateSessionId();
         const totalSize = files.reduce((sum, file) => sum + file.size, 0);
         const optimalSettings = getOptimalUploadSettings(files);
         const finalOptions = { ...optimalSettings, ...options };

         const session: UploadSession = {
            id: sessionId,
            files,
            totalSize,
            uploadedSize: 0,
            progress: 0,
            status: 'uploading',
            uploadedFiles: [],
            startTime: Date.now(),
            fileName: files.length === 1 ? files[0].name : `${files.length} files`,
            ...finalOptions,
         };

         setSessions((prev) => [...prev, session]);
         activeUploadRef.current.set(sessionId, true);
         lastProgressUpdate.current = Date.now();
         lastProgressValue.current = 0;

         uploadMutation.mutate(
            {
               file: files,
               onUploadProgress: (progress: number) => handleProgress(sessionId, progress),
               ...finalOptions,
            },
            {
               onSuccess: (data) => {
                  if (!activeUploadRef.current.get(sessionId)) return; // Was cancelled

                  setSessions((prev) =>
                     prev.map((s) => {
                        if (s.id !== sessionId) return s;

                        const completedSession: UploadSession = {
                           ...s,
                           status: 'completed',
                           progress: 100,
                           uploadedSize: s.totalSize,
                           uploadedFiles: data,
                        };

                        // Add to history
                        setUploadHistory((history) => [...history, completedSession]);

                        return completedSession;
                     })
                  );

                  activeUploadRef.current.delete(sessionId);
               },
               onError: (error) => {
                  if (!activeUploadRef.current.get(sessionId)) return; // Was cancelled

                  setSessions((prev) =>
                     prev.map((s) => {
                        if (s.id !== sessionId) return s;

                        const failedSession: UploadSession = {
                           ...s,
                           status: 'error',
                           error: error instanceof Error ? error.message : "Upload failed",
                        };

                        // Add to history
                        setUploadHistory((history) => [...history, failedSession]);

                        return failedSession;
                     })
                  );

                  activeUploadRef.current.delete(sessionId);
               },
            }
         );

         return sessionId;
      },
      [uploadMutation, handleProgress, getOptimalUploadSettings]
   );

   // Chunked upload convenience function
   const uploadFileChunked = useCallback(
      (file: File, options?: UploadOptions): string => {
         const chunkOptions = {
            useChunkedUpload: true,
            chunkSize: 5 * 1024 * 1024,
            maxConcurrency: 16,
            ...options,
         };

         return uploadFile([file], chunkOptions);
      },
      [uploadFile]
   );

   // Cancel a specific session
   const cancelSession = useCallback((sessionId: string) => {
      activeUploadRef.current.delete(sessionId);

      setSessions((prev) =>
         prev.map((s) => {
            if (s.id !== sessionId) return s;

            const cancelledSession: UploadSession = {
               ...s,
               status: 'cancelled',
               error: "Upload cancelled by user",
            };

            // Add to history
            setUploadHistory((history) => [...history, cancelledSession]);

            return cancelledSession;
         })
      );
   }, []);

   // Cancel all active sessions
   const cancelAllSessions = useCallback(() => {
      activeUploadRef.current.clear();

      setSessions((prev) =>
         prev.map((s) => {
            if (s.status !== 'uploading') return s;

            const cancelledSession: UploadSession = {
               ...s,
               status: 'cancelled',
               error: "Upload cancelled by user",
            };

            setUploadHistory((history) => [...history, cancelledSession]);

            return cancelledSession;
         })
      );
   }, []);

   // Remove a session from the list
   const removeSession = useCallback((sessionId: string) => {
      activeUploadRef.current.delete(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
   }, []);

   // Clear completed sessions
   const clearCompletedSessions = useCallback(() => {
      setSessions((prev) => prev.filter((s) => s.status === 'uploading' || s.status === 'pending'));
   }, []);

   // Clear upload history
   const clearHistory = useCallback(() => {
      setUploadHistory([]);
   }, []);

   // Computed values
   const activeSessions = sessions.filter((s) => s.status === 'uploading');
   const isUploading = activeSessions.length > 0;
   const activeSessionCount = activeSessions.length;

   const totalProgress = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.progress, 0) / sessions.length
      : 0;

   // Get all uploaded files from completed sessions
   const uploadedFiles = sessions
      .filter((s) => s.status === 'completed')
      .flatMap((s) => s.uploadedFiles);

   // For backward compatibility
   const currentSession = sessions.find((s) => s.status === 'uploading') || null;

   const value = useMemo(
      () => ({
         // New multi-session API
         sessions,
         isUploading,
         activeSessionCount,
         totalProgress,

         // Upload methods
         uploadFile,
         uploadFileChunked,

         // Session management
         cancelSession,
         cancelAllSessions,
         removeSession,
         clearCompletedSessions,

         // Upload stats
         uploadSpeed,
         estimatedTimeRemaining,

         // History
         uploadHistory,
         clearHistory,

         // Backward compatibility
         error: uploadMutation.error,
         progress: currentSession?.progress ?? 0,
         uploadedFiles,
         currentSession,
         cancelUpload: cancelAllSessions,
         clearUploaded: clearCompletedSessions,
      }),
      [
         sessions,
         isUploading,
         activeSessionCount,
         totalProgress,
         uploadFile,
         uploadFileChunked,
         cancelSession,
         cancelAllSessions,
         removeSession,
         clearCompletedSessions,
         uploadSpeed,
         estimatedTimeRemaining,
         uploadHistory,
         clearHistory,
         uploadMutation.error,
         currentSession,
         uploadedFiles,
      ]
   );

   return <UploaderContext.Provider value={value}>{children}</UploaderContext.Provider>;
};

export const useUploader = () => {
   const context = useContext(UploaderContext);
   if (context === undefined) {
      throw new Error("useUploader must be used within an UploaderProvider");
   }
   return context;
};
