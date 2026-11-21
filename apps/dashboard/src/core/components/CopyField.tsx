import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopy } from "@/core/hooks/useCopy";
import { cn } from "@/core/lib/utils";

/**
 * A read only value with a copy button, for identifiers such as account ids.
 * The value stays selectable, so it can also be copied by hand.
 */
export function CopyField({
  label,
  value,
  className,
}: {
  /** Names the field for screen readers, such as "User". */
  label: string;
  value: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const { copy, copied } = useCopy();
  const action = t("common.copyValue", { value: label });

  function handleCopy() {
    copy(value).then(
      () => toast.success(t("common.copied")),
      () => toast.error(t("common.copyFailed")),
    );
  }

  return (
    <InputGroup className={cn("h-8", className)}>
      <InputGroupInput
        readOnly
        dir="ltr"
        value={value}
        aria-label={label}
        className="font-mono text-xs"
      />
      <InputGroupAddon align="inline-end">
        <Tooltip>
          <TooltipTrigger
            render={
              <InputGroupButton size="icon-xs" aria-label={action} onClick={handleCopy}>
                <HugeiconsIcon
                  icon={copied ? Tick02Icon : Copy01Icon}
                  className={cn(copied && "text-primary")}
                />
              </InputGroupButton>
            }
          />
          <TooltipContent>{copied ? t("common.copied") : action}</TooltipContent>
        </Tooltip>
      </InputGroupAddon>
    </InputGroup>
  );
}
