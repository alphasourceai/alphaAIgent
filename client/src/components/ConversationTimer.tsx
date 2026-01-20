import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface ConversationTimerProps {
  duration: number;
  onComplete: () => void;
}

export default function ConversationTimer({ duration, onComplete }: ConversationTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);

  useEffect(() => {
    if (timeRemaining <= 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = ((duration - timeRemaining) / duration) * 100;
  const isLowTime = timeRemaining <= 20;

  return (
    <div 
      className="flex items-center gap-2 md:gap-3 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg bg-background/95 backdrop-blur-sm border border-border" 
      data-testid="timer-conversation"
    >
      <Clock className={`h-4 w-4 md:h-5 md:w-5 shrink-0 ${isLowTime ? 'text-destructive animate-pulse' : 'text-primary'}`} />
      <div className="flex flex-col gap-0.5 md:gap-1">
        <span 
          className={`text-sm md:text-lg font-semibold tabular-nums ${isLowTime ? 'text-destructive' : 'text-foreground'}`}
          data-testid="text-timer"
        >
          {formatTime(timeRemaining)}
        </span>
        <div className="w-20 md:w-32 h-0.5 md:h-1.5 bg-muted/80 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${isLowTime ? 'bg-destructive' : 'bg-primary'}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
