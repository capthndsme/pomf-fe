import { axiosInstanceAuthOptional } from "@/api/axios";
import { useQuery } from "react-query";
import { responseIsSuccess, type ApiBase } from "../../types/ApiBase";
import type FileItem from "../../types/response/FileItem";
import type { FileViewUrls } from "@/lib/fileViewUrls";
import { ApiResponseError } from "@/hooks/useResolveLinkToFile";

type ShareSurfaceResult =
  | { kind: "public-file"; file: FileItem }
  | { kind: "file-share"; file: FileItem; viewUrls: FileViewUrls };

type FileShareResponse = ApiBase<{
  file: FileItem;
  viewUrls: FileViewUrls;
}>;

export function useResolveShareSurface(id: string) {
  return useQuery<ShareSurfaceResult, ApiResponseError>(
    ["share-surface", id],
    async () => {
      // 1) Try normal public file alias resolution
      const res = await axiosInstanceAuthOptional.get<ApiBase<FileItem>>(`/file/${id}`);
      const api = res.data;
      if (responseIsSuccess(api)) {
        return { kind: "public-file", file: api.data };
      }

      // If it’s a private file requiring auth, bubble it (don’t fall through to folder share)
      if (api.status === "not-found" && /file is private|login required/i.test(api.message)) {
        throw new ApiResponseError(api.status, api.message);
      }

      // 2) Try token-based private file share resolution
      const shareRes = await axiosInstanceAuthOptional.get<FileShareResponse>(`/file/share-file/${id}`);
      const shareApi = shareRes.data;
      if (responseIsSuccess(shareApi)) {
        return { kind: "file-share", file: shareApi.data.file, viewUrls: shareApi.data.viewUrls };
      }

      throw new ApiResponseError(shareApi.status, shareApi.message);
    },
    { enabled: !!id }
  );
}

