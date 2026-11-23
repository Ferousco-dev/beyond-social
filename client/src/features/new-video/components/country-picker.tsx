"use client";

import { Select } from "@/components/ui/select";
import { OTHER_COUNTRY, TARGET_COUNTRIES } from "../countries";

const fieldClass =
  "h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-primary";

export function CountryPicker({
  choice,
  onChoiceChange,
  custom,
  onCustomChange,
}: {
  choice: string;
  onChoiceChange: (value: string) => void;
  custom: string;
  onCustomChange: (value: string) => void;
}) {
  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Target country
        <Select
          value={choice}
          onValueChange={onChoiceChange}
          options={TARGET_COUNTRIES.map((item) => ({ value: item, label: item }))}
        />
      </label>
      {choice === OTHER_COUNTRY ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink sm:col-span-2">
          Your country
          <input
            value={custom}
            onChange={(event) => onCustomChange(event.target.value)}
            maxLength={60}
            placeholder="Type your country or territory"
            className={fieldClass}
          />
        </label>
      ) : null}
    </>
  );
}
