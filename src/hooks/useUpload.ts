import { useMutation } from "react-query";
import { useCurrentServer } from "../providers/CurrentServerProvider";
import axios from "axios";
import { useAuth } from "@/providers/AuthProvider";
import type { ApiBase } from "types/ApiBase";
import type FileItem from "../../types/response/FileItem";
import type { ChunkedMeta } from "../../types/request/ChunkedMeta";

type UploadFileParams = {
   file: File[];
   onUploadProgress: (progress: number) => void;
   chunkSize?: number;
   useChunkedUpload?: boolean;
   maxConcurrency?: number;
   chunkThreshold?: number; // Size threshold for chunked upload
};

interface ChunkUploadTask {
   chunk: Blob;
   chunkIndex: number;
   meta: ChunkedMeta;
   retryCount: number;
   maxRetries: number;
}

interface ChunkUploadResult {
   chunkIndex: number;
   success: boolean;
   isComplete: boolean;
   data?: FileItem[];
   error?: string;
}

// Utility function to generate a secure random upload ID
const generateUploadId = (): string => {
   return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(36))
      .join("");
};

// Utility function to calculate SHA256 hash
const calculateSHA256 = async (data: ArrayBuffer): Promise<string> => {
   const hashBuffer = await crypto.subtle.digest("SHA-256", data);
   const hashArray = Array.from(new Uint8Array(hashBuffer));
   return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

// Function to split file into chunks
const splitFileIntoChunks = (file: File, chunkSize: number): Blob[] => {
   const chunks: Blob[] = [];
   let offset = 0;

   while (offset < file.size) {
      const chunk = file.slice(offset, offset + chunkSize);
      chunks.push(chunk);
      offset += chunkSize;
   }

   return chunks;
};

// Sleep utility for retry delays
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const uploadSingleChunk = async (
   task: ChunkUploadTask,
   server: string,
   token: string | null,
   onChunkProgress: (chunkIndex: number, progress: number) => void,
   signal?: AbortSignal
): Promise<ChunkUploadResult> => {
   const { chunk, chunkIndex, meta, retryCount, maxRetries } = task;

   try {
      const formData = new FormData();
      formData.append("file[]", chunk, `chunk-${chunkIndex}.bin`);

      const queryParams = new URLSearchParams({
         uploadId: meta.uploadId,
         chunkIndex: meta.chunkIndex.toString(),
         totalChunks: meta.totalChunks.toString(),
         fileName: meta.fileName,
         fileSize: meta.fileSize.toString(),
         mimeType: meta.mimeType,
         chunkHash: meta.chunkHash,
         fileHash: meta.fileHash,
         chunkSize: meta.chunkSize.toString(),
      });

      const response = await axios.post<ApiBase<FileItem[] | null>>(`${server}?${queryParams.toString()}`, formData, {
         headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
         },
         onUploadProgress: (progressEvent) => {
            const chunkProgress = progressEvent.total ? (progressEvent.loaded / progressEvent.total) * 100 : 0;
            onChunkProgress(chunkIndex, chunkProgress);
         },
         signal,
      });

      if (response.status !== 200) {
         throw new Error(response.data.message);
      }

 
      const isComplete = "data" in response.data && response.data.data !== null && response.data.status !== "chunk-finish";

      return {
         chunkIndex,
         success: true,
         isComplete,
         data: isComplete &&  "data" in response.data && response.data.data !== null? response.data.data : undefined,
      };
   } catch (error) {
      if (signal?.aborted) {
         throw error;
      }

      // Retry logic with exponential backoff
      if (retryCount < maxRetries) {
         const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10s delay
         await sleep(delay);

         return uploadSingleChunk({ ...task, retryCount: retryCount + 1 }, server, token, onChunkProgress, signal);
      }

      return {
         chunkIndex,
         success: false,
         isComplete: false,
         error: error instanceof Error ? error.message : "Unknown error",
      };
   }
};

// Concurrent chunk upload manager
class ChunkUploadManager {
   private readonly completedChunks = new Set<number>();
   private readonly chunkProgress = new Map<number, number>();
   private readonly totalChunks: number;
   private readonly onProgressUpdate: (progress: number) => void;
   private readonly abortController: AbortController;

   constructor(totalChunks: number, onProgressUpdate: (progress: number) => void) {
      this.totalChunks = totalChunks;
      this.onProgressUpdate = onProgressUpdate;
      this.abortController = new AbortController();
   }

   private updateProgress(): void {
      let totalProgress = 0;

      for (let i = 0; i < this.totalChunks; i++) {
         if (this.completedChunks.has(i)) {
            totalProgress += 100;
         } else {
            totalProgress += this.chunkProgress.get(i) ?? 0;
         }
      }

      const overallProgress = Math.round(totalProgress / this.totalChunks);
      this.onProgressUpdate(overallProgress);
   }

   private readonly onChunkProgress = (chunkIndex: number, progress: number): void => {
      if (!this.completedChunks.has(chunkIndex)) {
         this.chunkProgress.set(chunkIndex, progress);
         this.updateProgress();
      }
   };

   async uploadChunksConcurrently(
      tasks: ChunkUploadTask[],
      server: string,
      token: string | null,
      maxConcurrency: number
   ): Promise<FileItem[]> {
      const semaphore = new Semaphore(maxConcurrency);
      const promises: Promise<ChunkUploadResult>[] = [];

      for (const task of tasks) {
         const promise = semaphore.acquire().then(async (release) => {
            try {
               const result = await uploadSingleChunk(task, server, token, this.onChunkProgress, this.abortController.signal);

               if (result.success) {
                  this.completedChunks.add(result.chunkIndex);
                  this.chunkProgress.set(result.chunkIndex, 100);
                  this.updateProgress();
               }

               return result;
            } finally {
               release();
            }
         });

         promises.push(promise);
      }

      const results = await Promise.all(promises);

      // Check for any failures
      const failures = results.filter((r) => !r.success);
      if (failures.length > 0) {
         throw new Error(`${failures.length} chunks failed to upload: ${failures.map((f) => f.error).join(", ")}`);
      }

      // Find the result that indicates completion
      const completeResult = results.find((r) => r.isComplete);
      if (completeResult?.data) {
         return completeResult.data;
      }

      const finishResponse = await axios.post<ApiBase<FileItem[]>>(
         `${server.replace(/\/(anon-)?upload$/, "/$1upload/chunked/finish")}`,
         {
            uploadId: tasks[0].meta.uploadId,
            totalChunks: this.totalChunks,
            fileName: tasks[0].meta.fileName,
            fileSize: tasks[0].meta.fileSize,
            mimeType: tasks[0].meta.mimeType,
         },
         {
            headers: {
               Authorization: `Bearer ${token}`,
            },
         }
      );

      if (finishResponse.status !== 200 || !("data" in finishResponse.data)) {
         throw new Error("Failed to finalize upload");
      }

      return finishResponse.data.data;
   }

   abort(): void {
      this.abortController.abort();
   }
}

// Semaphore for controlling concurrency
class Semaphore {
   private permits: number;
   private readonly waitQueue: Array<() => void> = [];

   constructor(permits: number) {
      this.permits = permits;
   }

   async acquire(): Promise<() => void> {
      return new Promise((resolve) => {
         if (this.permits > 0) {
            this.permits--;
            resolve(() => this.release());
         } else {
            this.waitQueue.push(() => {
               this.permits--;
               resolve(() => this.release());
            });
         }
      });
   }

   private release(): void {
      this.permits++;
      if (this.waitQueue.length > 0) {
         const next = this.waitQueue.shift();
         next?.();
      }
   }
}

// Regular upload function (existing functionality)
const uploadFile = async ({
   file,
   server,
   token,
   onUploadProgress,
}: {
   file: File[];
   server: string;
   token: string | null;
   onUploadProgress: (progress: number) => void;
}) => {
   const formData = new FormData();
   file.forEach((file) => {
      formData.append("file[]", file);
   });

   const response = await axios.post<ApiBase<FileItem[]>>(`${server}`, formData, {
      headers: {
         Authorization: `Bearer ${token}`,
         "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
         const percentCompleted = progressEvent.total ? Math.round((progressEvent.loaded * 100) / progressEvent.total) : 0;
         onUploadProgress(percentCompleted);
      },
   });

   if (response.status !== 200) {
      throw new Error(response.data.message);
   }
   if (!("data" in response.data)) throw new Error(response.data.message);
   return response.data.data;
};

// Multithreaded chunked upload function
const uploadFileChunkedConcurrent = async ({
   file,
   server,
   token,
   onUploadProgress,
   chunkSize = 5 * 1024 * 1024,
   maxConcurrency = 16,
}: {
   file: File;
   server: string;
   token: string | null;
   onUploadProgress: (progress: number) => void;
   chunkSize?: number;
   maxConcurrency?: number;
}) => {
   const uploadId = generateUploadId();
   const chunks = splitFileIntoChunks(file, chunkSize);
   const totalChunks = chunks.length;

   // Calculate file hash
   const fileBuffer = await file.arrayBuffer();
   const fileHash = await calculateSHA256(fileBuffer);

   // Create upload tasks
   const tasks: ChunkUploadTask[] = [];
   for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const chunkBuffer = await chunk.arrayBuffer();
      const chunkHash = await calculateSHA256(chunkBuffer);

      const meta: ChunkedMeta = {
         uploadId,
         chunkIndex,
         totalChunks,
         fileName: file.name,
         fileSize: file.size,
         mimeType: file.type,
         chunkHash,
         fileHash,
         chunkSize: chunk.size,
      };

      tasks.push({
         chunk,
         chunkIndex,
         meta,
         retryCount: 0,
         maxRetries: 3,
      });
   }

   // Use upload manager for concurrent uploads
   const manager = new ChunkUploadManager(totalChunks, onUploadProgress);

   try {
      return await manager.uploadChunksConcurrently(tasks, server, token, maxConcurrency);
   } catch (error) {
      manager.abort();
      throw error;
   }
};

// Enhanced upload function that intelligently chooses upload method
const uploadFileEnhanced = async ({
   file,
   server,
   token,
   onUploadProgress,
   chunkSize = 5 * 1024 * 1024,
   useChunkedUpload = false,
   maxConcurrency = 16,
   chunkThreshold = 8 * 1024 * 1024, // 8MB threshold
}: {
   file: File[];
   server: string;
   token: string | null;
   onUploadProgress: (progress: number) => void;
   chunkSize?: number;
   useChunkedUpload?: boolean;
   maxConcurrency?: number;
   chunkThreshold?: number;
}) => {
   // For chunked uploads, handle single files only
   if (useChunkedUpload || (file.length === 1 && file[0].size >= chunkThreshold)) {
      if (file.length === 0) {
         throw new Error("No files provided for chunked upload");
      }
      if (file.length > 1) {
         throw new Error("Chunked uploads can only handle one file at a time");
      }

      const singleFile = file[0];

      // Determine optimal concurrency based on file size
      let optimalConcurrency;
      if (singleFile.size < 50 * 1024 * 1024) {
         // < 50MB
         optimalConcurrency = Math.min(8, maxConcurrency);
      } else if (singleFile.size < 200 * 1024 * 1024) {
         // < 200MB
         optimalConcurrency = Math.min(16, maxConcurrency);
      } else {
         // >= 200MB
         optimalConcurrency = Math.min(32, maxConcurrency);
      }

      return await uploadFileChunkedConcurrent({
         file: singleFile,
         server,
         token,
         onUploadProgress,
         chunkSize,
         maxConcurrency: optimalConcurrency,
      });
   } else {
      // Use regular upload for multiple files or small files
      return await uploadFile({
         file,
         server,
         token,
         onUploadProgress,
      });
   }
};

export const useUpload = () => {
   const { token } = useAuth();
   const { currentServer } = useCurrentServer();

   return useMutation({
      mutationFn: ({
         file,
         onUploadProgress,
         chunkSize = 5 * 1024 * 1024,
         useChunkedUpload = false,
         maxConcurrency = 16,
         chunkThreshold = 8 * 1024 * 1024,
      }: UploadFileParams) => {
         if (!currentServer) {
            throw new Error("No server selected");
         }

         return uploadFileEnhanced({
            file,
            server: `//${currentServer.domain}/${token ? "upload" : "anon-upload"}`,
            token,
            onUploadProgress,
            chunkSize,
            useChunkedUpload,
            maxConcurrency,
            chunkThreshold,
         });
      },
   });
};

// Convenience hook specifically for chunked uploads
export const useChunkedUpload = (chunkSize: number = 5 * 1024 * 1024, maxConcurrency: number = 16) => {
   const { token } = useAuth();
   const { currentServer } = useCurrentServer();

   return useMutation({
      mutationFn: ({ file, onUploadProgress }: { file: File; onUploadProgress: (progress: number) => void }) => {
         if (!currentServer) {
            throw new Error("No server selected");
         }

         return uploadFileEnhanced({
            file: [file],
            server: `//${currentServer.domain}/${token ? "upload" : "anon-upload"}`,
            token,
            onUploadProgress,
            chunkSize,
            useChunkedUpload: true,
            maxConcurrency,
            chunkThreshold: 0, // Always use chunked for this hook
         });
      },
   });
};
