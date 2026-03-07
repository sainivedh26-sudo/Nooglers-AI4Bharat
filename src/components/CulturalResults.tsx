import { motion } from "framer-motion";
import { MapPin, MessageSquare, Music, Utensils, BookOpen } from "lucide-react";
import { Sparkles } from "lucide-react";

interface CulturalChange {
  timestamp: string;
  original: string;
  adapted: string;
  category: string;
  icon: React.ReactNode;
  reason: string;
}

const CULTURAL_DATA: Record<string, CulturalChange[]> = {
  ml: [
    { timestamp: "0:24", original: "That's awesome!", adapted: "കൊള്ളാം! (Kollaam!)", category: "Expression", icon: <MessageSquare className="w-4 h-4" strokeWidth={3} />, reason: "Replaced casual English exclamation with natural Malayalam expression used in Kerala" },
    { timestamp: "1:12", original: "Like having coffee in the morning", adapted: "രാവിലെ ചായ കുടിക്കുന്നത് പോലെ", category: "Cultural Ref", icon: <Utensils className="w-4 h-4" strokeWidth={3} />, reason: "Kerala culture favors tea (ചായ) over coffee as a morning ritual" },
    { timestamp: "2:45", original: "Think of it like a highway system", adapted: "നമ്മുടെ ബാക്ക്‌വാട്ടർ കനാലുകൾ പോലെ", category: "Metaphor", icon: <MapPin className="w-4 h-4" strokeWidth={3} />, reason: "Replaced highway metaphor with Kerala's iconic backwater canals for relatability" },
    { timestamp: "4:30", original: "It's like a school classroom", adapted: "ഒരു കളരി പോലെ", category: "Education", icon: <BookOpen className="w-4 h-4" strokeWidth={3} />, reason: "Referenced Kalari — traditional Kerala learning space" },
    { timestamp: "6:15", original: "Background music: Electronic beat", adapted: "Background: Chenda rhythm pattern", category: "Audio", icon: <Music className="w-4 h-4" strokeWidth={3} />, reason: "Swapped electronic beat with Chenda drum rhythm native to Kerala festivals" },
    { timestamp: "8:02", original: "As easy as ordering pizza", adapted: "പരോട്ടയും ബീഫും ഓർഡർ ചെയ്യുന്നത് പോലെ", category: "Food Ref", icon: <Utensils className="w-4 h-4" strokeWidth={3} />, reason: "Replaced pizza with Kerala's beloved porotta and beef combo" },
  ],
  ta: [
    { timestamp: "0:24", original: "That's awesome!", adapted: "செம்மா! (Semmaa!)", category: "Expression", icon: <MessageSquare className="w-4 h-4" strokeWidth={3} />, reason: "Replaced with popular Tamil slang expression" },
    { timestamp: "1:12", original: "Like having coffee in the morning", adapted: "காலையில filter காபி குடிக்கிற மாதிரி", category: "Cultural Ref", icon: <Utensils className="w-4 h-4" strokeWidth={3} />, reason: "Tamil Nadu is famous for its filter coffee culture" },
    { timestamp: "2:45", original: "Think of it like a highway system", adapted: "மெரினா பீச் சாலை மாதிரி நினைங்க", category: "Metaphor", icon: <MapPin className="w-4 h-4" strokeWidth={3} />, reason: "Referenced Marina Beach road — iconic Chennai landmark" },
    { timestamp: "4:30", original: "It's like a school classroom", adapted: "திருக்குறள் வகுப்பு மாதிரி", category: "Education", icon: <BookOpen className="w-4 h-4" strokeWidth={3} />, reason: "Referenced Thirukkural — foundational Tamil literary work" },
    { timestamp: "6:15", original: "Background music: Electronic beat", adapted: "Background: Thavil rhythm pattern", category: "Audio", icon: <Music className="w-4 h-4" strokeWidth={3} />, reason: "Replaced with Thavil drum — traditional Tamil percussion" },
  ],
  hi: [
    { timestamp: "0:24", original: "That's awesome!", adapted: "बहुत बढ़िया! (Bahut Badhiya!)", category: "Expression", icon: <MessageSquare className="w-4 h-4" strokeWidth={3} />, reason: "Natural Hindi exclamation commonly used across North India" },
    { timestamp: "1:12", original: "Like having coffee in the morning", adapted: "सुबह की चाय जैसे ज़रूरी", category: "Cultural Ref", icon: <Utensils className="w-4 h-4" strokeWidth={3} />, reason: "Chai is the cultural backbone of North Indian mornings" },
    { timestamp: "2:45", original: "Think of it like a highway system", adapted: "दिल्ली मेट्रो की लाइनों जैसे सोचो", category: "Metaphor", icon: <MapPin className="w-4 h-4" strokeWidth={3} />, reason: "Delhi Metro is a widely understood infrastructure metaphor" },
    { timestamp: "4:30", original: "It's like a school classroom", adapted: "गुरुकुल जैसा माहौल", category: "Education", icon: <BookOpen className="w-4 h-4" strokeWidth={3} />, reason: "Referenced Gurukul — traditional Indian learning system" },
  ],
  te: [
    { timestamp: "0:24", original: "That's awesome!", adapted: "అదిరింది! (Adhirindhi!)", category: "Expression", icon: <MessageSquare className="w-4 h-4" strokeWidth={3} />, reason: "Popular Telugu exclamation, popularized through cinema" },
    { timestamp: "1:12", original: "Like having coffee in the morning", adapted: "పొద్దున్నే ఫిల్టర్ కాఫీ తాగినట్టు", category: "Cultural Ref", icon: <Utensils className="w-4 h-4" strokeWidth={3} />, reason: "Andhra Pradesh has a strong filter coffee tradition" },
    { timestamp: "2:45", original: "Think of it like a highway system", adapted: "హైదరాబాద్ ORR లాగా ఆలోచించండి", category: "Metaphor", icon: <MapPin className="w-4 h-4" strokeWidth={3} />, reason: "Hyderabad's Outer Ring Road is a well-known local reference" },
  ],
  kn: [
    { timestamp: "0:24", original: "That's awesome!", adapted: "ಅದ್ಭುತ! (Adhbhuta!)", category: "Expression", icon: <MessageSquare className="w-4 h-4" strokeWidth={3} />, reason: "Common Kannada exclamation expressing amazement" },
    { timestamp: "1:12", original: "Like having coffee in the morning", adapted: "ಬೆಳಗ್ಗೆ ಫಿಲ್ಟರ್ ಕಾಫಿ ಕುಡಿಯೋ ಹಾಗೆ", category: "Cultural Ref", icon: <Utensils className="w-4 h-4" strokeWidth={3} />, reason: "Karnataka's strong coffee culture, especially in Coorg region" },
    { timestamp: "2:45", original: "Think of it like a highway system", adapted: "ನಮ್ಮ ಮೆಟ್ರೋ ಲೈನ್ ತರ ಯೋಚಿಸಿ", category: "Metaphor", icon: <MapPin className="w-4 h-4" strokeWidth={3} />, reason: "Namma Metro is Bangalore's beloved transit system" },
  ],
};

const CATEGORY_COLORS: Record<string, string> = {
  Expression: "bg-pen-blue text-primary-foreground",
  "Cultural Ref": "bg-marker-red text-primary-foreground",
  Metaphor: "bg-postit text-foreground",
  Education: "bg-pen-blue text-primary-foreground",
  Audio: "bg-marker-red text-primary-foreground",
  "Food Ref": "bg-postit text-foreground",
};

interface CulturalResultsProps {
  languageCode: string;
  languageLabel: string;
  region: string;
}

const CulturalResults = ({ languageCode, languageLabel, region }: CulturalResultsProps) => {
  const changes = CULTURAL_DATA[languageCode] || CULTURAL_DATA["ml"];

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mb-4"
      >
        <div className="w-8 h-8 border-2 border-pencil bg-marker-red flex items-center justify-center wobbly-sm shadow-hard-sm -rotate-2">
          <Sparkles className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
        </div>
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground leading-none">
            Cultural Adaptations
          </h2>
          <p className="text-xs text-muted-foreground font-body">
            {changes.length} changes for <span className="font-bold text-foreground">{region}</span> · {languageLabel}
          </p>
        </div>
      </motion.div>

      {/* Horizontal scrollable cards */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin">
        {changes.map((change, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20, rotate: idx % 2 === 0 ? -1 : 1 }}
            animate={{ opacity: 1, y: 0, rotate: idx % 2 === 0 ? -0.5 : 0.5 }}
            transition={{ delay: idx * 0.1 }}
            className="snap-start shrink-0 w-[280px] sm:w-[300px] border-2 border-pencil bg-card p-4 wobbly-md shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all duration-150 group"
          >
            {/* Top: timestamp + category */}
            <div className="flex items-center justify-between mb-3">
              <span className="font-heading text-xs font-bold text-pen-blue border-2 border-pen-blue/30 px-2 py-0.5 wobbly-sm bg-background">
                ⏱ {change.timestamp}
              </span>
              <span className={`text-[10px] font-body font-bold px-2 py-0.5 wobbly-sm border border-pencil/20 ${CATEGORY_COLORS[change.category] || "bg-muted text-foreground"}`}>
                {change.category}
              </span>
            </div>

            {/* Original (struck through) */}
            <div className="mb-2">
              <span className="text-[10px] font-body font-bold text-muted-foreground uppercase tracking-wider">Original (EN)</span>
              <p className="text-sm font-body text-foreground/40 line-through mt-0.5">{change.original}</p>
            </div>

            {/* Adapted */}
            <div className="bg-postit/50 border border-dashed border-pencil/20 p-2 wobbly-sm mb-3">
              <span className="text-[10px] font-body font-bold text-marker-red uppercase tracking-wider">{languageCode.toUpperCase()} Adapted</span>
              <p className="text-sm font-body text-foreground font-bold mt-0.5 leading-snug">{change.adapted}</p>
            </div>

            {/* Reason */}
            <div className="flex items-start gap-2 pt-2 border-t-2 border-dashed border-pencil/15">
              <span className="text-pen-blue mt-0.5 shrink-0">{change.icon}</span>
              <p className="text-[11px] font-body text-foreground/60 leading-snug">{change.reason}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CulturalResults;
