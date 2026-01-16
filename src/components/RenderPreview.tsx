import type FileItem from "../../types/response/FileItem";
import BlurhashImage from "./BlurhashImage";
import { useState, useRef, useEffect, useMemo } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Blurhash } from "react-blurhash";

const VideoWithBlurhash = ({
  item,
  videoUrl,
}: {
  item: FileItem;
  videoUrl: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleLoadedData = () => setIsLoaded(true);
      video.addEventListener("loadeddata", handleLoadedData);
      video.load();
      return () => video.removeEventListener("loadeddata", handleLoadedData);
    }
  }, [videoUrl]);

  return (
    <div
      className="relative w-full h-full"
      style={{ aspectRatio: `${item.itemWidth} / ${item.itemHeight}` }}
    >
      {!isLoaded && (
        <Blurhash
          hash={item.previewBlurHash ?? ""}
          width="100%"
          height="100%"
          
          className="absolute top-0 left-0 w-full h-full rounded-lg overflow-clip"
        />
      )}
      <video
        ref={videoRef}
        autoPlay
        muted
        controls
        className="w-full h-auto rounded-lg object-contain"
        style={{ opacity: isLoaded ? 1 : 0 }}
      >
        <source src={videoUrl} type={item.mimeType ?? "video/mp4"} />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

const RenderPreview = ({ item }: { item: FileItem }) => {
  const [open, setOpen] = useState(false);

  // Sort previews by quality ascending to easily find the lowest
  const sortedPreviews = useMemo(
    () =>
      item.previews
        ? [...item.previews].sort(
            (a, b) => Number(a.quality) - Number(b.quality)
          )
        : [],
    [item.previews]
  );

  // Default to the lowest available resolution
  const [selectedResolution, setSelectedResolution] = useState<string | null>(
    sortedPreviews.length > 0 ? sortedPreviews[0].quality.toString() : null
  );

  const handleResolutionChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    // Use null for original, and the string value for specific resolutions
    setSelectedResolution(
      event.target.value === "" ? null : event.target.value
    );
  };

  // Determine the video URL based on the selected resolution
  const videoUrl = useMemo(() => {
    if (selectedResolution) {
      return `https://${item.serverShard?.domain}/${item.fileKey}_${selectedResolution}p.mp4`;
    }
    // Fallback to original if no resolution is selected
    return `https://${item.serverShard?.domain}/${item.fileKey}`;
  }, [item.fileKey, item.serverShard?.domain, selectedResolution]);

  switch (item.fileType) {
    case "IMAGE":
      const lowResPreview = sortedPreviews.find(p => p.mimeType.startsWith("image/"));
      console.log("FK", item.fileKey)
      const originalMain = `https://${item.serverShard?.domain}/${item.fileKey?.split("/")[0]}`;

      const lowResSrc = lowResPreview
        ? `${originalMain}/${lowResPreview.previewKey}`
        : `${originalMain}/${item.fileKey}`;
      
        console.log(lowResSrc)

      return (
        <>
          <BlurhashImage
            src={lowResSrc}
            trueSrc={`https://${item.serverShard?.domain}/${item.fileKey}`}
            blurhash={item.previewBlurHash ?? ""}
            className=" w-full h-auto object-contain rounded-lg"
            alt={item.originalFileName ?? "NA"}
            style={{ aspectRatio: `${item.itemWidth} / ${item.itemHeight}` }}
            onClick={() => setOpen(true)}
          />
          <Lightbox
            open={open}
            close={() => setOpen(false)}
            slides={[
              { src: `https://${item.serverShard?.domain}/${item.fileKey}` },
            ]}
          />
        </>
      );
    case "VIDEO": {
      return (
        <div className="w-full">
          <VideoWithBlurhash item={item} videoUrl={videoUrl} />
          {/* Only show resolution selector if there are previews */}
          {sortedPreviews.length > 0 && (
            <div className="mt-2">
              <label htmlFor="resolution" className="mr-2">
                Resolution:
              </label>
              <select
                id="resolution"
                onChange={handleResolutionChange}
                // The value is the selected resolution, or "" for the "Original" option
                value={selectedResolution ?? ""}
                className="bg-gray-800 text-white p-1 rounded"
              >
                <option value="">Original</option>
                {sortedPreviews
                  .filter((p) => p.mimeType.startsWith("video/"))
                  .map((preview) => (
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
        <audio
          controls
          className=" w-full aspect-[4/3] rounded-lg object-contain"
        >
          <source
            src={`https://${item.serverShard?.domain}/${item.fileKey}`}
            type={item.mimeType ?? "audio/ogg"}
          />
          Your browser does not support the audio tag.
        </audio>
      );
    case "DOCUMENT":
    case "PLAINTEXT":
      return (
        <iframe
          src={`https://${item.serverShard?.domain}/${item.fileKey}`}
          title={item.originalFileName ?? ""}
          className="  w-full aspect-[4/3] rounded-lg object-contain"
        ></iframe>
      );
    default:
      return <p>No preview available for this file type.</p>;
  }
};

export default RenderPreview;
