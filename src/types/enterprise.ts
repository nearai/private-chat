// Enterprise types for organization, workspace, roles, permissions, audit

// Organization types
export type PlanTier = "free" | "pro" | "enterprise";
export type OrganizationStatus = "active" | "suspended" | "deleted";
export type OrgRole = "owner" | "admin" | "member";

export interface OrganizationSettings {
  personal?: boolean;
  default_model?: string;
  enforce_sso?: boolean;
  allowed_email_domains?: string[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  logo_url?: string;
  plan_tier: PlanTier;
  billing_email?: string;
  settings: OrganizationSettings;
  status: OrganizationStatus;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  user_id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  org_role: OrgRole;
  joined_at: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  display_name?: string;
  logo_url?: string;
  plan_tier?: PlanTier;
  billing_email?: string;
  settings?: OrganizationSettings;
}

export interface UpdateOrganizationRequest {
  name?: string;
  display_name?: string;
  logo_url?: string;
  billing_email?: string;
  settings?: OrganizationSettings;
}

// Workspace types
export type WorkspaceStatus = "active" | "archived" | "deleted";
export type WorkspaceRole = "admin" | "member" | "viewer";

export interface WorkspaceSettings {
  default_model?: string;
  allowed_models?: string[];
}

export interface Workspace {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string;
  settings: WorkspaceSettings;
  is_default: boolean;
  status: WorkspaceStatus;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  user_id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: WorkspaceRole;
  status: string;
  joined_at: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  slug: string;
  description?: string;
  settings?: WorkspaceSettings;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  settings?: WorkspaceSettings;
}

// Role and Permission types
export interface Permission {
  id: string;
  name: string;
  description?: string;
  module: string;
  action: string;
  scope?: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  is_system: boolean;
  organization_id?: string;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permission_ids: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permission_ids?: string[];
}

// Audit Log types
export type ActorType = "user" | "system" | "api";
export type AuditStatus = "success" | "failure" | "pending";

export interface AuditLog {
  id: number;
  organization_id: string;
  workspace_id?: string;
  actor_id?: string;
  actor_type: string;
  actor_ip?: string;
  actor_user_agent?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status: string;
  error_message?: string;
  created_at: string;
}

export interface AuditLogQuery {
  workspace_id?: string;
  actor_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

// Domain Verification types
export type VerificationMethod = "dns_txt" | "http_file";
export type VerificationStatus = "pending" | "verified" | "failed" | "expired";

export interface DomainVerification {
  id: string;
  organization_id: string;
  domain: string;
  verification_method: VerificationMethod;
  verification_token: string;
  status: VerificationStatus;
  verified_at?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationInstructions {
  domain: string;
  verification_method: string;
  token: string;
  expected_value: string;
  instructions: string;
  expires_at: string;
  dns_record_type?: string;
  dns_record_name?: string;
  dns_record_value?: string;
  http_path?: string;
  http_content?: string;
}

export interface AddDomainRequest {
  domain: string;
  verification_method?: VerificationMethod;
}

// SAML types
export interface SamlAttributeMapping {
  email?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  groups?: string;
}

export interface SamlConfig {
  organization_id: string;
  idp_entity_id: string;
  idp_sso_url: string;
  idp_slo_url?: string;
  idp_certificate: string;
  sp_entity_id: string;
  sp_acs_url: string;
  sp_slo_url?: string;
  attribute_mapping: SamlAttributeMapping;
  jit_provisioning_enabled: boolean;
  jit_default_role: string;
  jit_default_workspace_id?: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSamlConfigRequest {
  idp_entity_id: string;
  idp_sso_url: string;
  idp_slo_url?: string;
  idp_certificate: string;
  attribute_mapping?: SamlAttributeMapping;
  jit_provisioning_enabled?: boolean;
  jit_default_role?: string;
  jit_default_workspace_id?: string;
}

export interface UpdateSamlConfigRequest {
  idp_entity_id?: string;
  idp_sso_url?: string;
  idp_slo_url?: string;
  idp_certificate?: string;
  attribute_mapping?: SamlAttributeMapping;
  jit_provisioning_enabled?: boolean;
  jit_default_role?: string;
  jit_default_workspace_id?: string;
  is_enabled?: boolean;
}

// Store types
export interface OrganizationStore {
  currentOrganization: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  error: string | null;
  setCurrentOrganization: (org: Organization | null) => void;
  setOrganizations: (orgs: Organization[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export interface WorkspaceStore {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  recentWorkspaces: string[];
  isLoading: boolean;
  error: string | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  addRecentWorkspace: (workspaceId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export interface PermissionsStore {
  permissions: string[];
  roles: Role[];
  isLoading: boolean;
  error: string | null;
  setPermissions: (permissions: string[]) => void;
  setRoles: (roles: Role[]) => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export interface AuditStore {
  logs: AuditLog[];
  total: number;
  query: AuditLogQuery;
  isLoading: boolean;
  error: string | null;
  setLogs: (logs: AuditLog[], total: number) => void;
  setQuery: (query: Partial<AuditLogQuery>) => void;
  resetQuery: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
