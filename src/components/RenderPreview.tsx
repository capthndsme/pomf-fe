import type FileItem from "../../types/response/FileItem";
import BlurhashImage from "./BlurhashImage";
import { useState, useRef, useEffect, useMemo } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Blurhash } from "react-blurhash";
import { Loader2, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

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
const RenderPreview = ({ item, className }: { item: FileItem; className?: string }) => {
  const [open, setOpen] = useState(false);

  // Sort previews by quality ascending to find the lowest quality
  const sortedPreviews = useMemo(
    () =>
      item.previews && Array.isArray(item.previews)
        ? [...item.previews].sort(
          (a, b) => Number(a.quality) - Number(b.quality)
        )
        : [],
    [item.previews]
  );

  // Default to the lowest available resolution for video
  const [selectedResolution, setSelectedResolution] = useState<string | null>(
    sortedPreviews.length > 0 ? sortedPreviews[0].quality.toString() : null
  );

  const handleResolutionChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedResolution(
      event.target.value === "" ? null : event.target.value
    );
  };

  // Calculate safe aspect ratio
  const aspectRatio = useMemo(() => {
    if (item.itemWidth && item.itemHeight && item.itemWidth > 0 && item.itemHeight > 0) {
      return `${item.itemWidth} / ${item.itemHeight}`;
    }
    return "16 / 9";
  }, [item.itemWidth, item.itemHeight]);

  // Build base URL once
  const baseUrl = item.serverShard?.domain
    ? `https://${item.serverShard.domain}`
    : null;

  // Determine the video URL based on the selected resolution
  const videoUrl = useMemo(() => {
    if (!baseUrl || !item.fileKey) return null;

    if (selectedResolution) {
      return `${baseUrl}/${item.fileKey}_${selectedResolution}p.mp4`;
    }
    return `${baseUrl}/${item.fileKey}`;
  }, [baseUrl, item.fileKey, selectedResolution]);

  // Guard: No server shard means no preview possible
  if (!baseUrl || !item.fileKey) {
    return (
      <div className={cn("p-8 text-center text-slate-400", className)}>
        <p>Preview not available</p>
      </div>
    );
  }

  switch (item.fileType) {
    case "IMAGE": {
      const directUrl = `${baseUrl}/${item.fileKey}`;

      // Find low-res image preview if available
      const lowResPreview = sortedPreviews.find((p) =>
        p.mimeType?.startsWith("image/")
      );

      // Build low-res URL
      const fileKeyBase = item.fileKey?.split("/")[0];
      const lowResSrc = lowResPreview
        ? `${baseUrl}/${fileKeyBase}/${lowResPreview.previewKey}`
        : directUrl;

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

      // Filter video previews
      const videoPreviews = sortedPreviews.filter((p) =>
        p.mimeType?.startsWith("video/")
      );

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
                value={selectedResolution ?? ""}
                className="bg-slate-800 text-white text-sm px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="">Original</option>
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
              src={`${baseUrl}/${item.fileKey}`}
              type={item.mimeType ?? "audio/mpeg"}
            />
            Your browser does not support the audio tag.
          </audio>
        </div>
      );

    case "DOCUMENT":
    case "PLAINTEXT":
      return (
        <iframe
          src={`${baseUrl}/${item.fileKey}`}
          title={item.originalFileName ?? "Document"}
          className={cn("w-full rounded-lg border border-slate-800", className)}
          style={{ aspectRatio: "4 / 3", minHeight: "400px" }}
        />
      );

    default:
      return null;
  }
};

export default RenderPreview;
