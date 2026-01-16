import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { getAuthState, setAuthState, clearAuthState, isAuthenticated as checkAuth, type AuthState, type UserInfo } from "../lib/auth";
import { axiosInstance, axiosInstanceAuth } from "../api/axios";

interface AuthContextType {
    userId: string | null;
    token: string | null;
    user: UserInfo | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    setAuth: (userId: string, token: string, user: UserInfo) => void;
    clearAuth: () => void;
    login: (emailOrUsername: string, password: string) => Promise<void>;
    register: (email: string, username: string, password: string, fullName?: string) => Promise<void>;
    verifyToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [auth, setAuthInternal] = useState<AuthState>(getAuthState());
    const [isLoading, setIsLoading] = useState(true);

    // Sync to localStorage on changes
    useEffect(() => {
        setAuthState(auth);
    }, [auth]);

    // Verify token on mount
    useEffect(() => {
        const verify = async () => {
            if (auth.token && auth.userId) {
                try {
                    const response = await axiosInstanceAuth.get('/auth/verify-token');
                    if (response.data?.status === 'success' && response.data?.data?.user) {
                        setAuthInternal({
                            userId: response.data.data.user.id,
                            token: auth.token,
                            user: response.data.data.user,
                        });
                    } else {
                        // Token invalid, clear auth
                        clearAuthState();
                        localStorage.removeItem('save_to_root');
                        setAuthInternal({ userId: null, token: null, user: null });
                    }
                } catch {
                    // Token verification failed, clear auth
                    clearAuthState();
                    localStorage.removeItem('save_to_root');
                    setAuthInternal({ userId: null, token: null, user: null });
                }
            }
            setIsLoading(false);
        };
        verify();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const setAuth = useCallback((userId: string, token: string, user: UserInfo) => {
        setAuthInternal({ userId, token, user });
    }, []);

    const clearAuth = useCallback(() => {
        clearAuthState();
        localStorage.removeItem('save_to_root');
        setAuthInternal({ userId: null, token: null, user: null });
    }, []);

    const login = useCallback(async (emailOrUsername: string, password: string) => {
        const isEmail = emailOrUsername.includes('@');
        const response = await axiosInstance.post('/auth/login', {
            [isEmail ? 'email' : 'username']: emailOrUsername,
            password,
        });

        if (response.data?.status === 'success' && response.data?.data) {
            const { user, token } = response.data.data;
            setAuthInternal({
                userId: user.id,
                token,
                user,
            });
        } else {
            throw new Error(response.data?.message || 'Login failed');
        }
    }, []);

    const register = useCallback(async (email: string, username: string, password: string, fullName?: string) => {
        const response = await axiosInstance.post('/auth/register', {
            email,
            username,
            password,
            fullName,
        });

        if (response.data?.status === 'success' && response.data?.data) {
            const { user, token } = response.data.data;
            setAuthInternal({
                userId: user.id,
                token,
                user,
            });
        } else {
            throw new Error(response.data?.message || 'Registration failed');
        }
    }, []);

    const verifyToken = useCallback(async (): Promise<boolean> => {
        if (!auth.token || !auth.userId) return false;

        try {
            const response = await axiosInstanceAuth.get('/auth/verify-token');
            return response.data?.status === 'success';
        } catch {
            return false;
        }
    }, [auth.token, auth.userId]);

    const value = useMemo(() => ({
        userId: auth.userId,
        token: auth.token,
        user: auth.user,
        isAuthenticated: checkAuth(),
        isLoading,
        setAuth,
        clearAuth,
        login,
        register,
        verifyToken,
    }), [auth.userId, auth.token, auth.user, isLoading, setAuth, clearAuth, login, register, verifyToken]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
