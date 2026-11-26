import { useTranslation } from "react-i18next";
import { SquareLockPasswordIcon } from "@hugeicons/core-free-icons";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAsyncAction } from "@/core/hooks/useAsyncAction";
import { useSession } from "@/core/contexts/Session";
import { AuthLayout } from "@/core/layouts/auth/AuthLayout";
import { cn, codexa } from "@/core/lib/utils";

/**
 * Shown in place of any dashboard page while signed out. Sign in leaves for
 * OAuth, so the pending state lasts until the browser navigates away.
 */
function SignIn() {
  const { t } = useTranslation();
  const { failure, canSignIn, signIn } = useSession();
  const [start, pending] = useAsyncAction(signIn, { error: t("signIn.failure.failed") });

  return (
    <AuthLayout
      icon={SquareLockPasswordIcon}
      heading={t("signIn.title")}
      description={t("signIn.description")}
    >
      <div className={cn(codexa.stagger, "flex flex-col gap-5 [animation-delay:150ms]")}>
        {failure && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{t(`signIn.failure.${failure}`)}</AlertDescription>
          </Alert>
        )}
        {!canSignIn && (
          <Alert role="alert">
            <AlertDescription>{t("signIn.notConfigured")}</AlertDescription>
          </Alert>
        )}
        <Button className="w-full" disabled={!canSignIn || pending} onClick={() => start()} data-shell="sign-in">
          {pending && <Spinner />}
          {t("signIn.button")}
        </Button>
      </div>
    </AuthLayout>
  );
}

export default SignIn;
