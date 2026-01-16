import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, Sparkles, ChevronDown } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { Blurhash } from "react-blurhash";
import type FileItem from "../../../types/response/FileItem";

/**
 * ABR Configuration
 */
const ABR_CONFIG = {
    /** Time (ms) to wait before downgrading on first buffer */
    DOWNGRADE_DELAY: 1500,
    /** If buffered within this time (ms), downgrade immediately */
    RECENT_BUFFER_THRESHOLD: 8000,
    /** Smooth playback duration (ms) before considering upgrade */
    UPGRADE_THRESHOLD: 8000,
    /** Minimum time (ms) since last buffer before upgrading */
    MIN_TIME_SINCE_BUFFER: 10000,
};

/**
 * Adaptive Bitrate Video Player with Quality Selector
 * 
 * Features:
 * - Auto quality switching based on network conditions
 * - Manual quality override
 * - Smooth quality transitions preserving playback position
 */
export const VideoPlayer = ({
    item,
    baseUrl,
}: {
    item: FileItem;
    baseUrl: string;
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);

    // ABR state
    const [isAutoMode, setIsAutoMode] = useState(true);
    const [isBuffering, setIsBuffering] = useState(false);
    const lastBufferTimeRef = useRef<number>(0);
    const smoothPlaybackStartRef = useRef<number>(0);
    const qualityChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Sort previews by quality ascending (480, 720, 1080)
    const sortedPreviews = useMemo(
        () =>
            item.previews && Array.isArray(item.previews)
                ? [...item.previews]
                    .filter((p) => p.mimeType?.startsWith("video/"))
                    .sort((a, b) => Number(a.quality) - Number(b.quality))
                : [],
        [item.previews]
    );

    // Available qualities including "original" at the end (highest)
    const qualityLevels = useMemo(() => {
        const levels = sortedPreviews.map(p => p.quality.toString());
        levels.push("original"); // Original is highest quality
        return levels;
    }, [sortedPreviews]);

    // Default to lowest quality for faster initial load
    const [currentQuality, setCurrentQuality] = useState<string>(
        sortedPreviews.length > 0 ? sortedPreviews[0].quality.toString() : "original"
    );

    const videoUrl = useMemo(() => {
        if (!item.fileKey) return null;
        if (currentQuality !== "original") {
            return `${baseUrl}/${item.fileKey}_${currentQuality}p.mp4`;
        }
        return `${baseUrl}/${item.fileKey}`;
    }, [baseUrl, item.fileKey, currentQuality]);

    // Get current quality index (higher = better quality)
    const getCurrentQualityIndex = () => qualityLevels.indexOf(currentQuality);

    // Switch to a different quality level
    const switchQuality = (newQuality: string, preservePosition = true) => {
        if (newQuality === currentQuality) return;

        const video = videoRef.current;
        const currentTime = video?.currentTime || 0;
        const wasPaused = video?.paused;

        setCurrentQuality(newQuality);
        setIsLoaded(false);

        // Clear any pending quality change
        if (qualityChangeTimeoutRef.current) {
            clearTimeout(qualityChangeTimeoutRef.current);
        }

        // Reset smooth playback tracking
        smoothPlaybackStartRef.current = 0;

        if (preservePosition) {
            // Restore playback position after quality change
            setTimeout(() => {
                const newVideo = videoRef.current;
                if (newVideo) {
                    newVideo.currentTime = currentTime;
                    if (!wasPaused) {
                        newVideo.play().catch(() => { });
                    }
                }
            }, 150);
        }
    };

    // Downgrade quality (when buffering/slow network)
    const downgradeQuality = () => {
        const currentIndex = getCurrentQualityIndex();
        if (currentIndex > 0) {
            const newQuality = qualityLevels[currentIndex - 1];
            console.log(`[ABR] Downgrading quality: ${currentQuality} -> ${newQuality}`);
            switchQuality(newQuality);
        }
    };

    // Upgrade quality (when playback is smooth)
    const upgradeQuality = () => {
        const currentIndex = getCurrentQualityIndex();
        if (currentIndex < qualityLevels.length - 1) {
            const newQuality = qualityLevels[currentIndex + 1];
            console.log(`[ABR] Upgrading quality: ${currentQuality} -> ${newQuality}`);
            switchQuality(newQuality);
        }
    };

    // ABR logic - monitor video events
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isAutoMode || sortedPreviews.length === 0) return;

        // Handle buffering/waiting - downgrade quickly
        const handleWaiting = () => {
            const now = Date.now();
            setIsBuffering(true);
            smoothPlaybackStartRef.current = 0; // Reset smooth playback

            // If we buffered recently, downgrade immediately
            if (now - lastBufferTimeRef.current < ABR_CONFIG.RECENT_BUFFER_THRESHOLD) {
                downgradeQuality();
            } else {
                // First buffer event - wait a bit before downgrading
                qualityChangeTimeoutRef.current = setTimeout(() => {
                    if (video.paused === false && video.readyState < 3) {
                        downgradeQuality();
                    }
                }, ABR_CONFIG.DOWNGRADE_DELAY);
            }

            lastBufferTimeRef.current = now;
        };

        // Handle stalled event - network is too slow
        const handleStalled = () => {
            console.log("[ABR] Stalled - downgrading immediately");
            setIsBuffering(true);
            smoothPlaybackStartRef.current = 0;
            downgradeQuality();
        };

        // Handle playing - buffer resolved
        const handlePlaying = () => {
            setIsBuffering(false);
            if (qualityChangeTimeoutRef.current) {
                clearTimeout(qualityChangeTimeoutRef.current);
            }
            // Start tracking smooth playback
            if (smoothPlaybackStartRef.current === 0) {
                smoothPlaybackStartRef.current = Date.now();
            }
        };

        // Handle timeupdate - check for smooth playback
        const handleTimeUpdate = () => {
            const now = Date.now();
            const timeSinceLastBuffer = now - lastBufferTimeRef.current;
            const smoothPlaybackDuration = smoothPlaybackStartRef.current > 0
                ? now - smoothPlaybackStartRef.current
                : 0;

            // Only consider upgrading if:
            // 1. We haven't buffered recently
            // 2. We've had smooth playback for the threshold duration
            // 3. Video is actually playing
            if (
                timeSinceLastBuffer > ABR_CONFIG.MIN_TIME_SINCE_BUFFER &&
                smoothPlaybackDuration >= ABR_CONFIG.UPGRADE_THRESHOLD &&
                !video.paused
            ) {
                upgradeQuality();
                smoothPlaybackStartRef.current = Date.now(); // Reset for next upgrade
            }
        };

        // Handle canplaythrough - enough buffer for smooth playback
        const handleCanPlayThrough = () => {
            setIsBuffering(false);
            // Start tracking smooth playback if not already
            if (smoothPlaybackStartRef.current === 0) {
                smoothPlaybackStartRef.current = Date.now();
            }
        };

        video.addEventListener("waiting", handleWaiting);
        video.addEventListener("stalled", handleStalled);
        video.addEventListener("playing", handlePlaying);
        video.addEventListener("timeupdate", handleTimeUpdate);
        video.addEventListener("canplaythrough", handleCanPlayThrough);

        return () => {
            video.removeEventListener("waiting", handleWaiting);
            video.removeEventListener("stalled", handleStalled);
            video.removeEventListener("playing", handlePlaying);
            video.removeEventListener("timeupdate", handleTimeUpdate);
            video.removeEventListener("canplaythrough", handleCanPlayThrough);

            if (qualityChangeTimeoutRef.current) {
                clearTimeout(qualityChangeTimeoutRef.current);
            }
        };
    }, [isAutoMode, currentQuality, sortedPreviews.length, qualityLevels]);

    // Video load/error handlers
    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            const handleLoadedData = () => {
                setIsLoaded(true);
                // Start tracking smooth playback
                smoothPlaybackStartRef.current = Date.now();
            };
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

    // Manual quality change handler
    const handleManualQualityChange = (quality: string) => {
        setIsAutoMode(false); // Disable auto mode when user manually selects
        switchQuality(quality);
        setShowQualityMenu(false);
    };

    // Enable auto mode
    const handleAutoMode = () => {
        setIsAutoMode(true);
        setShowQualityMenu(false);
        smoothPlaybackStartRef.current = Date.now();
        lastBufferTimeRef.current = 0;
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center bg-slate-900/50 rounded-lg p-8">
                <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                <p className="text-slate-400 text-sm">Failed to load video</p>
                {videoUrl && (
                    <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 text-blue-400 hover:underline text-sm"
                    >
                        Open directly
                    </a>
                )}
            </div>
        );
    }

    const displayQuality = currentQuality === "original" ? "Original" : `${currentQuality}p`;

    return (
        <div className="relative w-full h-full">
            {/* Blurhash placeholder */}
            {!isLoaded && item.previewBlurHash && (
                <div className="absolute inset-0 z-10 rounded-lg overflow-hidden">
                    <Blurhash
                        hash={item.previewBlurHash}
                        width="100%"
                        height="100%"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-white/60 animate-spin" />
                    </div>
                </div>
            )}

            {/* Loading state without blurhash */}
            {!isLoaded && !item.previewBlurHash && (
                <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10 rounded-lg">
                    <Loader2 className="w-10 h-10 text-white/60 animate-spin" />
                </div>
            )}

            {/* Buffering indicator overlay */}
            {isBuffering && isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center z-15 pointer-events-none">
                    <div className="bg-black/60 rounded-full p-4">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                </div>
            )}

            {/* Video element */}
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                controls
                className="w-full h-full rounded-lg object-contain bg-black"
                style={{ opacity: isLoaded ? 1 : 0 }}
            >
                {videoUrl && <source src={videoUrl} type="video/mp4" />}
                Your browser does not support the video tag.
            </video>

            {/* Quality selector overlay - top right */}
            {sortedPreviews.length > 0 && isLoaded && (
                <div className="absolute top-3 right-3 z-20">
                    <div className="relative">
                        <button
                            onClick={() => setShowQualityMenu(!showQualityMenu)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/70 hover:bg-black/90 backdrop-blur-md rounded-lg text-white text-sm font-medium transition-all border border-white/10"
                        >
                            {isAutoMode && (
                                <span className="text-emerald-400 text-xs mr-1">AUTO</span>
                            )}
                            {displayQuality}
                            <ChevronDown className={cn("w-4 h-4 transition-transform", showQualityMenu && "rotate-180")} />
                        </button>

                        {showQualityMenu && (
                            <div className="absolute top-full right-0 mt-1 bg-slate-900/95 backdrop-blur-xl rounded-lg border border-slate-700/50 shadow-2xl overflow-hidden min-w-[140px]">
                                {/* Auto option */}
                                <button
                                    onClick={handleAutoMode}
                                    className={cn(
                                        "w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-800/50 flex items-center gap-2",
                                        isAutoMode ? "text-emerald-400 bg-emerald-500/10" : "text-white"
                                    )}
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Auto
                                    {isAutoMode && <span className="text-xs text-slate-400 ml-auto">({displayQuality})</span>}
                                </button>

                                <div className="border-t border-slate-700/50" />

                                {/* Quality options - sorted highest to lowest for UX */}
                                <button
                                    onClick={() => handleManualQualityChange("original")}
                                    className={cn(
                                        "w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-800/50",
                                        !isAutoMode && currentQuality === "original" ? "text-blue-400 bg-blue-500/10" : "text-white"
                                    )}
                                >
                                    Original
                                </button>
                                {[...sortedPreviews].reverse().map((preview) => (
                                    <button
                                        key={preview.quality}
                                        onClick={() => handleManualQualityChange(preview.quality.toString())}
                                        className={cn(
                                            "w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-800/50",
                                            !isAutoMode && currentQuality === preview.quality.toString()
                                                ? "text-blue-400 bg-blue-500/10"
                                                : "text-white"
                                        )}
                                    >
                                        {preview.quality}p
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
