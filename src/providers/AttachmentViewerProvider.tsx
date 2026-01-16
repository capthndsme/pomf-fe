import { createContext, useContext, useState, useMemo, type ReactNode } from "react";
import RenderPreview from "@/components/RenderPreview";
import { X, FileIcon, Info, Share2, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoPanel } from "@/components/share/InfoPanel";
import { VideoPlayer } from "@/components/share/VideoPlayer";
import { TouchableLink } from "@/components/TouchableLink";
import type FileItem from "../../types/response/FileItem";
import { useFileViewUrls } from "@/hooks/useFileViewUrls";
import { toSharedFileUrl } from "@/lib/shareLinks";

interface AttachmentViewerContextType {
  previewFile: (file: FileItem) => void;
  closePreview: () => void;
}

const AttachmentViewerContext = createContext<AttachmentViewerContextType | undefined>(undefined);

export const useAttachmentViewer = () => {
  const context = useContext(AttachmentViewerContext);
  if (!context) {
    throw new Error("useAttachmentViewer must be used within an AttachmentViewerProvider");
  }
  return context;
};

export const AttachmentViewerProvider = ({ children }: { children: ReactNode }) => {
  const [previewItem, setPreviewItem] = useState<FileItem | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  const previewFile = async (file: FileItem) => {
    // Sanitize file object to handle leaky booleans (0/1 to false/true)
    const sanitizedFile = {
        ...file,
        isPrivate: !!file.isPrivate,
        isFolder: !!file.isFolder,
    };
    
    setPreviewItem(sanitizedFile);
    setShowInfoPanel(false); // Reset info panel state
  };

  const closePreview = () => {
    setPreviewItem(null);
  };

  const { urls: viewUrls, isLoading: isLoadingViewUrls, error: viewUrlsError } = useFileViewUrls(previewItem);

  // Memoized values for the preview
  const { directUrl, canPreview, isTranscoding, isPortrait, shareUrl } = useMemo(() => {
    if (!previewItem) return { directUrl: null, canPreview: false, isTranscoding: false, isPortrait: false, aspectRatio: 16 / 9, shareUrl: '' };

    const directUrl = viewUrls?.originalUrl ?? null;

    const isTranscoding = previewItem.transcodeStatus !== 'finished' && previewItem.transcodeStatus !== undefined;
    const canPreview = previewItem.fileType === 'IMAGE' || previewItem.fileType === 'VIDEO' || previewItem.fileType === 'AUDIO' || previewItem.fileType === 'DOCUMENT' || previewItem.fileType === 'PLAINTEXT';
    
    const hasValidDimensions = previewItem.itemWidth && previewItem.itemHeight;
    const aspectRatio = hasValidDimensions ? (previewItem.itemWidth as number) / (previewItem.itemHeight as number) : 16 / 9;
    const isPortrait = aspectRatio < 1;

    // For private files, the share URL is different or non-existent unless explicitly shared
    // But for the viewer, we can show the standard link structure, which will handle auth or 404
    const shareUrl = previewItem.id ? toSharedFileUrl(previewItem.id) : window.location.href;

    return { directUrl, canPreview, isTranscoding, isPortrait, shareUrl };
  }, [previewItem, viewUrls?.originalUrl]);

  const handleShare = async () => {
    if (!previewItem || !previewItem.id) return;
    
    const shareUrl = toSharedFileUrl(previewItem.id);
    
    const shareData = {
       title: previewItem.originalFileName || 'Shared File',
       text: `Check out this file: ${previewItem.originalFileName || 'file'} `,
       url: shareUrl,
    };

    if (navigator.share) {
       try {
          await navigator.share(shareData);
       } catch (err) {
          if ((err as Error).name !== 'AbortError') {
             console.error('Error sharing:', err);
          }
       }
    } else {
       try {
          await navigator.clipboard.writeText(shareUrl);
          alert('Link copied to clipboard!');
       } catch (err) {
          console.error('Error copying to clipboard:', err);
       }
    }
 };

  return (
    <AttachmentViewerContext.Provider value={{ previewFile, closePreview }}>
      {children}
      {previewItem && (
         <div className="fixed inset-0 z-[100] bg-slate-950 animate-in fade-in duration-200 flex flex-col lg:flex-row">
            {/* Background effects */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 blur-[120px]" />
            </div>

            {/* Close Button */}
            <button
                onClick={closePreview}
                className="fixed top-4 right-4 z-[110] p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white/80 hover:text-white transition-colors border border-white/10"
            >
                <X size={24} />
            </button>

            {/* Media Section */}
            <div className={cn(
               "flex-1 flex items-center justify-center p-4 lg:p-8 relative h-full overflow-hidden",
               isPortrait ? "lg:pr-4" : ""
            )}>
               <div 
                 className={cn(
                  "w-full h-full flex items-center justify-center transition-all duration-300",
                  isPortrait
                     ? "max-w-[min(100%,400px)] lg:max-w-[min(100%,500px)]"
                     : "max-w-full"
                 )}
                 onClick={(e) => e.stopPropagation()}
               >
                  {isLoadingViewUrls ? (
                      <div className="flex flex-col items-center justify-center">
                          <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-4" />
                          <p className="text-white/60">Authorizing...</p>
                      </div>
                  ) : viewUrlsError ? (
                     <div className="text-center p-8 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-700/50">
                        <p className="text-sm text-slate-400">{viewUrlsError}</p>
                     </div>
                  ) : canPreview && viewUrls?.originalUrl ? (
                     <>
                        {isTranscoding && !previewItem.previewBlurHash ? (
                           <div className="text-center p-8 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-700/50">
                              <div className="relative mx-auto w-16 h-16 mb-4">
                                 <div className="absolute inset-0 rounded-full border-4 border-slate-700/50" />
                                 <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
                                 <div className="absolute inset-0 flex items-center justify-center">
                                    <FileIcon className="w-6 h-6 text-slate-400" />
                                 </div>
                              </div>
                              <p className="text-lg font-semibold text-white">Generating Preview</p>
                              <p className="text-sm text-slate-400 mt-1">Optimization in progress...</p>
                           </div>
                        ) : previewItem.fileType === 'VIDEO' ? (
                           <VideoPlayer item={previewItem} urls={viewUrls} />
                        ) : (
                           <RenderPreview
                              item={previewItem}
                              urls={viewUrls}
                              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                           />
                        )}
                     </>
                  ) : (
                     <div className="text-center p-12">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-slate-800/50 flex items-center justify-center ring-1 ring-slate-700/50 shadow-xl">
                           <FileIcon className="w-10 h-10 text-slate-400" />
                        </div>
                        <p className="text-lg text-slate-300 font-medium">No Preview Available</p>
                        <p className="text-sm text-slate-500 mt-2">Download the file to view content</p>
                     </div>
                  )}
               </div>
            </div>

            {/* Desktop Sidebar (Info Panel) */}
            <div 
                className="hidden lg:flex lg:w-[380px] xl:w-[400px] flex-col border-l border-slate-800/50 bg-slate-900/30 z-[100]"
                onClick={(e) => e.stopPropagation()}
            >
               <InfoPanel
                  file={previewItem}
                  directUrl={directUrl}
                  shareUrl={shareUrl}
                  isOpen={true}
                  onClose={() => {}} 
                  onShare={handleShare}
               />
            </div>

            {/* Mobile Bottom Bar */}
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-[100] bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 p-4 safe-area-bottom">
               <div className="flex gap-3">
                  {directUrl && (
                     <TouchableLink
                        to={directUrl}
                        download={previewItem.originalFileName || "file"}
                        className="flex-1 flex items-center justify-center gap-2 h-12 bg-white hover:bg-slate-200 text-slate-900 font-semibold rounded-xl transition-all shadow-lg active:scale-[0.98]"
                     >
                        <Download className="w-4 h-4" />
                        Download
                     </TouchableLink>
                  )}
                  <button
                     onClick={handleShare}
                     className="h-12 px-4 bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors flex items-center justify-center border border-slate-700/50"
                     title="Share"
                  >
                     <Share2 className="w-5 h-5 text-slate-300" />
                  </button>
                  <button
                     onClick={() => setShowInfoPanel(true)}
                     className="h-12 px-4 bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors flex items-center justify-center border border-slate-700/50"
                     title="Info"
                  >
                     <Info className="w-5 h-5 text-slate-300" />
                  </button>
               </div>
            </div>

            {/* Mobile Info Panel Overlay */}
            {showInfoPanel && (
               <div
                  className="lg:hidden fixed inset-0 bg-black/60 z-[110]"
                  onClick={() => setShowInfoPanel(false)}
               />
            )}
            <div className="lg:hidden z-[120]">
               <InfoPanel
                  file={previewItem}
                  directUrl={directUrl}
                  shareUrl={shareUrl}
                  isOpen={showInfoPanel}
                  onClose={() => setShowInfoPanel(false)}
                  onShare={handleShare}
               />
            </div>
         </div>
      )}
    </AttachmentViewerContext.Provider>
  );
};
