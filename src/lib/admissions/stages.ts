import type { AdmissionStage } from "@prisma/client";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "error";

/** Main progress track shown in the Admission Stage Tracker (excludes terminal branches). */
export const ADMISSION_TRACK: AdmissionStage[] = [
  "INQUIRY",
  "APPLICATION_SUBMITTED",
  "UNDER_REVIEW",
  "ADMITTED",
  "ENROLLED",
];

export const TERMINAL_STAGES: AdmissionStage[] = [
  "WAITLISTED",
  "REJECTED",
  "WITHDRAWN",
];

/**
 * Stages staff may set manually. ENROLLED is convert-only.
 * Single source for StageChangePanel + changeApplicationStageAction.
 */
export const MANUAL_STAGES: AdmissionStage[] = [
  "INQUIRY",
  "APPLICATION_SUBMITTED",
  "UNDER_REVIEW",
  "ADMITTED",
  "WAITLISTED",
  "REJECTED",
  "WITHDRAWN",
];

/** Filter / dashboard enumeration: track + terminals. */
export const ALL_FILTER_STAGES: AdmissionStage[] = [
  ...ADMISSION_TRACK,
  ...TERMINAL_STAGES,
];

const LABELS: Record<AdmissionStage, string> = {
  INQUIRY: "Inquiry",
  APPLICATION_SUBMITTED: "Application submitted",
  UNDER_REVIEW: "Under review",
  ADMITTED: "Admitted",
  ENROLLED: "Enrolled",
  WAITLISTED: "Waitlisted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

/** Design-language status → tone mapping (single source for StatusBadge). */
export function admissionStageTone(stage: AdmissionStage): StatusTone {
  switch (stage) {
    case "INQUIRY":
      return "neutral";
    case "APPLICATION_SUBMITTED":
    case "UNDER_REVIEW":
      return "info";
    case "ADMITTED":
    case "ENROLLED":
      return "success";
    case "WAITLISTED":
      return "warning";
    case "REJECTED":
    case "WITHDRAWN":
      return "error";
    default:
      return "neutral";
  }
}

export function admissionStageLabel(stage: AdmissionStage): string {
  return LABELS[stage];
}

/**
 * Index of the last active track step. Terminal stages freeze at the previous
 * track position (or 0 if never advanced onto the track).
 * Prefer passing `freezeAtStage` from history when available.
 */
export function trackerActiveIndex(
  stage: AdmissionStage,
  freezeAtStage?: AdmissionStage | null,
): number {
  if (TERMINAL_STAGES.includes(stage)) {
    if (freezeAtStage && ADMISSION_TRACK.includes(freezeAtStage)) {
      return ADMISSION_TRACK.indexOf(freezeAtStage);
    }
    return 0;
  }
  const idx = ADMISSION_TRACK.indexOf(stage);
  return idx >= 0 ? idx : 0;
}

/**
 * Last non-terminal stage from status history (most recent first), used to
 * freeze the tracker when the application is waitlisted/rejected/withdrawn.
 */
export function lastTrackStageFromHistory(
  history: { fromStage: AdmissionStage | null; toStage: AdmissionStage }[],
): AdmissionStage | null {
  for (const entry of history) {
    if (!isTerminalStage(entry.toStage) && ADMISSION_TRACK.includes(entry.toStage)) {
      return entry.toStage;
    }
    if (
      entry.fromStage &&
      !isTerminalStage(entry.fromStage) &&
      ADMISSION_TRACK.includes(entry.fromStage)
    ) {
      return entry.fromStage;
    }
  }
  return null;
}

export function isTerminalStage(stage: AdmissionStage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

export function canConvertFromStage(stage: AdmissionStage): boolean {
  return stage === "ADMITTED";
}
