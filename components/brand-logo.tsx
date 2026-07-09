import Image from "next/image";
import { cn } from "@/lib/cn";

type BrandLogoVariant = "full" | "icon" | "iconDark";

const brandLogos: Record<BrandLogoVariant, { src: string; width: number; height: number }> = {
  full: { src: "/brand/zelo-logo.svg", width: 680, height: 300 },
  icon: { src: "/brand/zelo-icon.svg", width: 120, height: 120 },
  iconDark: { src: "/brand/zelo-icon-dark.svg", width: 120, height: 120 },
};

type BrandLogoProps = {
  variant: BrandLogoVariant;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
};

export function BrandLogo({ variant, className, priority = false, decorative = false }: BrandLogoProps) {
  const logo = brandLogos[variant];

  return (
    <Image
      src={logo.src}
      alt={decorative ? "" : "Zelo"}
      aria-hidden={decorative || undefined}
      width={logo.width}
      height={logo.height}
      priority={priority}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
