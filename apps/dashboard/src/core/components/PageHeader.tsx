import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * The top of every dashboard page: its one `h1`, a description and actions.
 * It also names the browser tab. React hoists the `<title>` into the head, so
 * no effect is needed.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <title>{`${title} · ${t("shell.product")}`}</title>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
