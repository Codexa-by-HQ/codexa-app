import type { ReactNode } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/** A section with nothing to show yet, explaining what will appear and how. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconSvgElement;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={icon} />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
