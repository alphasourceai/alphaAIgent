import { useEffect, useRef, useState, useCallback } from 'react';
import DailyIframe, { DailyCall, DailyParticipant, DailyEventObjectParticipant } from '@daily-co/daily-js';
import { Loader2, AlertCircle } from 'lucide-react';

interface DailyVideoInterfaceProps {
  conversationUrl: string;
  onError?: (error: string) => void;
}

type ConnectionState = 'initializing' | 'joining' | 'connected' | 'error';

export function DailyVideoInterface({ conversationUrl, onError }: DailyVideoInterfaceProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('initializing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const callObjectRef = useRef<DailyCall | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mountedRef = useRef(true);

  const handleError = useCallback((message: string) => {
    console.error('Daily.js error:', message);
    setErrorMessage(message);
    setConnectionState('error');
    onError?.(message);
  }, [onError]);

  const updateVideo = useCallback((participants: { [id: string]: DailyParticipant }) => {
    if (!videoRef.current || !mountedRef.current) return;

    // Find remote participants (filter out local participant)
    const remoteParticipants = Object.values(participants).filter(p => !p.local);

    if (remoteParticipants.length === 0) {
      // No remote participants - reset video state
      console.log('⏳ No remote participants, resetting video state');
      setHasRemoteVideo(false);
      videoRef.current.srcObject = null;
      return;
    }

    // Get the first remote participant (the AI agent)
    const aiAgent = remoteParticipants[0];

    // Build media stream with both video and audio tracks
    const tracks: MediaStreamTrack[] = [];
    
    if (aiAgent.videoTrack) {
      tracks.push(aiAgent.videoTrack);
    }
    
    if (aiAgent.audioTrack) {
      tracks.push(aiAgent.audioTrack);
    }

    // Only hide loading overlay when we have a VIDEO track
    // (audio alone is not enough to show as "video ready")
    if (aiAgent.videoTrack && tracks.length > 0) {
      const stream = new MediaStream(tracks);
      videoRef.current.srcObject = stream;
      
      // Update state to indicate we have remote video
      setHasRemoteVideo(true);
      console.log('✨ Remote video stream attached (video + audio)');
      
      // Ensure video plays
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err);
      });
    } else {
      // Remote participant exists but no video track yet
      // Keep loading overlay visible even if we have audio
      console.log('⏳ Remote participant exists but no video track yet');
      setHasRemoteVideo(false);
      
      // If we have audio but no video, still play the audio
      if (aiAgent.audioTrack) {
        const audioStream = new MediaStream([aiAgent.audioTrack]);
        videoRef.current.srcObject = audioStream;
        videoRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
        });
        console.log('🔊 Playing audio while waiting for video');
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let callObject: DailyCall | null = null;

    const initializeCall = async () => {
      try {
        console.log('📞 Initializing Daily call...');
        setConnectionState('joining');

        // Check if there's already a call object from a previous mount
        if (callObjectRef.current) {
          console.log('⚠️ Cleaning up existing call object before creating new one');
          try {
            await callObjectRef.current.destroy();
          } catch (err) {
            console.error('Error destroying previous call object:', err);
          }
          callObjectRef.current = null;
        }

        // Create Daily call object
        callObject = DailyIframe.createCallObject({
          url: conversationUrl,
        });

        callObjectRef.current = callObject;

        // Set up event listeners
        callObject
          .on('joined-meeting', () => {
            console.log('✅ Joined meeting successfully');
            if (mountedRef.current) {
              setConnectionState('connected');
            }
          })
          .on('participant-joined', (event: DailyEventObjectParticipant) => {
            console.log('👤 Participant joined:', event.participant.user_name);
            if (mountedRef.current && callObject) {
              updateVideo(callObject.participants());
            }
          })
          .on('participant-updated', (event: DailyEventObjectParticipant) => {
            console.log('🔄 Participant updated:', event.participant.user_name);
            if (mountedRef.current && callObject) {
              updateVideo(callObject.participants());
            }
          })
          .on('participant-left', () => {
            console.log('👋 Participant left');
            if (mountedRef.current && callObject) {
              updateVideo(callObject.participants());
            }
          })
          .on('track-started', (event) => {
            console.log('🎬 Track started:', event.track?.kind);
            if (mountedRef.current && callObject) {
              updateVideo(callObject.participants());
            }
          })
          .on('track-stopped', (event) => {
            console.log('🛑 Track stopped:', event.track?.kind);
            if (mountedRef.current && callObject) {
              updateVideo(callObject.participants());
            }
          })
          .on('error', (event) => {
            console.error('❌ Daily error:', event);
            if (mountedRef.current) {
              handleError(event.errorMsg || 'Connection error occurred');
            }
          })
          .on('camera-error', (event) => {
            console.error('📹 Camera error:', event);
            if (mountedRef.current) {
              handleError('Camera access denied. Please allow camera access to continue.');
            }
          });

        // Join the call immediately (auto-join, skip prejoin screen)
        // Note: We set startVideoOff/startAudioOff to false to request media,
        // but if devices aren't available (test environment), Daily will still
        // allow us to join and receive remote media (AI agent)
        await callObject.join({
          url: conversationUrl,
          userName: 'Conference Attendee',
          startVideoOff: false,  // Request video but don't fail if unavailable
          startAudioOff: false,  // Request audio but don't fail if unavailable
        });

        console.log('🎥 Call joined, waiting for AI agent...');

      } catch (error) {
        console.error('Failed to initialize call:', error);
        if (mountedRef.current) {
          handleError(
            error instanceof Error 
              ? error.message 
              : 'Failed to connect. Please check your camera and microphone permissions.'
          );
        }
      }
    };

    initializeCall();

    // Cleanup function
    return () => {
      mountedRef.current = false;
      
      if (callObject) {
        console.log('🧹 Cleaning up Daily call object...');
        callObject.destroy().catch(err => {
          console.error('Error destroying call object:', err);
        });
      }
    };
  }, [conversationUrl, handleError, updateVideo]);

  // Render based on connection state
  if (connectionState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-background p-6 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2" data-testid="text-error-title">
          Connection Error
        </h2>
        <p className="text-muted-foreground max-w-md" data-testid="text-error-message">
          {errorMessage}
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          Please refresh the page and ensure camera/microphone permissions are granted.
        </p>
      </div>
    );
  }

  if (connectionState === 'initializing' || connectionState === 'joining') {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-background">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-muted-foreground" data-testid="text-connecting">
          {connectionState === 'initializing' ? 'Initializing...' : 'Connecting to AI agent...'}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Please allow camera and microphone access when prompted
        </p>
      </div>
    );
  }

  // Connected state - show video in contained box
  return (
    <div className="flex items-center justify-center h-full w-full bg-background">
      <div className="relative w-full max-w-4xl mx-auto aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          data-testid="video-ai-agent"
        />
        
        {/* Overlay shown while waiting for AI agent video */}
        {!hasRemoteVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-lg text-foreground" data-testid="text-waiting-agent">
                Waiting for AI agent...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
