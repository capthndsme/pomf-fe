import type ServerShard from "../../types/response/ServerShard";

import { useQuery } from "react-query";
import { axiosInstance } from "../api/axios";
import { type ApiBase, responseIsSuccess } from "../../types/ApiBase";

export const useAvailableServers = () => {
   return useQuery(["available-servers"], {
      queryFn: async () => {
         const response = await axiosInstance.get<ApiBase<ServerShard[]>>("/upload/available-servers");
         const apiResponse = response.data;
         if (responseIsSuccess(apiResponse)) {
            return apiResponse.data;
         } else {
            throw new Error(apiResponse.message);
         }
      },
      refetchOnWindowFocus: false
   });
};
