import ConversationTimer from '../ConversationTimer';

export default function ConversationTimerExample() {
  return (
    <div className="flex items-center justify-center p-8">
      <ConversationTimer duration={120} onComplete={() => console.log('Timer complete!')} />
    </div>
  );
}
