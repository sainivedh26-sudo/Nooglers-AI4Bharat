import { useState } from "react";
import VideoCard from "@/components/VideoCard";
import ProcessingPipeline from "@/components/ProcessingPipeline";
import CulturalResults from "@/components/CulturalResults";
import HowWeBuilt from "@/components/HowWeBuilt";
import { MonitorPlay } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const LANGUAGES = [
  { code: "ml", label: "Malayalam", region: "Kerala" },
  { code: "ta", label: "Tamil", region: "Tamil Nadu" },
  { code: "hi", label: "Hindi", region: "North India" },
  { code: "te", label: "Telugu", region: "Andhra Pradesh" },
  { code: "kn", label: "Kannada", region: "Karnataka" },
];

const SAMPLE_VIDEOS = [
  {
    id: "1",
    title: "How AI is Changing the Future of Education",
    thumbnail: "https://img.youtube.com/vi/5dZ_lvDgevk/hqdefault.jpg",
    duration: "12:34",
    channel: "TechVision",
  },
  {
    id: "2",
    title: "The Science Behind Cooking Perfect Rice",
    thumbnail: "https://img.youtube.com/vi/Jf75I9LKhvg/hqdefault.jpg",
    duration: "8:21",
    channel: "Kitchen Lab",
  },
  {
    id: "3",
    title: "Understanding Neural Networks in 10 Minutes",
    thumbnail: "https://img.youtube.com/vi/aircAruvnKk/hqdefault.jpg",
    duration: "10:07",
    channel: "3Blue1Brown",
  },
];

const Index = () => {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("ml");
  const [showResults, setShowResults] = useState(false);

  const selectedVideo = SAMPLE_VIDEOS.find((v) => v.id === selectedVideoId);
  const selectedLang = LANGUAGES.find((l) => l.code === targetLanguage);

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Title */}
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-6 items-start">
        {/* Left: Videos */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-heading text-lg font-bold text-foreground">
              Your Videos
            </h2>
            <div className="flex-1 border-t-2 border-dashed border-pencil/20" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {SAMPLE_VIDEOS.map((video) => (
              <VideoCard
                key={video.id}
                title={video.title}
                thumbnail={video.thumbnail}
                duration={video.duration}
                channel={video.channel}
                isSelected={selectedVideoId === video.id}
                onClick={() => setSelectedVideoId(video.id)}
              />
            ))}
          </div>

          {/* Selected video preview */}
          {selectedVideo && (
            <div className="mt-6 border-2 border-pencil bg-card p-4 wobbly shadow-subtle">
              <div className="aspect-video bg-pencil/10 wobbly-md overflow-hidden">
                <img
                  src={selectedVideo.thumbnail}
                  alt={selectedVideo.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-heading text-lg font-bold mt-3 text-foreground">
                {selectedVideo.title}
              </h3>
              <p className="font-body text-sm text-muted-foreground">
                {selectedVideo.channel} · {selectedVideo.duration}
              </p>
            </div>
          )}
        </div>

        {/* Right: Processing Pipeline */}
        <div className="border-2 border-pencil bg-card p-4 wobbly-md shadow-hard lg:sticky lg:top-6">
          {/* Tape decoration */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-pencil/10 border border-pencil/20 rotate-1" />
          <ProcessingPipeline
            videoTitle={selectedVideo?.title || null}
            targetLanguage={targetLanguage}
            onSelectLanguage={setTargetLanguage}
            onProcessingComplete={() => setShowResults(true)}
            onReset={() => setShowResults(false)}
          />
        </div>
      </div>

      {/* Cultural Adaptations — horizontal scroll below video */}
      <AnimatePresence>
        {showResults && selectedLang && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            className="mt-8 border-2 border-pencil bg-card p-5 wobbly-md shadow-hard"
          >
            <CulturalResults
              languageCode={targetLanguage}
              languageLabel={selectedLang.label}
              region={selectedLang.region}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* How We Built Section */}
      <HowWeBuilt />
    </div>
  );
};

export default Index;
