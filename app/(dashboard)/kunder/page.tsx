import {
  PageStack,
} from "@/components/crm-ui";
import { CustomersView } from "@/components/customers-view";
import { getSellerOwnerOptions } from "@/lib/crm-users";
import { readCrmData, sortByDateDescending } from "@/lib/crm-store";

export default async function KunderPage({
  searchParams,
}: {
  searchParams: Promise<{ newCustomer?: string }>;
}) {
  const params = await searchParams;
  const [data, ownerOptions] = await Promise.all([
    readCrmData(),
    getSellerOwnerOptions(),
  ]);
  const customers = sortByDateDescending(data.customers);

  return (
    <PageStack>
      <CustomersView
        customers={customers}
        deals={data.deals}
        ownerOptions={ownerOptions}
        openNewCustomer={params.newCustomer === "1"}
      />
    </PageStack>
  );
}
