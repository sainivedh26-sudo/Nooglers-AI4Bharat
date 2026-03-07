import { Play } from "lucide-react";

interface VideoCardProps {
  title: string;
  thumbnail: string;
  duration: string;
  channel: string;
  isSelected: boolean;
  onClick: () => void;
}

const VideoCard = ({ title, thumbnail, duration, channel, isSelected, onClick }: VideoCardProps) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left border-2 border-pencil bg-card p-3 transition-transform duration-100 wobbly-md shadow-subtle hover:shadow-hard-sm hover:-rotate-1 ${
        isSelected ? "shadow-hard bg-postit rotate-1" : ""
      }`}
    >
      <div className="relative aspect-video bg-muted overflow-hidden wobbly-sm mb-2">
        <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-pencil/20">
          <div className="w-12 h-12 rounded-full bg-card/90 border-2 border-pencil flex items-center justify-center shadow-hard-sm">
            <Play className="w-5 h-5 text-pencil ml-0.5" strokeWidth={3} />
          </div>
        </div>
        <span className="absolute bottom-1 right-1 bg-pencil text-card text-xs px-2 py-0.5 font-body wobbly-sm">
          {duration}
        </span>
      </div>
      <h3 className="font-heading text-sm font-bold text-foreground leading-tight line-clamp-2">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground mt-1 font-body">{channel}</p>
    </button>
  );
};

export default VideoCard;
