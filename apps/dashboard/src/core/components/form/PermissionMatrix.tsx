import { useId, useState } from "react";
import { Controller, type FieldValues, type Path, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  MinusSignCircleIcon,
  PlusSignIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PERMISSION_PATTERN } from "@/core/lib/validation";
import { cn, groupPermissions, type TPermissionGroup } from "@/core/lib/utils";
import type { TCatalogItem } from "@/core/types";

type TEffect = "allow" | "deny";
type TPermissions = Record<string, TEffect>;

/**
 * Every permission in OAuth's catalog, grouped by what it acts on. Each one is
 * allowed, denied or left out with one tap, a whole resource at once with its
 * own switch, and a permission the catalog does not know is typed in below.
 */
export function PermissionMatrix<T extends FieldValues>({
  name,
  label,
  description,
  permissions,
}: {
  name: Path<T>;
  label: string;
  description?: string;
  permissions: readonly TCatalogItem[];
}) {
  const { t } = useTranslation();
  const id = useId();
  const { control } = useFormContext<T>();
  const [query, setQuery] = useState("");
  const all = groupPermissions(permissions);
  const known = new Set(["*", ...all.flatMap((group) => [group.resource, ...group.actions.map(({ action }) => `${group.resource}:${action}`)])]);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const value = (field.value ?? {}) as TPermissions;
        const set = (scope: string, effect: TEffect | undefined) => {
          const next = { ...value };
          if (effect) next[scope] = effect;
          else delete next[scope];
          field.onChange(next);
        };
        const needle = query.trim().toLowerCase();
        const groups = all
          .map((group) => ({
            ...group,
            actions: group.actions.filter(({ action, description }) =>
              !needle || `${group.resource}:${action}`.includes(needle) ||
              (description ?? "").toLowerCase().includes(needle) ||
              t(`permissions.resources.${group.resource}`, { defaultValue: group.resource }).toLowerCase().includes(needle)
            ),
          }))
          .filter((group) => group.actions.length > 0);
        const custom = Object.keys(value).filter((scope) => !known.has(scope));

        return (
          <Field data-invalid={fieldState.invalid} className="gap-2">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {description && <FieldDescription>{description}</FieldDescription>}

            <InputGroup>
              <InputGroupAddon><HugeiconsIcon icon={Search01Icon} /></InputGroupAddon>
              <InputGroupInput
                id={id}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("permissions.search")}
                aria-label={t("permissions.search")}
              />
            </InputGroup>

            <div className="flex flex-col gap-2">
              <PermissionRow
                title={t("permissions.everything")}
                hint={t("permissions.everythingHint")}
                scope="*"
                effect={value["*"]}
                onChange={(effect) => set("*", effect)}
                strong
              />
              {groups.map((group) => (
                <ResourceGroup
                  key={group.resource}
                  resource={group.resource}
                  actions={group.actions}
                  value={value}
                  set={set}
                  open={needle.length > 0}
                />
              ))}
              {custom.length > 0 && (
                <div className="flex flex-col divide-y rounded-xl border">
                  <p className="px-3 py-2 text-xs font-medium text-muted-foreground">{t("permissions.custom")}</p>
                  {custom.map((scope) => (
                    <PermissionRow
                      key={scope}
                      title={scope}
                      scope={scope}
                      effect={value[scope]}
                      onChange={(effect) => set(scope, effect)}
                      removable
                    />
                  ))}
                </div>
              )}
              <CustomPermission onAdd={(scope) => set(scope, value[scope] ?? "allow")} />
            </div>
            <FieldError errors={fieldState.error?.message ? [{ message: t(fieldState.error.message) }] : undefined} />
          </Field>
        );
      }}
    />
  );
}

/** One resource's actions, with a switch for the whole resource in its header. */
function ResourceGroup({
  resource,
  actions,
  value,
  set,
  open,
}: {
  resource: string;
  actions: TPermissionGroup["actions"];
  value: TPermissions;
  set: (scope: string, effect: TEffect | undefined) => void;
  open: boolean;
}) {
  const { t } = useTranslation();
  const scopes = actions.map(({ action }) => `${resource}:${action}`);
  const allowed = scopes.filter((scope) => value[scope] === "allow").length;
  const denied = scopes.filter((scope) => value[scope] === "deny").length;
  const title = t(`permissions.resources.${resource}`, { defaultValue: resource });

  return (
    <Collapsible key={String(open)} defaultOpen={open} className="rounded-xl border">
      <div className="flex items-center gap-2 px-3 py-2">
        <CollapsibleTrigger className="group/trigger flex min-w-0 flex-1 items-center gap-2 text-start text-sm font-medium">
          <HugeiconsIcon icon={ArrowDown01Icon} className="size-4 shrink-0 transition-transform ltr:-rotate-90 rtl:rotate-90 group-data-[panel-open]/trigger:rotate-0!" />
          <span className="truncate">{title}</span>
          {allowed > 0 && <Badge variant="secondary">{t("permissions.allowedCount", { count: allowed })}</Badge>}
          {denied > 0 && <Badge variant="destructive">{t("permissions.deniedCount", { count: denied })}</Badge>}
        </CollapsibleTrigger>
        <EffectToggle
          label={t("permissions.wholeResource", { resource: title })}
          effect={value[resource]}
          onChange={(effect) => set(resource, effect)}
        />
      </div>
      <CollapsibleContent className="flex flex-col divide-y border-t">
        {actions.map(({ action, description }) => (
          <PermissionRow
            key={action}
            title={t(`permissions.actions.${action}`, { defaultValue: description ?? action })}
            scope={`${resource}:${action}`}
            effect={value[`${resource}:${action}`]}
            onChange={(effect) => set(`${resource}:${action}`, effect)}
            covered={value[resource]}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function PermissionRow({
  title,
  hint,
  scope,
  effect,
  onChange,
  covered,
  strong,
  removable,
}: {
  title: string;
  hint?: string;
  scope: string;
  effect?: TEffect;
  onChange: (effect: TEffect | undefined) => void;
  /** The whole resource's own setting, which this row inherits when it has none. */
  covered?: TEffect;
  strong?: boolean;
  removable?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn("flex items-center gap-3 px-3 py-2", strong && "rounded-xl border bg-muted/40")}>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-sm", strong && "font-medium")}>{title}</span>
        <code dir="ltr" className="truncate text-start font-mono text-xs text-muted-foreground">
          {hint ?? scope}
          {!effect && covered && ` · ${t(`permissions.inherited.${covered}`)}`}
        </code>
      </div>
      <EffectToggle label={title} effect={effect} onChange={onChange} />
      {removable && (
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t("form.remove", { value: scope })} onClick={() => onChange(undefined)}>
          <HugeiconsIcon icon={Cancel01Icon} />
        </Button>
      )}
    </div>
  );
}

/** Allow, deny, or neither. Pressing the chosen one again clears it. */
function EffectToggle({ label, effect, onChange }: { label: string; effect?: TEffect; onChange: (effect: TEffect | undefined) => void }) {
  const { t } = useTranslation();
  return (
    <ToggleGroup
      value={effect ? [effect] : []}
      onValueChange={(next) => onChange(next[0] as TEffect | undefined)}
      variant="outline"
      size="sm"
      aria-label={label}
      className="shrink-0"
    >
      <ToggleGroupItem
        value="allow"
        aria-label={t("permissions.allow")}
        className="gap-1 px-2 data-pressed:bg-primary data-pressed:text-primary-foreground"
      >
        <HugeiconsIcon icon={CheckmarkCircle02Icon} />
        <span className="hidden sm:inline">{t("permissions.allow")}</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="deny"
        aria-label={t("permissions.deny")}
        className="gap-1 px-2 data-pressed:bg-destructive data-pressed:text-white"
      >
        <HugeiconsIcon icon={MinusSignCircleIcon} />
        <span className="hidden sm:inline">{t("permissions.deny")}</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

/** A permission the list does not offer, such as one of your product's. Enter adds it. */
function CustomPermission({ onAdd }: { onAdd: (scope: string) => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const scope = text.trim();
  const valid = PERMISSION_PATTERN.test(scope);
  const add = () => {
    if (!valid) return;
    onAdd(scope);
    setText("");
  };
  return (
    <div className="flex flex-col gap-1">
      <InputGroup>
        <InputGroupInput
          value={text}
          dir="ltr"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Enter adds the permission and never submits the policy.
            if (event.key !== "Enter") return;
            event.preventDefault();
            add();
          }}
          placeholder={t("permissions.customPlaceholder")}
          aria-label={t("permissions.addCustom")}
          aria-invalid={scope.length > 0 && !valid}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="button" onClick={add} disabled={!valid}>
            <HugeiconsIcon icon={PlusSignIcon} />
            {t("permissions.add")}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {scope.length > 0 && !valid && <p className="text-xs text-destructive">{t("form.cannotAdd")}</p>}
    </div>
  );
}
