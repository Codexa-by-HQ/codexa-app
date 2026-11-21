import type { IconSvgElement } from "@hugeicons/react";
import {
  Calendar03Icon,
  CircleIcon,
  GridIcon,
  HashtagIcon,
  TextIcon,
} from "@hugeicons/core-free-icons";

import type { TFilterColumn, TFilterType, TOption } from "@/core/types";

/** Each column type's operators, as bazza/ui and OAuth Base name them. */
export const FILTER_OPERATORS: Record<TFilterType, readonly string[]> = {
  text: ["contains", "does not contain"],
  number: [
    "is",
    "is not",
    "is greater than",
    "is greater than or equal to",
    "is less than",
    "is less than or equal to",
    "is between",
    "is not between",
  ],
  date: ["is", "is not", "is before", "is on or after", "is after", "is on or before", "is between", "is not between"],
  option: ["is", "is not", "is any of", "is none of"],
  multiOption: ["include", "exclude", "include any of", "include all of", "exclude if any of", "exclude if all"],
};

/** Operators that take two values, the ends of a range. */
export const RANGE_OPERATORS = new Set(["is between", "is not between"]);

/** The operator a new filter starts with, for one value and for several. */
export const DEFAULT_OPERATORS: Record<TFilterType, { single: string; multiple: string }> = {
  text: { single: "contains", multiple: "contains" },
  number: { single: "is", multiple: "is between" },
  date: { single: "is", multiple: "is between" },
  option: { single: "is", multiple: "is any of" },
  multiOption: { single: "include", multiple: "include any of" },
};

/** How an operator follows the number of values, as bazza/ui switches it. */
export const OPERATOR_FOR_MANY: Record<string, string> = {
  "is": "is any of",
  "is not": "is none of",
  "include": "include any of",
  "exclude": "exclude if any of",
};
export const OPERATOR_FOR_ONE: Record<string, string> = {
  "is any of": "is",
  "is none of": "is not",
  "include any of": "include",
  "include all of": "include",
  "exclude if any of": "exclude",
  "exclude if all": "exclude",
};

export const FILTER_ICONS: Record<TFilterType, IconSvgElement> = {
  text: TextIcon,
  number: HashtagIcon,
  date: Calendar03Icon,
  option: CircleIcon,
  multiOption: GridIcon,
};

/**
 * Builders for filter columns, so every list declares its filters in a line.
 * Each id must match the column OAuth Base declares for that list.
 */
export const column = {
  text: (id: string, label: string): TFilterColumn => ({ id, type: "text", label }),
  number: (id: string, label: string, min?: number, max?: number): TFilterColumn => ({ id, type: "number", label, min, max }),
  date: (id: string, label: string): TFilterColumn => ({ id, type: "date", label }),
  /** A single value column over fixed values, labelled under one translation prefix. */
  option: (id: string, label: string, values: readonly string[], prefix: string): TFilterColumn => ({
    id,
    type: "option",
    label,
    options: values.map((value) => ({ value, label: `${prefix}.${value}` })),
  }),
  /** Yes or no, stored by OAuth as true or false. */
  yesNo: (id: string, label: string): TFilterColumn => ({
    id,
    type: "option",
    label,
    options: [{ value: "yes", label: "common.yes" }, { value: "no", label: "common.no" }],
  }),
  /** Active or inactive, which most lists share. */
  status: (): TFilterColumn => ({
    id: "status",
    type: "option",
    label: "fields.status",
    options: [{ value: "active", label: "filters.active" }, { value: "inactive", label: "filters.inactive" }],
  }),
  /** A record from another management list, searched as the person types. */
  record: (id: string, label: string, type: "option" | "multiOption", path: string, labelKey = "name"): TFilterColumn => ({
    id,
    type,
    label,
    remote: { path, labelKey },
  }),
};

export type { TOption };
