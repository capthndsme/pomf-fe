export interface FileType {
    id: string;
    name: string;
    type: "file" | "folder";
    parentId: string | null;
    createdAt: string;
    updatedAt: string;
}