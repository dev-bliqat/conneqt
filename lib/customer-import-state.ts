export type CustomerImportState = {
  error: string | null;
  imported: number;
  skipped: number;
  duplicates: number;
};

export const initialCustomerImportState: CustomerImportState = {
  error: null,
  imported: 0,
  skipped: 0,
  duplicates: 0,
};
