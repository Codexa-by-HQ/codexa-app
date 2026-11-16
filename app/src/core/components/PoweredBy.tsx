import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/core/components/BrandLogo";
import { env } from "@/core/lib/env";
import { cn } from "@/lib/utils";

/** "Powered by Codexa-by-HQ" as an outline badge linking out, shown in the footer. */
export function PoweredBy({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <Badge
      variant="outline"
      render={<a href={env.brandUrl} target="_blank" rel="noreferrer noopener" />}
      className={cn("group h-6 gap-1.5 ps-1 pe-2.5 text-[11px] font-normal text-muted-foreground", className)}
    >
      <BrandLogo className="size-4 transition-transform group-hover:rotate-12" />
      {t("shell.poweredBy")}
      {/* The name stays left to right inside RTL text. */}
      <bdi className="font-semibold text-foreground">Codexa-by-HQ</bdi>
    </Badge>
  );
}
