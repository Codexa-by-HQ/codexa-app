import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useLoaderData, useNavigate, useNavigation, useRevalidator } from "react-router";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  GridViewIcon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  Search01Icon,
  TableIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState } from "@/core/components/EmptyState";
import { Filters } from "@/core/components/filters/Filters";
import { useListParams } from "@/core/hooks/useListParams";
import { ListValue } from "@/core/components/ListValue";
import { PageHeader } from "@/core/components/PageHeader";
import { useSignedInSession } from "@/core/contexts/Session";
import { sheet } from "@/core/contexts/Sheet";
import { useAsyncAction } from "@/core/hooks/useAsyncAction";
import { LIST_PAGE_SIZE, type listLoader } from "@/core/lib/loaders";
import { cn, columnValue, preferences } from "@/core/lib/utils";
import { RESOURCE_FORMS } from "@/core/pages/settings/forms";
import { RecordDetails, runRecordAction } from "@/core/pages/settings/RecordDetails";
import type { TFormOpener, TListItem, TListResource, TResourceAction } from "@/core/types";
import { useIsMobile } from "@/hooks/use-mobile";

type TView = "grid" | "table";

/** The list layout, a per browser convenience. */
const VIEW_KEY = "codexa-app:list-view";

const readView = (): TView => (preferences.get(VIEW_KEY) === "grid" ? "grid" : "table");

/**
 * One Settings list, such as users or roles. Its filters, text ones included,
 * sit behind the Filter button and run on the server, and the rows show as a
 * table or a grid of cards. Every row has an actions menu, and opening one
 * shows its details in the sheet, or its own page when the list has one.
 */
function ResourceList() {
  const { t } = useTranslation();
  const { resource, page, filters, labels } = useLoaderData<ReturnType<typeof listLoader>>();
  const listParams = useListParams();
  const loading = useNavigation().state === "loading";
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { capabilities } = useSignedInSession();
  const can = (capability?: string) => Boolean(capability && capabilities.includes(capability));
  const forms = RESOURCE_FORMS[resource.key] ?? {};
  const [view, setView] = React.useState<TView>(readView);
  const pageNumber = Math.floor(page.offset / LIST_PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(page.total / LIST_PAGE_SIZE));
  const filtered = filters.length > 0;

  const changed = (message?: string) => {
    if (message) toast.success(message);
    sheet.close();
    void revalidator.revalidate();
  };

  const [openCreate, creating] = useAsyncAction(
    async () => sheet.open(await forms.create!(changed)),
    { error: t("form.unexpected") },
  );
  const [openForm] = useAsyncAction(
    async (open: TFormOpener, item: TListItem) => sheet.open(await open(changed, item)),
    { error: t("form.unexpected") },
  );
  const [openEdit] = useAsyncAction(
    async (item: TListItem) => sheet.open(await forms.edit!(changed, item)),
    { error: t("form.unexpected") },
  );

  const actions = {
    open: (item: TListItem) => {
      if (resource.href) return navigate(resource.href(item), { viewTransition: true });
      sheet.open({
        // The summary inside names the record, so the header names its kind.
        title: t(`${resource.strings}.title`),
        description: t("details.description"),
        icon: resource.icon,
        body: (
          <RecordDetails
            item={item}
            columns={resource.columns}
            icon={resource.icon}
            sections={resource.describe?.(item)}
            edit={forms.edit && resource.edit && (resource.editable?.(item) ?? true)
              ? { capability: resource.edit, open: forms.edit }
              : undefined}
            actions={resource.actions}
            onChanged={changed}
          />
        ),
      });
    },
    edit: forms.edit && can(resource.edit) ? (item: TListItem) => openEdit(item) : undefined,
    form: (open: TFormOpener, item: TListItem) => openForm(open, item),
    run: async (action: TResourceAction, item: TListItem) => {
      if (await runRecordAction(action, item)) changed();
    },
  };

  const chooseView = (next: TView) => {
    setView(next);
    preferences.set(VIEW_KEY, next);
  };

  const pageLink = listParams.pageHref;

  const shownView = isMobile ? "grid" : view;

  return (
    <>
      <PageHeader
        title={t(`${resource.strings}.title`)}
        description={t(`${resource.strings}.description`)}
        actions={forms.create && can(resource.create) && (
          <Button onClick={() => openCreate()} disabled={creating}>
            {creating ? <Spinner /> : <HugeiconsIcon icon={Add01Icon} />}
            {t(`${resource.strings}.create`)}
          </Button>
        )}
      />

      <div className="flex flex-wrap items-center gap-2">
        {resource.filters && resource.filters.length > 0 && (
          <Filters columns={resource.filters} value={filters} labels={labels} onChange={listParams.setFilters} />
        )}
        <ToggleGroup
          value={[view]}
          onValueChange={(value) => value[0] && chooseView(value[0] as TView)}
          variant="outline"
          className="ms-auto hidden md:flex"
          aria-label={t("list.view")}
        >
          <ToggleGroupItem value="grid" aria-label={t("list.grid")} className="data-pressed:bg-accent data-pressed:text-foreground">
            <HugeiconsIcon icon={GridViewIcon} />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label={t("list.table")} className="data-pressed:bg-accent data-pressed:text-foreground">
            <HugeiconsIcon icon={TableIcon} />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {page.items.length === 0
        ? <EmptyState icon={Search01Icon} title={t(filtered ? "list.noMatches" : `${resource.strings}.empty`)} />
        : (
          <div className={cn("flex flex-col gap-4 transition-opacity", loading && "opacity-60")} aria-busy={loading}>
            {shownView === "table"
              ? <ResourceTable resource={resource} items={page.items} actions={actions} />
              : <ResourceGrid resource={resource} items={page.items} actions={actions} />}

            <nav className="flex items-center justify-between gap-3 text-sm text-muted-foreground" aria-label={t("list.paging")}>
              <span>{t("list.summary", { page: pageNumber, pages: pageCount, total: page.total })}</span>
              <div className="flex gap-2">
                <PageLink to={pageLink(pageNumber - 1)} disabled={pageNumber <= 1} label={t("list.previous")} icon={ArrowLeft01Icon} />
                <PageLink to={pageLink(pageNumber + 1)} disabled={pageNumber >= pageCount} label={t("list.next")} icon={ArrowRight01Icon} />
              </div>
            </nav>
          </div>
        )}
    </>
  );
}

type TRowActions = {
  open: (item: TListItem) => void;
  edit?: (item: TListItem) => void;
  run: (action: TResourceAction, item: TListItem) => void;
  form: (open: TFormOpener, item: TListItem) => void;
};

const titleOf = (resource: TListResource, item: TListItem) =>
  String(columnValue(item, resource.columns[0]) ?? item._id);

function ResourceTable({ resource, items, actions }: { resource: TListResource; items: TListItem[]; actions: TRowActions }) {
  const { t } = useTranslation();
  return (
    <Card className="overflow-hidden py-0">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            {resource.columns.map((column) => <TableHead key={column.key}>{t(column.label)}</TableHead>)}
            <TableHead className="w-14"><span className="sr-only">{t("list.actions")}</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item._id}
              tabIndex={0}
              className="cursor-pointer"
              onClick={() => actions.open(item)}
              onKeyDown={(event) => event.key === "Enter" && actions.open(item)}
            >
              {resource.columns.map((column) => (
                <TableCell key={column.key} className="overflow-hidden">
                  <ListValue value={columnValue(item, column)} kind={column.kind} />
                </TableCell>
              ))}
              <TableCell className="text-end" onClick={(event) => event.stopPropagation()}>
                <RowMenu resource={resource} item={item} actions={actions} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function ResourceGrid({ resource, items, actions }: { resource: TListResource; items: TListItem[]; actions: TRowActions }) {
  const { t } = useTranslation();
  const [primary, ...rest] = resource.columns;
  return (
    <ul className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label={t(`${resource.strings}.title`)}>
      {items.map((item) => (
        <li key={item._id} className="animate-enter">
          {/* The title button stretches over the card, so the menu stays its own control. */}
          <Card size="sm" className="relative h-full transition-colors focus-within:border-primary/40 hover:border-primary/40">
            <CardHeader>
              <CardTitle className="min-w-0">
                <button type="button" className="block w-full truncate text-start outline-none after:absolute after:inset-0 after:rounded-[inherit]" onClick={() => actions.open(item)}>
                  <ListValue value={columnValue(item, primary)} kind={primary.kind} />
                </button>
              </CardTitle>
              <CardAction className="relative z-10">
                <RowMenu resource={resource} item={item} actions={actions} />
              </CardAction>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                {rest.map((column) => (
                  <React.Fragment key={column.key}>
                    <dt className="text-muted-foreground">{t(column.label)}</dt>
                    <dd className="min-w-0 justify-self-end text-end">
                      <ListValue value={columnValue(item, column)} kind={column.kind} />
                    </dd>
                  </React.Fragment>
                ))}
              </dl>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

/** A row's actions: view, edit, and the record actions the session may use. */
function RowMenu({ resource, item, actions }: { resource: TListResource; item: TListItem; actions: TRowActions }) {
  const { t } = useTranslation();
  const { capabilities } = useSignedInSession();
  const extra = (RESOURCE_FORMS[resource.key]?.extra ?? []).filter((entry) => capabilities.includes(entry.capability));
  const available = (resource.actions ?? []).filter((action) =>
    capabilities.includes(action.capability) && (action.when?.(item) ?? true)
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={t("list.rowActions", { name: titleOf(resource, item) })}>
            <HugeiconsIcon icon={MoreHorizontalIcon} />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={() => actions.open(item)}>
          <HugeiconsIcon icon={ViewIcon} />
          {t(resource.href ? "list.open" : "list.details")}
        </DropdownMenuItem>
        {extra.map((entry) => (
          <DropdownMenuItem key={entry.key} onClick={() => actions.form(entry.open, item)}>
            <HugeiconsIcon icon={Add01Icon} />
            {t(entry.label)}
          </DropdownMenuItem>
        ))}
        {actions.edit && (resource.editable?.(item) ?? true) && (
          <DropdownMenuItem onClick={() => actions.edit!(item)}>
            <HugeiconsIcon icon={PencilEdit02Icon} />
            {t("forms.edit")}
          </DropdownMenuItem>
        )}
        {available.length > 0 && <DropdownMenuSeparator />}
        {available.map((action) => (
          <DropdownMenuItem
            key={action.key}
            variant={action.destructive ? "destructive" : "default"}
            onClick={() => actions.run(action, item)}
          >
            {t(`settings.actions.${action.key}.label`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PageLink({ to, disabled, label, icon }: { to: string; disabled: boolean; label: string; icon: typeof ArrowLeft01Icon }) {
  const content = <HugeiconsIcon icon={icon} className="rtl:rotate-180" />;
  if (disabled) {
    return <Button variant="outline" size="icon-sm" disabled aria-label={label}>{content}</Button>;
  }
  return (
    <Link to={to} aria-label={label} className={buttonVariants({ variant: "outline", size: "icon-sm" })}>
      {content}
    </Link>
  );
}

export default ResourceList;
