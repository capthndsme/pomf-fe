const AUTH_STORAGE_KEY = 'pomfd_auth';

export interface AuthState {
    userId: string | null;
    token: string | null;
    user: UserInfo | null;
}

export interface UserInfo {
    id: string;
    email: string;
    username: string;
    fullName: string | null;
    profilePhoto: string | null;
    profilePhotoBlurHash: string | null;
    bio: string | null;
}

// Initialize from localStorage
const loadAuthState = (): AuthState => {
    try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load auth state:', e);
    }
    return {
        userId: null,
        token: null,
        user: null,
    };
};

let authState: AuthState = loadAuthState();

export const getAuthState = (): AuthState => {
    return authState;
};

export const setAuthState = (newAuthState: AuthState) => {
    authState = newAuthState;
    try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
    } catch (e) {
        console.error('Failed to save auth state:', e);
    }
};

export const clearAuthState = () => {
    authState = {
        userId: null,
        token: null,
        user: null,
    };
    try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
        console.error('Failed to clear auth state:', e);
    }
};

export const isAuthenticated = (): boolean => {
    return !!authState.token && !!authState.userId;
};
