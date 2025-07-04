

import { useQuery } from 'react-query';
import { axiosInstanceAuth } from '../api/axios';
import { type FileType } from '../../types/FileType';
import { type ApiBase, responseIsSuccess } from '../../types/ApiBase';

export const useListFiles = (parentId: string) => {
    return useQuery(['files', parentId], async () => {
        const response = await axiosInstanceAuth.get<ApiBase<FileType[]>>(`/file/list/${parentId}`);
        const apiResponse = response.data;
        if (responseIsSuccess(apiResponse)) {
            return apiResponse.data;
        } else {
            throw new Error(apiResponse.message);
        }
    });
};

export const useGetFile = (fileId: string) => {
    return useQuery(['file', fileId], async () => {
        const response = await axiosInstanceAuth.get<ApiBase<FileType>>(`/file/get/${fileId}`);
        const apiResponse = response.data;
        if (responseIsSuccess(apiResponse)) {
            return apiResponse.data;
        } else {
            throw new Error(apiResponse.message);
        }
    });
};
