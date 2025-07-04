import { createContext, useContext, type ReactNode, useState, useMemo } from "react";
import { useUpload } from "../hooks/useUpload";
import FileItem from "../../types/response/FileItem";

type UploaderContextType = {
   isUploading: boolean;
   error?: unknown;
   progress: number;
   uploadFile: (file: File[]) => void;
   uploadedFiles: FileItem[];
};

const UploaderContext = createContext<UploaderContextType | undefined>(undefined);

export const UploaderProvider = ({ children }: { children: ReactNode }) => {
   const [progress, setProgress] = useState(0);
   const [uploadedFiles, setUploadedFiles] = useState<FileItem[]>([]);
   const uploadMutation = useUpload();

   const uploadFile = (file: File[]) => {
      setProgress(0);
      uploadMutation.reset();

      uploadMutation.mutate(
         {
            file,
            onUploadProgress: setProgress,
         },
         {
            onSuccess: (data) => {
               setUploadedFiles((prev) => [...prev, ...data]);
            },
         }
      );
   };

   const value = useMemo(
      () => ({
         isUploading: uploadMutation.isLoading,
         error: uploadMutation.error,
         progress,
         uploadFile,
         uploadedFiles,
      }),
      [uploadMutation.isLoading, uploadMutation.error, progress, uploadFile, uploadedFiles]
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
