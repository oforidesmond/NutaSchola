import type { ThermalPaperWidth } from "./types";
import { thermalPrintPageCss } from "./thermal-receipt-css";

const PAPER_WIDTH_STORAGE_KEY = "nutaschola.thermal-receipt.paper-width";

export function readStoredPaperWidth(): ThermalPaperWidth {
  if (typeof window === "undefined") return "80mm";
  try {
    const stored = window.localStorage.getItem(PAPER_WIDTH_STORAGE_KEY);
    if (stored === "58mm" || stored === "80mm") return stored;
  } catch {
    /* ignore */
  }
  return "80mm";
}

export function storePaperWidth(width: ThermalPaperWidth): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PAPER_WIDTH_STORAGE_KEY, width);
  } catch {
    /* ignore */
  }
}

/**
 * Print an element's HTML via a temporary iframe so only the receipt prints.
 */
export async function printThermalElement(
  element: HTMLElement,
  paperWidth: ThermalPaperWidth,
): Promise<void> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error("Unable to prepare print frame.");
  }

  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
<style>${thermalPrintPageCss(paperWidth)}</style>
</head><body></body></html>`);
  doc.close();

  const clone = element.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  doc.body.appendChild(clone);

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      win.removeEventListener("afterprint", finish);
      iframe.remove();
      resolve();
    };
    win.addEventListener("afterprint", finish);
    // Fallback if afterprint never fires (some browsers)
    window.setTimeout(finish, 60_000);
    win.focus();
    win.print();
  });
}
