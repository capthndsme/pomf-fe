import { type FileType } from "../FileType";
import User from "../User";
import ServerShard from "./ServerShard";

/** 
 * FileItem DTO - Represents a file stored in the system
 * Includes metadata, preview information, and transcoding status
 */
export default class FileItem {
    declare id: string;

    declare createdAt: string;

    declare updatedAt: string;

    declare ownerId: string;

    declare parentFolder: string | null;

    declare name: string;

    declare itemWidth: number | null;
    declare itemHeight: number | null;

    declare description: string | null;

    declare isPrivate: boolean | null;

    declare isFolder: boolean;

    declare originalFileName: string | null;

    declare mimeType: string | null;

    declare fileType: FileType | null;

    declare fileKey: string | null;

    declare previewKey: string | null;

    declare previewBlurHash: string | null;

    declare serverShardId: number | null;

    declare fileSize: number | null;

    declare replicationParent: string | null;

    /** Transcoding status: null = not started, pending = in progress, finished = done */
    declare transcodeStatus: 'pending' | 'finished' | 'invalid-file' | null;

    declare transcodeStartedAt: string | null;

    declare user: User | null;

    declare serverShard: ServerShard | null;

    declare parent: FileItem | null;

    declare children: FileItem[];

    declare replicas: FileItem[];

    declare previews: Array<{
        id: string;
        fileItemId: string;
        previewKey: string;
        mimeType: string;
        quality: "480" | "720" | "1080";
        createdAt: string;
        updatedAt: string;
    }>;
}
