import { createCustomer, updateCustomer } from "@/app/actions";
import {
  Field,
  FormGrid,
  OwnerSelect,
  Select,
  SubmitButton,
  Textarea,
} from "@/components/crm-ui";
import { customerStatuses, type Customer } from "@/lib/crm-types";

export function CustomerForm({
  mode,
  ownerOptions,
  customer,
}: {
  mode: "create" | "edit";
  ownerOptions: string[];
  customer?: Customer;
}) {
  const action = mode === "create" ? createCustomer : updateCustomer;
  const isCreate = mode === "create";

  return (
    <form action={action}>
      {customer ? <input type="hidden" name="customerId" value={customer.id} /> : null}
      <FormGrid columns={isCreate ? "four" : "two"}>
        <Field
          label="Kontaktperson"
          name="name"
          placeholder="Sara Holm"
          defaultValue={customer?.name}
        />
        <Field
          label="Bolag"
          name="company"
          placeholder="Aurora Studio"
          defaultValue={customer?.company}
        />
        <Field label="E-post" name="email" type="email" defaultValue={customer?.email} />
        <Field label="Telefon" name="phone" defaultValue={customer?.phone} />
        <Field
          label="Segment"
          name="segment"
          placeholder="Tillväxt"
          defaultValue={customer?.segment}
        />
        <Select
          label="Kundstatus"
          name="status"
          options={[...customerStatuses]}
          defaultValue={customer?.status ?? "Ska boka nytt möte"}
        />
        <Field
          label="Stad"
          name="city"
          placeholder="Stockholm"
          defaultValue={customer?.city}
        />
        <OwnerSelect options={ownerOptions} defaultValue={customer?.owner} />
        <div className="md:col-span-2">
          <Textarea
            label="Statusanteckningar"
            name="statusNotes"
            placeholder="Fri anteckning om nuläge, risk, relation eller senaste status."
            defaultValue={customer?.statusNotes}
            rows={isCreate ? 3 : 5}
            className={isCreate ? "min-h-[88px]" : "min-h-28"}
          />
        </div>
        <Field
          label="Follow-up datum"
          name="followUpDate"
          type="date"
          defaultValue={customer?.followUpDate}
        />
        <Field
          label="Vad ska göras då?"
          name="followUpAction"
          placeholder="Ring, boka möte, skicka offert..."
          defaultValue={customer?.followUpAction}
        />
        {mode === "edit" ? (
          <>
            <label className="flex items-center gap-3 rounded-2xl border border-[var(--brand-primary)]/10 bg-[var(--brand-lilac)]/10 px-4 py-3 text-sm text-[var(--brand-primary)]/72">
              <input type="checkbox" name="markFollowUpComplete" className="h-4 w-4" />
              Markera aktuell follow-up som klar
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-[#d9e8d8] bg-[#f5fbf5] px-4 py-3 text-sm text-[#2d6a33]">
              <input type="checkbox" name="markWon" className="h-4 w-4" />
              Markera som vunnen kund
            </label>
            <Field
              label="Vunnet värde (SEK)"
              name="wonValue"
              type="number"
              placeholder="150000"
              defaultValue={customer?.wonValue || ""}
            />
          </>
        ) : null}
        <div className="md:col-span-2">
          <Textarea
            label="Övriga anteckningar"
            name="notes"
            placeholder="Behov, relation och historik"
            defaultValue={customer?.notes}
            rows={isCreate ? 3 : 5}
            className={isCreate ? "min-h-[88px]" : "min-h-28"}
          />
        </div>
        <div className={`${isCreate ? "xl:col-span-4" : "md:col-span-2"} flex justify-end`}>
          <SubmitButton>{mode === "create" ? "Spara kund" : "Spara ändringar"}</SubmitButton>
        </div>
      </FormGrid>
    </form>
  );
}
