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
  recipientStatuses: CustomerEmailRecipientStatus[];
  failedRecipients: string[];
};

export const initialCustomerEmailState: CustomerEmailState = {
  error: null,
  success: null,
  sentCount: 0,
  failedCount: 0,
  recipientStatuses: [],
  failedRecipients: [],
};
