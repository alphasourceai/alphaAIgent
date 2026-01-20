import fullLogo from '@assets/Color logo - no background_1763141849175.png';
import symbolLogo from '@assets/alpha-symbol copy_1763141740352.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'symbol';
}

export default function Logo({ size = 'md', variant = 'full' }: LogoProps) {
  const sizes = {
    sm: 'h-8',
    md: 'h-12 md:h-16',
    lg: 'h-16 md:h-20'
  };

  const logoSrc = variant === 'full' ? fullLogo : symbolLogo;
  const altText = variant === 'full' ? 'AlphaSource Logo' : 'AlphaSource Symbol';

  return (
    <img 
      src={logoSrc} 
      alt={altText} 
      className={`${sizes[size]} w-auto`}
      data-testid="img-logo"
    />
  );
}
