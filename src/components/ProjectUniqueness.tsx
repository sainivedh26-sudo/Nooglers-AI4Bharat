import { motion } from "framer-motion";
import {
  Database,
  Network,
  Zap,
  Globe2,
  BrainCircuit,
  GitMerge,
  Languages,
  ShieldCheck,
} from "lucide-react";

const UNIQUE_POINTS = [
  {
    icon: <BrainCircuit className="w-6 h-6" strokeWidth={2.5} />,
    title: "Transcreation, Not Translation",
    desc: "We don't just translate words — we swap entire cultural contexts. Onam becomes Pongal. Kasavu becomes Kanjivaram. The emotion stays, the culture shifts.",
    color: "hsl(0,100%,65%)",
    dark: false,
    accent: "#fff",
  },
  {
    icon: <Network className="w-6 h-6" strokeWidth={2.5} />,
    title: "3-Tier Knowledge Mapper",
    desc: "Cache → Wikidata SPARQL → Tavily + Bedrock LLM. We exhaust structured knowledge before falling back to generative AI, giving grounded, citable substitutions.",
    color: "hsl(213,52%,40%)",
    dark: false,
    accent: "#fff",
  },
  {
    icon: <Database className="w-6 h-6" strokeWidth={2.5} />,
    title: "Wikidata QID Grounding",
    desc: "Every entity is linked to a canonical Wikidata QID. No hallucinated equivalents — every substitution has a knowledge-graph proof trail and confidence score.",
    color: "hsl(56,100%,88%)",
    dark: true,
    accent: "#1a1a1a",
  },
  {
    icon: <Globe2 className="w-6 h-6" strokeWidth={2.5} />,
    title: "Indic-First Stack",
    desc: "Built on AI4Bharat IndicBERT, Sarvam Saaras ASR, and Bulbul V2 TTS — models trained on Indian languages, not retrofitted from English.",
    color: "hsl(0,100%,65%)",
    dark: false,
    accent: "#fff",
  },
  {
    icon: <Zap className="w-6 h-6" strokeWidth={2.5} />,
    title: "Real-Time SSE Log Streaming",
    desc: "Every pipeline step — NER, SPARQL, Bedrock calls, TTS — streams live to the UI via Server-Sent Events. Full transparency, zero black boxes.",
    color: "hsl(213,52%,40%)",
    dark: false,
    accent: "#fff",
  },
  {
    icon: <GitMerge className="w-6 h-6" strokeWidth={2.5} />,
    title: "Audit Trail by Design",
    desc: "Every output ships with a JSON audit record: source mention, source QID, target QID, resolution tier, confidence. Reviewers can verify every substitution.",
    color: "hsl(56,100%,88%)",
    dark: true,
    accent: "#1a1a1a",
  },
  {
    icon: <Languages className="w-6 h-6" strokeWidth={2.5} />,
    title: "5 Indian Languages at Launch",
    desc: "Malayalam, Tamil, Hindi, Telugu, Kannada — each with region-specific cultural mapping databases and distinct voice personas.",
    color: "hsl(0,100%,65%)",
    dark: false,
    accent: "#fff",
  },
  {
    icon: <ShieldCheck className="w-6 h-6" strokeWidth={2.5} />,
    title: "Confidence-Gated Substitutions",
    desc: "Low-confidence mappings surface 'no safe substitution' rather than guessing. Human reviewers get flagged items — accuracy over automation.",
    color: "hsl(213,52%,40%)",
    dark: false,
    accent: "#fff",
  },
];

const ProjectUniqueness = () => {
  return (
    <section className="bg-foreground text-background py-20 px-4 md:px-8 relative overflow-hidden">
      {/* Background geometry */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-[hsl(56,100%,88%)] opacity-5 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-[hsl(0,100%,65%)] opacity-5 translate-y-1/2 -translate-x-1/2 rotate-45" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-14">
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
            WHAT MAKES
            <br />
            <span className="text-[hsl(56,100%,88%)]">US</span> DIFFERENT
          </h2>
          <p
            className="text-lg md:text-xl text-background/60 max-w-2xl font-medium"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Eight design decisions that separate cultural transcreation from
            plain dubbing — and why every one of them matters.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border-4 border-background">
          {UNIQUE_POINTS.map((point, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const borderR = col < 3 ? "sm:border-r-4" : "";
            const borderB = row < Math.floor((UNIQUE_POINTS.length - 1) / 4) ? "border-b-4" : "";

            return (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 4) * 0.08 }}
                className={`p-6 group cursor-default ${borderR} ${borderB} border-background relative overflow-hidden`}
                style={{ backgroundColor: point.color }}
              >
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-200" />

                {/* Number watermark */}
                <span
                  className="absolute top-2 right-3 font-black text-6xl select-none pointer-events-none"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    color: point.dark ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.15)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Icon */}
                <div
                  className="w-10 h-10 flex items-center justify-center border-2 mb-4 relative z-10"
                  style={{
                    borderColor: point.dark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)",
                    color: point.accent,
                  }}
                >
                  {point.icon}
                </div>

                <h3
                  className="font-black text-base uppercase tracking-wide mb-2 relative z-10 leading-tight"
                  style={{ fontFamily: "'Outfit', sans-serif", color: point.accent }}
                >
                  {point.title}
                </h3>
                <p
                  className="text-sm font-medium leading-relaxed relative z-10"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    color: point.dark ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.75)",
                  }}
                >
                  {point.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProjectUniqueness;
