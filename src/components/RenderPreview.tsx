import type FileItem from "../../types/response/FileItem";
import BlurhashImage from "./BlurhashImage";
import { useState, useRef, useEffect, useMemo } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { Blurhash } from "react-blurhash";
import { Loader2, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileViewUrls } from "@/lib/fileViewUrls";

/**
 * Video player with blurhash placeholder and controls
 */
const VideoWithBlurhash = ({
  item,
  videoUrl,
}: {
  item: FileItem;
  videoUrl: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleLoadedData = () => setIsLoaded(true);
      const handleError = () => setError(true);

      video.addEventListener("loadeddata", handleLoadedData);
      video.addEventListener("error", handleError);
      video.load();

      return () => {
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("error", handleError);
      };
    }
  }, [videoUrl]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-slate-900/50 rounded-lg p-8"
      >
        <p className="text-slate-400 text-sm">Failed to load video</p>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-blue-400 hover:underline text-sm"
        >
          Open directly
        </a>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full group">
      {/* Blurhash placeholder */}
      {!isLoaded && item.previewBlurHash && (
        <div className="absolute inset-0 z-10">
          <Blurhash
            hash={item.previewBlurHash}
            width="100%"
            height="100%"
            className="rounded-lg overflow-hidden"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
          </div>
        </div>
      )}

      {/* Loading state without blurhash */}
      {!isLoaded && !item.previewBlurHash && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10">
          <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        muted={isMuted}
        playsInline
        controls
        className="w-full h-full rounded-lg object-contain bg-black"
        style={{ opacity: isLoaded ? 1 : 0 }}
      >
        <source src={videoUrl} type={item.mimeType ?? "video/mp4"} />
        Your browser does not support the video tag.
      </video>

      {/* Mute toggle overlay */}
      {isLoaded && (
        <button
          onClick={toggleMute}
          className="absolute bottom-4 right-4 p-2 bg-black/60 hover:bg-black/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>
      )}
    </div>
  );
};

/**
 * RenderPreview - Renders appropriate preview based on file type
 * Handles missing preview data gracefully
 */
const RenderPreview = ({
  item,
  urls,
  className,
}: {
  item: FileItem;
  urls: FileViewUrls;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);

  const allPreviews = useMemo(() => (Array.isArray(urls?.previews) ? urls.previews : []), [urls?.previews]);

  const sortedVideoPreviews = useMemo(
    () => [...allPreviews].filter((p) => p.mimeType?.startsWith("video/")).sort((a, b) => Number(a.quality) - Number(b.quality)),
    [allPreviews]
  );

  const sortedImagePreviews = useMemo(
    () => [...allPreviews].filter((p) => p.mimeType?.startsWith("image/")).sort((a, b) => Number(a.quality) - Number(b.quality)),
    [allPreviews]
  );

  // Default to the lowest available resolution for video (fast start)
  const [selectedResolution, setSelectedResolution] = useState<string>("original");

  useEffect(() => {
    // Reset whenever the file changes
    if (sortedVideoPreviews.length > 0) {
      setSelectedResolution(sortedVideoPreviews[0].quality.toString());
    } else {
      setSelectedResolution("original");
    }
  }, [item?.id, sortedVideoPreviews.length]);

  const handleResolutionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedResolution(event.target.value);
  };

  // Calculate safe aspect ratio
  const aspectRatio = useMemo(() => {
    if (item.itemWidth && item.itemHeight && item.itemWidth > 0 && item.itemHeight > 0) {
      return `${item.itemWidth} / ${item.itemHeight}`;
    }
    return "16 / 9";
  }, [item.itemWidth, item.itemHeight]);

  const originalUrl = urls?.originalUrl ?? null;
  const videoUrl = useMemo(() => {
    if (!originalUrl) return null;
    if (selectedResolution === "original") return originalUrl;
    const match = sortedVideoPreviews.find((p) => p.quality.toString() === selectedResolution);
    return match?.url || originalUrl;
  }, [originalUrl, selectedResolution, sortedVideoPreviews]);

  // Guard: No URL means no preview possible
  if (!originalUrl) {
    return (
      <div className={cn("p-8 text-center text-slate-400", className)}>
        <p>Preview not available</p>
      </div>
    );
  }

  switch (item.fileType) {
    case "IMAGE": {
      const directUrl = originalUrl;
      const lowResSrc = sortedImagePreviews.length > 0 ? sortedImagePreviews[0].url : directUrl;

      return (
        <>
          <BlurhashImage
            src={lowResSrc}
            trueSrc={directUrl}
            blurhash={item.previewBlurHash || ""}
            className={cn("w-full h-auto object-contain", className)}
            alt={item.originalFileName ?? "Image"}
            style={{ aspectRatio }}
            onClick={() => setOpen(true)}
          />
          <Lightbox
            open={open}
            close={() => setOpen(false)}
            slides={[{ src: directUrl }]}
            plugins={[Zoom]}
          />
        </>
      );
    }

    case "VIDEO": {
      if (!videoUrl) {
        return (
          <div
            className={cn("flex items-center justify-center bg-slate-900/50 rounded-lg", className)}
            style={{ aspectRatio }}
          >
            <p className="text-slate-400">Video not available</p>
          </div>
        );
      }

      const videoPreviews = sortedVideoPreviews;

      return (
        <div className={cn("w-full", className)}>
          <VideoWithBlurhash item={item} videoUrl={videoUrl} />

          {/* Resolution selector - only show if there are multiple options */}
          {videoPreviews.length > 0 && (
            <div className="flex items-center gap-3 mt-3 px-1">
              <label
                htmlFor="resolution"
                className="text-sm text-slate-400"
              >
                Quality:
              </label>
              <select
                id="resolution"
                onChange={handleResolutionChange}
                value={selectedResolution}
                className="bg-slate-800 text-white text-sm px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="original">Original</option>
                {videoPreviews.map((preview) => (
                  <option
                    key={preview.quality}
                    value={preview.quality.toString()}
                  >
                    {preview.quality}p
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      );
    }

    case "AUDIO":
      return (
        <div className={cn("p-4 bg-slate-900/50 rounded-lg", className)}>
          <audio
            controls
            className="w-full"
            preload="metadata"
          >
            <source
              src={originalUrl}
              type={item.mimeType ?? "audio/mpeg"}
            />
            Your browser does not support the audio tag.
          </audio>
        </div>
      );

    case "DOCUMENT":
    case "PLAINTEXT":
      // For PDFs, use native embed for better browser support
      if (item.mimeType === 'application/pdf') {
         return (
             <embed
                 src={originalUrl}
                 type="application/pdf"
                 className={cn("w-full h-full rounded-lg border border-slate-800 bg-slate-900", className)}
                 style={{ minHeight: "80vh" }}
             />
         );
      }
      return (
        <iframe
          src={originalUrl}
          title={item.originalFileName ?? "Document"}
          className={cn("w-full h-full rounded-lg border border-slate-800 bg-white", className)}
          style={{ aspectRatio: "4 / 3", minHeight: "80vh" }}
        />
      );

    default:
      return null;
  }
};

export default RenderPreview;
