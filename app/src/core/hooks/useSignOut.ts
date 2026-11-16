import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useConfirm } from "@/core/hooks/useConfirm";
import { useSession } from "@/core/hooks/useSession";

/**
 * Sign out after confirming. Signing out revokes the refresh token, ending the
 * session on every tab that shares it, so it is worth a confirmation.
 */
export function useSignOut() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { signOut } = useSession();

  return () =>
    void confirm({
      title: t("account.signOutTitle"),
      description: t("account.signOutDescription"),
      confirmLabel: t("account.signOut"),
      destructive: true,
      onConfirm: async () => {
        try {
          await signOut();
        } catch {
          // The local session is already gone. Only the revocation failed.
          toast.error(t("account.signOutFailed"));
        }
      },
    });
}
