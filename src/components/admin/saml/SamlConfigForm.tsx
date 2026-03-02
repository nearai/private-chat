import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { SamlConfig, CreateSamlConfigRequest, UpdateSamlConfigRequest, SamlAttributeMapping, Workspace } from "@/types/enterprise";
import { organizationClient } from "@/api/organization/client";
import { workspaceClient } from "@/api/workspace/client";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { toast } from "sonner";
import { ClipboardIcon, CheckIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface SamlConfigFormProps {
  onUpdate?: (config: SamlConfig) => void;
}

export function SamlConfigForm({ onUpdate }: SamlConfigFormProps) {
  const { currentOrganization } = useOrganizationStore();
  const [config, setConfig] = useState<SamlConfig | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);

  const [formData, setFormData] = useState<CreateSamlConfigRequest>({
    idp_entity_id: "",
    idp_sso_url: "",
    idp_slo_url: "",
    idp_certificate: "",
    attribute_mapping: {
      email: "email",
      first_name: "firstName",
      last_name: "lastName",
      display_name: "displayName",
    },
    jit_provisioning_enabled: true,
    jit_default_role: "member",
    jit_default_workspace_id: undefined,
  });

  useEffect(() => {
    fetchConfig();
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (config) {
      setFormData({
        idp_entity_id: config.idp_entity_id,
        idp_sso_url: config.idp_sso_url,
        idp_slo_url: config.idp_slo_url || "",
        idp_certificate: config.idp_certificate,
        attribute_mapping: config.attribute_mapping,
        jit_provisioning_enabled: config.jit_provisioning_enabled,
        jit_default_role: config.jit_default_role,
        jit_default_workspace_id: config.jit_default_workspace_id,
      });
    }
  }, [config]);

  const fetchConfig = async () => {
    setIsFetching(true);
    try {
      const samlConfig = await organizationClient.getSamlConfig();
      setConfig(samlConfig);
    } catch (error) {
      console.error("Failed to fetch SAML config:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const response = await workspaceClient.listWorkspaces();
      setWorkspaces(response.workspaces);
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let updated: SamlConfig;
      if (config) {
        const updateData: UpdateSamlConfigRequest = {
          idp_entity_id: formData.idp_entity_id,
          idp_sso_url: formData.idp_sso_url,
          idp_slo_url: formData.idp_slo_url || undefined,
          idp_certificate: formData.idp_certificate,
          attribute_mapping: formData.attribute_mapping,
          jit_provisioning_enabled: formData.jit_provisioning_enabled,
          jit_default_role: formData.jit_default_role,
          jit_default_workspace_id: formData.jit_default_workspace_id,
        };
        updated = await organizationClient.updateSamlConfig(updateData);
        toast.success("SAML configuration updated");
      } else {
        updated = await organizationClient.createSamlConfig(formData);
        toast.success("SAML configuration created");
      }
      setConfig(updated);
      onUpdate?.(updated);
    } catch (error) {
      toast.error(`Failed to save SAML configuration: ${error}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!config) return;
    setIsLoading(true);

    try {
      const updated = config.is_enabled
        ? await organizationClient.disableSaml()
        : await organizationClient.enableSaml();
      setConfig(updated);
      toast.success(`SAML SSO ${updated.is_enabled ? "enabled" : "disabled"}`);
      onUpdate?.(updated);
    } catch (error) {
      toast.error(`Failed to ${config.is_enabled ? "disable" : "enable"} SAML`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!config) return;
    if (!confirm("Are you sure you want to delete the SAML configuration? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    try {
      await organizationClient.deleteSamlConfig();
      setConfig(null);
      setFormData({
        idp_entity_id: "",
        idp_sso_url: "",
        idp_slo_url: "",
        idp_certificate: "",
        attribute_mapping: {
          email: "email",
          first_name: "firstName",
          last_name: "lastName",
          display_name: "displayName",
        },
        jit_provisioning_enabled: true,
        jit_default_role: "member",
        jit_default_workspace_id: undefined,
      });
      toast.success("SAML configuration deleted");
    } catch (error) {
      toast.error("Failed to delete SAML configuration");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAttributeMapping = (key: keyof SamlAttributeMapping, value: string) => {
    setFormData({
      ...formData,
      attribute_mapping: {
        ...formData.attribute_mapping,
        [key]: value,
      },
    });
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Service Provider Info */}
      <div className="space-y-4 rounded-lg border border-border bg-muted/50 p-4">
        <h3 className="font-medium">Service Provider (SP) Information</h3>
        <p className="text-muted-foreground text-sm">
          Use these values when configuring your Identity Provider (Okta, Azure AD, etc.)
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-muted-foreground text-sm">Entity ID / Audience URI</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm">
                {config?.sp_entity_id || currentOrganization?.slug ? `${window.location.origin}` : "Configure organization first"}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(config?.sp_entity_id || window.location.origin, "entity_id")}
                className="rounded p-2 hover:bg-muted"
              >
                {copiedField === "entity_id" ? (
                  <CheckIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <ClipboardIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-muted-foreground text-sm">ACS URL / Single Sign-On URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm">
                {config?.sp_acs_url || `${window.location.origin}/v1/auth/saml/acs`}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(config?.sp_acs_url || `${window.location.origin}/v1/auth/saml/acs`, "acs_url")}
                className="rounded p-2 hover:bg-muted"
              >
                {copiedField === "acs_url" ? (
                  <CheckIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <ClipboardIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-muted-foreground text-sm">NameID Format</label>
            <code className="block rounded bg-background px-3 py-2 font-mono text-sm">
              urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress
            </code>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      {config && (
        <div className={`flex items-center justify-between rounded-lg border p-4 ${
          config.is_enabled
            ? "border-green-500/20 bg-green-500/10"
            : "border-yellow-500/20 bg-yellow-500/10"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${config.is_enabled ? "bg-green-500" : "bg-yellow-500"}`} />
            <span className="font-medium">
              SAML SSO is {config.is_enabled ? "enabled" : "disabled"}
            </span>
          </div>
          <Button
            variant={config.is_enabled ? "secondary" : "default"}
            onClick={handleToggleEnabled}
            disabled={isLoading}
          >
            {config.is_enabled ? "Disable SAML" : "Enable SAML"}
          </Button>
        </div>
      )}

      {/* Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium">Identity Provider (IdP) Settings</h3>

          <div>
            <label className="mb-1 block font-medium text-sm">
              IdP Entity ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.idp_entity_id}
              onChange={(e) => setFormData({ ...formData, idp_entity_id: e.target.value })}
              placeholder="e.g., http://www.okta.com/exk123abc"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <p className="mt-1 text-muted-foreground text-sm">
              The unique identifier for your Identity Provider
            </p>
          </div>

          <div>
            <label className="mb-1 block font-medium text-sm">
              IdP SSO URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.idp_sso_url}
              onChange={(e) => setFormData({ ...formData, idp_sso_url: e.target.value })}
              placeholder="e.g., https://your-org.okta.com/app/app123/sso/saml"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <p className="mt-1 text-muted-foreground text-sm">
              The URL where users will be redirected to sign in
            </p>
          </div>

          <div>
            <label className="mb-1 block font-medium text-sm">IdP SLO URL (Optional)</label>
            <input
              type="url"
              value={formData.idp_slo_url}
              onChange={(e) => setFormData({ ...formData, idp_slo_url: e.target.value })}
              placeholder="e.g., https://your-org.okta.com/app/app123/slo/saml"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-muted-foreground text-sm">
              Single Logout URL for coordinated logout (optional)
            </p>
          </div>

          <div>
            <label className="mb-1 block font-medium text-sm">
              IdP Certificate <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                value={formData.idp_certificate}
                onChange={(e) => setFormData({ ...formData, idp_certificate: e.target.value })}
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                className="min-h-[120px] w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              {formData.idp_certificate && (
                <button
                  type="button"
                  onClick={() => setShowCertificate(!showCertificate)}
                  className="absolute top-2 right-2 rounded bg-muted px-2 py-1 text-xs hover:bg-muted/80"
                >
                  {showCertificate ? "Hide" : "Show"}
                </button>
              )}
            </div>
            <p className="mt-1 text-muted-foreground text-sm">
              The X.509 certificate from your Identity Provider (in PEM format)
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Attribute Mapping</h3>
          <p className="text-muted-foreground text-sm">
            Map SAML attributes from your IdP to user fields. These are the attribute names sent in the SAML assertion.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-sm">Email Attribute</label>
              <input
                type="text"
                value={formData.attribute_mapping?.email || "email"}
                onChange={(e) => updateAttributeMapping("email", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-sm">First Name Attribute</label>
              <input
                type="text"
                value={formData.attribute_mapping?.first_name || "firstName"}
                onChange={(e) => updateAttributeMapping("first_name", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-sm">Last Name Attribute</label>
              <input
                type="text"
                value={formData.attribute_mapping?.last_name || "lastName"}
                onChange={(e) => updateAttributeMapping("last_name", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-sm">Display Name Attribute</label>
              <input
                type="text"
                value={formData.attribute_mapping?.display_name || "displayName"}
                onChange={(e) => updateAttributeMapping("display_name", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Just-in-Time (JIT) Provisioning</h3>
          <p className="text-muted-foreground text-sm">
            Automatically create user accounts when users sign in via SAML for the first time.
          </p>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="jit_enabled"
              checked={formData.jit_provisioning_enabled}
              onChange={(e) => setFormData({ ...formData, jit_provisioning_enabled: e.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="jit_enabled" className="font-medium text-sm">
              Enable JIT Provisioning
            </label>
          </div>

          {formData.jit_provisioning_enabled && (
            <div className="ml-7 space-y-4">
              <div>
                <label className="mb-1 block font-medium text-sm">Default Role</label>
                <select
                  value={formData.jit_default_role}
                  onChange={(e) => setFormData({ ...formData, jit_default_role: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="mt-1 text-muted-foreground text-sm">
                  The organization role assigned to new users
                </p>
              </div>

              <div>
                <label className="mb-1 block font-medium text-sm">Default Workspace (Optional)</label>
                <select
                  value={formData.jit_default_workspace_id || ""}
                  onChange={(e) => setFormData({ ...formData, jit_default_workspace_id: e.target.value || undefined })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">None</option>
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name} {ws.is_default && "(Default)"}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-muted-foreground text-sm">
                  Automatically add new users to this workspace
                </p>
              </div>
            </div>
          )}

          {!formData.jit_provisioning_enabled && (
            <div className="ml-7 flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-yellow-500" />
              <p className="text-sm">
                With JIT provisioning disabled, users must be manually created before they can sign in via SAML.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-border border-t pt-6">
          {config && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              Delete Configuration
            </Button>
          )}
          <div className={!config ? "ml-auto" : ""}>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : config ? "Update Configuration" : "Create Configuration"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default SamlConfigForm;
