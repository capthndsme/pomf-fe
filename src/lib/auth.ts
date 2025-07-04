
interface AuthState {
    userId: string | null;
    token: string | null;
}

let authState: AuthState = {
    userId: null,
    token: null,
};

export const getAuthState = (): AuthState => {
    return authState;
};

export const setAuthState = (newAuthState: AuthState) => {
    authState = newAuthState;
};

export const clearAuthState = () => {
    authState = {
        userId: null,
        token: null,
    };
};
