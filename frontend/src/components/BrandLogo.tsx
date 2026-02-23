import logoHorizontalLight from '../assets/brand/logo_horizontal_primary.svg';
import logoHorizontalDark from '../assets/brand/logo_horizontal_inverted.svg';
import logoStackedLight from '../assets/brand/logo_wordmark_primary.svg';
import logoStackedDark from '../assets/brand/logo_wordmark_inverted.svg';
import markLight from '../assets/brand/mark_Ndot_primary.svg';
import markDark from '../assets/brand/mark_Ndot_mono_white.svg';

type BrandLogoProps = {
  variant: 'horizontal' | 'stacked' | 'mark';
  theme: 'auto' | 'light' | 'dark';
  size: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses: Record<BrandLogoProps['size'], string> = {
  xs: 'h-[18px]',
  sm: 'h-[24px]',
  md: 'h-[32px]',
  lg: 'h-[44px]'
};

const getIsDark = (theme: BrandLogoProps['theme']) => {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
};

const getLogoSrc = (variant: BrandLogoProps['variant'], isDark: boolean) => {
  if (variant === 'mark') {
    return isDark ? markDark : markLight;
  }
  if (variant === 'stacked') {
    return isDark ? logoStackedDark : logoStackedLight;
  }
  return isDark ? logoHorizontalDark : logoHorizontalLight;
};

export const BrandLogo = ({ variant, theme, size, className }: BrandLogoProps) => {
  const isDark = getIsDark(theme);
  const src = getLogoSrc(variant, isDark);

  return (
    <div className={`flex items-center overflow-visible shrink-0 ${className ?? ''}`}>
      <img
        src={src}
        alt="Nexus Academy"
        className={`block w-auto object-contain select-none ${sizeClasses[size]}`}
        loading="lazy"
      />
    </div>
  );
};

export default BrandLogo;
