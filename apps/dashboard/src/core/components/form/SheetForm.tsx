import type { ReactNode } from "react";
import { type DefaultValues, type FieldValues, FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import type { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { sheet, SheetActions } from "@/core/contexts/Sheet";
import { failureMessage } from "@/core/lib/utils";

/**
 * A create or edit form inside the sheet: its fields, a form wide error, and
 * the cancel and submit bar at the bottom. OAuth's own message is shown when
 * a request is refused, since it names the rule that failed.
 */
export function SheetForm<TInput extends FieldValues, TOutput>({
  schema,
  defaultValues,
  submitLabel,
  onSubmit,
  another,
  children,
}: {
  schema: z.ZodType<TOutput, TInput>;
  defaultValues: DefaultValues<TInput>;
  submitLabel: string;
  onSubmit: (values: TOutput) => Promise<void>;
  /** Saves, then empties the form for the next one instead of closing, such as several policies at once. */
  another?: { label: string; onSubmit: (values: TOutput) => Promise<void> };
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const form = useForm<TInput, unknown, TOutput>({ resolver: zodResolver(schema), defaultValues });
  const { isSubmitting, errors } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      form.setError("root", { message: failureMessage(error, t) });
    }
  });
  const submitAnother = another && form.handleSubmit(async (values) => {
    try {
      await another.onSubmit(values);
      form.reset(defaultValues);
    } catch (error) {
      form.setError("root", { message: failureMessage(error, t) });
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-4">
        {errors.root?.message && (
          <Alert variant="destructive">
            <HugeiconsIcon icon={Alert02Icon} />
            <AlertTitle>{t("form.failed")}</AlertTitle>
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}
        {children}
        <SheetActions>
          <Button type="button" variant="outline" onClick={() => sheet.close()}>{t("common.cancel")}</Button>
          {another && (
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => void submitAnother?.()}>
              {another.label}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            {submitLabel}
          </Button>
        </SheetActions>
      </form>
    </FormProvider>
  );
}

/** A titled part of a long form, such as an application and its first credential. */
export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border p-4">
      <legend className="flex flex-col gap-0.5 px-1">
        <span className="text-sm font-semibold">{title}</span>
      </legend>
      {description && <p className="-mt-2 text-sm text-muted-foreground">{description}</p>}
      {children}
    </fieldset>
  );
}
