"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SMS_CREDITS_ALERT_BODY, SMS_CREDITS_ALERT_TITLE } from "@/lib/sms/credits";

export function SmsCreditsAlertDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      title={SMS_CREDITS_ALERT_TITLE}
      consequence={SMS_CREDITS_ALERT_BODY}
      confirmLabel="Got it"
      cancelLabel="Close"
      onConfirm={onClose}
      onCancel={onClose}
    />
  );
}
