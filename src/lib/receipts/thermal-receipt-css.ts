import type { ThermalPaperWidth } from "./types";

/** Self-contained styles for thermal receipt (preview + iframe print). */
export function thermalReceiptCss(paperWidth: ThermalPaperWidth): string {
  const width = paperWidth === "58mm" ? "58mm" : "80mm";
  const fontSize = paperWidth === "58mm" ? "11px" : "12px";

  return `
.thermal-receipt {
  width: ${width};
  max-width: 100%;
  margin: 0 auto;
  padding: 12px 8px;
  background: #fff;
  color: #000;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: ${fontSize};
  line-height: 1.35;
  box-sizing: border-box;
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

export function thermalPrintPageCss(paperWidth: ThermalPaperWidth): string {
  return `
@page {
  size: ${paperWidth} auto;
  margin: 2mm;
}
* {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #000;
}
${thermalReceiptCss(paperWidth)}
`;
}
