
import axios from "axios";
import { getAuthState } from "../lib/auth";

const createAxiosInstance = (auth: boolean = false, authOptional: boolean = false) => {
    const instance = axios.create({
        baseURL: import.meta.env.VITE_API_URL,
    });

    instance.interceptors.request.use(
        (config) => {
            if (auth || authOptional) {
                const { userId, token } = getAuthState();
                if (userId && token) {
                    config.headers["x-user-id"] = userId;
                    config.headers["Authorization"] = `Bearer ${token}`;
                }
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    return instance;
};

export const axiosInstance = createAxiosInstance();
export const axiosInstanceAuth = createAxiosInstance(true);
export const axiosInstanceAuthOptional = createAxiosInstance(false, true);
