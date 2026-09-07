export type { OutboundSms } from "@/lib/sms/types";
export { sendSms } from "@/lib/sms/send";
export { normalizeGhPhone, uniqueNormalizedPhones } from "@/lib/sms/phone";
export {
  admissionStageSms,
  admissionFeeDueSms,
  admissionFeePaymentSms,
  admissionFeeArrearsSms,
} from "@/lib/sms/templates";
export { dispatchSms, type DispatchSmsInput, type DispatchSmsResult } from "@/lib/sms/dispatch";
export { resolvePrimaryGuardianContact } from "@/lib/sms/guardians";
