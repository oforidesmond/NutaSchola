import type { AdmissionStage } from "@prisma/client";
import {
  ADMISSION_TRACK,
  admissionStageLabel,
  isTerminalStage,
} from "@/lib/admissions/stages";

export const APPLICATION_DOCUMENT_TYPES = [
  "BIRTH_CERTIFICATE",
  "PASSPORT_PHOTO",
  "PREVIOUS_REPORT_CARD",
] as const;

export type NextAction = {
  title: string;
  description: string;
  /** Suggested primary control: stage | fee | convert | docs | none */
  focus: "stage" | "fee" | "convert" | "docs" | "none";
  ctaLabel?: string;
};

type NextActionInput = {
  stage: AdmissionStage;
  guardianCount: number;
  uploadedDocumentTypes: string[];
  hasInvoice: boolean;
  amountPaid: number;
  canConvert: boolean;
  alreadyConverted: boolean;
  convertBlockedReason: string | null;
};

export function getAdmissionNextAction(input: NextActionInput): NextAction {
  const {
    stage,
    guardianCount,
    uploadedDocumentTypes,
    hasInvoice,
    amountPaid,
    canConvert,
    alreadyConverted,
    convertBlockedReason,
  } = input;

  if (alreadyConverted || stage === "ENROLLED") {
    return {
      title: "Application enrolled",
      description:
        "This applicant has been converted to a student. Review history below if needed.",
      focus: "none",
    };
  }

  if (isTerminalStage(stage)) {
    return {
      title: `${admissionStageLabel(stage)} — update if needed`,
      description:
        "This application left the main track. You can reopen it by changing the stage, or leave it as a terminal record.",
      focus: "stage",
      ctaLabel: "Change stage",
    };
  }

  if (guardianCount === 0) {
    return {
      title: "Add a guardian",
      description: "At least one guardian is required before advancing the application.",
      focus: "docs",
      ctaLabel: "Add guardian",
    };
  }

  const missingDocs = APPLICATION_DOCUMENT_TYPES.filter(
    (t) => !uploadedDocumentTypes.includes(t),
  );
  if (
    (stage === "INQUIRY" || stage === "APPLICATION_SUBMITTED") &&
    missingDocs.length > 0
  ) {
    return {
      title: "Collect remaining documents",
      description: `Still needed: ${missingDocs.map(docLabel).join(", ")}. Upload them, then move the application forward.`,
      focus: "docs",
      ctaLabel: "Upload documents",
    };
  }

  if (stage === "INQUIRY" || stage === "APPLICATION_SUBMITTED") {
    const next = nextTrackStage(stage);
    return {
      title: next ? `Move to ${admissionStageLabel(next)}` : "Advance stage",
      description:
        "Bio-data and guardians are in place. Advance when the file is ready for review.",
      focus: "stage",
      ctaLabel: "Update stage",
    };
  }

  if (stage === "UNDER_REVIEW") {
    return {
      title: "Record an admission decision",
      description:
        "Admit, waitlist, or reject this applicant. Use the stage panel and add a note for the record.",
      focus: "stage",
      ctaLabel: "Update stage",
    };
  }

  if (stage === "ADMITTED") {
    if (!hasInvoice) {
      return {
        title: "Generate the admission fee invoice",
        description: "Create the invoice so payments can be recorded against this application.",
        focus: "fee",
        ctaLabel: "Generate invoice",
      };
    }
    if (amountPaid <= 0) {
      return {
        title: "Record a fee payment",
        description:
          "At least one payment is required before converting to a student. Partial payment is enough.",
        focus: "fee",
        ctaLabel: "Record payment",
      };
    }
    if (canConvert) {
      return {
        title: "Convert to student",
        description:
          "Admitted and payment recorded. Convert to create the student record and enrollment.",
        focus: "convert",
        ctaLabel: "Convert to student",
      };
    }
    return {
      title: "Ready for conversion soon",
      description: convertBlockedReason ?? "Complete remaining requirements to convert.",
      focus: "convert",
    };
  }

  return {
    title: "Continue this application",
    description: "Review the details below and take the next appropriate action.",
    focus: "stage",
  };
}

function nextTrackStage(stage: AdmissionStage): AdmissionStage | null {
  const idx = ADMISSION_TRACK.indexOf(stage);
  if (idx < 0 || idx >= ADMISSION_TRACK.length - 1) return null;
  return ADMISSION_TRACK[idx + 1] ?? null;
}

function docLabel(type: string): string {
  switch (type) {
    case "BIRTH_CERTIFICATE":
      return "birth certificate";
    case "PASSPORT_PHOTO":
      return "passport photo";
    case "PREVIOUS_REPORT_CARD":
      return "previous report";
    default:
      return type.toLowerCase().replace(/_/g, " ");
  }
}
