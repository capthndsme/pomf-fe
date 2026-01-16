import RenderPreview from "@/components/RenderPreview";
import { TouchableLink } from "@/components/TouchableLink";
import { BRANDING } from "@/constants";
import { ApiResponseError, useResolveLinkToFile } from "@/hooks/useResolveLinkToFile";
import { cn } from "@/lib/utils";
import {
   Download,
   FileIcon,
   AlertCircle,
   Info,
   Share2
} from "lucide-react";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import SharedFolder from "@/screens/SharedFolder";
import { buildPublicViewUrls } from "@/lib/fileViewUrls";

// Import share components
import { VideoPlayer, InfoPanel } from "@/components/share";

/**
 * Loading Skeleton
 */
const ShareLinkSkeleton = () => (
   <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-4xl">
         <div className="aspect-video rounded-2xl border border-slate-800/50 bg-slate-900/50 backdrop-blur-xl animate-pulse" />
         <div className="mt-6 h-24 rounded-xl bg-slate-900/50 animate-pulse" />
      </div>
   </div>
);

/**
 * Error State
 */
const ShareLinkError = ({ message }: { message?: string }) => (
   <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950">
      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800/50 p-10 text-center shadow-2xl">
         <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center ring-1 ring-red-500/20">
            <AlertCircle className="w-10 h-10 text-red-400" />
         </div>
         <h2 className="text-2xl font-bold text-white mb-3">File Unavailable</h2>
         <p className="text-slate-400 mb-8 leading-relaxed">
            {message || "The file you are looking for has been deleted or continues to elude us."}
         </p>
         <TouchableLink
            to="/"
            className="inline-flex w-full items-center justify-center h-12 bg-slate-100 hover:bg-white text-slate-900 rounded-xl transition-all font-semibold"
         >
            Back to Home
         </TouchableLink>
      </div>
   </div>
);

const ShareLink = () => {
   const { id } = useParams();
   const { data: file, isLoading, isError, error } = useResolveLinkToFile(id ?? "");
   const [showInfoPanel, setShowInfoPanel] = useState(false);

   const handleShare = async () => {
      const shareUrl = window.location.href;
      const shareData = {
         title: file?.originalFileName || 'Shared File',
         text: `Check out this file: ${file?.originalFileName || 'file'}`,
         url: shareUrl,
      };

      // Check if Web Share API is available
      if (navigator.share) {
         try {
            await navigator.share(shareData);
         } catch (err) {
            // User cancelled or error occurred
            if ((err as Error).name !== 'AbortError') {
               console.error('Error sharing:', err);
            }
         }
      } else {
         // Fallback: copy to clipboard
         try {
            await navigator.clipboard.writeText(shareUrl);
            // Could show a toast notification here
            alert('Link copied to clipboard!');
         } catch (err) {
            console.error('Error copying to clipboard:', err);
         }
      }
   };

   if (isLoading) {
      return <ShareLinkSkeleton />;
   }

   if (isError || !file) {
      // /s/:id is a share surface: it can be a file alias OR a folder shareId.
      // If file resolution fails, fall back to shared-folder rendering ONLY when it
      // doesn't look like "private file requires login".
      const err = error as unknown;
      const isPrivateLoginRequired =
         err instanceof ApiResponseError &&
         err.status === 'not-found' &&
         /file is private|login required/i.test(err.message);

      if (id && !isPrivateLoginRequired) {
        return <SharedFolder shareIdOverride={id} />;
      }

      if (isPrivateLoginRequired) {
        return <ShareLinkError message="This file is private. Please log in to view it." />;
      }
      return <ShareLinkError message={(error as Error)?.message} />;
   }

   const isTranscoding = file.transcodeStatus !== 'finished';
   const canPreview = file.fileType === 'IMAGE' || file.fileType === 'VIDEO' || file.fileType === 'AUDIO' || file.fileType === 'DOCUMENT' || file.fileType === 'PLAINTEXT';
   const viewUrls = buildPublicViewUrls(file);
   const directUrl = viewUrls?.originalUrl ?? null;
   const canPreviewWithUrls = canPreview && !!directUrl && !!viewUrls;

   // Calculate aspect ratio for sizing
   const hasValidDimensions = file.itemWidth && file.itemHeight;
   const aspectRatio = hasValidDimensions ? (file.itemWidth as number) / (file.itemHeight as number) : 16 / 9;
   const isPortrait = aspectRatio < 1;

   return (
      <>
         <Helmet>
            <title>{file.originalFileName} • {BRANDING || "Pomf"}</title>
            {file.previewBlurHash && viewUrls?.thumbnailUrl && (
               <meta property="og:image" content={viewUrls.thumbnailUrl} />
            )}
         </Helmet>

         {/* Background */}
         <div className="fixed inset-0 -z-10 bg-slate-950">
            <div className="absolute top-[-10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/8 blur-[120px]" />
            <div className="absolute bottom-[-10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-500/8 blur-[120px]" />
         </div>

         {/* Main Layout */}
         <div className="min-h-screen flex flex-col lg:flex-row pt-16">
            {/* Media Section */}
            <div className={cn(
               "flex-1 flex items-center justify-center p-4 lg:p-8",
               isPortrait ? "lg:pr-4" : ""
            )}>
               <div className={cn(
                  "w-full h-full flex items-center justify-center",
                  // Constrain size based on aspect ratio
                  isPortrait
                     ? "max-w-[min(100%,400px)] lg:max-w-[min(100%,500px)]"
                     : "max-w-full"
               )}>
                  {canPreviewWithUrls && viewUrls ? (
                     <>
                        {isTranscoding && !file.previewBlurHash ? (
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
                        ) : file.fileType === 'VIDEO' ? (
                           <VideoPlayer item={file} urls={viewUrls} />
                        ) : (
                           <RenderPreview
                              item={file}
                              urls={viewUrls}
                              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
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

            {/* Desktop Sidebar */}
            <div className="hidden lg:flex lg:w-[380px] xl:w-[400px] flex-col border-l border-slate-800/50 bg-slate-900/30">
               <InfoPanel
                  file={file}
                  directUrl={directUrl}
                  shareUrl={window.location.href}
                  isOpen={true}
                  onClose={() => { }}
                  onShare={handleShare}
               />
            </div>

            {/* Mobile Bottom Bar */}
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 p-4 safe-area-bottom">
               <div className="flex gap-3">
                  {directUrl && (
                     <TouchableLink
                        to={directUrl}
                        download={file.originalFileName || "file"}
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
                  className="lg:hidden fixed inset-0 bg-black/60 z-40"
                  onClick={() => setShowInfoPanel(false)}
               />
            )}
            <div className="lg:hidden">
               <InfoPanel
                  file={file}
                  directUrl={directUrl}
                  shareUrl={window.location.href}
                  isOpen={showInfoPanel}
                  onClose={() => setShowInfoPanel(false)}
                  onShare={handleShare}
               />
            </div>
         </div>
      </>
   );
};

export default ShareLink;
