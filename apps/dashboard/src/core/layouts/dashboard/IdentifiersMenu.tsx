import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Copy01Icon, FingerPrintIcon, Tick02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, useSignedInSession } from "@/core/contexts/Session";
import { useCopy } from "@/core/hooks/useCopy";

/**
 * The identifiers support and developers ask for, grouped by what they name,
 * one tap from the header. Each copies on its own and the menu stays open.
 */
export function IdentifiersMenu() {
  const { t } = useTranslation();
  const session = useSignedInSession();
  const { memberships } = useSession();
  const account = memberships.find((membership) => membership.accountId === session.accountId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 rounded-full" aria-label={t("ids.open")}>
            <HugeiconsIcon icon={FingerPrintIcon} />
            <span className="hidden sm:inline">{t("ids.label")}</span>
            <HugeiconsIcon icon={ArrowDown01Icon} className="hidden size-3.5 opacity-60 sm:block" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("ids.you")}</DropdownMenuLabel>
          <CopyItem label={t("user.userId")} value={session.userId} />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{account?.name ?? t("ids.account")}</DropdownMenuLabel>
          <CopyItem label={t("user.accountId")} value={session.accountId} />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One identifier. Choosing it copies the value and keeps the menu open. */
export function CopyItem({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  const { copy, copied } = useCopy();
  return (
    <DropdownMenuItem
      closeOnClick={false}
      onClick={() => copy(value).then(() => toast.success(t("common.copied")), () => toast.error(t("common.copyFailed")))}
      aria-label={t("common.copyValue", { value: label })}
    >
      <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} className={copied ? "text-primary" : undefined} />
      <span className="flex min-w-0 flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span dir="ltr" className="truncate text-start font-mono text-xs">{value}</span>
      </span>
    </DropdownMenuItem>
  );
}
