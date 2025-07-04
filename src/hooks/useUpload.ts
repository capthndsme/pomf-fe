import { useMutation } from "react-query";
 
import { useCurrentServer } from "../providers/CurrentServerProvider";
import axios from "axios";
import { useAuth } from "@/providers/AuthProvider";
import type { ApiBase } from "types/ApiBase";
import type FileItem from "types/response/FileItem";

type UploadFileParams = {
  file: File[];
  onUploadProgress: (progress: number) => void;
};

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

  file.forEach(file => {
      formData.append("file[]", file);
  })

  const response = await axios.post<ApiBase<FileItem[]>>(`${server}`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = progressEvent.total
        ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
        : 0;
      onUploadProgress(percentCompleted);
    },
  });
  if (response.status !== 200) {
    throw new Error(response.data.message)
  }
  if (!('data' in response.data)) throw new Error(response.data.message)
  return response.data.data;
};

export const useUpload = () => {
  const { token } = useAuth();
  const { currentServer } = useCurrentServer();

  return useMutation({
    mutationFn: ({ file, onUploadProgress }: UploadFileParams) => {
      if (!currentServer) {
        throw new Error("No server selected");
      }
      return uploadFile({
        file,
        server: `//${currentServer.domain}/${token ? 'upload' : 'anon-upload'}`,
        token,
        onUploadProgress,
      });
    },
  });
};