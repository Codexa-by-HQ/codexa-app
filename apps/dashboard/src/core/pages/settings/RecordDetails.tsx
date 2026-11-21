import type React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit02Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { CopyField } from "@/core/components/CopyField";
import { DetailList } from "@/core/components/DetailList";
import { IconTile } from "@/core/components/IconTile";
import { ListValue } from "@/core/components/ListValue";
import { confirm } from "@/core/contexts/Confirm";
import { useSignedInSession } from "@/core/contexts/Session";
import { sheet, SheetActions } from "@/core/contexts/Sheet";
import { useAsyncAction } from "@/core/hooks/useAsyncAction";
import i18n from "@/core/i18n";
import { api } from "@/core/lib/api";
import { withTokens } from "@/core/lib/loaders";
import { columnValue, failureMessage } from "@/core/lib/utils";
import type { TFormOpener, TListColumn, TListItem, TResourceAction } from "@/core/types";

/**
 * Asks first, then sends the action for one record. A refusal is shown as a
 * toast with OAuth's reason, and the dialog stays open to retry or cancel.
 */
export function runRecordAction(action: TResourceAction, item: TListItem): Promise<boolean> {
  const t = i18n.t.bind(i18n);
  const strings = `settings.actions.${action.key}`;
  return confirm({
    title: t(`${strings}.title`),
    description: t(`${strings}.description`),
    confirmLabel: t(`${strings}.label`),
    destructive: action.destructive,
    onConfirm: async () => {
      try {
        await withTokens((tokens) => api.write.execute(tokens, "POST", action.path, { id: item._id }));
        toast.success(t(`${strings}.done`));
      } catch (error) {
        toast.error(failureMessage(error, t));
        throw error;
      }
    },
  });
}

/**
 * The top of every details sheet: the record's icon, name, key and state
 * chips at a glance.
 */
export function RecordSummary({
  icon,
  title,
  subtitle,
  states,
}: {
  icon?: IconSvgElement;
  title: React.ReactNode;
  subtitle?: string;
  states?: React.ReactNode;
}) {
  return (
    <section className="flex items-center gap-4 rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-4">
      {icon && <IconTile icon={icon} size="lg" />}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-base font-semibold">{title}</p>
        {subtitle && <code dir="ltr" className="truncate text-start font-mono text-xs text-muted-foreground">{subtitle}</code>}
        {states && <div className="mt-1 flex flex-wrap gap-1.5">{states}</div>}
      </div>
    </section>
  );
}

/** Fields most records carry that a list rarely shows, for the Activity card. */
const ACTIVITY_FIELDS = [
  { key: "createdAt", label: "fields.created" },
  { key: "updatedAt", label: "fields.updated" },
  { key: "expiresAt", label: "fields.expires" },
  { key: "lastActiveAt", label: "fields.lastActive" },
] as const;

/**
 * One record in the sheet. A summary at the top gives its name, key and
 * state at a glance, then its values in Details, its dates in Activity and
 * its identifiers, each copyable, in Identifiers. Edit and the actions the
 * session may use stay at the bottom.
 */
export function RecordDetails({
  item,
  columns,
  icon,
  sections = [],
  edit,
  actions = [],
  onChanged,
}: {
  item: TListItem;
  columns: TListColumn[];
  icon?: IconSvgElement;
  /** Extra sections the resource adds, after Details. */
  sections?: { title: string; rows: { key: string; label: string; value: React.ReactNode }[] }[];
  edit?: { capability: string; open: TFormOpener };
  actions?: TResourceAction[];
  onChanged: (message?: string) => void;
}) {
  const { t } = useTranslation();
  const { capabilities } = useSignedInSession();
  const can = (capability: string) => capabilities.includes(capability);
  const available = actions.filter((action) => can(action.capability) && (action.when?.(item) ?? true));
  const [openEdit, opening] = useAsyncAction(
    async () => sheet.open(await edit!.open(onChanged, item)),
    { error: t("form.unexpected") },
  );

  const act = async (action: TResourceAction) => {
    if (await runRecordAction(action, item)) {
      sheet.close();
      onChanged();
    }
  };

  const [primary, ...rest] = columns;
  const isState = (column: TListColumn) => column.kind === "boolean" || column.kind === "badge";
  const isIdentifier = (column: TListColumn) => column.kind === "mono";
  const isDate = (column: TListColumn) => column.kind === "date";
  const subtitle = rest.find(isIdentifier);
  const states = rest.filter(isState);
  const details = rest.filter((column) => !isState(column) && !isIdentifier(column) && !isDate(column));
  const dates = [
    ...rest.filter(isDate),
    ...ACTIVITY_FIELDS.filter((field) => !columns.some((column) => column.key === field.key) && item[field.key]),
  ];
  const identifiers = rest.filter(isIdentifier).filter((column) => column !== subtitle);
  const row = (column: { key: string; label: string; kind?: TListColumn["kind"] }) => ({
    key: column.key,
    label: t(column.label),
    value: <ListValue value={columnValue(item, column)} kind={column.kind ?? "date"} />,
  });

  return (
    <>
      <RecordSummary
        icon={icon}
        title={primary ? <ListValue value={columnValue(item, primary)} kind={primary.kind} /> : item._id}
        subtitle={subtitle ? String(columnValue(item, subtitle) ?? "") : undefined}
        states={states.length > 0 && states.map((column) => (
          <span key={column.key} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {t(column.label)}
            <ListValue value={columnValue(item, column)} kind={column.kind} />
          </span>
        ))}
      />
      {details.length > 0 && <DetailList title={t("details.details")} rows={details.map(row)} />}
      {sections.map((section) => <DetailList key={section.title} title={section.title} rows={section.rows} />)}
      {dates.length > 0 && <DetailList title={t("details.activity")} rows={dates.map(row)} />}
      <DetailList
        title={t("details.identifiers")}
        rows={[
          ...identifiers.map((column) => ({
            key: column.key,
            label: t(column.label),
            value: <CopyField label={t(column.label)} value={String(columnValue(item, column) ?? "")} />,
          })),
          { key: "_id", label: t("fields.id"), value: <CopyField label={t("fields.id")} value={item._id} /> },
        ]}
      />
      {(available.length > 0 || (edit && can(edit.capability))) && (
        <SheetActions>
          {available.map((action) => (
            <Button key={action.key} variant={action.destructive ? "destructive" : "outline"} onClick={() => act(action)}>
              {t(`settings.actions.${action.key}.label`)}
            </Button>
          ))}
          {edit && can(edit.capability) && (
            <Button onClick={() => openEdit()} disabled={opening}>
              <HugeiconsIcon icon={PencilEdit02Icon} />
              {t("forms.edit")}
            </Button>
          )}
        </SheetActions>
      )}
    </>
  );
}
