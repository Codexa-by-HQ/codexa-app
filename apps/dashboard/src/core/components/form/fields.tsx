import { type ReactNode, useId, useState } from "react";
import {
  Controller,
  type ControllerFieldState,
  type FieldPath,
  type FieldValues,
  useFormContext,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/core/lib/utils";
import type { TOption } from "@/core/types";

/**
 * Form fields bound to the surrounding react-hook-form form. Every field has
 * a label, a translated placeholder and its error under it. Zod messages are
 * translation keys, translated here.
 */

type TBaseProps<T extends FieldValues> = {
  name: FieldPath<T>;
  label: string;
  description?: ReactNode;
  optional?: boolean;
};

function Frame({
  id,
  label,
  description,
  optional,
  state,
  children,
}: {
  id: string;
  label: string;
  description?: ReactNode;
  optional?: boolean;
  state: ControllerFieldState;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Field data-invalid={state.invalid} className="gap-2">
      <FieldLabel htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-muted-foreground">{t("form.optional")}</span>}
      </FieldLabel>
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={state.error?.message ? [{ message: t(state.error.message) }] : undefined} />
    </Field>
  );
}

export function TextField<T extends FieldValues>({
  name,
  label,
  description,
  optional,
  placeholder,
  type = "text",
  ltr,
  autoFocus,
}: TBaseProps<T> & { placeholder: string; type?: "text" | "email" | "url" | "number" | "datetime-local"; ltr?: boolean; autoFocus?: boolean }) {
  const id = useId();
  const { control } = useFormContext<T>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Frame id={id} label={label} description={description} optional={optional} state={fieldState}>
          <Input
            {...field}
            value={field.value ?? ""}
            id={id}
            type={type}
            placeholder={placeholder}
            autoFocus={autoFocus}
            dir={ltr ? "ltr" : undefined}
            className={cn(ltr && "text-start")}
            aria-invalid={fieldState.invalid}
          />
        </Frame>
      )}
    />
  );
}

/**
 * A hex colour: a swatch that opens the system picker, beside the value as
 * text. Left empty, the app's own colour stays.
 */
export function ColorField<T extends FieldValues>({ name, label }: TBaseProps<T>) {
  const id = useId();
  const { control } = useFormContext<T>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Frame id={id} label={label} state={fieldState}>
          <InputGroup>
            <InputGroupAddon>
              <Input
                type="color"
                tabIndex={-1}
                aria-hidden="true"
                value={/^#[0-9a-f]{6}$/i.test(field.value ?? "") ? field.value : "#000000"}
                onChange={(event) => field.onChange(event.target.value)}
                className="size-6 cursor-pointer rounded-md border-0 bg-transparent p-0 shadow-none"
              />
            </InputGroupAddon>
            <InputGroupInput
              {...field}
              value={field.value ?? ""}
              id={id}
              placeholder="#16a34a"
              dir="ltr"
              className="text-start font-mono"
              aria-invalid={fieldState.invalid}
            />
          </InputGroup>
        </Frame>
      )}
    />
  );
}

export function TextAreaField<T extends FieldValues>({
  name,
  label,
  description,
  optional,
  placeholder,
  ltr,
  rows = 3,
}: TBaseProps<T> & { placeholder: string; ltr?: boolean; rows?: number }) {
  const id = useId();
  const { control } = useFormContext<T>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Frame id={id} label={label} description={description} optional={optional} state={fieldState}>
          <Textarea
            {...field}
            value={field.value ?? ""}
            id={id}
            rows={rows}
            placeholder={placeholder}
            dir={ltr ? "ltr" : undefined}
            className={cn(ltr && "text-start font-mono text-xs")}
            aria-invalid={fieldState.invalid}
          />
        </Frame>
      )}
    />
  );
}

/** A yes or no setting, laid out as a row with its explanation. */
export function SwitchField<T extends FieldValues>({ name, label, description }: TBaseProps<T>) {
  const id = useId();
  const { control } = useFormContext<T>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field orientation="horizontal" className="rounded-xl border bg-card p-4">
          <FieldContent>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {description && <FieldDescription>{description}</FieldDescription>}
          </FieldContent>
          <Switch id={id} checked={Boolean(field.value)} onCheckedChange={field.onChange} />
        </Field>
      )}
    />
  );
}

export function SelectField<T extends FieldValues>({
  name,
  label,
  description,
  optional,
  placeholder,
  options,
}: TBaseProps<T> & { placeholder: string; options: TOption[] }) {
  const id = useId();
  const { control } = useFormContext<T>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Frame id={id} label={label} description={description} optional={optional} state={fieldState}>
          <Select items={options} value={field.value ?? null} onValueChange={field.onChange}>
            <SelectTrigger id={id} className="w-full" aria-invalid={fieldState.invalid} onBlur={field.onBlur}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Frame>
      )}
    />
  );
}

/**
 * Several values shown as removable chips, with type to filter. With
 * `creatable`, typing a value that `creatable` accepts offers to add it, so
 * the list holds suggestions rather than every allowed value.
 */
export function ChipsField<T extends FieldValues>({
  name,
  label,
  description,
  optional,
  placeholder,
  options,
  creatable,
}: TBaseProps<T> & { placeholder: string; options: TOption[]; creatable?: RegExp }) {
  const { t } = useTranslation();
  const id = useId();
  const anchor = useComboboxAnchor();
  const { control } = useFormContext<T>();
  const [typed, setTyped] = useState("");
  const labels = new Map(options.map((option) => [option.value, option.label]));
  const known = options.map((option) => option.value);
  const draft = typed.trim();
  const offer = creatable && draft && !labels.has(draft) && creatable.test(draft) ? draft : null;
  const rejected = Boolean(creatable && draft && !labels.has(draft) && !creatable.test(draft));
  const matches = (value: string) => (labels.get(value) ?? value).toLowerCase().includes(draft.toLowerCase());

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selected = (field.value as string[] | undefined) ?? [];
        // Values already chosen stay listed, so a created one can be removed again.
        const items = [...new Set([...(offer ? [offer] : []), ...selected, ...known])];
        const labelOf = (value: string) => labels.get(value) ?? value;
        return (
          <Frame id={id} label={label} description={description} optional={optional} state={fieldState}>
            <Combobox
              multiple
              // The first match, or the "Add" offer, is ready for Enter.
              autoHighlight
              items={items}
              value={selected}
              onValueChange={(value) => {
                field.onChange(value);
                setTyped("");
              }}
              inputValue={typed}
              onInputValueChange={setTyped}
              itemToStringLabel={labelOf}
            >
              <ComboboxChips ref={anchor} aria-invalid={fieldState.invalid}>
                <ComboboxValue>
                  {(chosen: string[]) =>
                    chosen.map((value) => (
                      <ComboboxChip key={value} removeLabel={t("form.remove", { value: labelOf(value) })}>
                        {labelOf(value)}
                      </ComboboxChip>
                    ))}
                </ComboboxValue>
                <ComboboxChipsInput
                  id={id}
                  placeholder={placeholder}
                  onBlur={field.onBlur}
                  onKeyDown={(event) => {
                    // Enter while typing adds a value. It never submits the form,
                    // even when the text matches nothing that can be added.
                    if (event.key === "Enter" && draft && !offer && !items.some(matches)) event.preventDefault();
                  }}
                />
              </ComboboxChips>
              <ComboboxContent anchor={anchor}>
                <ComboboxEmpty>
                  {t(rejected ? "form.cannotAdd" : creatable ? "form.noMatchCreate" : "form.noOptions")}
                </ComboboxEmpty>
                <ComboboxList>
                  {(value: string) => (
                    <ComboboxItem key={value} value={value}>
                      {value === offer
                        ? (
                          <span className="flex w-full items-center gap-2">
                            <HugeiconsIcon icon={PlusSignIcon} className="size-4 text-primary" />
                            {t("form.add", { value })}
                            <kbd className="ms-auto rounded border px-1.5 text-xs text-muted-foreground">Enter</kbd>
                          </span>
                        )
                        : labelOf(value)}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Frame>
        );
      }}
    />
  );
}
