import { axiosInstanceAuthOptional } from "@/api/axios";
import { useQuery } from "react-query";
import { responseIsSuccess, type ApiBase } from "../../types/ApiBase";
import type { ValidApiMessages } from "../../types/ApiMessages";
import type FileItem from "../../types/response/FileItem";

export class ApiResponseError extends Error {
  status: ValidApiMessages;

  constructor(status: ValidApiMessages, message: string) {
    super(message);
    this.name = 'ApiResponseError';
    this.status = status;
  }
}

export function useResolveLinkToFile(
  id: string
) {
  return useQuery([
    'resolver',
    id
  ],
    async () => {
      const res = await axiosInstanceAuthOptional.get<ApiBase<FileItem>>(
        `/file/${id}`
      )


      const apiResponse = res.data;
      if (responseIsSuccess(apiResponse)) {
        return apiResponse.data;
      } else {
        throw new ApiResponseError(apiResponse.status, apiResponse.message);
      }


    }
  )
}