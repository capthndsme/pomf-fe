import UUIDService from "@/components/UUIDService";

/**
 * Shared FILE link helper.
 *
 * Note: Folder shares use a shareId that is typically a UUID and should be passed through
 * as-is (no encoding). This helper is ONLY for file ids/aliases.
 */
export const toSharedFilePath = (idOrAlias: string) => {
  if (!idOrAlias) return "/s/";
  if (idOrAlias.includes("-") && idOrAlias.length >= 32) {
    return `/s/${UUIDService.encode(idOrAlias)}`;
  }
  return `/s/${idOrAlias}`;
};

export const toSharedFileUrl = (idOrAlias: string) =>
  `${window.location.origin}${toSharedFilePath(idOrAlias)}`;

