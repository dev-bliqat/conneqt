export type CustomerEmailRecipientStatus = {
  recipient: string;
  ok: boolean;
  message: string | null;
};

export type CustomerEmailState = {
  error: string | null;
  success: string | null;
  sentCount: number;
  failedCount: number;
  ignoredCount: number;
  recipientStatuses: CustomerEmailRecipientStatus[];
  failedRecipients: string[];
  ignoredActiveRecipients: string[];
};

export const initialCustomerEmailState: CustomerEmailState = {
  error: null,
  success: null,
  sentCount: 0,
  failedCount: 0,
  ignoredCount: 0,
  recipientStatuses: [],
  failedRecipients: [],
  ignoredActiveRecipients: [],
};
