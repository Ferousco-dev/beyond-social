"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";

import { Chip, ChoiceChips } from "@/components/ui/choice-chips";

import { MAX_INTERESTS, type AudienceChoice, type AudienceGender } from "./audience";
import { AGE_RANGES, GENDER_OPTIONS, INTEREST_SUGGESTIONS } from "./options";

const toggle = (list: readonly string[], item: string): string[] =>
  list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];

/** Gender, age brackets and interests, prefilled from the analysis when there is one. */
export function AudiencePicker({ value, onChange }: { value: AudienceChoice; onChange: (value: AudienceChoice) => void }) {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const interestOptions = [...new Set([...value.interests, ...INTEREST_SUGGESTIONS])];
  const full = value.interests.length >= MAX_INTERESTS;

  function addInterest(): void {
    const interest = draft.trim();
    if (interest === "" || full) return;
    if (!value.interests.includes(interest)) onChange({ ...value, interests: [...value.interests, interest] });
    setDraft("");
  }

  return (
    <fieldset className="flex flex-col gap-4 rounded-2xl border border-hairline p-4 sm:col-span-2">
      <legend className="px-1 text-sm font-semibold text-ink">Target audience</legend>
      <ChoiceChips
        label="Who"
        options={GENDER_OPTIONS}
        value={value.gender}
        onChange={(gender) => onChange({ ...value, gender: gender as AudienceGender })}
      />
      <div className="flex flex-col gap-2" role="group" aria-label="Age">
        <span className="text-sm font-medium text-ink">Age</span>
        <div className="flex flex-wrap gap-2">
          {AGE_RANGES.map((range) => (
            <Chip
              key={range.value}
              selected={value.ages.includes(range.value)}
              onClick={() => onChange({ ...value, ages: toggle(value.ages, range.value) })}
            >
              {range.value}
            </Chip>
          ))}
        </div>
        <span className="text-xs text-ink-soft">Leave all off for any age.</span>
      </div>
      <div className="flex flex-col gap-2" role="group" aria-label="Interests">
        <span className="text-sm font-medium text-ink">Interests</span>
        <div className="flex flex-wrap gap-2">
          {interestOptions.map((interest) => {
            const selected = value.interests.includes(interest);
            return (
              <Chip
                key={interest}
                selected={selected}
                disabled={!selected && full}
                onClick={() => onChange({ ...value, interests: toggle(value.interests, interest) })}
              >
                {interest}
              </Chip>
            );
          })}
        </div>
        <div className="flex gap-2">
          <label htmlFor={inputId} className="sr-only">
            Add an interest
          </label>
          <input
            id={inputId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              addInterest();
            }}
            maxLength={40}
            disabled={full}
            placeholder="Add another, like fishing"
            className="h-10 min-w-0 flex-1 rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary disabled:opacity-60"
          />
          <button
            type="button"
            onClick={addInterest}
            disabled={full || draft.trim() === ""}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-[10px] border border-hairline px-3 text-sm font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="size-3.5" aria-hidden />
            Add
          </button>
        </div>
      </div>
    </fieldset>
  );
}
