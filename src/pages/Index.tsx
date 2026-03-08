import { useState, useMemo, useRef, useCallback } from "react";
import SwipeableVideoPlayer, { SwipeableVideoPlayerHandle } from "@/components/SwipeableVideoPlayer";
import ProcessingPipeline from "@/components/ProcessingPipeline";
import CulturalResults from "@/components/CulturalResults";
import HowWeBuilt from "@/components/HowWeBuilt";
import { MonitorPlay, Play } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// ── Source Videos (CloudFront originals) ─────────────────────────────────────
const ORIGINAL_VIDEOS = [
  {
    id: "vi1",
    url: "https://dq4cphu30m9zy.cloudfront.net/videos/hindi1.mp4",
    title: "Hindi Video 1",
    sourceLang: "Hindi",
    sourceLangCode: "hi",
  },
  {
    id: "vi2",
    url: "https://dq4cphu30m9zy.cloudfront.net/videos/hindi2.mp4",
    title: "Hindi Video 2",
    sourceLang: "Hindi",
    sourceLangCode: "hi",
  },
  {
    id: "vi3",
    url: "https://dq4cphu30m9zy.cloudfront.net/videos/malayalam.mp4",
    title: "Malayalam Video",
    sourceLang: "Malayalam",
    sourceLangCode: "ml",
  },
];

// ── Translated videos – CloudFront S3 URLs mapped per original ───────────────
const TRANSLATED_VIDEOS: Record<
  string,
  { url: string; targetLang: string; targetLangCode: string }[]
> = {
  vi1: [
    {
      url: "https://dq4cphu30m9zy.cloudfront.net/videos/hi2ma.mp4",
      targetLang: "Malayalam",
      targetLangCode: "ml",
    },
  ],
  vi2: [
    {
      url: "https://dq4cphu30m9zy.cloudfront.net/videos/hi2ta.mp4",
      targetLang: "Tamil",
      targetLangCode: "ta",
    },
    {
      url: "https://dq4cphu30m9zy.cloudfront.net/videos/hi2tl.mp4",
      targetLang: "Telugu",
      targetLangCode: "te",
    },
  ],
  vi3: [
    {
      url: "https://dq4cphu30m9zy.cloudfront.net/videos/ma2hi.mp4",
      targetLang: "Hindi",
      targetLangCode: "hi",
    },
    {
      url: "https://dq4cphu30m9zy.cloudfront.net/videos/ma2ta.mp4",
      targetLang: "Tamil",
      targetLangCode: "ta",
    },
    {
      url: "https://dq4cphu30m9zy.cloudfront.net/videos/ma2tl.mp4",
      targetLang: "Telugu",
      targetLangCode: "te",
    },
  ],
};

// ── Language metadata ────────────────────────────────────────────────────────
const ALL_LANGUAGES = [
  { code: "ml", label: "Malayalam", region: "Kerala" },
  { code: "ta", label: "Tamil", region: "Tamil Nadu" },
  { code: "hi", label: "Hindi", region: "North India" },
  { code: "te", label: "Telugu", region: "Andhra Pradesh / Telangana" },
  { code: "kn", label: "Kannada", region: "Karnataka" },
];

const Index = () => {
  const [selectedVideoId, setSelectedVideoId] = useState<string>("vi1");
  const [selectedTargetLangCode, setSelectedTargetLangCode] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [processingDone, setProcessingDone] = useState(false);

  const playerRef = useRef<SwipeableVideoPlayerHandle>(null);

  const selectedVideo = ORIGINAL_VIDEOS.find((v) => v.id === selectedVideoId)!;
  const availableTranslations = TRANSLATED_VIDEOS[selectedVideoId] || [];

  // Auto-select first available target language when video changes
  useMemo(() => {
    const currentValid = availableTranslations.find(
      (t) => t.targetLangCode === selectedTargetLangCode
    );
    if (!currentValid && availableTranslations.length > 0) {
      setSelectedTargetLangCode(availableTranslations[0].targetLangCode);
    } else if (availableTranslations.length === 0) {
      setSelectedTargetLangCode(null);
    }
    // Reset processing state when video changes
    setProcessingDone(false);
    setShowResults(false);
  }, [selectedVideoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeTranslation = availableTranslations.find(
    (t) => t.targetLangCode === selectedTargetLangCode
  );
  const selectedLang = ALL_LANGUAGES.find((l) => l.code === selectedTargetLangCode);

  // Pipeline finished → unlock translated video
  const handleProcessingComplete = useCallback(() => {
    setProcessingDone(true);
    setShowResults(true);
  }, []);

  const handleReset = useCallback(() => {
    setProcessingDone(false);
    setShowResults(false);
    playerRef.current?.showOriginal();
  }, []);

  const handleTargetLangChange = useCallback(
    (code: string) => {
      const available = availableTranslations.find((t) => t.targetLangCode === code);
      if (available) {
        setSelectedTargetLangCode(code);
        // Reset processing when language changes
        setProcessingDone(false);
        setShowResults(false);
      }
    },
    [availableTranslations]
  );

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* ── Header ── */}
      <header className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 border-2 border-pencil bg-postit flex items-center justify-center wobbly-sm shadow-hard-sm rotate-2">
          <MonitorPlay className="w-5 h-5 text-pencil" strokeWidth={3} />
        </div>
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground leading-none">
            Maatram AI
          </h1>
          <p className="font-body text-sm text-muted-foreground">
            culturally-aware video dubbing ~
          </p>
        </div>
      </header>

      {/* ── Source Video Thumbnails (top row) ── */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-heading text-lg font-bold text-foreground">Source Videos</h2>
        <div className="flex-1 border-t-2 border-dashed border-pencil/20" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {ORIGINAL_VIDEOS.map((video) => (
          <button
            key={video.id}
            onClick={() => setSelectedVideoId(video.id)}
            className={`w-full text-left border-2 border-pencil bg-card overflow-hidden transition-all duration-150 wobbly-md ${selectedVideoId === video.id
              ? "shadow-hard ring-2 ring-pen-blue scale-[1.02]"
              : "shadow-subtle opacity-70 hover:opacity-100 hover:shadow-hard-sm hover:-rotate-1"
              }`}
          >
            <div className="relative aspect-video bg-muted overflow-hidden">
              {/* Use the actual video as preview (paused) */}
              <video
                src={video.url}
                muted
                preload="metadata"
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-pencil/10">
                <div className="w-10 h-10 rounded-full bg-card/90 border-2 border-pencil flex items-center justify-center shadow-hard-sm">
                  <Play className="w-4 h-4 text-pencil ml-0.5" strokeWidth={3} />
                </div>
              </div>
              <span className="absolute top-1.5 left-1.5 bg-pen-blue text-white text-[9px] font-body font-bold px-1.5 py-0.5 wobbly-sm">
                {video.sourceLang}
              </span>
              <span className="absolute bottom-1.5 right-1.5 bg-pencil text-card text-[9px] font-body font-bold px-1.5 py-0.5 wobbly-sm">
                {TRANSLATED_VIDEOS[video.id]?.length || 0} dubs
              </span>
            </div>
            <div className="p-2">
              <h3 className="font-heading text-xs font-bold text-foreground leading-tight truncate">
                {video.title}
              </h3>
              <p className="font-body text-[10px] text-muted-foreground mt-0.5">
                → {TRANSLATED_VIDEOS[video.id]?.map((t) => t.targetLang).join(", ")}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Main Grid: Player + Pipeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-6 items-start">
        {/* ── Left: Video Player ── */}
        <div>
          {/* Target language pills */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <h2 className="font-heading text-sm font-bold text-foreground shrink-0">
              Translate to:
            </h2>
            <div className="flex gap-2 flex-wrap">
              {availableTranslations.map((trans) => (
                <button
                  key={trans.targetLangCode}
                  onClick={() => handleTargetLangChange(trans.targetLangCode)}
                  className={`px-3 py-1.5 text-sm border-2 border-pencil font-body transition-all duration-100 wobbly-sm ${selectedTargetLangCode === trans.targetLangCode
                    ? "bg-marker-red text-primary-foreground shadow-hard-sm translate-x-[1px] translate-y-[1px]"
                    : "bg-card text-foreground hover:bg-postit shadow-subtle"
                    }`}
                >
                  {trans.targetLang}
                </button>
              ))}
            </div>
          </div>

          {/* Swipeable Video Player */}
          {activeTranslation && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${selectedVideoId}-${selectedTargetLangCode}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <SwipeableVideoPlayer
                  ref={playerRef}
                  originalUrl={selectedVideo.url}
                  translatedUrl={activeTranslation.url}
                  originalLang={selectedVideo.sourceLang}
                  targetLang={activeTranslation.targetLang}
                  processingDone={processingDone}
                />
              </motion.div>
            </AnimatePresence>
          )}

          {/* Help text */}
          <div className="mt-3 flex items-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 bg-pen-blue rounded-full shrink-0" />
            <p className="font-body text-xs text-muted-foreground">
              <span className="font-bold text-pen-blue">Original</span> plays on the left
              · Click <span className="font-bold text-marker-red">Process Video</span> on the
              right to unlock the culturally dubbed version
            </p>
          </div>

          {/* ── Cultural Adaptations Audit Trace (Moved here) ── */}
          <AnimatePresence>
            {showResults && selectedLang && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="border-2 border-pencil bg-card p-5 wobbly-md shadow-hard"
              >
                <CulturalResults
                  videoId={selectedVideoId}
                  languageCode={selectedTargetLangCode!}
                  languageLabel={selectedLang.label}
                  region={selectedLang.region}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right: Processing Pipeline ── */}
        <div className="border-2 border-pencil bg-card p-4 wobbly-md shadow-hard lg:sticky lg:top-6 relative">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-pencil/10 border border-pencil/20 rotate-1" />
          <ProcessingPipeline
            videoTitle={selectedVideo?.title || null}
            targetLanguage={selectedTargetLangCode || "ml"}
            onSelectLanguage={handleTargetLangChange}
            onProcessingComplete={handleProcessingComplete}
            onReset={handleReset}
            availableLanguageCodes={availableTranslations.map((t) => t.targetLangCode)}
          />
        </div>
      </div>

      {/* ── How We Built ── */}
      <HowWeBuilt />
    </div>
  );
};

export default Index;
