
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { getAuthState, setAuthState, clearAuthState } from "../lib/auth";

interface AuthContextType {
    userId: string | null;
    token: string | null;
    setAuth: (userId: string, token: string) => void;
    clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [auth, setAuth] = useState(getAuthState());

    useEffect(() => {
        setAuthState(auth);
    }, [auth]);

    const setAuthData = (userId: string, token: string) => {
        setAuth({ userId, token });
    };

    const clearAuthData = () => {
        clearAuthState();
        setAuth({ userId: null, token: null });
    };

    const val = useMemo(() => ({ ...auth, setAuth: setAuthData, clearAuth: clearAuthData }), [clearAuthData, setAuth, auth.token, auth.userId])

    return (
        <AuthContext.Provider value={val}>
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
