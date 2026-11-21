import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useDashboardNav } from "@/core/hooks/useDashboardNav";

/** Ctrl K or Cmd K anywhere opens the screen search. */
const handle = React.createRef<{ open: () => void }>();

export const openSearch = () => handle.current?.open();

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch();
  }
});

/** Finds any page the session may see, grouped by section. */
export function SearchCommand() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sections } = useDashboardNav();
  const [open, setOpen] = React.useState(false);

  React.useImperativeHandle(handle, () => ({ open: () => setOpen(true) }), []);

  const go = (to: string) => {
    setOpen(false);
    navigate(to, { viewTransition: true });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title={t("search.title")} description={t("search.description")}>
      <Command>
        <CommandInput placeholder={t("search.placeholder")} />
        <CommandList>
          <CommandEmpty>{t("search.empty")}</CommandEmpty>
          {sections.map((section) => (
            <CommandGroup key={section.key} heading={t(section.name)}>
              {section.items.map((item) => (
                <CommandItem key={item.key} value={`${t(section.name)} ${t(item.name)}`} onSelect={() => go(item.to)}>
                  {item.icon && <HugeiconsIcon icon={item.icon} />}
                  {t(item.name)}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
