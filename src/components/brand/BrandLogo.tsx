import { brand } from "@/config/brand";

/** Full logo SVG is 1080×763 — keep intrinsic ratio so the mark isn't clipped. */
const LOGO_ASPECT = 763 / 1080;

type LogoProps = {
  className?: string;
  /** Minimum practical width for wordmark readability in headers */
  width?: number;
  priority?: boolean;
  alt?: string;
};

export function BrandLogo({
  className,
  width = 160,
  alt = brand.productName,
}: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brand.logo.svg}
      alt={alt}
      width={width}
      height={Math.round(width * LOGO_ASPECT)}
      className={className}
      style={{ height: "auto", width }}
    />
  );
}
