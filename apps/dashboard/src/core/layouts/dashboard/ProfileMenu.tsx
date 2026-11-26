import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AddCircleIcon,
  Building03Icon,
  ComputerIcon,
  LanguageSkillIcon,
  Logout03Icon,
  Moon02Icon,
  PaintBoardIcon,
  Sun03Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { LanguageSelect, ThemeToggle } from "@/core/components/Preferences";
import { useSession, useSignedInSession } from "@/core/contexts/Session";
import { sheet } from "@/core/contexts/Sheet";
import { accountForm } from "@/core/pages/settings/forms";
import { useTheme } from "@/core/contexts/Theme";
import { LANGUAGE_NAMES, LANGUAGES } from "@/core/i18n";
import { features } from "@/core/lib/env";
import { useAsyncAction } from "@/core/hooks/useAsyncAction";
import { useSignOut } from "@/core/hooks/useSignOut";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import type { TMembership, TTheme } from "@/core/types";

const THEMES = [
  { value: "light", icon: Sun03Icon },
  { value: "dark", icon: Moon02Icon },
  { value: "system", icon: ComputerIcon },
] as const satisfies { value: TTheme; icon: unknown }[];

/**
 * The signed in user's menu, which also holds the language and appearance. A
 * dropdown with submenus on a desktop, and on a phone a sheet from the bottom.
 * `onBeforeOpen` lets a surrounding overlay close first, so two never stack.
 */
export function ProfileMenu({ onBeforeOpen }: { onBeforeOpen?: () => void }) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const session = useSignedInSession();
  const signOut = useSignOut();
  const { openAccount, memberships, switchAccount } = useSession();
  const [manageAccount] = useAsyncAction(() => openAccount(), { error: t("user.accountFailed") });
  const [changeTenant, switching] = useAsyncAction(
    (accountId: string) => accountId === session.accountId ? Promise.resolve() : switchAccount(accountId),
    { error: t("user.switchFailed") },
  );
  const current = memberships.find((membership) => membership.accountId === session.accountId);
  const canCreateAccount = session.capabilities.includes("accounts:create");
  const [enterAccount] = useAsyncAction((accountId: string) => switchAccount(accountId), { error: t("user.switchFailed") });
  const newAccount = async () => {
    onBeforeOpen?.();
    sheet.open(await accountForm((accountId) => {
      sheet.close();
      toast.success(t("forms.accounts.created"));
      enterAccount(accountId);
    }));
  };
  const showAccounts = memberships.length > 1 || canCreateAccount;
  const app = session.application?.name ?? t("session.appFallback");

  const avatar = (
    <Avatar className="size-8">
      <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
        {app.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );

  if (isMobile) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        aria-label={t("user.menu")}
        data-shell="profile"
        onClick={() => {
          onBeforeOpen?.();
          sheet.open({
            title: app,
            description: session.userId,
            body: (
              <ProfilePanel
                onManageAccount={manageAccount}
                onSignOut={signOut}
                onChangeTenant={changeTenant}
                onCreateAccount={canCreateAccount ? () => void newAccount() : undefined}
                switching={switching}
              />
            ),
          });
        }}
      >
        {avatar}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("user.menu")} data-shell="profile">
            {avatar}
          </Button>
        }
      />
      <DropdownMenuContent side="inline-end" align="end" className="min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{app}</span>
            {current && <span className="truncate text-xs font-normal">{current.name}</span>}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => manageAccount()}>
            <HugeiconsIcon icon={UserCircleIcon} />
            {t("user.manageAccount")}
          </DropdownMenuItem>
          {showAccounts && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={switching}>
                <HugeiconsIcon icon={Building03Icon} />
                {t("user.changeTenant")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-56">
                <DropdownMenuRadioGroup value={session.accountId} onValueChange={(accountId: string) => changeTenant(accountId)}>
                  {memberships.map((membership) => (
                    <DropdownMenuRadioItem key={membership.accountId} value={membership.accountId}>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{membership.name}</span>
                        <span className="text-xs text-muted-foreground">{roleName(membership, t)}</span>
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                {canCreateAccount && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => void newAccount()}>
                      <HugeiconsIcon icon={AddCircleIcon} />
                      {t("user.createAccount")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {features.languageSwitcher && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <HugeiconsIcon icon={LanguageSkillIcon} />
                {t("shell.language")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-44">
                <DropdownMenuRadioGroup
                  value={i18n.resolvedLanguage ?? "en"}
                  onValueChange={(language: string) => void i18n.changeLanguage(language)}
                >
                  {LANGUAGES.map((language) => (
                    <DropdownMenuRadioItem key={language} value={language} lang={language}>
                      {LANGUAGE_NAMES[language]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          {features.themeSwitcher && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <HugeiconsIcon icon={PaintBoardIcon} />
                {t("shell.appearance")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-44">
                <DropdownMenuRadioGroup value={theme} onValueChange={(value: TTheme) => setTheme(value)}>
                  {THEMES.map(({ value, icon }) => (
                    <DropdownMenuRadioItem key={value} value={value}>
                      <HugeiconsIcon icon={icon} />
                      {t(`shell.themes.${value}`)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                {canCreateAccount && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => void newAccount()}>
                      <HugeiconsIcon icon={AddCircleIcon} />
                      {t("user.createAccount")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={signOut}>
          <HugeiconsIcon icon={Logout03Icon} />
          {t("account.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The phone's profile sheet: account actions, preferences, then sign out. */
function ProfilePanel({
  onManageAccount,
  onSignOut,
  onChangeTenant,
  onCreateAccount,
  switching,
}: {
  onManageAccount: () => void;
  onSignOut: () => void;
  onChangeTenant: (accountId: string) => void;
  onCreateAccount?: () => void;
  switching: boolean;
}) {
  const { t } = useTranslation();
  const session = useSignedInSession();
  const { memberships } = useSession();

  return (
    <div className="flex flex-col gap-4">
      {(memberships.length > 1 || onCreateAccount) && (
        <section aria-labelledby="tenant-heading" className="flex flex-col gap-2">
          <h2 id="tenant-heading" className="text-sm font-medium">{t("user.changeTenant")}</h2>
          <ItemGroup className="gap-1">
            {memberships.map((membership) => {
              const isCurrent = membership.accountId === session.accountId;
              return (
                <div role="listitem" key={membership.accountId}>
                  <Item
                    variant="outline"
                    size="sm"
                    render={
                      <button
                        type="button"
                        aria-current={isCurrent || undefined}
                        disabled={switching}
                        onClick={() => {
                          if (isCurrent) return;
                          sheet.close();
                          onChangeTenant(membership.accountId);
                        }}
                      />
                    }
                  >
                    <ItemMedia><HugeiconsIcon icon={Building03Icon} /></ItemMedia>
                    <ItemContent>
                      <ItemTitle>{membership.name}</ItemTitle>
                      <ItemDescription>{roleName(membership, t)}</ItemDescription>
                    </ItemContent>
                    {isCurrent && (
                      <ItemActions><Badge variant="secondary">{t("user.currentTenant")}</Badge></ItemActions>
                    )}
                  </Item>
                </div>
              );
            })}
          </ItemGroup>
          {onCreateAccount && (
            <Button variant="outline" className="w-full" onClick={onCreateAccount}>
              <HugeiconsIcon icon={AddCircleIcon} />
              {t("user.createAccount")}
            </Button>
          )}
        </section>
      )}
      <ItemGroup className="gap-1">
        <Item render={<button type="button" onClick={onManageAccount} />} size="sm">
          <ItemMedia><HugeiconsIcon icon={UserCircleIcon} /></ItemMedia>
          <ItemContent><ItemTitle>{t("user.manageAccount")}</ItemTitle></ItemContent>
        </Item>
        {features.languageSwitcher && (
          <Item size="sm">
            <ItemMedia><HugeiconsIcon icon={LanguageSkillIcon} /></ItemMedia>
            <ItemContent><ItemTitle>{t("shell.switchLanguage")}</ItemTitle></ItemContent>
            <LanguageSelect />
          </Item>
        )}
        {features.themeSwitcher && (
          <Item size="sm">
            <ItemMedia><HugeiconsIcon icon={Moon02Icon} /></ItemMedia>
            <ItemContent><ItemTitle>{t("shell.themeLabel")}</ItemTitle></ItemContent>
            <ThemeToggle />
          </Item>
        )}
      </ItemGroup>
      <Button
        variant="destructive"
        className="w-full"
        onClick={() => {
          sheet.close();
          onSignOut();
        }}
      >
        <HugeiconsIcon icon={Logout03Icon} />
        {t("account.signOut")}
      </Button>
    </div>
  );
}

/** A membership's role, translated when it is one OAuth ships. */
function roleName(membership: TMembership, t: TFunction) {
  return t(`roles.${membership.role}`, { defaultValue: membership.role });
}
