/**
 * Single source for Excellence Kids brand strings and asset paths.
 * Keep product-facing branding here so a future multi-tenant layer is a config swap.
 */
export const brand = {
  productName: "Excellence Kids",
  codebaseName: "NutaSchola",
  vendorName: "NutaSolutions",
  vendorUrl: "https://nutasolutions.com",
  tagline: "Be a reader, be a writer, be a problem solver",
  primaryColor: "#0C6C9C",
  currency: "GHS",
  timezone: "Africa/Accra",
  country: "Ghana",
  defaultSchoolSlug: "excellence-kids",
  logo: {
    /** Full mark + wordmark — navbar, marketing, print (≥120px wide) */
    svg: "/brand/excellence-kids-logo.svg",
    /** Icon-only mark — favicons, app icons, tight UI */
    mark: "/brand/excellence-kids-mark.svg",
    /** Raster variants for email / printed letters (not used in product chrome) */
    pngTransparent: "/brand/excellence-kids-logo-transparent.png",
    pngWhiteBg: "/brand/excellence-kids-logo-white-bg.png",
  },
} as const;
