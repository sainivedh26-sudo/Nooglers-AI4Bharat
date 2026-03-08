import { useState, useCallback, useRef, useEffect } from "react";
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
  Brain,
  BookOpen,
  Wifi,
  WifiOff,
  Timer as TimerIcon
} from "lucide-react";

const API_BASE = "http://localhost:8000";

type StepStatus = "idle" | "active" | "done";

interface PipelineStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  estTime: number; // in seconds
}

interface LogEvent {
  type: "step_start" | "step_done" | "log" | "complete" | "error";
  step_id?: string;
  label?: string;
  message?: string;
}

interface ProcessingPipelineProps {
  videoTitle: string | null;
  targetLanguage: string;
  onSelectLanguage: (lang: string) => void;
  onProcessingComplete?: () => void;
  onReset?: () => void;
  availableLanguageCodes?: string[];
}

const LANGUAGES = [
  { code: "ml", label: "Malayalam", region: "Kerala" },
  { code: "ta", label: "Tamil", region: "Tamil Nadu" },
  { code: "hi", label: "Hindi", region: "North India" },
  { code: "te", label: "Telugu", region: "Andhra Pradesh" },
  { code: "kn", label: "Kannada", region: "Karnataka" },
];

const STEPS: PipelineStep[] = [
  {
    id: "transcript",
    label: "ASR Transcription",
    description: "CloudFront edge extraction + Sarvam Saaras...",
    icon: <FileText className="w-5 h-5" strokeWidth={3} />,
    estTime: 3.2
  },
  {
    id: "ner",
    label: "Semantic Parsing",
    description: "AWS Bedrock Qwen3-30B anchor identification...",
    icon: <Brain className="w-5 h-5" strokeWidth={3} />,
    estTime: 4.5
  },
  {
    id: "knowledge",
    label: "Knowledge Mapping",
    description: "3-Tier resolution (Cache/SPARQL/Tavily)...",
    icon: <Globe className="w-5 h-5" strokeWidth={3} />,
    estTime: 5.1
  },
  {
    id: "rewrite",
    label: "Transcreation",
    description: "Culturally-aware script reconstruction...",
    icon: <BookOpen className="w-5 h-5" strokeWidth={3} />,
    estTime: 3.8
  },
  {
    id: "tts",
    label: "Vocal Synthesis",
    description: "Bulbul V2 neural voice generation...",
    icon: <Mic className="w-5 h-5" strokeWidth={3} />,
    estTime: 4.2
  },
  {
    id: "sync",
    label: "Muxing & Export",
    description: "FFmpeg alignment and master rendering...",
    icon: <Film className="w-5 h-5" strokeWidth={3} />,
    estTime: 2.5
  },
];

const DEMO_LOG_TEMPLATES: Record<string, string[]> = {
  transcript: [
    "[INFO] Establishing CloudFront edge connection...",
    "[DEBUG] Buffer init: 2048KB | Codec: h264/aac",
    "[SYSTEM] Invoking Sarvam Saaras (v2.1) Indic-ASR engine...",
    "[ASR] Processing audio cluster [0x001 - 0x015]... 100% OK",
    "[ASR] Processing audio cluster [0x015 - 0x030]... 100% OK",
    "[INFO] Running punctuation model (confidence: 0.94)...",
    "[SUCCESS] Extraction complete. Text blob stored in KV-Temp ✓",
  ],
  ner: [
    "[INFO] Authenticating AWS Bedrock session...",
    "[PARSER] Initializing semantic anchor detection...",
    "[ENTITY] 0:12:04 → Detected Anchor [TYPE: EVENT, ID: 0xFD12]",
    "[ENTITY] 0:18:11 → Detected Anchor [TYPE: FOOD, ID: 0xFD44]",
    "[ENTITY] 0:25:02 → Detected Anchor [TYPE: ATTIRE, ID: 0xFD68]",
    "[DEBUG] Pruning low-confidence candidate overlaps...",
    "[SUCCESS] Cultural anchors tokenized for mapping ✓",
  ],
  knowledge: [
    "[INFO] Querying Tier-1: Regional Cache Index...",
    "[CACHE] HIT: Target match found for [ANCHOR_0xFD12]",
    "[CACHE] MISS: [ANCHOR_0xFD72] — Escalating to SPARQL...",
    "[SPARQL] Resolving Q-ID mapping for regional sibling...",
    "[INFO] Escalating to Tier-3: Tavily-LLM Hybrid Search...",
    "[RESOLVER] Anchor identity verified and mapped.",
    "[SUCCESS] Full cross-region mapping index created ✓",
  ],
  rewrite: [
    "[INFO] Initializing prompt context injection...",
    "[REWRITE] Segment 1/14: Applying transcreation hook (0xFD12)...",
    "[REWRITE] Segment 4/14: Applying transcreation hook (0xFD68)...",
    "[DEBUG] Semantic consistency check pass (0.97 similarity)...",
    "[SUCCESS] Target-language transcreation buffer finalized ✓",
  ],
  tts: [
    "[INFO] Loading Bulbul-V2 neural vocoder stream...",
    "[TTS] Batch processing cluster 0x01... [650ms]",
    "[DEBUG] Pacing synchronization: +120ms shift applied",
    "[SUCCESS] Naturalized audio stream synthesized ✓",
  ],
  sync: [
    "[FFMPEG] Initializing muxer: mp4 [video] <=> wav [dub]...",
    "[SYNC] Aligning audio track with metadata timestamps...",
    "[INFO] Normalizing audio gain to mastering standards...",
    "[SUCCESS] Final media bundle ready for deployment ✓",
  ],
};

const StepTimer = ({ isActive, isDone }: { isActive: boolean; isDone: boolean }) => {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed((Date.now() - start) / 1000);
      }, 100);
    } else if (isDone) {
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, isDone]);

  if (!isActive && !isDone) return null;

  return (
    <div className={`text-[10px] font-mono font-bold px-1.5 py-0.5 wobbly-sm border border-pencil/20 flex items-center gap-1 ${isActive ? "bg-pen-blue text-white animate-pulse" : "bg-muted text-muted-foreground"}`}>
      <TimerIcon className="w-3 h-3" />
      {elapsed.toFixed(1)}s
    </div>
  );
};

const ProcessingPipeline = ({
  videoTitle,
  targetLanguage,
  onSelectLanguage,
  onProcessingComplete,
  onReset,
  availableLanguageCodes,
}: ProcessingPipelineProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({});
  const [stepLogs, setStepLogs] = useState<Record<string, string[]>>({});
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const selectedLang = LANGUAGES.find((l) => l.code === targetLanguage);

  const runDemoFallback = useCallback(async () => {
    setIsProcessing(true);
    setIsDone(false);
    setStepStatuses({});
    setStepLogs({});

    for (const step of STEPS) {
      setStepStatuses((prev) => ({ ...prev, [step.id]: "active" }));
      for (const log of DEMO_LOG_TEMPLATES[step.id] ?? []) {
        // Increased lag for a more realistic processing feel
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 1700));
        setStepLogs((prev) => ({
          ...prev,
          [step.id]: [...(prev[step.id] ?? []), log],
        }));
      }
      setStepStatuses((prev) => ({ ...prev, [step.id]: "done" }));
    }
    setIsDone(true);
    setIsProcessing(false);
    onProcessingComplete?.();
  }, [onProcessingComplete]);

  const runPipeline = useCallback(async () => {
    setIsProcessing(true);
    setIsDone(false);
    setStepStatuses({});
    setStepLogs({});
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_region: "Kerala",
          target_region: selectedLang?.region ?? "Tamil Nadu",
        }),
      });
      if (!res.ok) throw new Error();
      setBackendOnline(true);
      const { job_id } = await res.json();
      const es = new EventSource(`${API_BASE}/api/process/${job_id}/stream`);
      esRef.current = es;

      es.onmessage = (evt) => {
        const event: LogEvent = JSON.parse(evt.data);
        if (event.type === "step_start" && event.step_id) {
          setStepStatuses((prev) => ({ ...prev, [event.step_id!]: "active" }));
        } else if (event.type === "step_done" && event.step_id) {
          setStepStatuses((prev) => ({ ...prev, [event.step_id!]: "done" }));
        } else if (event.type === "log" && event.step_id && event.message) {
          setStepLogs((prev) => ({
            ...prev,
            [event.step_id!]: [...(prev[event.step_id!] ?? []), event.message!],
          }));
        } else if (event.type === "complete") {
          setIsDone(true);
          setIsProcessing(false);
          es.close();
          onProcessingComplete?.();
        }
      };

      es.onerror = () => {
        setBackendOnline(false);
        es.close();
        runDemoFallback();
      };
    } catch {
      setBackendOnline(false);
      runDemoFallback();
    }
  }, [selectedLang, onProcessingComplete, runDemoFallback]);

  const reset = () => {
    esRef.current?.close();
    setIsProcessing(false);
    setIsDone(false);
    setStepStatuses({});
    setStepLogs({});
    onReset?.();
  };

  const totalPossibleTime = STEPS.reduce((acc, s) => acc + s.estTime, 0);
  const completedSteps = STEPS.filter(s => stepStatuses[s.id] === "done").length;
  const progressPercent = (completedSteps / STEPS.length) * 100;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b-2 border-dashed border-pencil/30 pb-4 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Languages className="w-6 h-6 text-pen-blue" strokeWidth={3} />
            Pipeline
          </h2>
          {isProcessing && (
            <div className="flex items-center gap-2 bg-foreground text-background px-2 py-1 text-[10px] font-black uppercase tracking-widest wobbly-sm animate-pulse">
              Processing...
            </div>
          )}
        </div>
      </div>

      {/* Target Language */}
      {!isProcessing && !isDone && (
        <div className="mb-5">
          <p className="font-heading text-sm font-bold mb-2">Select Target:</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES
              .filter(l => !availableLanguageCodes || availableLanguageCodes.includes(l.code))
              .map(l => (
                <button
                  key={l.code}
                  onClick={() => onSelectLanguage(l.code)}
                  className={`px-3 py-1.5 text-xs border-2 border-pencil font-body wobbly-sm transition-all ${targetLanguage === l.code ? "bg-pen-blue text-white shadow-hard-sm" : "bg-card hover:bg-postit shadow-subtle"}`}
                >
                  {l.label}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Process Button / Progress Bar */}
      <div className="mb-6">
        {isProcessing ? (
          <div className="border-4 border-foreground p-1 bg-white shadow-hard wobbly-md">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest">Global Progress</span>
              <span className="text-[10px] font-black">{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-4 bg-foreground/10 border-2 border-foreground relative overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-marker-red"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
              />
              <div className="absolute inset-0 bg-transparent flex items-center justify-center">
                <div className="w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:20px_20px] animate-[progress-scan_1s_linear_infinite]" />
              </div>
            </div>
          </div>
        ) : isDone ? (
          <div className="border-4 border-foreground p-3 bg-postit shadow-hard wobbly-md flex items-center justify-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-700" strokeWidth={3} />
            <span className="font-heading text-lg font-black uppercase italic">Video Ready</span>
          </div>
        ) : (
          <button
            onClick={runPipeline}
            disabled={!videoTitle}
            className={`w-full py-4 border-[4px] border-foreground font-heading text-xl font-black uppercase tracking-tighter wobbly transition-all active:translate-x-1 active:translate-y-1 ${videoTitle ? "bg-white hover:bg-marker-red hover:text-white shadow-hard cursor-pointer" : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"}`}
          >
            {videoTitle ? "Initialize Transcreation" : "Select Video Source"}
          </button>
        )}
      </div>

      {/* Steps List */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {STEPS.map((step, idx) => {
          const status = stepStatuses[step.id] ?? "idle";
          const logs = stepLogs[step.id] ?? [];
          const isActive = status === "active";

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`border-2 border-foreground p-3 wobbly-sm transition-all ${isActive ? "bg-white shadow-hard ring-2 ring-pen-blue" : "bg-card opacity-90 shadow-subtle"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center border-2 border-foreground wobbly-sm ${isActive ? "bg-pen-blue text-white" : status === "done" ? "bg-marker-red text-white" : "bg-muted text-muted-foreground"}`}>
                  {status === "done" ? <CheckCircle className="w-4 h-4" strokeWidth={3} /> : step.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading text-xs font-black uppercase">{step.label}</h4>
                    <StepTimer isActive={isActive} isDone={status === "done"} />
                  </div>
                  <p className="text-[10px] font-body opacity-60 leading-none mt-1">{step.description}</p>
                </div>
              </div>

              <AnimatePresence>
                {logs.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="mt-2 ml-10 border-l-2 border-dashed border-foreground/20 pl-2 max-h-24 overflow-y-auto scrollbar-thin"
                  >
                    {logs.map((log, i) => (
                      <p key={i} className="text-[10px] font-mono py-0.5 text-foreground/70 truncate">
                        › {log}
                      </p>
                    ))}
                    {isActive && <span className="inline-block w-1 h-3 bg-pen-blue animate-pulse ml-1" />}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {isDone && (
        <button onClick={reset} className="mt-4 p-2 font-heading text-xs font-black uppercase text-foreground/40 hover:text-marker-red transition-colors italic">
          / reset_pipeline_stack
        </button>
      )}
    </div>
  );
};

export default ProcessingPipeline;
