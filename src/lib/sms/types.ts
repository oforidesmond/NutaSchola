export type OutboundSms = {
  /** One or more destination numbers (already normalized when possible). */
  to: string | string[];
  body: string;
};
