import { brand } from "@/config/brand";
import type { EmailContent } from "@/lib/mail/types";
import { escapeHtml, renderEmailShell } from "@/lib/mail/templates/shell";

export function inviteEmail(input: {
  firstName: string;
  schoolName: string;
  acceptUrl: string;
  expiresInHours: number;
}): EmailContent {
  const title = `You're invited to ${input.schoolName}`;
  const bodyText = [
    `Hi ${input.firstName},`,
    "",
    `You have been invited to join ${input.schoolName}.`,
    "",
    `Accept your invite and set your password. This link expires in ${input.expiresInHours} hours.`,
  ].join("\n");

  const { html, text } = renderEmailShell({
    preheader: `Join ${input.schoolName}`,
    title,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(input.firstName)},</p>
      <p style="margin:0 0 12px;">You have been invited to join <strong>${escapeHtml(input.schoolName)}</strong>.</p>
      <p style="margin:0;">Accept your invite and set your password. This link expires in ${input.expiresInHours} hours.</p>
    `,
    bodyText,
    cta: { label: "Accept invite", url: input.acceptUrl },
    footerNote: `${input.schoolName} · ${brand.productName}`,
  });

  return { subject: title, html, text };
}

export function passwordResetEmail(input: {
  resetUrl: string;
  expiresInHours: number;
}): EmailContent {
  const title = `Reset your ${brand.productName} password`;
  const bodyText = [
    `We received a request to reset your ${brand.productName} password.`,
    "",
    `Use the link below to choose a new password. This link expires in ${input.expiresInHours} hour${input.expiresInHours === 1 ? "" : "s"}.`,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const { html, text } = renderEmailShell({
    preheader: "Choose a new password for your account",
    title,
    bodyHtml: `
      <p style="margin:0 0 12px;">We received a request to reset your ${escapeHtml(brand.productName)} password.</p>
      <p style="margin:0 0 12px;">Use the button below to choose a new password. This link expires in ${input.expiresInHours} hour${input.expiresInHours === 1 ? "" : "s"}.</p>
      <p style="margin:0;">If you did not request this, you can ignore this email.</p>
    `,
    bodyText,
    cta: { label: "Reset password", url: input.resetUrl },
  });

  return { subject: title, html, text };
}

export function admissionStatusEmail(input: {
  schoolName: string;
  guardianFirstName: string;
  guardianLastName: string;
  applicantName: string;
  applicationNumber: string;
  stageLabel: string;
  note?: string | null;
}): EmailContent {
  const subject = `${input.schoolName} admissions update — ${input.stageLabel}`;
  const bodyLines = [
    `Dear ${input.guardianFirstName} ${input.guardianLastName},`,
    "",
    `The admission application ${input.applicationNumber} for ${input.applicantName} has moved to: ${input.stageLabel}.`,
  ];
  if (input.note) {
    bodyLines.push("", `Note: ${input.note}`);
  }
  bodyLines.push("", `— ${input.schoolName} Admissions`);

  const noteHtml = input.note
    ? `<p style="margin:12px 0 0;"><strong>Note:</strong> ${escapeHtml(input.note)}</p>`
    : "";

  const { html, text } = renderEmailShell({
    preheader: `Application ${input.applicationNumber} is now ${input.stageLabel}`,
    title: "Admissions update",
    bodyHtml: `
      <p style="margin:0 0 12px;">Dear ${escapeHtml(input.guardianFirstName)} ${escapeHtml(input.guardianLastName)},</p>
      <p style="margin:0;">The admission application <strong>${escapeHtml(input.applicationNumber)}</strong> for <strong>${escapeHtml(input.applicantName)}</strong> has moved to: <strong>${escapeHtml(input.stageLabel)}</strong>.</p>
      ${noteHtml}
      <p style="margin:16px 0 0;">— ${escapeHtml(input.schoolName)} Admissions</p>
    `,
    bodyText: bodyLines.join("\n"),
    footerNote: `${input.schoolName}`,
  });

  return { subject, html, text };
}
