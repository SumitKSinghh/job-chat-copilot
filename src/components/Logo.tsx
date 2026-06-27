import logoAsset from "@/assets/recruitiq-logo.png.asset.json";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /**
   * Fallback inline height in px when no Tailwind height class is supplied via `className`.
   * Prefer Tailwind height classes (e.g. `h-9 md:h-12`) for responsive sizing.
   */
  size?: number;
  alt?: string;
}

/**
 * RecruitIQ logo. Pass responsive Tailwind height classes via `className`
 * (e.g. `h-8 md:h-10`). `size` is used only as a fallback when no `h-*`
 * class is detected in `className`.
 */
export function Logo({ className, size = 36, alt = "RecruitIQ" }: LogoProps) {
  const hasHeightClass = className?.split(/\s+/).some((c) => /^h-/.test(c) || /:h-/.test(c));
  return (
    <img
      src={logoAsset.url}
      alt={alt}
      loading="eager"
      decoding="async"
      className={cn("w-auto object-contain select-none", className)}
      style={hasHeightClass ? undefined : { height: size }}
    />
  );
}

export default Logo;
