import type FileItem from "../../types/response/FileItem";

export type FileViewPreviewUrl = {
  id: string;
  quality: string;
  mimeType: string;
  url: string;
};

export type FileViewUrls = {
  fileId: string;
  isPrivate: boolean;
  expiresIn: number | null;
  originalUrl: string | null;
  thumbnailUrl: string | null;
  previews: FileViewPreviewUrl[];
};

const isAlreadyUrl = (value: string) => /^https?:\/\//i.test(value) || value.startsWith("//");

const normalizeOrigin = (domain: string): string => {
  const trimmed = domain.trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const buildPublicUrl = (domain: string | null | undefined, filePath: string | null | undefined) => {
  if (!domain || !filePath) return null;
  // Some API responses may already include a fully qualified URL (e.g. presigned/private shares).
  if (isAlreadyUrl(filePath)) return filePath;
  return `${normalizeOrigin(domain)}/${filePath}`;
};

export const buildPublicViewUrls = (item: FileItem): FileViewUrls | null => {
  if (!item?.id) return null;
  if (!item.serverShard?.domain) return null;

  const originalUrl = buildPublicUrl(item.serverShard.domain, item.fileKey);
  const thumbnailUrl = buildPublicUrl(item.serverShard.domain, item.previewKey);

  const previews = Array.isArray(item.previews)
    ? item.previews.map((p) => ({
        id: p.id,
        quality: p.quality.toString(),
        mimeType: p.mimeType,
        url: buildPublicUrl(item.serverShard!.domain, p.previewKey) ?? "",
      }))
    : [];

  return {
    fileId: item.id,
    isPrivate: !!item.isPrivate,
    expiresIn: null,
    originalUrl,
    thumbnailUrl,
    previews,
  };
};

