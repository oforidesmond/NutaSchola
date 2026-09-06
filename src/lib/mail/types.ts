export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailContent = {
  subject: string;
  text: string;
  html: string;
};
