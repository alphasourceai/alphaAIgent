import Logo from '../Logo';

export default function LogoExample() {
  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Full Logo</p>
        <Logo size="sm" variant="full" />
        <Logo size="md" variant="full" />
        <Logo size="lg" variant="full" />
      </div>
      <div className="space-y-4 pt-8">
        <p className="text-sm text-muted-foreground">Symbol Only</p>
        <Logo size="sm" variant="symbol" />
        <Logo size="md" variant="symbol" />
        <Logo size="lg" variant="symbol" />
      </div>
    </div>
  );
}
