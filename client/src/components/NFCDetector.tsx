import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface NFCDetectorProps {
  onNFCDetected: () => void;
}

export default function NFCDetector({ onNFCDetected }: NFCDetectorProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);

  useEffect(() => {
    // Check if Web NFC is supported
    if ('NDEFReader' in window) {
      setNfcSupported(true);
      initNFC();
    }
  }, []);

  const initNFC = async () => {
    try {
      setIsDetecting(true);
      // @ts-ignore - Web NFC API types
      const ndef = new NDEFReader();
      await ndef.scan();
      
      ndef.addEventListener('reading', () => {
        console.log('NFC tag detected');
        onNFCDetected();
      });
    } catch (error) {
      console.log('NFC scan failed:', error);
      setIsDetecting(false);
    }
  };

  if (!nfcSupported) return null;

  if (isDetecting) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-nfc-status">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>NFC ready - tap to begin</span>
      </div>
    );
  }

  return null;
}
