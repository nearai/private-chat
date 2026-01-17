import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { Organization, UpdateOrganizationRequest } from "@/types/enterprise";
import { organizationClient } from "@/api/organization/client";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { toast } from "sonner";

interface OrgSettingsFormProps {
  organization?: Organization;
  onUpdate?: (org: Organization) => void;
}

export function OrgSettingsForm({ organization: propOrg, onUpdate }: OrgSettingsFormProps) {
  const { currentOrganization, setCurrentOrganization } = useOrganizationStore();
  const [organization, setOrganization] = useState<Organization | null>(propOrg || currentOrganization);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(!organization);
  const [formData, setFormData] = useState<UpdateOrganizationRequest>({
    name: organization?.name || "",
    display_name: organization?.display_name || "",
    billing_email: organization?.billing_email || "",
  });

  useEffect(() => {
    if (!organization) {
      fetchOrganization();
    }
  }, []);

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name,
        display_name: organization.display_name || "",
        billing_email: organization.billing_email || "",
      });
    }
  }, [organization]);

  const fetchOrganization = async () => {
    setIsFetching(true);
    try {
      const response = await organizationClient.listOrganizations();
      if (response.organizations.length > 0) {
        setOrganization(response.organizations[0]);
        setCurrentOrganization(response.organizations[0]);
      }
    } catch (error) {
      toast.error("Failed to load organization");
      console.error(error);
    } finally {
      setIsFetching(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No organization found. Please contact support.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updated = await organizationClient.updateOrganization(
        organization.id,
        formData
      );
      toast.success("Organization settings updated");
      onUpdate?.(updated);
    } catch (error) {
      toast.error("Failed to update organization settings");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block font-medium text-sm">
            Organization Name
          </label>
          <input
            type="text"
            value={formData.name || ""}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <div>
          <label className="mb-1 block font-medium text-sm">
            Display Name
          </label>
          <input
            type="text"
            value={formData.display_name || ""}
            onChange={(e) =>
              setFormData({ ...formData, display_name: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-muted-foreground text-sm">
            Friendly name shown in the UI
          </p>
        </div>

        <div>
          <label className="mb-1 block font-medium text-sm">Slug</label>
          <input
            type="text"
            value={organization.slug}
            disabled
            className="w-full cursor-not-allowed rounded-lg border border-border bg-muted px-3 py-2 text-muted-foreground"
          />
          <p className="mt-1 text-muted-foreground text-sm">
            Used in URLs. Cannot be changed.
          </p>
        </div>

        <div>
          <label className="mb-1 block font-medium text-sm">
            Billing Email
          </label>
          <input
            type="email"
            value={formData.billing_email || ""}
            onChange={(e) =>
              setFormData({ ...formData, billing_email: e.target.value })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1 block font-medium text-sm">Plan</label>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary text-sm capitalize">
              {organization.plan_tier}
            </span>
            {organization.plan_tier === "free" && (
              <Button variant="ghost" size="small" type="button">
                Upgrade
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

export default OrgSettingsForm;
