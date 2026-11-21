import { useRef, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { DEFAULT_OPERATORS, RANGE_OPERATORS } from "@/core/config/filters";
import { api } from "@/core/lib/api";
import { withTokens } from "@/core/lib/loaders";
import { formatDate, nextOperator } from "@/core/lib/utils";
import type { TFilterColumn, TFilterModel, TOption } from "@/core/types";

type TValueProps = {
  column: TFilterColumn;
  model?: TFilterModel;
  labels: Record<string, string>;
  onChange: (next?: TFilterModel) => void;
};

const SEARCH_DELAY_MS = 300;

/**
 * A filter with new values, its operator following their number, or no
 * filter at all when nothing is left.
 */
function withValues(column: TFilterColumn, model: TFilterModel | undefined, values: (string | number)[]): TFilterModel | undefined {
  if (values.length === 0) return undefined;
  const base = model ?? {
    columnId: column.id,
    type: column.type,
    operator: DEFAULT_OPERATORS[column.type][values.length > 1 ? "multiple" : "single"],
    values: [],
  };
  return { ...base, operator: model ? nextOperator(model, values.length) : base.operator, values };
}

/**
 * A filter with another operator. A range needs both ends, so choosing one
 * repeats the value, and leaving one keeps its start.
 */
export function withOperator(model: TFilterModel, operator: string): TFilterModel {
  const range = RANGE_OPERATORS.has(operator);
  const values = range
    ? [model.values[0], model.values[1] ?? model.values[0]]
    : RANGE_OPERATORS.has(model.operator)
    ? [model.values[0]]
    : model.values;
  return { ...model, operator, values };
}

/** The value part of a chip: the text, the range, the dates or the options chosen. */
export function FilterValueDisplay({ column, model, labels }: Omit<TValueProps, "onChange">) {
  const { t, i18n } = useTranslation();
  if (!model) return null;
  const shown = model.values.map((value) => {
    if (column.type === "date") return formatDate(value, i18n.language) ?? String(value);
    if (column.remote) return labels[String(value)] ?? String(value);
    const option = column.options?.find((entry) => entry.value === value);
    return option ? t(option.label) : String(value);
  });
  if ((column.type === "option" || column.type === "multiOption") && shown.length > 2) {
    return <span>{t("filters.selected", { count: shown.length })}</span>;
  }
  return <span className="truncate">{shown.join(RANGE_OPERATORS.has(model.operator) ? " – " : ", ")}</span>;
}

/** The control that sets a filter's value, chosen by the column's type. */
export function FilterValueController(props: TValueProps) {
  switch (props.column.type) {
    case "text":
      return <TextValue {...props} />;
    case "number":
    case "date":
      return <ScalarValue {...props} />;
    case "option":
    case "multiOption":
      return props.column.remote ? <RemoteOptions {...props} /> : <StaticOptions {...props} />;
  }
}

/** Text, applied a moment after typing stops. Empty removes the filter. */
function TextValue({ column, model, onChange }: TValueProps) {
  const { t } = useTranslation();
  const timer = useRef<number | undefined>(undefined);
  return (
    <div className="p-3">
      <InputGroup>
        <InputGroupAddon><HugeiconsIcon icon={Search01Icon} /></InputGroupAddon>
        <InputGroupInput
          autoFocus
          defaultValue={String(model?.values[0] ?? "")}
          placeholder={t("filters.textPlaceholder")}
          aria-label={t(column.label)}
          onChange={(event) => {
            const text = event.target.value;
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => onChange(withValues(column, model, text.trim() ? [text.trim()] : [])), SEARCH_DELAY_MS);
          }}
        />
      </InputGroup>
    </div>
  );
}

/** A number or a date, or both ends of a range. Applied when a field is left or Enter is pressed. */
function ScalarValue({ column, model, onChange }: TValueProps) {
  const { t } = useTranslation();
  const range = Boolean(model && RANGE_OPERATORS.has(model.operator));
  const [values, setValues] = useState<string[]>((model?.values ?? []).map(String));
  const type = column.type === "date" ? "date" : "number";
  const apply = (next: string[]) => {
    const typed = next.filter(Boolean).map((value) => (type === "number" ? Number(value) : value));
    onChange(withValues(column, model, typed.filter((value) => !(typeof value === "number" && Number.isNaN(value)))));
  };
  const field = (index: number, label: string) => (
    <Input
      type={type}
      dir="ltr"
      min={column.min}
      max={column.max}
      value={values[index] ?? ""}
      aria-label={label}
      placeholder={type === "number" ? "0" : undefined}
      onChange={(event) => setValues((current) => Object.assign([...current], { [index]: event.target.value }))}
      onBlur={() => apply(values)}
      onKeyDown={(event) => event.key === "Enter" && apply(values)}
    />
  );
  return (
    <div className="flex flex-col gap-2 p-3">
      {field(0, range ? t("filters.from") : t(column.label))}
      {range && field(1, t("filters.to"))}
    </div>
  );
}

/** A searchable list of checkboxes. */
function OptionList({
  options,
  chosen,
  onToggle,
  loading = false,
  onSearch,
}: {
  options: TOption[];
  chosen: Set<string>;
  onToggle: (value: string) => void;
  loading?: boolean;
  /** Set when the list searches on the server, which then filters it. */
  onSearch?: (text: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Command loop shouldFilter={!onSearch}>
      <CommandInput
        placeholder={t("filters.searchOptions")}
        onValueChange={onSearch}
        onFocus={() => onSearch?.("")}
      />
      <CommandList>
        <CommandEmpty>{loading ? <Spinner className="mx-auto" /> : t("filters.noOptions")}</CommandEmpty>
        <CommandGroup>
          {options.map((option) => (
            <CommandItem key={option.value} value={option.label} onSelect={() => onToggle(option.value)}>
              <Checkbox checked={chosen.has(option.value)} tabIndex={-1} aria-hidden="true" />
              <span className="truncate">{option.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

function toggled(model: TFilterModel | undefined, value: string): string[] {
  const current = (model?.values ?? []).map(String);
  return current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value];
}

function StaticOptions({ column, model, onChange }: TValueProps) {
  const { t } = useTranslation();
  const options = (column.options ?? []).map((option) => ({ value: option.value, label: t(option.label) }));
  return (
    <OptionList
      options={options}
      chosen={new Set((model?.values ?? []).map(String))}
      onToggle={(value) => onChange(withValues(column, model, toggled(model, value)))}
    />
  );
}

/** Records from another list, such as accounts, searched on the server as the person types. */
function RemoteOptions({ column, model, labels, onChange }: TValueProps) {
  const [options, setOptions] = useState<TOption[]>(() =>
    (model?.values ?? []).map((value) => ({ value: String(value), label: labels[String(value)] ?? String(value) }))
  );
  const [loading, startTransition] = useTransition();
  const timer = useRef<number | undefined>(undefined);
  const remote = column.remote!;

  const search = (text: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() =>
      startTransition(async () => {
        const query: Record<string, string> = { limit: "20", ...(text.trim() ? { search: text.trim() } : {}) };
        const page = await withTokens((tokens) => api.list.execute(tokens, remote.path, query)).catch(() => null);
        if (!page) return;
        const found = page.items.map((item) => ({ value: String(item._id), label: String(item[remote.labelKey] ?? item._id) }));
        const kept = options.filter((option) => model?.values.map(String).includes(option.value) && !found.some((entry) => entry.value === option.value));
        setOptions([...kept, ...found]);
      }), SEARCH_DELAY_MS);
  };

  return (
    <OptionList
      options={options}
      chosen={new Set((model?.values ?? []).map(String))}
      loading={loading}
      onSearch={search}
      onToggle={(value) => onChange(withValues(column, model, toggled(model, value)))}
    />
  );
}
