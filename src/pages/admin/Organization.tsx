import {
  BuildingOffice2Icon,
  GlobeAltIcon,
  KeyIcon,
} from "@heroicons/react/24/solid";
import { useMemo } from "react";
import OrgSettingsForm from "@/components/admin/organization/OrgSettingsForm";
import DomainVerificationWizard from "@/components/admin/domains/DomainVerificationWizard";
import SamlConfigForm from "@/components/admin/saml/SamlConfigForm";
import TabbedContent from "@/components/common/TabbedContent";
import { PermissionGate } from "@/components/common/PermissionGate";

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
              <DomainVerificationWizard />
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
              <SamlConfigForm />
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
