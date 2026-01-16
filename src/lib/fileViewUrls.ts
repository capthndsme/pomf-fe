import type FileItem from "../../types/response/FileItem";
import type ServerShard from "../../types/response/ServerShard";

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
  const cleanPath = filePath.replace(/^\/+/, "");
  return `${normalizeOrigin(domain)}/${cleanPath}`;
};

export const resolveShardDomain = (item: FileItem, availableServers?: ServerShard[] | null): string | null => {
  if (item?.serverShard?.domain) return item.serverShard.domain;
  const shardId = item?.serverShardId;
  if (!shardId || !Array.isArray(availableServers)) return null;
  return availableServers.find((s) => s.id === shardId)?.domain ?? null;
};

const joinRelativeToFileKey = (fileKey: string | null | undefined, maybeRelativeKey: string | null | undefined) => {
  if (!maybeRelativeKey) return null;
  if (!fileKey) return maybeRelativeKey;
  // If the preview key already includes a path, keep as-is.
  if (maybeRelativeKey.includes("/")) return maybeRelativeKey;
  const idx = fileKey.lastIndexOf("/");
  if (idx === -1) return maybeRelativeKey;
  const prefix = fileKey.slice(0, idx);
  return `${prefix}/${maybeRelativeKey}`;
};

export const buildPublicViewUrls = (item: FileItem, availableServers?: ServerShard[] | null): FileViewUrls | null => {
  if (!item?.id) return null;
  const domain = resolveShardDomain(item, availableServers);
  if (!domain) return null;

  const originalUrl = buildPublicUrl(domain, item.fileKey);
  const thumbnailUrl = buildPublicUrl(domain, joinRelativeToFileKey(item.fileKey, item.previewKey));

  const previews = Array.isArray(item.previews)
    ? item.previews
        .map((p) => {
          const url = buildPublicUrl(domain, joinRelativeToFileKey(item.fileKey, p.previewKey));
          if (!url) return null;
          return {
            id: p.id,
            quality: p.quality.toString(),
            mimeType: p.mimeType,
            url,
          };
        })
        .filter((p): p is FileViewPreviewUrl => !!p)
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

