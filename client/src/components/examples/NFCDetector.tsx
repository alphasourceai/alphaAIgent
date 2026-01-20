import NFCDetector from '../NFCDetector';

export default function NFCDetectorExample() {
  return (
    <div className="flex items-center justify-center p-8">
      <NFCDetector onNFCDetected={() => console.log('NFC detected!')} />
    </div>
  );
}
