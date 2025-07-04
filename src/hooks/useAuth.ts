
import { useMutation } from 'react-query';
import { axiosInstance, axiosInstanceAuth } from '../api/axios';
import { useAuth } from '../providers/AuthProvider';
import { type AuthRequest } from '../../types/request/AuthRequest';
import { type AuthResponse } from '../../types/response/AuthResponse';
import { type ApiBase, responseIsSuccess } from '../../types/ApiBase';

export const useLogin = () => {
    const { setAuth } = useAuth();
    return useMutation(
        (data: AuthRequest) => axiosInstance.post<ApiBase<AuthResponse>>("/auth/login", data),
        {
            onSuccess: (response) => {
                const apiResponse = response.data;
                if (responseIsSuccess(apiResponse)) {
                    setAuth(apiResponse.data.user.id, apiResponse.data.token);
                } else {
                    throw new Error(apiResponse.message);
                }
            },
        }
    );
};

export const useLogout = () => {
    const { clearAuth } = useAuth();
    return useMutation(() => axiosInstanceAuth.post<ApiBase<{}>>("/auth/logout"), {
        onSuccess: (response) => {
            const apiResponse = response.data;
            if (responseIsSuccess(apiResponse)) {
                clearAuth();
            } else {
                throw new Error(apiResponse.message);
            }
        },
    });
};
