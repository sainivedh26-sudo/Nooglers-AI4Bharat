import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Wrench,
  AlertCircle,
  Github,
  ExternalLink,
} from "lucide-react";

type StatusType = "done" | "in-progress" | "planned" | "blocked";

interface StatusItem {
  module: string;
  description: string;
  status: StatusType;
  detail: string;
}

const STATUS_ITEMS: StatusItem[] = [
  {
    module: "Knowledge Mapper",
    description: "3-tier cache → Wikidata SPARQL → Tavily + Bedrock",
    status: "done",
    detail: "All 5 integration tests passing. 15 seed mappings in cache.",
  },
  {
    module: "Bedrock LLM (Qwen3-Coder-30B)",
    description: "AWS Bedrock model integration via boto3 converse API",
    status: "done",
    detail: "invoke_qwen() with 5-min timeout, 25k max tokens. IAM permissions pending.",
  },
  {
    module: "Transcreation Pipeline",
    description: "NER → Mapping → Wikipedia → Rewrite orchestrator",
    status: "done",
    detail: "transcreation_pipeline.py syntax verified. Awaiting Bedrock IAM grant.",
  },
  {
    module: "FastAPI Backend",
    description: "SSE log streaming + job management API",
    status: "done",
    detail: "/api/process POST + /stream GET endpoints live. CORS enabled.",
  },
  {
    module: "Frontend (React + Vite)",
    description: "Live pipeline log streaming UI with demo fallback",
    status: "done",
    detail: "SSE-connected ProcessingPipeline. Falls back to demo when offline.",
  },
  {
    module: "Sarvam Saaras ASR",
    description: "Indic speech-to-text for transcript extraction",
    status: "in-progress",
    detail: "API integration in progress. Currently using YouTube transcript API as fallback.",
  },
  {
    module: "Bulbul V2 TTS",
    description: "Indic text-to-speech synthesis",
    status: "in-progress",
    detail: "Voice model selected. Prosody tuning in progress.",
  },
  {
    module: "FFmpeg Audio Sync",
    description: "Replace original audio track with adapted speech",
    status: "planned",
    detail: "Muxing pipeline designed. Blocked on TTS output format finalization.",
  },
  {
    module: "AWS Bedrock IAM",
    description: "bedrock:InvokeModel permission for qwen.qwen3-coder-30b-a3b-v1:0",
    status: "blocked",
    detail: "User 'rose' needs InvokeModel policy + model access enabled in us-east-1.",
  },
  {
    module: "Redis Cache Layer",
    description: "TTL-based caching for Wikidata QID lookups",
    status: "planned",
    detail: "Designed in architecture. Implementation queued after core pipeline is live.",
  },
  {
    module: "VTT/SRT Export",
    description: "Subtitle export with cultural audit trail",
    status: "planned",
    detail: "Schema designed in design.md. Requires completed audio sync step.",
  },
];

const STATUS_META: Record<StatusType, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  done: {
    label: "Done",
    icon: <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />,
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-300",
  },
  "in-progress": {
    label: "In Progress",
    icon: <Wrench className="w-4 h-4" strokeWidth={2.5} />,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-300",
  },
  planned: {
    label: "Planned",
    icon: <Clock className="w-4 h-4" strokeWidth={2.5} />,
    color: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-300",
  },
  blocked: {
    label: "Blocked",
    icon: <AlertCircle className="w-4 h-4" strokeWidth={2.5} />,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-300",
  },
};

const counts = STATUS_ITEMS.reduce(
  (acc, item) => { acc[item.status] = (acc[item.status] ?? 0) + 1; return acc; },
  {} as Record<StatusType, number>
);

const ProjectStatus = () => {
  return (
    <section className="bg-foreground text-background py-20 px-4 md:px-8 relative overflow-hidden">
      {/* Geometry */}
      <div className="absolute bottom-8 right-8 w-40 h-40 border-4 border-[hsl(213,52%,40%)] opacity-10 rotate-12 hidden md:block" />
      <div className="absolute top-16 left-8 w-20 h-20 rounded-full border-4 border-[hsl(0,100%,65%)] opacity-10 hidden md:block" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-12">
          <div className="flex gap-2 items-center mb-4">
            <div className="w-4 h-4 rounded-full bg-[hsl(0,100%,65%)]" />
            <div className="w-4 h-4 bg-[hsl(213,52%,40%)]" />
            <div
              className="w-4 h-4 bg-[hsl(56,100%,88%)]"
              style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
            />
          </div>
          <h2
            className="font-black text-4xl sm:text-6xl lg:text-7xl uppercase tracking-tighter leading-[0.9] mb-4"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            PROJECT
            <br />
            <span className="text-[hsl(56,100%,88%)]">STATUS</span>
          </h2>
          <p
            className="text-lg text-background/60 max-w-2xl font-medium mb-8"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Live build tracker — every module, its current state, and what's next.
          </p>

          {/* Summary counters */}
          <div className="flex flex-wrap gap-3">
            {(["done", "in-progress", "planned", "blocked"] as StatusType[]).map((s) => {
              const meta = STATUS_META[s];
              return (
                <div
                  key={s}
                  className={`flex items-center gap-2 px-4 py-2 border-2 font-medium text-sm ${meta.bg} ${meta.color} ${meta.border}`}
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {meta.icon}
                  <span className="font-black text-lg">{counts[s] ?? 0}</span>
                  <span className="uppercase tracking-wide text-xs">{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status table */}
        <div className="border-4 border-background overflow-hidden">
          {/* Table header */}
          <div
            className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_3fr_auto] gap-0 border-b-4 border-background px-6 py-3"
            style={{ backgroundColor: "hsl(213,52%,40%)" }}
          >
            <span
              className="font-black uppercase tracking-widest text-xs text-white"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Module
            </span>
            <span
              className="font-black uppercase tracking-widest text-xs text-white hidden sm:block"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Details
            </span>
            <span
              className="font-black uppercase tracking-widest text-xs text-white text-right"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Status
            </span>
          </div>

          {/* Rows */}
          {STATUS_ITEMS.map((item, i) => {
            const meta = STATUS_META[item.status];
            const isLast = i === STATUS_ITEMS.length - 1;
            return (
              <motion.div
                key={item.module}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className={`grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_3fr_auto] gap-4 px-6 py-4 ${
                  !isLast ? "border-b-2 border-background/20" : ""
                } ${i % 2 === 0 ? "bg-background/5" : "bg-transparent"} group hover:bg-background/10 transition-colors`}
              >
                {/* Module name */}
                <div>
                  <p
                    className="font-black text-sm uppercase tracking-wide text-background leading-tight"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {item.module}
                  </p>
                  <p
                    className="text-xs text-background/50 mt-0.5 font-medium"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {item.description}
                  </p>
                  {/* Detail shown on mobile only */}
                  <p
                    className="text-xs text-background/40 mt-1 sm:hidden"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {item.detail}
                  </p>
                </div>

                {/* Detail — desktop */}
                <p
                  className="hidden sm:block text-sm text-background/50 font-medium self-center"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {item.detail}
                </p>

                {/* Status badge */}
                <div className="flex items-start justify-end pt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-xs font-bold uppercase tracking-wide ${meta.bg} ${meta.color} ${meta.border}`}
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {meta.icon}
                    <span className="hidden sm:inline">{meta.label}</span>
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer links */}
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="https://github.com/Git-Roshan09/Nooglers-AI4Bharat"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 border-2 border-background text-background text-sm font-bold uppercase tracking-wide hover:bg-background hover:text-foreground transition-colors"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            <Github className="w-4 h-4" /> View on GitHub <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://arxiv.org/abs/2410.14057"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 border-2 border-[hsl(56,100%,88%)] text-[hsl(56,100%,88%)] text-sm font-bold uppercase tracking-wide hover:bg-[hsl(56,100%,88%)] hover:text-foreground transition-colors"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Research Paper <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default ProjectStatus;
