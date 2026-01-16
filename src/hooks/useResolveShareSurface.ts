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

async function getApiResponse<T>(promise: Promise<{ data: ApiBase<T> }>): Promise<ApiBase<T>> {
  try {
    const res = await promise;
    return res.data;
  } catch (e: any) {
    // Axios throws on non-2xx; the API still returns structured ApiBase JSON.
    const data = e?.response?.data;
    if (data && typeof data === "object") {
      return data as ApiBase<T>;
    }
    throw e;
  }
}

export function useResolveShareSurface(id: string) {
  return useQuery<ShareSurfaceResult, ApiResponseError>(
    ["share-surface", id],
    async () => {
      // 1) Try normal public file alias resolution
      const api = await getApiResponse<FileItem>(
        axiosInstanceAuthOptional.get<ApiBase<FileItem>>(`/file/${id}`)
      );
      if (responseIsSuccess(api)) {
        return { kind: "public-file", file: api.data };
      }

      // If it’s a private file requiring auth, bubble it (don’t fall through to folder share)
      if (api.status === "not-found" && /file is private|login required/i.test(api.message)) {
        throw new ApiResponseError(api.status, api.message);
      }

      // 2) Try file share resolution (DB-backed share IDs or legacy tokens)
      const shareApi = await getApiResponse<{ file: FileItem; viewUrls: FileViewUrls }>(
        axiosInstanceAuthOptional.get<FileShareResponse>(`/file/share-file/${id}`)
      );
      if (responseIsSuccess(shareApi)) {
        return { kind: "file-share", file: shareApi.data.file, viewUrls: shareApi.data.viewUrls };
      }

      throw new ApiResponseError(shareApi.status, shareApi.message);
    },
    { enabled: !!id }
  );
}

