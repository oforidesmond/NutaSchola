import type { ThermalPaperWidth } from "./types";

/** Self-contained styles for thermal receipt (preview + iframe print). */
export function thermalReceiptCss(paperWidth: ThermalPaperWidth): string {
  const width = paperWidth === "58mm" ? "58mm" : "80mm";
  // Slightly larger than screen UI so text stays readable on thermal stock.
  const fontSize = paperWidth === "58mm" ? "12px" : "14px";

  return `
.thermal-receipt {
  width: ${width};
  max-width: 100%;
  margin: 0 auto;
  padding: 8px 6px;
  background: #fff;
  color: #000;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: ${fontSize};
  line-height: 1.35;
  box-sizing: border-box;
  break-inside: avoid;
  page-break-inside: avoid;
}
.thermal-receipt *,
.thermal-receipt *::before,
.thermal-receipt *::after {
  box-sizing: border-box;
}
.thermal-receipt__header,
.thermal-receipt__title,
.thermal-receipt__footer {
  text-align: center;
}
.thermal-receipt__school {
  margin: 0;
  font-size: 1.15em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.thermal-receipt__meta {
  margin: 4px 0 0;
  opacity: 0.9;
}
.thermal-receipt__title {
  margin: 0;
  font-size: 1.05em;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.thermal-receipt__rule {
  margin: 8px 0;
  border: 0;
  border-top: 1px dashed rgba(0, 0, 0, 0.4);
}
.thermal-receipt__rows {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.thermal-receipt__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}
.thermal-receipt__row--bold {
  font-weight: 600;
}
.thermal-receipt__row-value {
  text-align: right;
}
.thermal-receipt__footer-strong {
  margin: 0;
  font-weight: 600;
}
.thermal-receipt__footer-note {
  margin: 2px 0 0;
  opacity: 0.9;
}
`;
}

/**
 * Print CSS sized to the slip. Page height must stay close to content length:
 * a tall blank page (e.g. 297mm) makes many XP-80C drivers scale the whole
 * sheet down to fit, so the receipt prints tiny.
 */
export function thermalPrintPageCss(
  paperWidth: ThermalPaperWidth,
  pageHeightMm: number,
): string {
  const heightMm = Math.min(297, Math.max(60, Math.ceil(pageHeightMm)));

  return `
@page {
  size: ${paperWidth} ${heightMm}mm;
  margin: 0;
}
* {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
html, body {
  margin: 0;
  padding: 0;
  width: ${paperWidth};
  height: auto;
  overflow: visible;
  background: #fff;
  color: #000;
}
.thermal-receipt {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
}
${thermalReceiptCss(paperWidth)}
`;
}
