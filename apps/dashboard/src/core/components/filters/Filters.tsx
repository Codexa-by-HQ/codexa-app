import { useState } from "react";
import { useTranslation } from "react-i18next";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, Cancel01Icon, FilterHorizontalIcon, FilterRemoveIcon } from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { FILTER_ICONS, FILTER_OPERATORS } from "@/core/config/filters";
import type { TFilterColumn, TFilterModel } from "@/core/types";
import { FilterValueController, FilterValueDisplay, withOperator } from "./FilterValue";

type TFiltersProps = {
  columns: readonly TFilterColumn[];
  value: TFilterModel[];
  onChange: (next: TFilterModel[]) => void;
  /** Names for record ids in the applied filters, such as an account's name. */
  labels: Record<string, string>;
};

/**
 * A list's filters in the data table filter style of bazza/ui: a Filter
 * button that picks a column and then its value, and each applied filter as a
 * chip of column, operator and value, any part of which can be changed, plus
 * Clear. Every change goes straight to the URL, so the list reloads on the
 * server with it.
 */
export function Filters({ columns, value, onChange, labels }: TFiltersProps) {
  const { t } = useTranslation();
  const replace = (columnId: string, model?: TFilterModel) =>
    onChange(model
      ? value.some((entry) => entry.columnId === columnId)
        ? value.map((entry) => (entry.columnId === columnId ? model : entry))
        : [...value, model]
      : value.filter((entry) => entry.columnId !== columnId));

  return (
    <>
      <FilterSelector columns={columns} value={value} replace={replace} labels={labels} />
      {value.length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => onChange([])} className="text-destructive hover:text-destructive">
          <HugeiconsIcon icon={FilterRemoveIcon} />
          <span className="hidden md:inline">{t("filters.clear")}</span>
        </Button>
      )}
      {value.length > 0 && (
        <div className="no-scrollbar order-last flex w-full gap-2 overflow-x-auto pb-1">
          {value.map((model) => {
            const column = columns.find((entry) => entry.id === model.columnId);
            return column
              ? (
                <FilterChip
                  key={model.columnId}
                  column={column}
                  model={model}
                  labels={labels}
                  onChange={(next) => replace(model.columnId, next)}
                />
              )
              : null;
          })}
        </div>
      )}
    </>
  );
}

/**
 * The Filter button: first the columns to filter by, searchable, then the
 * chosen column's value control in the same panel.
 */
function FilterSelector({
  columns,
  value,
  replace,
  labels,
}: {
  columns: readonly TFilterColumn[];
  value: TFilterModel[];
  replace: (columnId: string, model?: TFilterModel) => void;
  labels: Record<string, string>;
}) {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState<TFilterColumn | null>(null);

  return (
    <Popover onOpenChangeComplete={(open) => !open && setChosen(null)}>
      <PopoverTrigger
        render={
          <Button variant="outline">
            <HugeiconsIcon icon={FilterHorizontalIcon} />
            {t("list.filter")}
            {value.length > 0 && <Badge className="ms-0.5 h-5 min-w-5 px-1.5">{value.length}</Badge>}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-72 p-0">
        {chosen
          ? (
            <FilterValueController
              column={chosen}
              model={value.find((entry) => entry.columnId === chosen.id)}
              labels={labels}
              onChange={(next) => replace(chosen.id, next)}
            />
          )
          : (
            <Command loop>
              <CommandInput placeholder={t("filters.searchColumns")} />
              <CommandList>
                <CommandEmpty>{t("filters.noColumns")}</CommandEmpty>
                <CommandGroup>
                  {columns.map((column) => (
                    <CommandItem
                      key={column.id}
                      value={t(column.label)}
                      onSelect={() => setChosen(column)}
                      className="group"
                    >
                      <HugeiconsIcon icon={column.icon ?? FILTER_ICONS[column.type]} />
                      <span>{t(column.label)}</span>
                      {value.some((entry) => entry.columnId === column.id) && (
                        <Badge variant="secondary" className="ms-auto">{t("filters.applied")}</Badge>
                      )}
                      <CommandShortcut className="opacity-0 group-data-[selected=true]:opacity-100">
                        <HugeiconsIcon icon={ArrowRight01Icon} className="rtl:rotate-180" />
                      </CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
      </PopoverContent>
    </Popover>
  );
}

/** One applied filter: its column, a menu of operators, its value, and remove. */
function FilterChip({
  column,
  model,
  labels,
  onChange,
}: {
  column: TFilterColumn;
  model: TFilterModel;
  labels: Record<string, string>;
  onChange: (next?: TFilterModel) => void;
}) {
  const { t } = useTranslation();
  const label = t(column.label);

  return (
    <div
      role="group"
      aria-label={label}
      className="flex h-8 shrink-0 items-center overflow-hidden rounded-full border bg-background text-xs shadow-xs"
    >
      <span className="flex items-center gap-1.5 ps-3 pe-2 font-medium whitespace-nowrap">
        <HugeiconsIcon icon={column.icon ?? FILTER_ICONS[column.type]} className="size-3.5" />
        {label}
      </span>
      <Separator orientation="vertical" />
      <Popover>
        <PopoverTrigger
          render={
            <Button variant="ghost" size="sm" className="h-full rounded-none px-2 text-xs text-muted-foreground" aria-label={t("filters.operator", { column: label })}>
              {t(`filters.operators.${model.operator}`)}
            </Button>
          }
        />
        <PopoverContent align="start" className="w-56 p-0">
          <Command loop>
            <CommandList>
              <CommandGroup heading={t("filters.operatorsHeading")}>
                {FILTER_OPERATORS[column.type].map((operator) => (
                  <CommandItem key={operator} value={operator} onSelect={() => onChange(withOperator(model, operator))}>
                    {t(`filters.operators.${operator}`)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Separator orientation="vertical" />
      <Popover>
        <PopoverTrigger
          render={
            <Button variant="ghost" size="sm" className="h-full max-w-56 rounded-none px-2 text-xs" aria-label={t("filters.value", { column: label })}>
              <FilterValueDisplay column={column} model={model} labels={labels} />
            </Button>
          }
        />
        <PopoverContent align="start" className="w-72 p-0">
          <FilterValueController column={column} model={model} labels={labels} onChange={onChange} />
        </PopoverContent>
      </Popover>
      <Separator orientation="vertical" />
      <Button
        variant="ghost"
        size="icon-sm"
        className="h-full w-8 rounded-none"
        aria-label={t("filters.remove", { column: label })}
        onClick={() => onChange(undefined)}
      >
        <HugeiconsIcon icon={Cancel01Icon} />
      </Button>
    </div>
  );
}
