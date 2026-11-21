import { useId } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon, FolderAddIcon, InformationCircleIcon } from "@hugeicons/core-free-icons";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import { CONDITION_FIELDS, CONDITION_ROOTS } from "@/core/config/permissions";
import { CONDITION_OPERATORS } from "@/core/lib/validation";
import type { TPolicyValues } from "@/core/types";

type TRule = TPolicyValues["condition"]["rules"][number];
const NEW_RULE: TRule = { field: "account.type", operator: "$eq", value: "", ref: false, negate: false };
type TRulePath = `condition.rules.${number}` | `condition.groups.${number}.rules.${number}`;

/**
 * When a policy applies: rules over the signed in person, their account and
 * membership, the session and the request, joined by all or any, each one
 * negated if needed, and one level of grouped rules. Empty means always.
 */
export function ConditionBuilder() {
  const { t } = useTranslation();
  const { control } = useFormContext<TPolicyValues>();
  const rules = useFieldArray({ control, name: "condition.rules" });
  const groups = useFieldArray({ control, name: "condition.groups" });
  const raw = useWatch<TPolicyValues, "condition.raw">({ name: "condition.raw" });

  if (raw) {
    return (
      <Alert>
        <HugeiconsIcon icon={InformationCircleIcon} />
        <AlertDescription>{t("conditions.tooDeep")}</AlertDescription>
      </Alert>
    );
  }

  const empty = rules.fields.length === 0 && groups.fields.length === 0;
  return (
    <div className="flex flex-col gap-3">
      {empty
        ? <p className="text-sm text-muted-foreground">{t("conditions.always")}</p>
        : <ModeSelect name="condition.mode" />}
      {rules.fields.map((rule, index) => (
        <RuleRow key={rule.id} path={`condition.rules.${index}`} onRemove={() => rules.remove(index)} />
      ))}
      {groups.fields.map((group, index) => (
        <GroupCard key={group.id} index={index} onRemove={() => groups.remove(index)} />
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => rules.append(NEW_RULE)}>
          <HugeiconsIcon icon={Add01Icon} />
          {t("conditions.addRule")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => groups.append({ mode: "or", negate: false, rules: [NEW_RULE] })}>
          <HugeiconsIcon icon={FolderAddIcon} />
          {t("conditions.addGroup")}
        </Button>
      </div>
    </div>
  );
}

function ModeSelect({ name }: { name: "condition.mode" | `condition.groups.${number}.mode` }) {
  const { t } = useTranslation();
  const { control } = useFormContext<TPolicyValues>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
          <SelectTrigger size="sm" className="w-fit" aria-label={t("conditions.mode")}>
            <SelectValue>{(value: string) => t(`conditions.modes.${value}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">{t("conditions.modes.and")}</SelectItem>
            <SelectItem value="or">{t("conditions.modes.or")}</SelectItem>
          </SelectContent>
        </Select>
      )}
    />
  );
}

/** A bordered set of rules joined by its own all or any, which may be negated. */
function GroupCard({ index, onRemove }: { index: number; onRemove: () => void }) {
  const { t } = useTranslation();
  const { control } = useFormContext<TPolicyValues>();
  const rules = useFieldArray({ control, name: `condition.groups.${index}.rules` });
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed p-3">
      <div className="flex flex-wrap items-center gap-2">
        <NegateToggle name={`condition.groups.${index}.negate`} />
        <ModeSelect name={`condition.groups.${index}.mode`} />
        <Button type="button" variant="ghost" size="icon-sm" className="ms-auto" aria-label={t("conditions.removeGroup")} onClick={onRemove}>
          <HugeiconsIcon icon={Delete02Icon} />
        </Button>
      </div>
      {rules.fields.map((rule, ruleIndex) => (
        <RuleRow
          key={rule.id}
          path={`condition.groups.${index}.rules.${ruleIndex}`}
          onRemove={() => (rules.fields.length > 1 ? rules.remove(ruleIndex) : onRemove())}
        />
      ))}
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => rules.append(NEW_RULE)}>
        <HugeiconsIcon icon={Add01Icon} />
        {t("conditions.addRule")}
      </Button>
    </div>
  );
}

function NegateToggle({ name }: { name: `${TRulePath}.negate` | `condition.groups.${number}.negate` }) {
  const { t } = useTranslation();
  const { control } = useFormContext<TPolicyValues>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Toggle
          variant="outline"
          size="sm"
          pressed={Boolean(field.value)}
          onPressedChange={field.onChange}
          aria-label={t("conditions.notLabel")}
          className="data-pressed:bg-destructive/10 data-pressed:text-destructive"
        >
          {t("conditions.not")}
        </Toggle>
      )}
    />
  );
}

/** One comparison: which field, how, and against a value or another field. */
function RuleRow({ path, onRemove }: { path: TRulePath; onRemove: () => void }) {
  const { t } = useTranslation();
  const { control, register, formState } = useFormContext<TPolicyValues>();
  const operator = useWatch<TPolicyValues, `${TRulePath}.operator`>({ name: `${path}.operator` });
  const isRef = useWatch<TPolicyValues, `${TRulePath}.ref`>({ name: `${path}.ref` });
  const fieldPath = useWatch<TPolicyValues, `${TRulePath}.field`>({ name: `${path}.field` });
  const currentRoot = String(fieldPath ?? "").split(".")[0];
  const suggestionsId = useId();
  const error = path.split(".").reduce<unknown>(
    (node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined),
    formState.errors,
  ) as { field?: { message?: string }; value?: { message?: string } } | undefined;

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <NegateToggle name={`${path}.negate`} />
        <Controller
          control={control}
          name={`${path}.field`}
          render={({ field }) => {
            const [root, ...rest] = String(field.value ?? "").split(".");
            const suggestions = CONDITION_FIELDS[root as keyof typeof CONDITION_FIELDS] ?? [];
            return (
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <Select value={root} onValueChange={(value) => field.onChange(`${value}.${rest.join(".")}`)}>
                  <SelectTrigger size="sm" className="w-32 shrink-0" aria-label={t("conditions.root")}>
                    <SelectValue>{(value: string) => t(`conditions.roots.${value}`)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="min-w-72">
                    {CONDITION_ROOTS.map((option) => (
                      <SelectItem key={option} value={option} className="items-start">
                        <span className="flex flex-col gap-0.5">
                          <span>{t(`conditions.roots.${option}`)}</span>
                          <span className="text-xs text-muted-foreground">{t(`conditions.rootHints.${option}`)}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  dir="ltr"
                  className="h-8 min-w-0 flex-1 font-mono text-xs"
                  value={rest.join(".")}
                  onChange={(event) => field.onChange(`${root}.${event.target.value}`)}
                  placeholder={suggestions[0] ?? "attributes.region"}
                  aria-label={t("conditions.field")}
                  aria-invalid={Boolean(error?.field)}
                  list={suggestionsId}
                />
                <datalist id={suggestionsId}>
                  {suggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}
                </datalist>
              </div>
            );
          }}
        />
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t("conditions.removeRule")} onClick={onRemove}>
          <HugeiconsIcon icon={Delete02Icon} />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Controller
          control={control}
          name={`${path}.operator`}
          render={({ field }) => (
            <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
              <SelectTrigger size="sm" className="w-44" aria-label={t("conditions.operator")}>
                <SelectValue>{(value: string) => t(`conditions.operators.${value.slice(1)}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPERATORS.map((option) => (
                  <SelectItem key={option} value={option}>{t(`conditions.operators.${option.slice(1)}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {operator === "$exists"
          ? (
            <Controller
              control={control}
              name={`${path}.value`}
              render={({ field }) => (
                <Select value={field.value === "false" ? "false" : "true"} onValueChange={(value) => field.onChange(value)}>
                  <SelectTrigger size="sm" className="w-36" aria-label={t("conditions.value")}>
                    <SelectValue>{(value: string) => t(value === "true" ? "conditions.isSet" : "conditions.isNotSet")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t("conditions.isSet")}</SelectItem>
                    <SelectItem value="false">{t("conditions.isNotSet")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          )
          : (
            <>
              <Input
                dir="ltr"
                className="h-8 min-w-32 flex-1 text-sm"
                {...register(`${path}.value`)}
                placeholder={t(isRef
                  ? "conditions.refPlaceholder"
                  : operator === "$in" || operator === "$nin"
                  ? "conditions.listPlaceholder"
                  : "conditions.valuePlaceholder")}
                aria-label={t("conditions.value")}
                aria-invalid={Boolean(error?.value)}
              />
              <Controller
                control={control}
                name={`${path}.ref`}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch size="sm" checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                    {t("conditions.compareField")}
                  </label>
                )}
              />
            </>
          )}
      </div>
      {currentRoot && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <HugeiconsIcon icon={InformationCircleIcon} className="mt-px size-3.5 shrink-0" />
          {t(`conditions.rootHelp.${currentRoot}`)}
        </p>
      )}
      <Field data-invalid={Boolean(error?.field || error?.value)} className="gap-0">
        <FieldError
          errors={[error?.field, error?.value]
            .filter((entry): entry is { message: string } => Boolean(entry?.message))
            .map((entry) => ({ message: t(entry.message) }))}
        />
      </Field>
    </div>
  );
}
