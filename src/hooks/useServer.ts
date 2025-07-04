
import { useQuery } from 'react-query';
import { axiosInstance } from '../api/axios';
import { type ApiBase, responseIsSuccess } from '../../types/ApiBase';

export const usePing = () => {
    return useQuery(['ping'], async () => {
        const response = await axiosInstance.get<ApiBase<string>>('/coordinator/v1/ping');
        const apiResponse = response.data;
        if (responseIsSuccess(apiResponse)) {
            return apiResponse.data;
        } else {
            throw new Error(apiResponse.message);
        }
    });
};
