import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from "react";
import { motion, AnimatePresence, useMotionValue, animate, PanInfo } from "framer-motion";
import {
    ChevronRight,
    ChevronLeft,
    Play,
    Pause,
    Volume2,
    VolumeX,
    AlertCircle,
    GripVertical,
    Lock,
} from "lucide-react";

const FALLBACK_POSTER = "/placeholder.svg";

export interface SwipeableVideoPlayerHandle {
    /** Slide to translated panel and auto-play */
    playTranslated: () => void;
    /** Slide back to original */
    showOriginal: () => void;
}

interface SwipeableVideoPlayerProps {
    /** CloudFront URL for the original video */
    originalUrl: string;
    /** CloudFront URL for the translated video */
    translatedUrl: string;
    /** Label for original language */
    originalLang: string;
    /** Label for target language */
    targetLang: string;
    /** Whether the processing pipeline has completed — translated panel is locked until true */
    processingDone?: boolean;
}

const SwipeableVideoPlayer = forwardRef<SwipeableVideoPlayerHandle, SwipeableVideoPlayerProps>(
    ({ originalUrl, translatedUrl, originalLang, targetLang, processingDone = false }, ref) => {
        const [activePanel, setActivePanel] = useState<"original" | "translated">("original");

        // Original video state
        const [isOriginalPlaying, setIsOriginalPlaying] = useState(false);
        const [isOriginalMuted, setIsOriginalMuted] = useState(true);
        const [originalProgress, setOriginalProgress] = useState(0);
        const [originalError, setOriginalError] = useState(false);
        const originalVideoRef = useRef<HTMLVideoElement>(null);

        // Translated video state
        const [isTranslatedPlaying, setIsTranslatedPlaying] = useState(false);
        const [isTranslatedMuted, setIsTranslatedMuted] = useState(false);
        const [translatedProgress, setTranslatedProgress] = useState(0);
        const [translatedError, setTranslatedError] = useState(false);
        const translatedVideoRef = useRef<HTMLVideoElement>(null);

        const containerRef = useRef<HTMLDivElement>(null);
        const x = useMotionValue(0);

        // ── Width helper ─────────────────────────────────────────────────────────
        const getWidth = useCallback(() => containerRef.current?.offsetWidth || 600, []);

        // ── Slide helpers ────────────────────────────────────────────────────────
        const slideToTranslated = useCallback(() => {
            if (!processingDone) return; // guard
            const w = getWidth();
            animate(x, -w, { type: "spring", stiffness: 300, damping: 30 });
            setActivePanel("translated");
            // Pause original when switching
            if (originalVideoRef.current) {
                originalVideoRef.current.pause();
                setIsOriginalPlaying(false);
            }
        }, [getWidth, x, processingDone]);

        const slideToOriginal = useCallback(() => {
            animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
            setActivePanel("original");
            // Pause translated when switching
            if (translatedVideoRef.current) {
                translatedVideoRef.current.pause();
                setIsTranslatedPlaying(false);
            }
        }, [x]);

        // ── Imperative handle ────────────────────────────────────────────────────
        useImperativeHandle(ref, () => ({
            playTranslated: () => {
                if (!processingDone) return;
                slideToTranslated();
                setTimeout(() => {
                    if (translatedVideoRef.current && !translatedError) {
                        translatedVideoRef.current.currentTime = 0;
                        translatedVideoRef.current.play().catch(() => { });
                        setIsTranslatedPlaying(true);
                    }
                }, 500);
            },
            showOriginal: slideToOriginal,
        }));

        // ── Drag / Swipe ─────────────────────────────────────────────────────────
        const handleDragEnd = useCallback(
            (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
                const w = getWidth();
                const threshold = w * 0.2;

                if (info.offset.x < -threshold && activePanel === "original" && processingDone) {
                    slideToTranslated();
                } else if (info.offset.x > threshold && activePanel === "translated") {
                    slideToOriginal();
                } else {
                    animate(x, activePanel === "translated" ? -w : 0, {
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                    });
                }
            },
            [activePanel, x, getWidth, slideToTranslated, slideToOriginal, processingDone]
        );

        // ── Video controls — Original ────────────────────────────────────────────
        const toggleOriginalPlay = useCallback(() => {
            if (!originalVideoRef.current || originalError) return;
            if (isOriginalPlaying) {
                originalVideoRef.current.pause();
            } else {
                originalVideoRef.current.play();
            }
            setIsOriginalPlaying(!isOriginalPlaying);
        }, [isOriginalPlaying, originalError]);

        const toggleOriginalMute = useCallback(() => {
            if (!originalVideoRef.current) return;
            originalVideoRef.current.muted = !isOriginalMuted;
            setIsOriginalMuted(!isOriginalMuted);
        }, [isOriginalMuted]);

        // ── Video controls — Translated ──────────────────────────────────────────
        const toggleTranslatedPlay = useCallback(() => {
            if (!translatedVideoRef.current || translatedError || !processingDone) return;
            if (isTranslatedPlaying) {
                translatedVideoRef.current.pause();
            } else {
                translatedVideoRef.current.play();
            }
            setIsTranslatedPlaying(!isTranslatedPlaying);
        }, [isTranslatedPlaying, translatedError, processingDone]);

        const toggleTranslatedMute = useCallback(() => {
            if (!translatedVideoRef.current) return;
            translatedVideoRef.current.muted = !isTranslatedMuted;
            setIsTranslatedMuted(!isTranslatedMuted);
        }, [isTranslatedMuted]);

        // ── Progress tracking ────────────────────────────────────────────────────
        useEffect(() => {
            const v = originalVideoRef.current;
            if (!v) return;
            const h = () => { if (v.duration) setOriginalProgress((v.currentTime / v.duration) * 100); };
            v.addEventListener("timeupdate", h);
            return () => v.removeEventListener("timeupdate", h);
        }, [originalUrl]);

        useEffect(() => {
            const v = translatedVideoRef.current;
            if (!v) return;
            const h = () => { if (v.duration) setTranslatedProgress((v.currentTime / v.duration) * 100); };
            v.addEventListener("timeupdate", h);
            return () => v.removeEventListener("timeupdate", h);
        }, [translatedUrl]);

        // ── Reset when sources change ────────────────────────────────────────────
        useEffect(() => {
            setActivePanel("original");
            setOriginalError(false);
            setTranslatedError(false);
            setIsOriginalPlaying(false);
            setIsTranslatedPlaying(false);
            setOriginalProgress(0);
            setTranslatedProgress(0);
            setIsOriginalMuted(true);
            setIsTranslatedMuted(false);
            x.set(0);
        }, [originalUrl, translatedUrl, x]);

        // ── Auto-play translated when processingDone flips to true ───────────────
        useEffect(() => {
            if (processingDone && activePanel === "original") {
                // Slight delay for the user to see the "done" state before we slide over
                const t = setTimeout(() => {
                    slideToTranslated();
                    setTimeout(() => {
                        if (translatedVideoRef.current && !translatedError) {
                            translatedVideoRef.current.currentTime = 0;
                            translatedVideoRef.current.play().catch(() => { });
                            setIsTranslatedPlaying(true);
                        }
                    }, 500);
                }, 600);
                return () => clearTimeout(t);
            }
        }, [processingDone]); // eslint-disable-line react-hooks/exhaustive-deps

        // ── Shared bottom‑bar controls builder ───────────────────────────────────
        const renderControls = (
            isPlaying: boolean,
            togglePlay: () => void,
            isMuted: boolean,
            toggleMute: () => void,
            progress: number,
            label: string,
            pointerEvents: boolean
        ) => (
            <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3"
                style={{ pointerEvents: pointerEvents ? "auto" : "none" }}
            >
                <div className="w-full h-1.5 bg-white/20 rounded-full mb-2 overflow-hidden">
                    <div
                        className="h-full bg-marker-red rounded-full transition-all duration-200"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <button
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        className="w-8 h-8 flex items-center justify-center text-white hover:scale-110 transition-transform"
                    >
                        {isPlaying ? (
                            <Pause className="w-4 h-4" strokeWidth={3} />
                        ) : (
                            <Play className="w-4 h-4 ml-0.5" strokeWidth={3} />
                        )}
                    </button>
                    <span className="font-body text-xs text-white/80 flex-1 text-center">{label}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                        className="w-8 h-8 flex items-center justify-center text-white hover:scale-110 transition-transform"
                    >
                        {isMuted ? (
                            <VolumeX className="w-4 h-4" strokeWidth={3} />
                        ) : (
                            <Volume2 className="w-4 h-4" strokeWidth={3} />
                        )}
                    </button>
                </div>
            </div>
        );

        return (
            <div className="border-2 border-pencil wobbly-md shadow-hard overflow-hidden bg-card">
                {/* ── Tab bar ── */}
                <div className="flex border-b-2 border-pencil bg-background">
                    <button
                        onClick={slideToOriginal}
                        className={`flex-1 py-2 px-3 font-heading text-sm font-bold transition-all duration-150 flex items-center justify-center gap-1.5 ${activePanel === "original"
                                ? "bg-pen-blue text-primary-foreground"
                                : "text-foreground/60 hover:bg-postit/50"
                            }`}
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Original ({originalLang})
                    </button>

                    <div className="w-[3px] bg-pencil relative flex items-center justify-center shrink-0">
                        <div className="absolute w-6 h-6 bg-pencil rounded-full flex items-center justify-center z-10 shadow-hard-sm">
                            <GripVertical className="w-3 h-3 text-card" strokeWidth={3} />
                        </div>
                    </div>

                    <button
                        onClick={() => { if (processingDone) slideToTranslated(); }}
                        className={`flex-1 py-2 px-3 font-heading text-sm font-bold transition-all duration-150 flex items-center justify-center gap-1.5 ${!processingDone
                                ? "text-foreground/30 cursor-not-allowed"
                                : activePanel === "translated"
                                    ? "bg-marker-red text-primary-foreground"
                                    : "text-foreground/60 hover:bg-postit/50"
                            }`}
                    >
                        {!processingDone && <Lock className="w-3 h-3" />}
                        Translated ({targetLang})
                        {processingDone && <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                </div>

                {/* ── Swipeable container ── */}
                <div
                    ref={containerRef}
                    className="relative overflow-hidden"
                    style={{ aspectRatio: "16 / 9" }}
                >
                    <motion.div
                        style={{ x }}
                        drag={processingDone ? "x" : false}
                        dragConstraints={{ left: -(getWidth()), right: 0 }}
                        dragElastic={0.12}
                        onDragEnd={handleDragEnd}
                        className="flex h-full cursor-grab active:cursor-grabbing"
                    >
                        {/* ── Panel 1: Original Video ── */}
                        <div className="shrink-0 h-full bg-black relative" style={{ width: "100%", minWidth: "100%" }}>
                            {originalError ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 p-4">
                                    <AlertCircle className="w-10 h-10 text-muted-foreground/50 mb-2" strokeWidth={2} />
                                    <p className="font-body text-sm text-muted-foreground text-center">Video unavailable</p>
                                    <img src={FALLBACK_POSTER} alt="" className="absolute inset-0 w-full h-full object-contain opacity-10" />
                                </div>
                            ) : (
                                <>
                                    <video
                                        ref={originalVideoRef}
                                        src={originalUrl}
                                        muted={isOriginalMuted}
                                        playsInline
                                        preload="metadata"
                                        poster={FALLBACK_POSTER}
                                        onError={() => setOriginalError(true)}
                                        onEnded={() => setIsOriginalPlaying(false)}
                                        className="w-full h-full object-contain bg-black"
                                    />
                                    {/* Play overlay */}
                                    <button
                                        onClick={toggleOriginalPlay}
                                        className="absolute inset-0 flex items-center justify-center group"
                                        style={{ pointerEvents: activePanel === "original" ? "auto" : "none" }}
                                    >
                                        {!isOriginalPlaying && (
                                            <div className="w-16 h-16 rounded-full bg-card/90 border-[3px] border-pencil flex items-center justify-center shadow-hard transition-transform group-hover:scale-110">
                                                <Play className="w-7 h-7 text-pencil ml-1" strokeWidth={3} />
                                            </div>
                                        )}
                                    </button>
                                    {/* Bottom bar */}
                                    {renderControls(
                                        isOriginalPlaying, toggleOriginalPlay,
                                        isOriginalMuted, toggleOriginalMute,
                                        originalProgress,
                                        `🎬 Original · ${originalLang}`,
                                        activePanel === "original"
                                    )}
                                    {/* Badge */}
                                    <div className="absolute top-3 left-3 px-2 py-1 bg-pen-blue text-white font-body text-[10px] font-bold wobbly-sm shadow-hard-sm">
                                        ORIGINAL
                                    </div>
                                </>
                            )}
                        </div>

                        {/* ── Panel 2: Translated Video ── */}
                        <div className="shrink-0 h-full bg-black relative" style={{ width: "100%", minWidth: "100%" }}>
                            {/* Lock overlay when processing hasn't run */}
                            {!processingDone && (
                                <div className="absolute inset-0 z-30 bg-pencil/60 flex flex-col items-center justify-center backdrop-blur-sm">
                                    <div className="w-16 h-16 rounded-full bg-card/90 border-[3px] border-pencil flex items-center justify-center shadow-hard mb-3">
                                        <Lock className="w-7 h-7 text-pencil" strokeWidth={2.5} />
                                    </div>
                                    <p className="font-heading text-base font-bold text-white text-center px-4">
                                        Process Video First
                                    </p>
                                    <p className="font-body text-xs text-white/70 text-center mt-1 px-8">
                                        Run the pipeline on the right to unlock the culturally translated version
                                    </p>
                                </div>
                            )}

                            {translatedError ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 p-4">
                                    <AlertCircle className="w-10 h-10 text-muted-foreground/50 mb-2" strokeWidth={2} />
                                    <p className="font-body text-sm text-muted-foreground text-center">Translated video unavailable</p>
                                    <p className="font-body text-xs text-muted-foreground/60 mt-1">{originalLang} → {targetLang}</p>
                                    <img src={FALLBACK_POSTER} alt="" className="absolute inset-0 w-full h-full object-contain opacity-10" />
                                </div>
                            ) : (
                                <>
                                    <video
                                        ref={translatedVideoRef}
                                        src={translatedUrl}
                                        muted={isTranslatedMuted}
                                        playsInline
                                        preload="metadata"
                                        poster={FALLBACK_POSTER}
                                        onError={() => setTranslatedError(true)}
                                        onEnded={() => setIsTranslatedPlaying(false)}
                                        className="w-full h-full object-contain bg-black"
                                    />
                                    {/* Play overlay */}
                                    <button
                                        onClick={toggleTranslatedPlay}
                                        className="absolute inset-0 flex items-center justify-center group z-10"
                                        style={{ pointerEvents: activePanel === "translated" && processingDone ? "auto" : "none" }}
                                    >
                                        {!isTranslatedPlaying && processingDone && (
                                            <div className="w-16 h-16 rounded-full bg-card/90 border-[3px] border-pencil flex items-center justify-center shadow-hard transition-transform group-hover:scale-110">
                                                <Play className="w-7 h-7 text-pencil ml-1" strokeWidth={3} />
                                            </div>
                                        )}
                                    </button>
                                    {/* Bottom bar */}
                                    {processingDone &&
                                        renderControls(
                                            isTranslatedPlaying, toggleTranslatedPlay,
                                            isTranslatedMuted, toggleTranslatedMute,
                                            translatedProgress,
                                            `🌐 ${originalLang} → ${targetLang}`,
                                            activePanel === "translated"
                                        )}
                                    {/* Badge */}
                                    {processingDone && (
                                        <div className="absolute top-3 left-3 px-2 py-1 bg-marker-red text-white font-body text-[10px] font-bold wobbly-sm shadow-hard-sm z-20">
                                            ✦ CULTURALLY TRANSLATED
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>

                    {/* ── Swipe hints ── */}
                    <AnimatePresence>
                        {activePanel === "original" && processingDone && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute bottom-14 right-3 flex items-center gap-1 bg-card/90 border-2 border-pencil px-2 py-1 wobbly-sm shadow-hard-sm pointer-events-none z-20"
                            >
                                <span className="font-body text-[10px] text-foreground/70 whitespace-nowrap">
                                    ← Swipe for translated
                                </span>
                                <motion.div
                                    animate={{ x: [0, -4, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                >
                                    <ChevronLeft className="w-3.5 h-3.5 text-marker-red" strokeWidth={3} />
                                </motion.div>
                            </motion.div>
                        )}
                        {activePanel === "translated" && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute bottom-14 left-3 flex items-center gap-1 bg-card/90 border-2 border-pencil px-2 py-1 wobbly-sm shadow-hard-sm pointer-events-none z-20"
                            >
                                <motion.div
                                    animate={{ x: [0, 4, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                >
                                    <ChevronRight className="w-3.5 h-3.5 text-pen-blue" strokeWidth={3} />
                                </motion.div>
                                <span className="font-body text-[10px] text-foreground/70 whitespace-nowrap">
                                    Swipe for original →
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
    }
);

SwipeableVideoPlayer.displayName = "SwipeableVideoPlayer";
export default SwipeableVideoPlayer;
