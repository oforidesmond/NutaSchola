import { formatGhs } from "@/lib/format/currency";

export function admissionStageSms(input: {
  schoolName: string;
  guardianFirstName: string;
  applicantName: string;
  applicationNumber: string;
  stageLabel: string;
}): string {
  return (
    `${input.schoolName}: Hi ${input.guardianFirstName}, ` +
    `${input.applicantName}'s application (${input.applicationNumber}) ` +
    `is now ${input.stageLabel}.`
  );
}

export function admissionFeeDueSms(input: {
  schoolName: string;
  guardianFirstName: string;
  applicantName: string;
  amountDue: string | number;
}): string {
  return (
    `${input.schoolName}: Hi ${input.guardianFirstName}, ` +
    `an admission fee of ${formatGhs(input.amountDue)} is due for ${input.applicantName}. ` +
    `Please visit the school office to pay.`
  );
}

export function admissionFeePaymentSms(input: {
  schoolName: string;
  guardianFirstName: string;
  applicantName: string;
  amountPaid: string | number;
  methodLabel: string;
  outstanding: string | number;
}): string {
  const outstanding = Number(input.outstanding);
  const balancePart =
    outstanding <= 0
      ? "The admission fee is now fully paid. Thank you."
      : `Outstanding balance: ${formatGhs(outstanding)}.`;

  return (
    `${input.schoolName}: Hi ${input.guardianFirstName}, ` +
    `we received ${formatGhs(input.amountPaid)} (${input.methodLabel}) ` +
    `for ${input.applicantName}'s admission fee. ${balancePart}`
  );
}

export function admissionFeeArrearsSms(input: {
  schoolName: string;
  guardianFirstName: string;
  applicantName: string;
  outstanding: string | number;
}): string {
  return (
    `${input.schoolName}: Hi ${input.guardianFirstName}, ` +
    `a friendly reminder that ${formatGhs(input.outstanding)} remains outstanding ` +
    `on ${input.applicantName}'s admission fee. Please settle at your earliest convenience.`
  );
}
