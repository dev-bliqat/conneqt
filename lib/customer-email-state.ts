export type CustomerEmailState = {
  error: string | null;
  success: string | null;
  sentCount: number;
};

export const initialCustomerEmailState: CustomerEmailState = {
  error: null,
  success: null,
  sentCount: 0,
};
