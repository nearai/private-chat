import {
  BuildingOffice2Icon,
  GlobeAltIcon,
  KeyIcon,
} from "@heroicons/react/24/solid";
import { useMemo } from "react";
import OrgSettingsForm from "@/components/admin/organization/OrgSettingsForm";
import TabbedContent from "@/components/common/TabbedContent";
import { PermissionGate } from "@/components/common/PermissionGate";

const DomainSettings = () => {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">Domain Verification</h3>
      <p className="text-muted-foreground">
        Verify your organization's domain to enable SAML SSO and automatic user provisioning.
      </p>
      <div className="py-8 text-center text-muted-foreground">
        Domain verification coming soon
      </div>
    </div>
  );
};

const SamlSettings = () => {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">SAML Single Sign-On</h3>
      <p className="text-muted-foreground">
        Configure SAML SSO to allow your team to sign in with your identity provider.
      </p>
      <div className="py-8 text-center text-muted-foreground">
        SAML configuration coming soon
      </div>
    </div>
  );
};

const AdminOrganizationPage = () => {
  const tabs = useMemo(
    () =>
      [
        {
          id: "general",
          label: "General",
          icon: BuildingOffice2Icon,
          content: <OrgSettingsForm />,
        },
        {
          id: "domains",
          label: "Domains",
          icon: GlobeAltIcon,
          content: (
            <PermissionGate permission="domains:manage" fallback={
              <div className="py-8 text-center text-muted-foreground">
                You don't have permission to manage domains.
              </div>
            }>
              <DomainSettings />
            </PermissionGate>
          ),
        },
        {
          id: "saml",
          label: "SAML SSO",
          icon: KeyIcon,
          content: (
            <PermissionGate permission="saml:manage" fallback={
              <div className="py-8 text-center text-muted-foreground">
                You don't have permission to manage SAML settings.
              </div>
            }>
              <SamlSettings />
            </PermissionGate>
          ),
        },
      ] as const,
    []
  );

  return (
    <PermissionGate
      permission="organization:read"
      fallback={
        <div className="py-8 text-center text-muted-foreground">
          You don't have permission to view organization settings.
        </div>
      }
    >
      <TabbedContent tabs={tabs} defaultTab="general" />
    </PermissionGate>
  );
};

export default AdminOrganizationPage;
