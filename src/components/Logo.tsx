import logoAsset from "@/assets/recruitiq-logo.png.asset.json";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

export function Logo({ className, size = 36, alt = "RecruitIQ" }: LogoProps) {
  return (
    <img
      src={logoAsset.url}
      alt={alt}
      width={size}
      height={size}
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

export default Logo;
