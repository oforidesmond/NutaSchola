/**
 * Single source for Excellence Kids brand strings and asset paths.
 * Keep product-facing branding here so a future multi-tenant layer is a config swap.
 */
export const brand = {
  productName: "Excellence Kids",
  codebaseName: "NutaSchola",
  vendorName: "NutaSolutions",
  tagline: "Be a reader, be a writer, be a problem solver",
  primaryColor: "#0C6C9C",
  currency: "GHS",
  timezone: "Africa/Accra",
  country: "Ghana",
  defaultSchoolSlug: "excellence-kids",
  logo: {
    /** Primary UI asset — navbar, headers, favicon source */
    svg: "/brand/excellence-kids-logo.svg",
  },
} as const;
