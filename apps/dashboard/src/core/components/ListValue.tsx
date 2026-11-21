import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { describeDevice, formatDate } from "@/core/lib/utils";
import type { TColumnKind } from "@/core/types";

/** One value in a Settings list, shown the way its column says. */
export function ListValue({ value, kind = "text" }: { value: unknown; kind?: TColumnKind }) {
  const { t, i18n } = useTranslation();
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">{t("common.empty")}</span>;
  }

  switch (kind) {
    case "boolean":
      return <Badge variant={value ? "default" : "outline"}>{t(value ? "common.yes" : "common.no")}</Badge>;
    case "badge":
      return <Badge variant="secondary" className="capitalize">{String(value).replaceAll("_", " ")}</Badge>;
    case "date":
      return <span className="whitespace-nowrap">{formatDate(value, i18n.language) ?? String(value)}</span>;
    case "tags":
      return (
        <span className="flex flex-wrap gap-1">
          {(Array.isArray(value) ? value : [value]).map((tag) => (
            <Badge key={String(tag)} variant="secondary" className="font-mono">{String(tag)}</Badge>
          ))}
        </span>
      );
    case "mono":
      return <code dir="ltr" title={String(value)} className="block truncate font-mono text-xs">{String(value)}</code>;
    case "device":
      return <span title={String(value)} className="block truncate">{describeDevice(String(value))}</span>;
    default: {
      const text = typeof value === "object" ? JSON.stringify(value) : String(value);
      return <span title={text} className="block truncate">{text}</span>;
    }
  }
}
