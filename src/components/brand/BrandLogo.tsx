import { brand } from "@/config/brand";

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
      height={Math.round(width * 0.45)}
      className={className}
      style={{ height: "auto", width }}
    />
  );
}
