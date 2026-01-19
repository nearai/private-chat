import { PermissionGate } from "@/components/common/PermissionGate";
import SamlConfigForm from "@/components/admin/saml/SamlConfigForm";

const AdminSamlPage = () => {
  return (
    <PermissionGate
      permission="settings:update:saml"
      fallback={
        <div className="py-8 text-center text-muted-foreground">
          You don't have permission to manage SAML settings.
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <h2 className="font-semibold text-xl">SAML Single Sign-On</h2>
          <p className="text-muted-foreground">
            Configure SAML SSO to allow your team members to sign in using your organization's identity provider (Okta, Azure AD, etc.)
          </p>
        </div>

        <SamlConfigForm />
      </div>
    </PermissionGate>
  );
};

export default AdminSamlPage;
