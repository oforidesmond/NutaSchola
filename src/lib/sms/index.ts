export type { OutboundSms } from "@/lib/sms/types";
export { sendSms } from "@/lib/sms/send";
export { normalizeGhPhone, uniqueNormalizedPhones, parseGhPhoneList } from "@/lib/sms/phone";
export { canUseEbits } from "@/lib/sms/providers/ebits";
export {
  SMS_CREDITS_EXHAUSTED_CODE,
  SMS_CREDITS_EXHAUSTED_MESSAGE,
  SMS_CREDITS_ALERT_TITLE,
  SMS_CREDITS_ALERT_BODY,
} from "@/lib/sms/credits";
export {
  admissionStageSms,
  admissionFeeDueSms,
  admissionFeePaymentSms,
  admissionFeeArrearsSms,
} from "@/lib/sms/templates";
export { dispatchSms, type DispatchSmsInput, type DispatchSmsResult } from "@/lib/sms/dispatch";
export { resolvePrimaryGuardianContact } from "@/lib/sms/guardians";
