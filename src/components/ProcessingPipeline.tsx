import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Globe,
  Mic,
  Film,
  CheckCircle,
  Loader2,
  Languages,
  Sparkles,
} from "lucide-react";


type StepStatus = "idle" | "active" | "done";

interface PipelineStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
  status: StepStatus;
}

interface ProcessingPipelineProps {
  videoTitle: string | null;
  targetLanguage: string;
  onSelectLanguage: (lang: string) => void;
  onProcessingComplete?: () => void;
  onReset?: () => void;
}

const LANGUAGES = [
  { code: "ml", label: "Malayalam", region: "Kerala" },
  { code: "ta", label: "Tamil", region: "Tamil Nadu" },
  { code: "hi", label: "Hindi", region: "North India" },
  { code: "te", label: "Telugu", region: "Andhra Pradesh" },
  { code: "kn", label: "Kannada", region: "Karnataka" },
];

const ProcessingPipeline = ({
  videoTitle,
  targetLanguage,
  onSelectLanguage,
  onProcessingComplete,
  onReset,
}: ProcessingPipelineProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [liveDetails, setLiveDetails] = useState<string[]>([]);

  const selectedLang = LANGUAGES.find((l) => l.code === targetLanguage);

  const steps: PipelineStep[] = [
    {
      id: "transcript",
      label: "Collecting Transcript",
      description: "Extracting speech from the video...",
      icon: <FileText className="w-5 h-5" strokeWidth={3} />,
      details: [
        "Connecting to video source...",
        "Extracting audio stream...",
        "Running speech recognition model...",
        "Parsing timestamps & segments...",
        "Transcript collected ✓",
      ],
      status: "idle",
    },
    {
      id: "cultural",
      label: "Cultural Analysis",
      description: `Optimizing content for ${selectedLang?.region || "target region"}...`,
      icon: <Globe className="w-5 h-5" strokeWidth={3} />,
      details: [
        "Pulling cultural context from web sources...",
        `Analyzing ${selectedLang?.region || "regional"} linguistic patterns...`,
        "Fetching local idioms & expressions...",
        "Mapping cultural references...",
        `Adapting humor & metaphors for ${selectedLang?.label || "target"} audience...`,
        "Validating cultural sensitivity...",
        "Cultural transcription ready ✓",
      ],
      status: "idle",
    },
    {
      id: "tts",
      label: "TTS Inference",
      description: "Generating culturally adapted speech...",
      icon: <Mic className="w-5 h-5" strokeWidth={3} />,
      details: [
        `Loading ${selectedLang?.label || "target"} voice model...`,
        "Applying prosody & intonation patterns...",
        "Running text-to-speech synthesis...",
        "Adjusting pacing to match original...",
        "Audio generation complete ✓",
      ],
      status: "idle",
    },
    {
      id: "sync",
      label: "Audio Sync",
      description: "Replacing original audio with translated version...",
      icon: <Film className="w-5 h-5" strokeWidth={3} />,
      details: [
        "Stripping original audio track...",
        "Aligning new audio with video timeline...",
        "Blending background audio & music...",
        "Final render & quality check...",
        "Video ready! ✓",
      ],
      status: "idle",
    },
  ];

  const runPipeline = useCallback(async () => {
    setIsProcessing(true);
    setLiveDetails([]);

    for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
      setCurrentStep(stepIdx);
      setLiveDetails([]);

      const stepDetails = steps[stepIdx].details;
      for (let detailIdx = 0; detailIdx < stepDetails.length; detailIdx++) {
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));
        setLiveDetails((prev) => [...prev, stepDetails[detailIdx]]);
      }

      await new Promise((r) => setTimeout(r, 400));
    }

    setCurrentStep(steps.length);
    setIsProcessing(false);
    onProcessingComplete?.();
  }, [targetLanguage]);

  const getStepStatus = (idx: number): StepStatus => {
    if (currentStep === -1) return "idle";
    if (idx < currentStep) return "done";
    if (idx === currentStep) return "active";
    return "idle";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b-2 border-dashed border-pencil/30 pb-4 mb-4">
        <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Languages className="w-6 h-6 text-pen-blue" strokeWidth={3} />
          Video Translator
        </h2>
        {videoTitle && (
          <p className="text-sm text-muted-foreground mt-1 font-body">
            Selected: <span className="text-foreground font-bold">{videoTitle}</span>
          </p>
        )}
      </div>

      {/* Language Selector */}
      <div className="mb-5">
        <p className="font-heading text-sm font-bold mb-2 text-foreground">
          Target Language:
        </p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => onSelectLanguage(lang.code)}
              className={`px-3 py-1.5 text-sm border-2 border-pencil font-body transition-all duration-100 wobbly-sm ${
                targetLanguage === lang.code
                  ? "bg-pen-blue text-primary-foreground shadow-hard-sm translate-x-[1px] translate-y-[1px]"
                  : "bg-card text-foreground hover:bg-postit shadow-subtle"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Process Button */}
      {!isProcessing && currentStep === -1 && (
        <button
          onClick={runPipeline}
          disabled={!videoTitle}
          className={`w-full py-3 px-4 border-[3px] border-pencil font-heading text-xl font-bold wobbly transition-all duration-100 mb-5 ${
            videoTitle
              ? "bg-card text-foreground shadow-hard hover:bg-marker-red hover:text-primary-foreground hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
              : "bg-muted text-muted-foreground cursor-not-allowed shadow-subtle"
          }`}
        >
          {videoTitle ? (
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" strokeWidth={3} />
              Process Video
            </span>
          ) : (
            "Select a video first"
          )}
        </button>
      )}

      {/* Pipeline Steps */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {steps.map((step, idx) => {
          const status = getStepStatus(idx);
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{
                opacity: status === "idle" && currentStep >= 0 ? 0.4 : 1,
                x: 0,
              }}
              transition={{ delay: idx * 0.1 }}
              className={`border-2 border-pencil p-3 wobbly-md transition-colors duration-200 ${
                status === "active"
                  ? "bg-postit shadow-hard"
                  : status === "done"
                  ? "bg-card shadow-subtle"
                  : "bg-card shadow-subtle"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 flex items-center justify-center border-2 border-pencil wobbly-sm ${
                    status === "active"
                      ? "bg-pen-blue text-primary-foreground"
                      : status === "done"
                      ? "bg-marker-red text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {status === "done" ? (
                    <CheckCircle className="w-5 h-5" strokeWidth={3} />
                  ) : status === "active" ? (
                    <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-heading text-sm font-bold text-foreground">
                    {step.label}
                  </h4>
                  <p className="text-xs text-muted-foreground font-body">
                    {step.description}
                  </p>
                </div>
                {status === "done" && (
                  <span className="text-xs font-body text-marker-red font-bold">
                    Done!
                  </span>
                )}
              </div>

              {/* Live details */}
              <AnimatePresence>
                {status === "active" && liveDetails.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="mt-2 ml-12 border-l-2 border-dashed border-pencil/40 pl-3"
                  >
                    {liveDetails.map((detail, dIdx) => (
                      <motion.p
                        key={dIdx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs font-body text-foreground/70 py-0.5 flex items-start gap-1.5"
                      >
                        <span className="text-pen-blue mt-0.5">›</span>
                        {detail}
                      </motion.p>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

      </div>

      {/* Completion message */}
      <AnimatePresence>
        {currentStep === steps.length && selectedLang && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 border-[3px] border-pencil bg-postit p-3 wobbly shadow-hard text-center"
          >
            <h3 className="font-heading text-lg font-bold text-foreground">
              🎉 Video Translated!
            </h3>
            <p className="font-body text-xs text-foreground/70 mt-1">
              Scroll down to see cultural adaptations for {selectedLang.region}
            </p>
            <button
              onClick={() => {
                setCurrentStep(-1);
                setLiveDetails([]);
                onReset?.();
              }}
              className="mt-2 px-3 py-1.5 border-2 border-pencil bg-card font-body text-sm wobbly-sm shadow-hard-sm hover:bg-pen-blue hover:text-primary-foreground transition-all duration-100"
            >
              Process Another
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProcessingPipeline;
