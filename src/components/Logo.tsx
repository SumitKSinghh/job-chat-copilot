import logoAsset from "@/assets/recruitiq-logo.png.asset.json";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

/**
 * RecruitIQ logo. `size` controls the rendered height in px;
 * width is set automatically to preserve the source aspect ratio.
 */
export function Logo({ className, size = 36, alt = "RecruitIQ" }: LogoProps) {
  return (
    <img
      src={logoAsset.url}
      alt={alt}
      className={cn("w-auto object-contain", className)}
      style={{ height: size }}
    />
  );
}

export default Logo;
