import { createContext, useContext, type ReactNode, useState, useMemo, useCallback, useRef } from "react";
import { useUpload } from "../hooks/useUpload";
import FileItem from "../../types/response/FileItem";

interface UploadSession {
   id: string;
   files: File[];
   totalSize: number;
   uploadedSize: number;
   progress: number;
   isUploading: boolean;
   error?: string;
   uploadedFiles: FileItem[];
   startTime: number;
   chunkSize?: number;
   maxConcurrency?: number;
   useChunkedUpload?: boolean;
}

interface UploadOptions {
   chunkSize?: number;
   maxConcurrency?: number;
   useChunkedUpload?: boolean;
   chunkThreshold?: number;
}

type UploaderContextType = {
   // Current upload state
   isUploading: boolean;
   error?: unknown;
   progress: number;
   uploadedFiles: FileItem[];
   currentSession: UploadSession | null;

   // Upload methods
   uploadFile: (files: File[], options?: UploadOptions) => void;
   uploadFileChunked: (file: File, options?: UploadOptions) => void;

   // Session management
   cancelUpload: () => void;
   clearUploaded: () => void;

   // Upload stats
   uploadSpeed: number; // bytes per second
   estimatedTimeRemaining: number; // seconds

   // History
   uploadHistory: UploadSession[];
   clearHistory: () => void;
};

const UploaderContext = createContext<UploaderContextType | undefined>(undefined);

// Generate unique session ID
const generateSessionId = (): string => {
   return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const UploaderProvider = ({ children }: { children: ReactNode }) => {
   const [currentSession, setCurrentSession] = useState<UploadSession | null>(null);
   const [uploadedFiles, setUploadedFiles] = useState<FileItem[]>([]);
   const [uploadHistory, setUploadHistory] = useState<UploadSession[]>([]);
   const [uploadSpeed, setUploadSpeed] = useState(0);
   const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);

   const uploadMutation = useUpload();
   const lastProgressUpdate = useRef<number>(0);
   const lastProgressValue = useRef<number>(0);

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
      (progress: number) => {
         setCurrentSession((prev) => {
            if (!prev) return null;

            const updatedSession = {
               ...prev,
               progress,
               uploadedSize: (progress / 100) * prev.totalSize,
            };

            updateUploadStats(progress, updatedSession);

            return updatedSession;
         });
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
         maxConcurrency = 12;
      } else if (largestFile >= 100 * 1024 * 1024) {
         // 100MB+
         chunkSize = 10 * 1024 * 1024; // 10mb
         maxConcurrency = 10;
      } else if (largestFile >= 50 * 1024 * 1024) {
         // 50MB+
         chunkSize = 6 * 1024 * 1024; // 5mb
         maxConcurrency = 8;
      } else if (largestFile >= 25 * 1024 * 1024) {
         // 25MB+
         chunkSize = 6 * 1024 * 1024; // 5mb
         maxConcurrency = 4;
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

   // Main upload function
   const uploadFile = useCallback(
      (files: File[], options?: UploadOptions) => {
         if (files.length === 0) return;

         const totalSize = files.reduce((sum, file) => sum + file.size, 0);
         const optimalSettings = getOptimalUploadSettings(files);
         const finalOptions = { ...optimalSettings, ...options };

         const session: UploadSession = {
            id: generateSessionId(),
            files,
            totalSize,
            uploadedSize: 0,
            progress: 0,
            isUploading: true,
            uploadedFiles: [],
            startTime: Date.now(),
            ...finalOptions,
         };

         setCurrentSession(session);
         lastProgressUpdate.current = Date.now();
         lastProgressValue.current = 0;
         setUploadSpeed(0);
         setEstimatedTimeRemaining(0);

         uploadMutation.reset();
         uploadMutation.mutate(
            {
               file: files,
               onUploadProgress: handleProgress,
               ...finalOptions,
            },
            {
               onSuccess: (data) => {
                  setCurrentSession((prev) => {
                     if (!prev) return null;

                     const completedSession = {
                        ...prev,
                        isUploading: false,
                        progress: 100,
                        uploadedSize: prev.totalSize,
                        uploadedFiles: data,
                     };

                     // Add to history
                     setUploadHistory((history) => [...history, completedSession]);

                     return completedSession;
                  });

                  setUploadedFiles((prev) => [...prev, ...data]);
                  setUploadSpeed(0);
                  setEstimatedTimeRemaining(0);
               },
               onError: (error) => {
                  setCurrentSession((prev) => {
                     if (!prev) return null;

                     const failedSession = {
                        ...prev,
                        isUploading: false,
                        error: error instanceof Error ? error.message : "Upload failed",
                     };

                     // Add to history
                     setUploadHistory((history) => [...history, failedSession]);

                     return failedSession;
                  });

                  setUploadSpeed(0);
                  setEstimatedTimeRemaining(0);
               },
            }
         );
      },
      [uploadMutation, handleProgress, getOptimalUploadSettings]
   );

   // Chunked upload convenience function
   const uploadFileChunked = useCallback(
      (file: File, options?: UploadOptions) => {
         const chunkOptions = {
            useChunkedUpload: true,
            chunkSize: 5 * 1024 * 1024,
            maxConcurrency: 16,
            ...options,
         };

         uploadFile([file], chunkOptions);
      },
      [uploadFile]
   );

   // Cancel current upload
   const cancelUpload = useCallback(() => {
      if (currentSession?.isUploading) {
         uploadMutation.reset();

         setCurrentSession((prev) => {
            if (!prev) return null;

            const cancelledSession = {
               ...prev,
               isUploading: false,
               error: "Upload cancelled by user",
            };

            // Add to history
            setUploadHistory((history) => [...history, cancelledSession]);

            return cancelledSession;
         });

         setUploadSpeed(0);
         setEstimatedTimeRemaining(0);
      }
   }, [currentSession, uploadMutation]);

   // Clear uploaded files
   const clearUploaded = useCallback(() => {
      setUploadedFiles([]);
   }, []);

   // Clear upload history
   const clearHistory = useCallback(() => {
      setUploadHistory([]);
   }, []);

   const value = useMemo(
      () => ({
         // Current state
         isUploading: uploadMutation.isLoading || (currentSession?.isUploading ?? false),
         error: uploadMutation.error,
         progress: currentSession?.progress ?? 0,
         uploadedFiles,
         currentSession,

         // Upload methods
         uploadFile,
         uploadFileChunked,

         // Session management
         cancelUpload,
         clearUploaded,

         // Upload stats
         uploadSpeed,
         estimatedTimeRemaining,

         // History
         uploadHistory,
         clearHistory,
      }),
      [
         uploadMutation.isLoading,
         uploadMutation.error,
         currentSession,
         uploadedFiles,
         uploadFile,
         uploadFileChunked,
         cancelUpload,
         clearUploaded,
         uploadSpeed,
         estimatedTimeRemaining,
         uploadHistory,
         clearHistory,
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
