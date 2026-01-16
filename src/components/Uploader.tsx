import { useDropzone } from "react-dropzone";
import { useUploader, type UploadOptions } from "../providers/UploaderProvider";
import { useEffect } from "react";

interface UploaderProps {
  uploadOptions?: UploadOptions;
}

export const Uploader = ({ uploadOptions }: UploaderProps) => {
  const { uploadFile, isUploading, progress } = useUploader();

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadFile(acceptedFiles, uploadOptions);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading,
  });

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (isUploading) {
        return;
      }

      const files = event.clipboardData?.files;
      if (files && files.length > 0) {
        // Prevent the browser from trying to paste content into an input
        event.preventDefault();
        uploadFile(Array.from(files), uploadOptions);
      }
    };

    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [isUploading, uploadFile, uploadOptions]);

  return (
    <div {...getRootProps()} className="uploader w-full aspect-square border-blue-900 border-2 border-dashed
     rounded-lg flex items-center justify-center text-white text-center cursor-pointer px-4">
      <input {...getInputProps()} />
      {isUploading ? (
        <div>
          <p>Uploading...</p>
          <progress value={progress} max="100" />
        </div>
      ) : isDragActive ? (
        <p>Drop the files here ...</p>
      ) : (
        <p>Drag and drop, click, or paste to upload</p>
      )}
    </div>
  );
};