import { CustomerImportView } from "@/components/customer-import-view";
import { getSellerOwnerOptions } from "@/lib/crm-users";

export default async function ImportPage() {
  const ownerOptions = await getSellerOwnerOptions();

  return <CustomerImportView ownerOptions={ownerOptions} />;
}
