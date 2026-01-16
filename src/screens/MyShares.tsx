import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { BRANDING } from "@/constants";
import { axiosInstanceAuth } from "@/api/axios";
import { responseIsSuccess, type ApiBase } from "../../types/ApiBase";
import type FileItem from "../../types/response/FileItem";
import { TouchableLink } from "@/components/TouchableLink";
import { cn } from "@/lib/utils";
import {
  Link2,
  Trash2,
  Copy,
  Check,
  Loader2,
  Folder,
  File as FileIcon,
  Clock,
  RefreshCw,
} from "lucide-react";

type FolderShareRow = {
  id: string;
  shareType?: string;
  name?: string | null;
  expiresAt?: string | null;
  folder?: FileItem;
  folderId?: string;
  createdAt?: string;
};

type FileShareRow = {
  id: string;
  expiresAt?: string | null;
  file?: FileItem;
  fileId?: string;
  createdAt?: string;
};

type Tab = "files" | "folders";

const formatExpiry = (expiresAt?: string | null) => {
  if (!expiresAt) return "Never";
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString();
};

export default function MyShares() {
  const [tab, setTab] = useState<Tab>("files");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fileShares, setFileShares] = useState<FileShareRow[]>([]);
  const [folderShares, setFolderShares] = useState<FolderShareRow[]>([]);

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const fetchShares = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fileRes, folderRes] = await Promise.all([
        axiosInstanceAuth.get<ApiBase<FileShareRow[]>>("/file/my-file-shares"),
        axiosInstanceAuth.get<ApiBase<FolderShareRow[]>>("/file/my-shares"),
      ]);

      if (!responseIsSuccess(fileRes.data)) {
        throw new Error(fileRes.data.message || "Failed to load file shares");
      }
      if (!responseIsSuccess(folderRes.data)) {
        throw new Error(folderRes.data.message || "Failed to load folder shares");
      }

      setFileShares(fileRes.data.data ?? []);
      setFolderShares(folderRes.data.data ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load shares");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchShares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revokeShare = async (kind: Tab, shareId: string) => {
    setRevokingId(shareId);
    try {
      const url = kind === "files" ? `/file/share-file/${shareId}` : `/file/share/${shareId}`;
      const res = await axiosInstanceAuth.delete<ApiBase<null>>(url);
      if (!responseIsSuccess(res.data)) {
        throw new Error(res.data.message || "Failed to revoke share");
      }

      if (kind === "files") {
        setFileShares((prev) => prev.filter((s) => s.id !== shareId));
      } else {
        setFolderShares((prev) => prev.filter((s) => s.id !== shareId));
      }
    } catch (e: any) {
      setError(e?.message || "Failed to revoke share");
    } finally {
      setRevokingId(null);
    }
  };

  const rows = useMemo(() => {
    return tab === "files" ? fileShares : folderShares;
  }, [tab, fileShares, folderShares]);

  const handleCopy = async (shareId: string) => {
    const url = `${origin}/s/${shareId}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 1200);
  };

  return (
    <>
      <Helmet>
        <title>My Shares • {BRANDING || "Pomf"}</title>
      </Helmet>

      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-slate-950">
        <div className="absolute top-[-10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <div className="min-h-screen pt-20 pb-10 px-4">
        <div className="w-full max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">My Shares</h1>
              <p className="text-slate-400 text-sm mt-1">
                Manage share links you’ve created. Revoke any time.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <TouchableLink
                to="/my-files"
                className="h-10 px-4 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-white border border-slate-700/60 transition-colors flex items-center gap-2"
              >
                <Folder size={16} />
                My Files
              </TouchableLink>
              <button
                onClick={() => void fetchShares()}
                className="h-10 px-4 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-white border border-slate-700/60 transition-colors flex items-center gap-2"
                disabled={isLoading}
                title="Refresh"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Refresh
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab("files")}
              className={cn(
                "h-10 px-4 rounded-xl border transition-colors flex items-center gap-2",
                tab === "files"
                  ? "bg-blue-600/25 border-blue-500/40 text-white"
                  : "bg-slate-900/40 border-slate-800/60 text-slate-300 hover:bg-slate-800/40"
              )}
            >
              <FileIcon size={16} />
              File links
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/10">{fileShares.length}</span>
            </button>
            <button
              onClick={() => setTab("folders")}
              className={cn(
                "h-10 px-4 rounded-xl border transition-colors flex items-center gap-2",
                tab === "folders"
                  ? "bg-blue-600/25 border-blue-500/40 text-white"
                  : "bg-slate-900/40 border-slate-800/60 text-slate-300 hover:bg-slate-800/40"
              )}
            >
              <Folder size={16} />
              Folder shares
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/10">{folderShares.length}</span>
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
              {error}
            </div>
          )}

          {/* List */}
          <div className="rounded-3xl border border-slate-800/60 bg-slate-900/30 backdrop-blur-xl overflow-hidden">
            {isLoading ? (
              <div className="p-10 flex items-center justify-center text-slate-300 gap-3">
                <Loader2 className="animate-spin" size={18} />
                Loading shares…
              </div>
            ) : rows.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/60 flex items-center justify-center border border-slate-700/50">
                  <Link2 size={22} className="text-slate-300" />
                </div>
                <p className="text-white font-semibold">No shares yet</p>
                <p className="text-slate-400 text-sm mt-1">
                  Create a share from <span className="text-slate-200">My Files</span>.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {rows.map((row: any) => {
                  const shareId = row.id as string;
                  const sharePath = `/s/${shareId}`;
                  const shareUrl = `${origin}${sharePath}`;

                  const title =
                    tab === "files"
                      ? (row.file?.originalFileName || row.file?.name || row.fileId || "File")
                      : (row.name || row.folder?.name || row.folderId || "Folder");

                  const subtitle =
                    tab === "files"
                      ? (row.file?.isPrivate ? "Private file" : "Public file")
                      : (row.shareType ? `Share type: ${row.shareType}` : "Folder share");

                  const expiresAt = formatExpiry(row.expiresAt);

                  return (
                    <div key={shareId} className="p-5 flex items-start gap-4">
                      <div className="mt-1 w-10 h-10 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
                        {tab === "files" ? (
                          <FileIcon size={18} className="text-blue-300" />
                        ) : (
                          <Folder size={18} className="text-purple-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-white font-semibold truncate">{title}</p>
                            <p className="text-slate-400 text-sm truncate">{subtitle}</p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <TouchableLink
                              to={sharePath}
                              className="h-9 px-3 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-white border border-slate-700/60 transition-colors flex items-center gap-2"
                              title="Open"
                            >
                              <Link2 size={16} />
                              Open
                            </TouchableLink>
                            <button
                              onClick={() => void handleCopy(shareId)}
                              className="h-9 px-3 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-white border border-slate-700/60 transition-colors flex items-center gap-2"
                              title="Copy link"
                            >
                              {copiedId === shareId ? <Check size={16} /> : <Copy size={16} />}
                              Copy
                            </button>
                            <button
                              onClick={() => void revokeShare(tab, shareId)}
                              disabled={revokingId === shareId}
                              className="h-9 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/20 text-red-200 border border-red-500/25 transition-colors flex items-center gap-2 disabled:opacity-60"
                              title="Revoke"
                            >
                              {revokingId === shareId ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                              Revoke
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} />
                            Expires: <span className="text-slate-200">{expiresAt}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="text-slate-500">ID:</span>
                            <span className="font-mono text-slate-300">{shareId}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

