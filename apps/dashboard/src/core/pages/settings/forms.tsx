import { useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Building03Icon,
  PaintBoardIcon,
  GridViewIcon,
  Key01Icon,
  Login03Icon,
  MailAdd01Icon,
  PolicyIcon,
  ShieldUserIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import { ChipsField, ColorField, SelectField, SwitchField, TextAreaField, TextField } from "@/core/components/form/fields";
import { FormSection, SheetForm } from "@/core/components/form/SheetForm";
import { showCredentialIssued } from "@/core/pages/settings/CredentialIssued";
import { showInviteSent } from "@/core/pages/settings/InviteSent";
import { ConditionBuilder } from "@/core/components/form/ConditionBuilder";
import { PermissionMatrix } from "@/core/components/form/PermissionMatrix";
import i18n from "@/core/i18n";
import { api } from "@/core/lib/api";
import { BRANDING_COLORS } from "@/core/config/branding";
import { applicationFor, reloadSession, withTokens } from "@/core/lib/loaders";
import { applyBranding, conditionToExpr, exprToCondition, type TExprNode, valueAt } from "@/core/lib/utils";
import {
  ACCOUNT_TYPES,
  CREDENTIAL_KINDS,
  POLICY_TARGETS,
  SCOPE_PATTERN,
  USER_STATUSES,
  accountCreateSchema,
  accountEditSchema,
  applicationCreateSchema,
  applicationSchema,
  brandingSchema,
  credentialCreateSchema,
  credentialEditSchema,
  inviteCreateSchema,
  memberEditSchema,
  policySchema,
  roleCreateSchema,
  roleEditSchema,
  ssoProviderSchema,
  userEditSchema,
} from "@/core/lib/validation";
import type {
  TBranding,
  TBrandingTheme,
  TApplicationCreateValues,
  TCatalog,
  TCredentialCreateValues,
  TFormOpener,
  TListItem,
  TOption,
  TPolicyValues,
  TSheetOptions,
  TSsoProvider,
} from "@/core/types";

/**
 * The create and edit forms of every Settings list. An opener loads what its
 * form offers, such as the roles to choose from, then returns the sheet to
 * show. Each form sends exactly the fields OAuth's management API accepts.
 */

const t = (key: string) => i18n.t(key);

const save = (method: "POST" | "PATCH", path: string, body: Record<string, unknown>, idempotencyKey?: string) =>
  withTokens((tokens) => api.write.execute(tokens, method, path, body, idempotencyKey));

/** One key per submitted form, so a retried request never issues a second credential or app. */
const onceKey = () => crypto.randomUUID();

const listAll = (path: string, query: Record<string, string> = {}) =>
  withTokens((tokens) => api.list.execute(tokens, path, { limit: "100", ...query })).then((page) => page.items);

const translated = (values: readonly string[], prefix: string): TOption[] =>
  values.map((value) => ({ value, label: t(`${prefix}.${value}`) }));


/** OAuth's catalog, loaded before a form that offers permissions or scopes opens. */
const loadCatalog = () => withTokens((tokens) => api.catalog.execute(tokens));

/** Every registered scope as a choice, named and described. */
const scopeOptions = (catalog: TCatalog): TOption[] =>
  catalog.scopes.map(({ name, description }) => ({ value: name, label: description ? `${name} · ${description}` : name }));

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Roles that may be given to someone, for member, invite and policy forms. */
async function roleOptions(): Promise<TOption[]> {
  const roles = await listAll("/management/roles", { status: "active" });
  return roles
    .filter((role) => role.isAssignable !== false)
    .map((role) => ({ value: text(role.name), label: text(role.label) || text(role.name) }));
}

/** Active members, with the user each one is, for policy and machine credential forms. */
async function memberOptions(): Promise<(TOption & { user: string })[]> {
  const members = await listAll("/management/collaborators", { status: "active" });
  return members.map((member) => ({
    value: member._id,
    label: text(valueAt(member, "userProfile.username")) || member._id,
    user: text(member.user),
  }));
}

/** Accounts in this workspace, for policies that apply to everyone in some of them. */
async function accountOptions(): Promise<TOption[]> {
  const accounts = await listAll("/management/accounts");
  return accounts.map((account) => ({ value: account._id, label: text(account.name) || account._id }));
}

/* Accounts */

const createAccount: TFormOpener = (done) => accountForm(() => done(t("forms.accounts.created")));

/** A new account directly under the chosen one. */
const createSubAccount: TFormOpener = (done, item) => accountForm(() => done(t("forms.accounts.created")), item?._id);

/**
 * A new account, from Settings or the profile menu. `onCreated` gets its id,
 * so the profile menu can switch straight into it.
 */
export const accountForm = async (onCreated: (accountId: string) => void, parentId = ""): Promise<TSheetOptions> => {
  const parents = await listAll("/management/accounts").then((items) =>
    items.map((item) => ({ value: item._id, label: `${"· ".repeat(Number(item.depth ?? 0))}${text(item.name)}` }))
  ).catch(() => [] as TOption[]);
  return {
  title: t("forms.accounts.createTitle"),
  description: t("forms.accounts.createDescription"),
  icon: Building03Icon,
  body: (
    <SheetForm
      schema={accountCreateSchema}
      defaultValues={{ name: "", slug: "", type: "team", customType: "", description: "", parentId }}
      submitLabel={t("forms.create")}
      onSubmit={async ({ description, customType, parentId: parent, ...account }) => {
        const created = await save("POST", "/management/accounts", {
          ...account,
          ...(parent ? { parentId: parent } : {}),
          ...(customType ? { customType } : {}),
          ...(description ? { profile: { description } } : {}),
        });
        onCreated(text(created?._id));
      }}
    >
      <TextField name="name" label={t("fields.name")} placeholder={t("forms.accounts.namePlaceholder")} autoFocus />
      <TextField
        name="slug"
        label={t("fields.slug")}
        placeholder="acme-team"
        description={t("forms.accounts.slugHint")}
        ltr
      />
      <SelectField name="type" label={t("fields.type")} placeholder={t("forms.choose")} options={translated(ACCOUNT_TYPES, "accountTypes")} />
      {parents.length > 1 && (
        <SelectField
          name="parentId"
          label={t("forms.accounts.parent")}
          placeholder={t("forms.accounts.parentPlaceholder")}
          options={parents}
          description={t("forms.accounts.parentHint")}
        />
      )}
      <CustomTypeField />
      <TextAreaField name="description" label={t("fields.description")} placeholder={t("forms.descriptionPlaceholder")} optional />
    </SheetForm>
  ),
};
};

/** The label of a custom account type, asked only for the custom type. */
function CustomTypeField() {
  const type = useWatch({ name: "type" });
  if (type !== "custom") return null;
  return <TextField name="customType" label={t("forms.accounts.customType")} placeholder={t("forms.accounts.customTypePlaceholder")} />;
}

const editAccount: TFormOpener = async (done, item) => ({
  title: t("forms.accounts.editTitle"),
  description: text(item?.name),
  icon: Building03Icon,
  body: (
    <SheetForm
      schema={accountEditSchema}
      defaultValues={{
        name: text(item?.name),
        description: text(valueAt(item ?? {}, "profile.description")),
        isActive: item?.isActive !== false,
      }}
      submitLabel={t("forms.save")}
      onSubmit={async (values) => {
        await save("PATCH", "/management/accounts", { id: item?._id, ...values, description: values.description ?? "" });
        done(t("forms.saved"));
      }}
    >
      <TextField name="name" label={t("fields.name")} placeholder={t("forms.accounts.namePlaceholder")} autoFocus />
      <TextAreaField name="description" label={t("fields.description")} placeholder={t("forms.descriptionPlaceholder")} optional />
      <SwitchField name="isActive" label={t("fields.active")} description={t("forms.accounts.activeHint")} />
    </SheetForm>
  ),
});

/* Users */

const editUser: TFormOpener = async (done, item) => ({
  title: t("forms.users.editTitle"),
  description: text(item?.username),
  icon: UserCircleIcon,
  body: (
    <SheetForm
      schema={userEditSchema}
      defaultValues={{
        displayName: text(valueAt(item ?? {}, "profile.displayName")),
        status: (USER_STATUSES as readonly string[]).includes(text(item?.status))
          ? text(item?.status) as (typeof USER_STATUSES)[number]
          : "active",
      }}
      submitLabel={t("forms.save")}
      onSubmit={async (values) => {
        await save("PATCH", "/management/users", { id: item?._id, ...values });
        done(t("forms.saved"));
      }}
    >
      <TextField name="displayName" label={t("forms.users.displayName")} placeholder={t("forms.users.displayNamePlaceholder")} optional autoFocus />
      <SelectField
        name="status"
        label={t("fields.status")}
        placeholder={t("forms.choose")}
        options={translated(USER_STATUSES, "statuses")}
        description={t("forms.users.statusHint")}
      />
    </SheetForm>
  ),
});

/* Members and invites */

const editMember: TFormOpener = async (done, item) => {
  const roles = await roleOptions();
  return {
    title: t("forms.members.editTitle"),
    description: text(valueAt(item ?? {}, "userProfile.username")),
    icon: UserGroupIcon,
    body: (
      <SheetForm
        schema={memberEditSchema}
        defaultValues={{ role: text(item?.role), isActive: item?.isActive !== false }}
        submitLabel={t("forms.save")}
        onSubmit={async (values) => {
          await save("PATCH", "/management/collaborators", { id: item?._id, ...values });
          done(t("forms.saved"));
        }}
      >
        <SelectField name="role" label={t("fields.role")} placeholder={t("forms.choose")} options={roles} />
        <SwitchField name="isActive" label={t("fields.active")} description={t("forms.members.activeHint")} />
      </SheetForm>
    ),
  };
};

const createInvite: TFormOpener = async (done) => {
  const roles = await roleOptions();
  return {
    title: t("forms.invites.createTitle"),
    description: t("forms.invites.createDescription"),
    icon: MailAdd01Icon,
    body: (
      <SheetForm
        schema={inviteCreateSchema}
        defaultValues={{ email: "", role: roles.some((role) => role.value === "member") ? "member" : roles[0]?.value ?? "", message: "" }}
        submitLabel={t("forms.invites.send")}
        onSubmit={async (values) => {
          // OAuth adds the invitation token to this page, which signs the invitee in with it.
          const sent = await save("POST", "/management/invites", { ...values, acceptUrl: `${location.origin}${import.meta.env.BASE_URL}invite` });
          done(t("forms.invites.sent"));
          if (typeof sent?.shareUrl === "string") showInviteSent({ email: values.email, shareUrl: sent.shareUrl });
        }}
      >
        <TextField name="email" type="email" label={t("fields.email")} placeholder={t("forms.invites.emailPlaceholder")} ltr autoFocus />
        <SelectField name="role" label={t("fields.role")} placeholder={t("forms.choose")} options={roles} />
        <TextAreaField name="message" label={t("forms.invites.message")} placeholder={t("forms.invites.messagePlaceholder")} optional />
      </SheetForm>
    ),
  };
};

/* Roles */

const createRole: TFormOpener = async (done) => ({
  title: t("forms.roles.createTitle"),
  description: t("forms.roles.createDescription"),
  icon: ShieldUserIcon,
  body: (
    <SheetForm
      schema={roleCreateSchema}
      defaultValues={{ name: "", label: "", description: "", isAssignable: true }}
      submitLabel={t("forms.create")}
      onSubmit={async (values) => {
        await save("POST", "/management/roles", values);
        done(t("forms.roles.created"));
      }}
    >
      <TextField name="label" label={t("fields.name")} placeholder={t("forms.roles.labelPlaceholder")} autoFocus />
      <TextField name="name" label={t("fields.key")} placeholder="billing-admin" description={t("forms.roles.keyHint")} ltr />
      <TextAreaField name="description" label={t("fields.description")} placeholder={t("forms.descriptionPlaceholder")} optional />
      <SwitchField name="isAssignable" label={t("fields.assignable")} description={t("forms.roles.assignableHint")} />
    </SheetForm>
  ),
});

const editRole: TFormOpener = async (done, item) => ({
  title: t("forms.roles.editTitle"),
  description: text(item?.label),
  icon: ShieldUserIcon,
  body: (
    <SheetForm
      schema={roleEditSchema}
      defaultValues={{
        label: text(item?.label),
        description: text(item?.description),
        isAssignable: item?.isAssignable !== false,
        isActive: item?.isActive !== false,
      }}
      submitLabel={t("forms.save")}
      onSubmit={async (values) => {
        await save("PATCH", "/management/roles", { id: item?._id, ...values, description: values.description ?? "" });
        done(t("forms.saved"));
      }}
    >
      <TextField name="label" label={t("fields.name")} placeholder={t("forms.roles.labelPlaceholder")} autoFocus />
      <TextAreaField name="description" label={t("fields.description")} placeholder={t("forms.descriptionPlaceholder")} optional />
      <SwitchField name="isAssignable" label={t("fields.assignable")} description={t("forms.roles.assignableHint")} />
      {item?.isSystem !== true && (
        <SwitchField name="isActive" label={t("fields.active")} description={t("forms.roles.activeHint")} />
      )}
    </SheetForm>
  ),
});

/* Policies */

/** A stored policy, as OAuth Base returns it. */
type TPolicyDocument = {
  name?: string;
  description?: string;
  priority?: number;
  target?: { targetType?: string; roles?: string[]; collaborators?: string[]; accounts?: string[] };
  permissions?: { effect: "allow" | "deny"; permission: string }[];
  condition?: TExprNode;
  activeFrom?: string;
  activeUntil?: string;
};

/** The value a datetime-local input shows for a stored date, in local time. */
const localDateTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

function policyValues(policy: TPolicyDocument): TPolicyValues {
  const target = policy.target ?? {};
  return {
    applicationWide: false,
    name: policy.name ?? "",
    description: policy.description ?? "",
    targetType: (POLICY_TARGETS as readonly string[]).includes(target.targetType ?? "")
      ? target.targetType as (typeof POLICY_TARGETS)[number]
      : "role",
    roles: target.roles ?? [],
    collaborators: target.collaborators ?? [],
    accounts: target.accounts ?? [],
    permissions: Object.fromEntries((policy.permissions ?? []).map((entry) => [entry.permission, entry.effect])),
    condition: exprToCondition(policy.condition),
    activeFrom: localDateTime(policy.activeFrom),
    activeUntil: localDateTime(policy.activeUntil),
    priority: policy.priority ?? 0,
  };
}

/** The policy document OAuth stores, from the form. Empty optional parts clear. */
function policyDocument(values: ReturnType<typeof policySchema.parse>) {
  const target = values.targetType === "role"
    ? { targetType: "role", roles: values.roles }
    : values.targetType === "collaborator"
    ? { targetType: "collaborator", collaborators: values.collaborators }
    : values.targetType === "account"
    ? { targetType: "account", accounts: values.accounts }
    : { targetType: "global" };
  return {
    name: values.name,
    description: values.description || null,
    target,
    permissions: Object.entries(values.permissions).map(([permission, effect]) => ({ permission, effect })),
    condition: conditionToExpr(values.condition) ?? null,
    activeFrom: values.activeFrom ? new Date(values.activeFrom).toISOString() : null,
    activeUntil: values.activeUntil ? new Date(values.activeUntil).toISOString() : null,
    priority: values.priority,
  };
}

/**
 * A policy: who it applies to, what it allows and denies, when it applies,
 * and for how long. A new one can be saved and followed by another.
 */
async function policyForm(done: (message: string) => void, item?: TListItem) {
  const [roles, members, accounts, catalog, existing, session] = await Promise.all([
    roleOptions(),
    memberOptions(),
    accountOptions(),
    loadCatalog(),
    item ? withTokens((tokens) => api.read.execute(tokens, "/management/policies/detail", { id: item._id })) : null,
    reloadSession(),
  ]);
  const defaults = policyValues((existing ?? {}) as TPolicyDocument);
  const create = (values: ReturnType<typeof policySchema.parse>) =>
    save("POST", "/management/policies", { policy: policyDocument(values), applicationWide: values.applicationWide });
  return {
    title: t(item ? "forms.policies.editTitle" : "forms.policies.createTitle"),
    description: item ? text(item.name) : t("forms.policies.createDescription"),
    icon: PolicyIcon,
    wide: true,
    body: (
      <SheetForm
        schema={policySchema}
        defaultValues={defaults}
        submitLabel={t(item ? "forms.save" : "forms.create")}
        another={item ? undefined : {
          label: t("forms.policies.createAnother"),
          onSubmit: async (values) => {
            await create(values);
            toast.success(t("forms.policies.created"));
          },
        }}
        onSubmit={async (values) => {
          if (item) await save("PATCH", "/management/policies", { id: item._id, policy: policyDocument(values) });
          else await create(values);
          done(t(item ? "forms.saved" : "forms.policies.created"));
        }}
      >
        <FormSection title={t("forms.policies.aboutTitle")}>
          <TextField name="name" label={t("fields.name")} placeholder={t("forms.policies.namePlaceholder")} autoFocus />
          <TextAreaField name="description" label={t("fields.description")} placeholder={t("forms.descriptionPlaceholder")} optional />
        </FormSection>
        <FormSection title={t("forms.policies.whoTitle")} description={t("forms.policies.whoDescription")}>
          {!item && session?.platformAdministrator
            ? (
              <SwitchField<TPolicyValues>
                name="applicationWide"
                label={t("forms.policies.applicationWide")}
                description={t("forms.policies.applicationWideHint")}
              />
            )
            : null}
          <SelectField name="targetType" label={t("forms.policies.appliesTo")} placeholder={t("forms.choose")} options={translated(POLICY_TARGETS, "forms.policies.targets")} />
          <PolicyTargetField roles={roles} members={members} accounts={accounts} />
        </FormSection>
        <FormSection title={t("forms.policies.whatTitle")} description={t("forms.policies.whatDescription")}>
          <PermissionMatrix<TPolicyValues>
            name="permissions"
            label={t("forms.policies.permissions")}
            // Only what this person may hand out, plus what the policy already names.
            permissions={catalog.permissions.filter((permission) => permission.grantable || permission.name in defaults.permissions)}
          />
        </FormSection>
        <FormSection title={t("forms.policies.whenTitle")} description={t("forms.policies.whenDescription")}>
          <ConditionBuilder />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="activeFrom" type="datetime-local" label={t("forms.policies.activeFrom")} placeholder="" optional ltr />
            <TextField name="activeUntil" type="datetime-local" label={t("forms.policies.activeUntil")} placeholder="" optional ltr />
          </div>
          <TextField name="priority" type="number" label={t("forms.policies.priority")} placeholder="0" description={t("forms.policies.priorityHint")} ltr />
        </FormSection>
      </SheetForm>
    ),
  };
}

/** Who the policy applies to: the roles or members picker for its target. */
function PolicyTargetField({ roles, members, accounts }: { roles: TOption[]; members: TOption[]; accounts: TOption[] }) {
  const { t } = useTranslation();
  const targetType = useWatch<TPolicyValues, "targetType">({ name: "targetType" });
  if (targetType === "role") {
    return <ChipsField name="roles" label={t("forms.policies.targets.role")} placeholder={t("forms.policies.rolePlaceholder")} options={roles} />;
  }
  if (targetType === "collaborator") {
    return <ChipsField name="collaborators" label={t("forms.policies.targets.collaborator")} placeholder={t("forms.policies.memberPlaceholder")} options={members} />;
  }
  if (targetType === "account") {
    return <ChipsField name="accounts" label={t("forms.policies.targets.account")} placeholder={t("forms.policies.accountPlaceholder")} options={accounts} description={t("forms.policies.accountHint")} />;
  }
  return null;
}

/* Applications and credentials */

/**
 * A new application provisioned whole, as setup provisions the first: its own
 * administrator and account, its first client and the roles to copy. It is a
 * separate realm that its administrator signs in to with its new client.
 * Every identifier, and a secret once, shows afterwards ready to copy.
 */
const createApplication: TFormOpener = async (done) => {
  const [roles, catalog] = await Promise.all([listAll("/management/roles", { status: "active" }), loadCatalog()]);
  // Only this account's own custom roles can be copied. Built in ones always exist.
  const ownRoles = roles
    .filter((role) => role.account && role.isSystem !== true)
    .map((role) => ({ value: text(role.name), label: text(role.label) || text(role.name) }));
  return {
    title: t("forms.applications.createTitle"),
    description: t("forms.applications.createDescription"),
    icon: GridViewIcon,
    wide: true,
    body: (
      <SheetForm
        schema={applicationCreateSchema}
        defaultValues={{
          name: "",
          description: "",
          adminUsername: "",
          adminEmail: "",
          adminPassword: "",
          adminConfirm: "",
          accountName: "",
          accountSlug: "",
          clientName: "",
          clientType: "public",
          redirectUris: "",
          allowedScopes: ["profile", "api:read", "api:write"],
          consentRequired: false,
          serviceAccountName: "",
          serviceAccountSlug: "",
          serviceUsername: "",
          copyRoles: [],
          linkCreatedBy: true,
        }}
        submitLabel={t("forms.create")}
        onSubmit={async (values) => {
          const created = await save("POST", "/management/oauth-apps", applicationRequest(values), onceKey());
          const appId = text(created?.appId);
          const credential = (created?.credential ?? {}) as Record<string, unknown>;
          done(t("forms.applications.created"));
          showCredentialIssued({
            name: values.name,
            clientId: text(credential.clientId),
            secret: text(credential.clientSecret) || undefined,
            applicationHref: `/settings/applications/${appId}`,
            identifiers: [
              { key: "appId", label: t("forms.applications.appId"), value: appId },
              { key: "administrator", label: t("forms.applications.administratorId"), value: text(created?.administratorUserId) },
              { key: "account", label: t("forms.applications.accountId"), value: text(created?.accountId) },
            ],
          });
        }}
      >
        <FormSection title={t("forms.applications.aboutTitle")} description={t("forms.applications.aboutDescription")}>
          <TextField name="name" label={t("fields.name")} placeholder={t("forms.applications.namePlaceholder")} autoFocus />
          <TextAreaField name="description" label={t("fields.description")} placeholder={t("forms.applications.descriptionPlaceholder")} optional />
        </FormSection>
        <FormSection title={t("forms.applications.administratorTitle")} description={t("forms.applications.administratorDescription")}>
          <TextField name="adminUsername" label={t("forms.applications.username")} placeholder={t("forms.applications.usernamePlaceholder")} ltr />
          <TextField name="adminEmail" type="email" label={t("forms.applications.email")} placeholder={t("forms.applications.emailPlaceholder")} ltr />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="adminPassword" type="password" label={t("forms.applications.password")} placeholder={t("forms.applications.passwordPlaceholder")} ltr />
            <TextField name="adminConfirm" type="password" label={t("forms.applications.confirmPassword")} placeholder={t("forms.applications.passwordPlaceholder")} ltr />
          </div>
        </FormSection>
        <FormSection title={t("forms.applications.accountTitle")} description={t("forms.applications.accountDescription")}>
          <TextField name="accountName" label={t("forms.applications.accountName")} placeholder={t("forms.applications.accountPlaceholder")} />
          <TextField name="accountSlug" label={t("forms.applications.slug")} placeholder="acme" ltr />
        </FormSection>
        <FormSection title={t("forms.applications.signInTitle")} description={t("forms.applications.signInDescription")}>
          <TextField name="clientName" label={t("forms.credentials.name")} placeholder={t("forms.credentials.namePlaceholder")} description={t("forms.credentials.nameHint")} />
          <ApplicationClientFields scopes={scopeOptions(catalog)} />
        </FormSection>
        <FormSection title={t("forms.applications.rolesTitle")} description={t("forms.applications.rolesDescription")}>
          {ownRoles.length
            ? <ChipsField name="copyRoles" label={t("forms.applications.copyRoles")} placeholder={t("forms.applications.copyRolesPlaceholder")} options={ownRoles} optional />
            : <p className="text-sm text-muted-foreground">{t("forms.applications.noRoles")}</p>}
          <SwitchField
            name="linkCreatedBy"
            label={t("forms.applications.link")}
            description={t("forms.applications.linkHint")}
          />
        </FormSection>
      </SheetForm>
    ),
  };
};

/** The provisioning request OAuth takes, from the form. */
function applicationRequest(values: ReturnType<typeof applicationCreateSchema.parse>) {
  return {
    business: { name: values.name, ...(values.description ? { description: values.description } : {}) },
    administrator: {
      username: values.adminUsername,
      email: values.adminEmail,
      password: values.adminPassword,
      confirmPassword: values.adminConfirm,
    },
    account: { name: values.accountName, slug: values.accountSlug },
    credential: values.clientType === "public"
      ? {
        type: "public",
        name: values.clientName,
        redirectUris: values.redirectUris,
        allowedScopes: values.allowedScopes,
        consentRequired: values.consentRequired,
      }
      : {
        type: "confidential",
        name: values.clientName,
        allowedScopes: values.allowedScopes,
        serviceAccountName: values.serviceAccountName,
        serviceAccountSlug: values.serviceAccountSlug,
        serviceUsername: values.serviceUsername,
      },
    copyRoles: values.copyRoles,
    linkCreatedBy: values.linkCreatedBy,
  };
}

/** A browser client needs where to return. A server client gets its own service identity. */
function ApplicationClientFields({ scopes }: { scopes: TOption[] }) {
  const { t } = useTranslation();
  const type = useWatch<TApplicationCreateValues, "clientType">({ name: "clientType" });
  return (
    <>
      <SelectField
        name="clientType"
        label={t("forms.applications.clientType")}
        placeholder={t("forms.choose")}
        options={translated(["public", "confidential"], "forms.applications.clientTypes")}
      />
      {type === "public"
        ? (
          <>
            <TextAreaField
              name="redirectUris"
              label={t("forms.credentials.redirectUris")}
              placeholder="https://app.example.com/callback"
              description={t("forms.credentials.urlsHint")}
              ltr
            />
            <SwitchField name="consentRequired" label={t("forms.credentials.consent")} description={t("forms.credentials.consentHint")} />
          </>
        )
        : (
          <>
            <TextField name="serviceAccountName" label={t("forms.applications.serviceAccountName")} placeholder={t("forms.applications.serviceAccountPlaceholder")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="serviceAccountSlug" label={t("forms.applications.slug")} placeholder="acme-service" ltr />
              <TextField name="serviceUsername" label={t("forms.applications.serviceUsername")} placeholder="acme_service" ltr />
            </div>
          </>
        )}
      <ChipsField
        name="allowedScopes"
        label={t("forms.credentials.scopes")}
        placeholder={t("forms.credentials.scopePlaceholder")}
        options={scopes}
        description={t("forms.applications.scopesHint")}
      />
    </>
  );
}

export const editApplication: TFormOpener = async (done, item) => ({
  title: t("forms.applications.editTitle"),
  description: text(item?.name),
  icon: GridViewIcon,
  body: (
    <SheetForm
      schema={applicationSchema}
      defaultValues={{ name: text(item?.name), description: text(item?.description) }}
      submitLabel={t("forms.save")}
      onSubmit={async (values) => {
        await save("PATCH", "/management/oauth-apps", { id: item?._id, ...values });
        done(t("forms.saved"));
      }}
    >
      <TextField name="name" label={t("fields.name")} placeholder={t("forms.applications.namePlaceholder")} autoFocus />
      <TextAreaField name="description" label={t("fields.description")} placeholder={t("forms.descriptionPlaceholder")} optional />
    </SheetForm>
  ),
});

/** A theme's stored values as the editor's text fields, empty where unset. */
const themeValues = (theme?: TBrandingTheme) => ({
  ...Object.fromEntries(BRANDING_COLORS.map((color) => [color, theme?.[color] ?? ""])),
  radiusPx: theme?.radiusPx === undefined ? "" : String(theme.radiusPx),
});

function ThemeFields({ theme }: { theme: "lightTheme" | "darkTheme" }) {
  return (
    <FormSection title={t(`forms.branding.${theme}`)} description={t("forms.branding.themeHint")}>
      <div className="grid gap-4 sm:grid-cols-2">
        {BRANDING_COLORS.map((color) => (
          <ColorField key={color} name={`${theme}.${color}`} label={t(`forms.branding.colors.${color}`)} />
        ))}
        <TextField name={`${theme}.radiusPx`} type="number" label={t("forms.branding.radius")} placeholder="12" description={t("forms.branding.radiusHint")} ltr />
      </div>
    </FormSection>
  );
}

/**
 * An application's branding: its logos, font and the colours of each theme,
 * which every sign in page and this dashboard wear. Anything left empty keeps
 * the app's own theme.
 */
export const editBranding: TFormOpener = async (done, item) => {
  const branding = (item?.branding ?? {}) as TBranding;
  return {
    title: t("forms.branding.title"),
    description: text(item?.name),
    icon: PaintBoardIcon,
    body: (
      <SheetForm
        schema={brandingSchema}
        defaultValues={{
          logo: branding.logo ?? "",
          darkLogo: branding.darkLogo ?? "",
          fontFamily: branding.fontFamily ?? "",
          lightTheme: themeValues(branding.lightTheme),
          darkTheme: themeValues(branding.darkTheme),
        }}
        submitLabel={t("forms.save")}
        onSubmit={async (values) => {
          await save("PATCH", "/management/oauth-apps", { id: item?._id, branding: values });
          // Read the edited branding past any cached copy. The signed in app may
          // be the one just branded, so wear the session's again.
          await applicationFor({ app: String(item?._id) }, true);
          applyBranding((await reloadSession())?.application ?? null);
          done(t("forms.saved"));
        }}
      >
        <FormSection title={t("forms.branding.identity")} description={t("forms.branding.identityHint")}>
          <TextField name="logo" type="url" label={t("forms.branding.logo")} placeholder="https://example.com/logo.svg" optional ltr />
          <TextField name="darkLogo" type="url" label={t("forms.branding.darkLogo")} placeholder="https://example.com/logo-dark.svg" description={t("forms.branding.darkLogoHint")} optional ltr />
          <TextField name="fontFamily" label={t("forms.branding.font")} placeholder="Inter, sans-serif" description={t("forms.branding.fontHint")} optional ltr />
        </FormSection>
        <ThemeFields theme="lightTheme" />
        <ThemeFields theme="darkTheme" />
      </SheetForm>
    ),
  };
};

/**
 * A sign in provider for one app: add it, or change its name, whether it is
 * on, and whether new people may sign up through it when the host allows it.
 */
export async function ssoProviderForm(appId: string, provider: TSsoProvider, done: (message: string) => void): Promise<TSheetOptions> {
  const added = provider.revision !== null && !provider.archived;
  return {
    title: t(added ? "providers.editTitle" : "providers.addTitle"),
    description: provider.issuer,
    icon: Login03Icon,
    body: (
      <SheetForm
        schema={ssoProviderSchema}
        defaultValues={{ name: provider.name, enabled: added ? provider.enabled : true, allowRegistration: provider.allowRegistration }}
        submitLabel={t(added ? "forms.save" : "providers.add")}
        onSubmit={async (values) => {
          await withTokens((tokens) =>
            api.ssoProviderWrite.execute(tokens, added ? "PATCH" : "POST", {
              appId,
              providerId: provider.id,
              ...values,
              ...(added ? { revision: provider.revision } : {}),
            })
          );
          done(t(added ? "forms.saved" : "providers.added"));
        }}
      >
        <TextField name="name" label={t("providers.name")} placeholder={provider.name} description={t("providers.nameHint")} autoFocus />
        <SwitchField name="enabled" label={t("providers.enabled")} description={t("providers.enabledHint")} />
        {provider.registrationAllowed
          ? <SwitchField name="allowRegistration" label={t("providers.registration")} description={t("providers.registrationHint")} />
          : <p className="text-sm text-muted-foreground">{t("providers.registrationLocked")}</p>}
      </SheetForm>
    ),
  };
}

/** Each kind's client type and grants, which OAuth's credential rules require. */
const CREDENTIAL_SHAPES = {
  browser: { type: "public", grantTypes: ["authorization_code", "refresh_token"] },
  server: { type: "confidential", grantTypes: ["authorization_code", "refresh_token"] },
  machine: { type: "confidential", grantTypes: ["client_credentials"] },
  device: { type: "public", grantTypes: ["device_code", "refresh_token"] },
} as const;

const CREDENTIAL_DEFAULTS: Omit<TCredentialCreateValues, "name"> = {
  kind: "browser",
  redirectUris: "",
  postLogoutRedirectUris: "",
  allowedScopes: ["openid", "profile", "email"],
  consentRequired: true,
  serviceRole: "",
};

/**
 * The credential OAuth stores for a kind of client. A machine gets its own
 * service identity in this account with the chosen role, which OAuth creates
 * and requires for the client credentials grant.
 */
function credentialBody(values: {
  kind: keyof typeof CREDENTIAL_SHAPES;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  allowedScopes: string[];
  consentRequired: boolean;
  serviceRole: string;
}) {
  const shape = CREDENTIAL_SHAPES[values.kind];
  const redirects = values.kind === "browser" || values.kind === "server";
  const machine = values.kind === "machine";
  return {
    type: shape.type,
    grantTypes: shape.grantTypes,
    pkceRequired: true,
    allowedScopes: values.allowedScopes,
    // Nobody is there to approve a machine's request.
    consentRequired: machine ? false : values.consentRequired,
    redirectUris: redirects ? values.redirectUris : [],
    postLogoutRedirectUris: redirects ? values.postLogoutRedirectUris : [],
    ...(machine ? { serviceRole: values.serviceRole } : {}),
  };
}

/** Adds a credential to an application and shows its client ID, and a secret once. */
export async function createCredential(appId: string, onCreated: () => void): Promise<TSheetOptions> {
  const [roles, catalog] = await Promise.all([roleOptions(), loadCatalog()]);
  return {
    title: t("forms.credentials.createTitle"),
    description: t("forms.credentials.createDescription"),
    icon: Key01Icon,
    body: (
      <SheetForm
        schema={credentialCreateSchema}
        defaultValues={{ name: "", ...CREDENTIAL_DEFAULTS }}
        submitLabel={t("forms.create")}
        onSubmit={async ({ name, ...credential }) => {
          const issued = await save("POST", "/management/oauth-credentials", {
            ...credentialBody(credential),
            name,
            appId,
          }, onceKey());
          onCreated();
          showCredentialIssued({ name, clientId: text(issued?.clientId), secret: text(issued?.clientSecret) || undefined });
        }}
      >
        <TextField name="name" label={t("forms.credentials.name")} placeholder={t("forms.credentials.namePlaceholder")} description={t("forms.credentials.nameHint")} autoFocus />
        <CredentialFields roles={roles} scopes={scopeOptions(catalog)} />
      </SheetForm>
    ),
  };
}

/** The kind of client, what that kind needs, its scopes and consent. */
function CredentialFields({ roles, scopes }: { roles: TOption[]; scopes: TOption[] }) {
  const { t } = useTranslation();
  const kind = useWatch<TCredentialCreateValues, "kind">({ name: "kind" });
  return (
    <>
      <SelectField
        name="kind"
        label={t("forms.credentials.kind")}
        placeholder={t("forms.choose")}
        options={translated(CREDENTIAL_KINDS, "forms.credentials.kinds")}
      />
      <CredentialKindFields roles={roles} />
      <ChipsField
        name="allowedScopes"
        label={t("forms.credentials.scopes")}
        placeholder={t("forms.credentials.scopePlaceholder")}
        options={scopes}
        creatable={SCOPE_PATTERN}
        description={t("forms.credentials.scopesHint")}
      />
      {kind !== "machine" && (
        <SwitchField name="consentRequired" label={t("forms.credentials.consent")} description={t("forms.credentials.consentHint")} />
      )}
    </>
  );
}

/** What each kind needs: redirect URLs for sign in, a role for a machine. */
function CredentialKindFields({ roles }: { roles: TOption[] }) {
  const { t } = useTranslation();
  const kind = useWatch<TCredentialCreateValues, "kind">({ name: "kind" });
  return (
    <>
      <p className="-mt-2 text-sm text-muted-foreground">{t(`forms.credentials.kindHints.${kind}`)}</p>
      {(kind === "browser" || kind === "server") && <RedirectFields />}
      {kind === "machine" && (
        <SelectField
          name="serviceRole"
          label={t("forms.credentials.actsAs")}
          placeholder={t("forms.credentials.actsAsPlaceholder")}
          options={roles}
          description={t("forms.credentials.actsAsHint")}
        />
      )}
    </>
  );
}

function RedirectFields() {
  const { t } = useTranslation();
  return (
    <>
      <TextAreaField
        name="redirectUris"
        label={t("forms.credentials.redirectUris")}
        placeholder="https://app.example.com/callback"
        description={t("forms.credentials.urlsHint")}
        ltr
      />
      <TextAreaField
        name="postLogoutRedirectUris"
        label={t("forms.credentials.logoutUris")}
        placeholder="https://app.example.com/"
        description={t("forms.credentials.urlsHint")}
        optional
        ltr
      />
    </>
  );
}

export const editCredential: TFormOpener = async (done, item) => {
  const catalog = await loadCatalog();
  const signsInPeople = Array.isArray(item?.grantTypes) && item.grantTypes.includes("authorization_code");
  const lines = (value: unknown) => (Array.isArray(value) ? value.join("\n") : "");
  return {
    title: t("forms.credentials.editTitle"),
    description: text(item?.name),
    icon: Key01Icon,
    body: (
      <SheetForm
        schema={credentialEditSchema}
        defaultValues={{
          name: text(item?.name),
          redirectUris: lines(item?.redirectUris),
          postLogoutRedirectUris: lines(item?.postLogoutRedirectUris),
          allowedScopes: Array.isArray(item?.allowedScopes) ? item.allowedScopes.map(String) : [],
          consentRequired: item?.consentRequired !== false,
        }}
        submitLabel={t("forms.save")}
        onSubmit={async (values) => {
          await save("PATCH", "/management/oauth-credentials", {
            id: item?._id,
            name: values.name,
            allowedScopes: values.allowedScopes,
            consentRequired: values.consentRequired,
            ...(signsInPeople
              ? { redirectUris: values.redirectUris, postLogoutRedirectUris: values.postLogoutRedirectUris }
              : {}),
          });
          done(t("forms.saved"));
        }}
      >
        <TextField name="name" label={t("fields.name")} placeholder={t("forms.credentials.namePlaceholder")} autoFocus />
        {signsInPeople && <RedirectFields />}
        <ChipsField name="allowedScopes" label={t("forms.credentials.scopes")} placeholder={t("forms.credentials.scopePlaceholder")} options={scopeOptions(catalog)} creatable={SCOPE_PATTERN} />
        <SwitchField name="consentRequired" label={t("forms.credentials.consent")} description={t("forms.credentials.consentHint")} />
      </SheetForm>
    ),
  };
};

/** The forms each Settings list offers, by resource key. */
export const RESOURCE_FORMS: Record<string, {
  create?: TFormOpener;
  edit?: TFormOpener;
  /** More forms a row opens, such as a sub-account under it. */
  extra?: { key: string; label: string; capability: string; open: TFormOpener }[];
}> = {
  accounts: {
    create: createAccount,
    edit: editAccount,
    extra: [{ key: "subAccount", label: "forms.accounts.createSub", capability: "accounts:create", open: createSubAccount }],
  },
  users: { edit: editUser },
  members: { edit: editMember },
  invites: { create: createInvite },
  roles: { create: createRole, edit: editRole },
  policies: { create: (done) => policyForm(done), edit: policyForm },
  applications: { create: createApplication, edit: editApplication },
};
