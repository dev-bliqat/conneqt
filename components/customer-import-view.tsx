"use client";

import { useActionState, useMemo, useState, type ChangeEvent } from "react";
import { importCustomersFromCsv } from "@/app/actions";
import {
  PageStack,
  SectionCard,
  StatusPill,
  SubmitButton,
} from "@/components/crm-ui";
import { initialCustomerImportState } from "@/lib/customer-import-state";

type CustomerImportViewProps = {
  ownerOptions: string[];
};

type ParsedCsv = {
  rows: string[][];
  delimiter: "," | ";" | "\t";
};

const importFields = [
  { key: "company", label: "Bolag", required: true },
  { key: "name", label: "Kontaktperson", required: true },
  { key: "email", label: "E-post", required: false },
  { key: "phone", label: "Telefon", required: false },
  { key: "segment", label: "Segment", required: false },
  { key: "status", label: "Kundstatus", required: false },
  { key: "statusNotes", label: "Statusanteckningar", required: false },
  { key: "city", label: "Stad", required: false },
  { key: "notes", label: "Övriga anteckningar", required: false },
  { key: "followUpDate", label: "Follow-up datum", required: false },
  { key: "followUpAction", label: "Vad ska göras då?", required: false },
  { key: "owner", label: "Ansvarig", required: false },
] as const;

function detectDelimiter(text: string): "," | ";" | "\t" {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;

  if (tabs > semicolons && tabs > commas) {
    return "\t";
  }

  if (semicolons > commas) {
    return ";";
  }

  return ",";
}

function parseCsv(text: string): ParsedCsv {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        value += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(value.trim());
      value = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(value.trim());
      value = "";

      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value.trim());
    if (row.some((cell) => cell !== "")) {
      rows.push(row);
    }
  }

  return { rows, delimiter };
}

function getMappedColumnValue(mappingValue: string | undefined) {
  if (!mappingValue || mappingValue === "__skip__") {
    return "";
  }

  return mappingValue;
}

export function CustomerImportView({ ownerOptions }: CustomerImportViewProps) {
  const [state, formAction] = useActionState(
    importCustomersFromCsv,
    initialCustomerImportState,
  );
  const [step, setStep] = useState<1 | 2>(1);
  const [hasHeader, setHasHeader] = useState(true);
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  const previewRows = useMemo(() => {
    if (!parsedCsv) {
      return [];
    }

    return parsedCsv.rows.slice(0, Math.min(parsedCsv.rows.length, 6));
  }, [parsedCsv]);

  const columnOptions = useMemo(() => {
    const firstRow = parsedCsv?.rows[0] ?? [];

    return firstRow.map((cell, index) => ({
      value: String(index),
      label: hasHeader ? `${cell || `Kolumn ${index + 1}`}` : `Kolumn ${index + 1}`,
    }));
  }, [hasHeader, parsedCsv]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsv(text);

      if (parsed.rows.length < 1) {
        setUploadError("Filen verkar vara tom eller kunde inte läsas som CSV.");
        setParsedCsv(null);
        return;
      }

      setFileName(file.name);
      setParsedCsv(parsed);
      setUploadError(null);
      setStep(1);

      const defaults: Record<string, string> = {};
      const headerSource = parsed.rows[0] ?? [];

      importFields.forEach((field) => {
        const matchIndex = headerSource.findIndex((value) =>
          value.trim().toLowerCase() === field.label.trim().toLowerCase(),
        );
        defaults[field.key] = matchIndex >= 0 ? String(matchIndex) : "__skip__";
      });

      setMapping(defaults);
    } catch {
      setUploadError("Kunde inte läsa filen. Kontrollera att det är en giltig CSV-fil.");
      setParsedCsv(null);
    }
  }

  const requiredMapped = Boolean(
    getMappedColumnValue(mapping.company) && getMappedColumnValue(mapping.name),
  );

  function updateMapping(fieldKey: string, value: string) {
    setMapping((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  }

  return (
    <PageStack>
      <SectionCard
        title="Importera kunder via CSV"
        subtitle="Ladda upp en kundlista, mappa kolumnerna och lägg sedan in kunderna direkt i CRM-systemet."
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill tone={step === 1 ? "dark" : "neutral"}>Steg 1: Ladda upp</StatusPill>
            <StatusPill tone={step === 2 ? "dark" : "neutral"}>Steg 2: Mappa kolumner</StatusPill>
            {fileName ? <StatusPill tone="amber">{fileName}</StatusPill> : null}
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4 p-1">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--brand-primary)]/72">
                  CSV-fil
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="w-full rounded-2xl bg-white/72 px-4 py-3 text-sm text-[var(--brand-primary)] shadow-[inset_0_0_0_1px_rgba(58,17,98,0.06)]"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl bg-[var(--brand-lilac)]/10 px-4 py-3 text-sm text-[var(--brand-primary)]/72">
                <input
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(event) => setHasHeader(event.target.checked)}
                  className="h-4 w-4"
                />
                Första raden innehåller rubriker
              </label>

              {uploadError ? (
                <div className="rounded-2xl bg-[#fff2f2] px-4 py-3 text-sm text-[#a43b3b]">
                  {uploadError}
                </div>
              ) : null}

              {state.error ? (
                <div className="rounded-2xl bg-[#fff2f2] px-4 py-3 text-sm text-[#a43b3b]">
                  {state.error}
                </div>
              ) : null}

              {(state.imported > 0 || state.skipped > 0 || state.duplicates > 0) ? (
                <div className="rounded-2xl bg-[#edf8ee] px-4 py-3 text-sm text-[#2d6a33]">
                  Import klart: {state.imported} importerade, {state.duplicates} dubbletter, {state.skipped} hoppades över.
                </div>
              ) : null}

              <button
                type="button"
                disabled={!parsedCsv}
                onClick={() => setStep(2)}
                className="rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Fortsätt till kolumnmappning
              </button>
            </div>

            <div className="p-1">
              <p className="text-sm font-medium text-[var(--brand-primary)]/72">
                Förhandsvisning
              </p>
              {!parsedCsv ? (
                <p className="mt-3 text-sm text-[var(--brand-primary)]/55">
                  Ladda upp en CSV-fil för att se en förhandsvisning av innehållet här.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <tbody>
                      {previewRows.map((row, rowIndex) => (
                        <tr
                          key={`${rowIndex}-${row.join("-")}`}
                          className={rowIndex === 0 && hasHeader ? "font-semibold text-[var(--brand-primary)]" : "text-[var(--brand-primary)]/65"}
                        >
                          {row.map((cell, columnIndex) => (
                            <td
                              key={`${rowIndex}-${columnIndex}`}
                              className="border-b border-[rgba(58,17,98,0.06)] px-3 py-2"
                            >
                              {cell || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {step === 2 && parsedCsv ? (
        <SectionCard
          title="Mappa kolumner"
          subtitle="Välj vilken kolumn som innehåller vilken information innan kunderna importeras."
        >
          <form action={formAction} className="space-y-6">
            <input type="hidden" name="rowsJson" value={JSON.stringify(parsedCsv.rows)} />
            <input type="hidden" name="mappingJson" value={JSON.stringify(mapping)} />
            <input type="hidden" name="hasHeader" value={hasHeader ? "1" : "0"} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {importFields.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--brand-primary)]/72">
                    {field.label}
                    {field.required === true ? " *" : ""}
                  </span>
                  <select
                    value={mapping[field.key] ?? "__skip__"}
                    onChange={(event) => updateMapping(field.key, event.target.value)}
                    className="w-full rounded-2xl bg-white/72 px-4 py-3 text-sm text-[var(--brand-primary)] outline-none shadow-[inset_0_0_0_1px_rgba(58,17,98,0.06)] transition focus:bg-white focus:shadow-[inset_0_0_0_1.5px_rgba(233,87,59,0.45)]"
                  >
                    <option value="__skip__">Hoppa över</option>
                    {columnOptions.map((option) => (
                      <option key={`${field.key}-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div className="p-1">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--brand-primary)]/72">
                    Standardansvarig om CSV saknar ansvarig-kolumn
                  </span>
                  <select
                    name="defaultOwner"
                    defaultValue={ownerOptions[0] ?? ""}
                    className="w-full rounded-2xl bg-white/72 px-4 py-3 text-sm text-[var(--brand-primary)] outline-none shadow-[inset_0_0_0_1px_rgba(58,17,98,0.06)]"
                  >
                    {ownerOptions.map((owner) => (
                      <option key={owner} value={owner}>
                        {owner}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <p className="text-sm text-[var(--brand-primary)]/55">
                    Bolag och kontaktperson måste vara mappade. Dubbletter identifieras med bolag + e-post eller bolag + kontaktperson.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full bg-white/72 px-5 py-2.5 text-sm font-medium text-[var(--brand-primary)] shadow-[inset_0_0_0_1px_rgba(58,17,98,0.06)]"
              >
                Tillbaka
              </button>
              <SubmitButton disabled={!requiredMapped}>
                {requiredMapped ? "Importera kunder" : "Mappa bolag och kontaktperson först"}
              </SubmitButton>
            </div>
          </form>
        </SectionCard>
      ) : null}
    </PageStack>
  );
}
