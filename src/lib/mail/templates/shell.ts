import { brand } from "@/config/brand";

export function appBaseUrl(): string {
  return (
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

type ShellInput = {
  preheader?: string;
  title: string;
  bodyHtml: string;
  bodyText: string;
  cta?: { label: string; url: string };
  footerNote?: string;
};

/**
 * Simple table-based transactional email shell.
 * Inline styles only — safe for Outlook/Gmail.
 */
export function renderEmailShell(input: ShellInput): { html: string; text: string } {
  const logoUrl = `${appBaseUrl()}${brand.logo.pngWhiteBg}`;
  const brandColor = brand.primaryColor;
  const ctaHtml = input.cta
    ? `
      <tr>
        <td style="padding: 24px 0 8px;">
          <a href="${escapeHtml(input.cta.url)}"
             style="display:inline-block;background:${brandColor};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:6px;">
            ${escapeHtml(input.cta.label)}
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;line-height:1.5;">
          Or copy this link:<br/>
          <a href="${escapeHtml(input.cta.url)}" style="color:${brandColor};word-break:break-all;">${escapeHtml(input.cta.url)}</a>
        </td>
      </tr>`
    : "";

  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(input.preheader)}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">
          <tr>
            <td style="padding:24px 28px 16px;border-bottom:3px solid ${brandColor};">
              <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brand.productName)}" width="160" style="display:block;border:0;height:auto;"/>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#111827;">
              ${escapeHtml(input.title)}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#374151;">
              ${input.bodyHtml}
              ${ctaHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#9ca3af;">
              ${escapeHtml(input.footerNote ?? `${brand.productName} · ${brand.tagline}`)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textParts = [input.title, "", input.bodyText];
  if (input.cta) {
    textParts.push("", `${input.cta.label}: ${input.cta.url}`);
  }
  textParts.push("", input.footerNote ?? `${brand.productName} · ${brand.tagline}`);

  return { html, text: textParts.join("\n") };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
