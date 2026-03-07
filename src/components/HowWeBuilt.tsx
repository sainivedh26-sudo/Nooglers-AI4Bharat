import pipelineDiagram from "@/assets/pipeline-diagram.png";
import { Heart } from "lucide-react";

const HowWeBuilt = () => {
  return (
    <div className="mt-16">
      {/* Section Divider */}
      <div className="border-t-4 border-foreground mb-0" />

      {/* How We Built Section - Bauhaus Style */}
      <section className="bg-foreground text-background py-16 px-4 md:px-8 relative overflow-hidden">
        {/* Decorative geometric shapes */}
        <div className="absolute top-8 right-8 w-24 h-24 rounded-full bg-[hsl(0,100%,65%)] opacity-20 hidden md:block" />
        <div className="absolute bottom-12 left-12 w-16 h-16 bg-[hsl(213,52%,40%)] opacity-20 rotate-45 hidden md:block" />
        <div className="absolute top-1/2 right-1/4 w-12 h-12 bg-[hsl(56,100%,88%)] opacity-10 hidden lg:block" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="mb-12 flex items-start gap-4">
            <div className="flex gap-2 items-center">
              <div className="w-4 h-4 rounded-full bg-[hsl(0,100%,65%)]" />
              <div className="w-4 h-4 bg-[hsl(213,52%,40%)]" />
              <div
                className="w-4 h-4 bg-[hsl(56,100%,88%)]"
                style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
              />
            </div>
          </div>

          <h2
            className="font-black text-4xl sm:text-6xl lg:text-7xl uppercase tracking-tighter leading-[0.9] mb-4"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            HOW WE
            <br />
            <span className="text-[hsl(56,100%,88%)]">BUILT</span> THIS
          </h2>

          <p
            className="text-lg md:text-xl text-background/70 max-w-2xl mb-12 font-medium"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Our end-to-end pipeline leverages cutting-edge AI models for
            culturally-aware video dubbing — from transcript extraction to final
            audio synchronization.
          </p>

          {/* Pipeline Diagram */}
          <div className="border-4 border-background bg-white p-4 md:p-8 shadow-[8px_8px_0px_0px_hsl(0,100%,65%)] relative">
            {/* Corner decorations */}
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-[hsl(213,52%,40%)]" />
            <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[hsl(0,100%,65%)]" />
            <div
              className="absolute -bottom-2 -left-2 w-4 h-4 bg-[hsl(56,100%,88%)]"
              style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
            />
            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-[hsl(213,52%,40%)] rotate-45" />

            <img
              src={pipelineDiagram}
              alt="DubStudio Pipeline Architecture — showing yt-dlp, Sarvam, LlamaIndex, AI4Bharat, Tavily, CrewAI, FFmpeg, and Bulbul V2 integration flow"
              className="w-full h-auto"
            />
          </div>

          {/* Pipeline Steps Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 mt-12 border-4 border-background">
            {[
              {
                num: "01",
                title: "EXTRACT",
                desc: "yt-dlp + Sarvam Saaras model for transcript extraction",
                color: "hsl(0,100%,65%)",
              },
              {
                num: "02",
                title: "ANALYZE",
                desc: "LlamaIndex chunking + AI4Bharat IndicBERT for entity matching",
                color: "hsl(213,52%,40%)",
              },
              {
                num: "03",
                title: "ADAPT",
                desc: "Tavily + CrewAI agents for cultural content adaptation",
                color: "hsl(56,100%,88%)",
                dark: true,
              },
              {
                num: "04",
                title: "SYNTHESIZE",
                desc: "Bulbul V2 TTS + FFmpeg for final audio sync",
                color: "hsl(0,100%,65%)",
              },
            ].map((step, i) => (
              <div
                key={step.num}
                className={`p-6 ${i < 3 ? "border-b-4 sm:border-b-0 sm:border-r-4" : ""} border-background`}
                style={{ backgroundColor: step.color }}
              >
                <span
                  className={`font-black text-5xl block mb-2 ${step.dark ? "text-foreground" : "text-white"} opacity-40`}
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {step.num}
                </span>
                <h3
                  className={`font-black text-xl uppercase tracking-wider mb-2 ${step.dark ? "text-foreground" : "text-white"}`}
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {step.title}
                </h3>
                <p
                  className={`text-sm font-medium ${step.dark ? "text-foreground/80" : "text-white/80"}`}
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer - Bauhaus */}
      <footer className="bg-foreground border-t-4 border-[hsl(0,100%,65%)] py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[hsl(0,100%,65%)]" />
            <div className="w-3 h-3 bg-[hsl(213,52%,40%)]" />
            <div
              className="w-3 h-3 bg-[hsl(56,100%,88%)]"
              style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
            />
          </div>
          <p
            className="text-background/90 font-bold text-lg uppercase tracking-widest flex items-center gap-2"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Built with{" "}
            <Heart
              className="w-5 h-5 text-[hsl(0,100%,65%)] fill-[hsl(0,100%,65%)]"
              strokeWidth={0}
            />{" "}
            by Team Nooglers
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HowWeBuilt;
