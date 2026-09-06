import {
  ApplicationSource,
  DocumentType,
  Gender,
  PaymentMethod,
  RelationshipType,
} from "@prisma/client";

export const SOURCE_LABELS: Record<ApplicationSource, string> = {
  WALK_IN: "Walk-in",
  WEBSITE: "Website",
  PHONE: "Phone",
  REFERRAL: "Referral",
  SOCIAL_MEDIA: "Social media",
  AGENT: "Agent",
  OTHER: "Other",
};

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
};

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  FATHER: "Father",
  MOTHER: "Mother",
  GUARDIAN: "Guardian",
  GRANDPARENT: "Grandparent",
  SIBLING: "Sibling",
  OTHER: "Other",
};

/** Document types collectable from the admissions detail screen (Phase 3 scope). */
export const APPLICATION_DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "BIRTH_CERTIFICATE", label: "Birth certificate" },
  { value: "PASSPORT_PHOTO", label: "Passport photo" },
  { value: "PREVIOUS_REPORT_CARD", label: "Previous report card" },
];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  BIRTH_CERTIFICATE: "Birth certificate",
  PASSPORT_PHOTO: "Passport photo",
  PREVIOUS_REPORT_CARD: "Previous report card",
  TRANSFER_LETTER: "Transfer letter",
  IMMUNIZATION_RECORD: "Immunization record",
  ID_CARD: "ID card",
  CONTRACT: "Contract",
  RECEIPT: "Receipt",
  OTHER: "Other",
};

/** Manual, non-gateway payment methods staff can record against an admission fee invoice. */
export const ADMISSION_PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  MOBILE_MONEY: "Mobile money",
  BANK_TRANSFER: "Bank transfer",
  CARD: "Card",
  CHEQUE: "Cheque",
  PAYSTACK: "Paystack",
  HUBTEL: "Hubtel",
  OTHER: "Other",
};
