import { useEffect, useMemo, useState } from "react";
import type FileItem from "../../types/response/FileItem";
import { axiosInstanceAuth } from "@/api/axios";
import type { FileViewUrls } from "@/lib/fileViewUrls";
import { buildPublicViewUrls } from "@/lib/fileViewUrls";
import { useAvailableServers } from "@/hooks/useAvailableServers";

type ViewUrlsState = {
  urls: FileViewUrls | null;
  isLoading: boolean;
  error: string | null;
};

type ViewUrlsResponse = {
  status: string;
  data: {
    fileId: string;
    isPrivate: boolean;
    expiresIn: number | null;
    originalUrl: string;
    thumbnailUrl: string;
    previews: Array<{ id: string; quality: string; mimeType: string; url: string }>;
  };
};

export const useFileViewUrls = (item: FileItem | null): ViewUrlsState => {
  const { data: availableServers, isLoading: isServersLoading } = useAvailableServers();

  const publicUrls = useMemo(() => {
    if (!item) return null;
    if (!!item.isPrivate) return null;
    return buildPublicViewUrls(item, availableServers);
  }, [item, availableServers]);

  const [state, setState] = useState<ViewUrlsState>({
    urls: publicUrls,
    isLoading: false,
    error: null,
  });

  // Keep state in sync for the public path (no fetch).
  useEffect(() => {
    if (!item) {
      setState({ urls: null, isLoading: false, error: null });
      return;
    }
    if (!item.isPrivate) {
      // Public files may still require shard-domain resolution if the API omitted serverShard.
      // While servers are loading, show a loading state rather than a blank preview.
      const needsDomainResolution = !publicUrls && !!item.serverShardId && !item.serverShard?.domain;
      if (needsDomainResolution && isServersLoading) {
        setState({ urls: null, isLoading: true, error: null });
      } else if (needsDomainResolution && !publicUrls) {
        setState({ urls: null, isLoading: false, error: "Missing file host for preview" });
      } else {
        setState({ urls: publicUrls, isLoading: false, error: null });
      }
    }
  }, [item, publicUrls, isServersLoading]);

  useEffect(() => {
    if (!item?.id) return;
    if (!item.isPrivate) return;

    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true, error: null, urls: null }));

    (async () => {
      try {
        const response = await axiosInstanceAuth.post<ViewUrlsResponse>("/file/view-urls", {
          fileId: item.id,
          expiresIn: 3600,
        });

        if (cancelled) return;

        const payload = response.data?.data;
        const urls: FileViewUrls = {
          fileId: payload.fileId,
          isPrivate: !!payload.isPrivate,
          expiresIn: payload.expiresIn ?? null,
          originalUrl: payload.originalUrl || null,
          thumbnailUrl: payload.thumbnailUrl || null,
          previews: Array.isArray(payload.previews) ? payload.previews : [],
        };

        setState({ urls, isLoading: false, error: null });
      } catch (e) {
        if (cancelled) return;
        setState({ urls: null, isLoading: false, error: "Failed to authorize file preview" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item?.id, item?.isPrivate]);

  return state;
};

