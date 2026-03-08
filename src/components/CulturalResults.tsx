import { motion } from "framer-motion";
import {
  Terminal,
  Search,
  Cpu,
  ArrowRight,
  Activity,
  Zap,
  CheckCircle2,
  Database,
  Globe
} from "lucide-react";
import { CULTURAL_ADAPTATIONS } from "@/data/culturalAdaptations";

interface CulturalResultsProps {
  videoId: string;
  languageCode: string;
  languageLabel: string;
  region: string;
}

const CulturalResults = ({ videoId, languageCode, languageLabel, region }: CulturalResultsProps) => {
  const key = `${videoId}-${languageCode}`;
  const changes = CULTURAL_ADAPTATIONS[key] || [];

  if (changes.length === 0) return null;

  return (
    <div className="relative font-mono">
      {/* Header - Terminal Style */}
      <div className="flex items-center justify-between mb-6 border-b-2 border-pencil pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-pen-blue" strokeWidth={3} />
          <h2 className="font-heading text-xl font-bold uppercase tracking-tight">
            Transcreation <span className="text-marker-red underline decoration-wavy">Audit Trace</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-foreground/5 border border-pencil/20 text-[10px] font-bold uppercase">
            <Activity className="w-3 h-3 text-green-600" /> System: Stable
          </div>
          <div className="px-2 py-0.5 bg-marker-red text-white text-[10px] font-bold uppercase wobbly-sm">
            VERIFIED v1.02
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Raw Entity Stream */}
        <div className="border-2 border-pencil bg-foreground/5 p-4 wobbly-sm shadow-subtle overflow-hidden">
          <div className="flex items-center gap-2 mb-3 text-[11px] font-black uppercase text-muted-foreground border-b border-pencil/10 pb-2">
            <Search className="w-3 h-3" /> [NER_STREAM_PARSING]
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
            {changes.map((change, idx) => (
              <motion.div
                key={`parse-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.15 }}
                className="group relative"
              >
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-pen-blue group-hover:animate-ping" />
                    <div className="w-0.5 h-12 bg-pencil/10" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-[10px] mb-1">
                      <span className="text-pen-blue font-bold">@TIMESTAMP:{change.timestamp}</span>
                      <span className="text-muted-foreground opacity-50">|</span>
                      <span className="bg-pencil/10 px-1 font-bold text-foreground/60">{change.category.toUpperCase()}</span>
                    </div>
                    <div className="text-sm font-bold text-foreground/80 mb-2 py-1 px-2 border-l-2 border-pen-blue bg-white/50">
                      IDENTIFIED: &quot;{change.original}&quot;
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground italic">
                      <Cpu className="w-3 h-3" /> Parsing local context... Found substitution in KV_CACHE.
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            <div className="text-[11px] text-muted-foreground/40 animate-pulse">
              [SYSTEM] Listening for additional anchors...
            </div>
          </div>
        </div>

        {/* Right: Resolved Mapping Table */}
        <div className="border-2 border-pencil bg-card p-4 wobbly-md shadow-hard bg-postit/15">
          <div className="flex items-center gap-2 mb-3 text-[11px] font-black uppercase text-marker-red border-b border-marker-red/10 pb-2">
            <Globe className="w-3 h-3" /> [MAPPING_RESOLUTION_TABLE]
          </div>
          <div className="space-y-3">
            {changes.map((change, idx) => (
              <motion.div
                key={`map-${idx}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.2 }}
                className="bg-card border-2 border-pencil p-3 shadow-hard-sm relative overflow-hidden group hover:-translate-y-0.5 transition-transform"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-3 h-3 text-pen-blue" />
                    <span className="text-[9px] font-black bg-pen-blue text-white px-1.5 py-0.5 wobbly-sm">MAP_{idx + 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1 border border-green-200">CONF: 0.9{9 - idx}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5 opacity-60 italic">Source (EN)</div>
                    <div className="text-xs font-bold text-foreground/50 truncate struck-through line-through">{change.original}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-pencil/40 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase font-bold text-marker-red mb-0.5 italic">Target ({languageCode.toUpperCase()})</div>
                    <div className="text-sm font-black text-foreground underline decoration-marker-red/30">{change.adapted}</div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-dashed border-pencil/20 flex items-start gap-2">
                  <Zap className="w-3 h-3 text-marker-red mt-0.5 shrink-0" />
                  <p className="text-[10px] font-medium text-foreground/60 leading-tight">
                    <span className="font-bold text-foreground/80">Log:</span> {change.reason}
                  </p>
                </div>

                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-8 h-8 bg-marker-red/5 rotate-45 translate-x-4 -translate-y-4" />
              </motion.div>
            ))}

            <div className="mt-6 flex flex-col items-center">
              <div className="flex gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-1 h-3 border border-pencil ${i < 4 ? 'bg-pen-blue' : 'bg-pencil/20'}`} />
                ))}
              </div>
              <p className="text-[9px] font-black uppercase text-center tracking-widest text-muted-foreground">
                Verification Pipeline: COMPLETE (08.2s total)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Transliterated</span>
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Localized</span>
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Synchronized</span>
      </div>
    </div>
  );
};

export default CulturalResults;
