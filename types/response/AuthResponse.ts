export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        username: string;
        fullName: string | null;
        profilePhoto: string | null;
        profilePhotoBlurHash: string | null;
        bio: string | null;
    };
}