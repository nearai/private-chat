import type {
  CreateOrganizationRequest,
  Organization,
  OrganizationMember,
  UpdateOrganizationRequest,
  DomainVerification,
  VerificationInstructions,
  AddDomainRequest,
  SamlConfig,
  CreateSamlConfigRequest,
  UpdateSamlConfigRequest,
} from "@/types/enterprise";
import { ApiClient } from "../base-client";

interface OrganizationListResponse {
  organizations: Organization[];
  limit: number;
  offset: number;
  total: number;
}

interface MemberListResponse {
  members: OrganizationMember[];
  limit: number;
  offset: number;
  total: number;
}

interface DomainListResponse {
  domains: DomainVerification[];
}

interface VerifyDomainResponse {
  success: boolean;
  message: string;
  status: string;
  domain?: DomainVerification;
}

class OrganizationClient extends ApiClient {
  constructor() {
    super({
      apiPrefix: "/api/v1",
      defaultHeaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      includeAuth: true,
    });
  }

  // Organization CRUD
  async listOrganizations(
    limit = 50,
    offset = 0
  ): Promise<OrganizationListResponse> {
    return this.get<OrganizationListResponse>(
      `/organizations?limit=${limit}&offset=${offset}`
    );
  }

  async getOrganization(id: string): Promise<Organization> {
    return this.get<Organization>(`/organizations/${id}`);
  }

  async getOrganizationBySlug(slug: string): Promise<Organization> {
    return this.get<Organization>(`/organizations/by-slug/${slug}`);
  }

  async createOrganization(
    data: CreateOrganizationRequest
  ): Promise<Organization> {
    return this.post<Organization>("/organizations", data);
  }

  async updateOrganization(
    id: string,
    data: UpdateOrganizationRequest
  ): Promise<Organization> {
    return this.patch<Organization>(`/organizations/${id}`, data);
  }

  async deleteOrganization(id: string): Promise<void> {
    return this.delete<void>(`/organizations/${id}`);
  }

  // Members
  async listMembers(
    organizationId: string,
    limit = 50,
    offset = 0
  ): Promise<MemberListResponse> {
    return this.get<MemberListResponse>(
      `/organizations/${organizationId}/members?limit=${limit}&offset=${offset}`
    );
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    return this.delete<void>(
      `/organizations/${organizationId}/members/${userId}`
    );
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: string
  ): Promise<void> {
    return this.patch<void>(
      `/organizations/${organizationId}/members/${userId}`,
      { role }
    );
  }

  // Domain Verification
  async listDomains(): Promise<DomainListResponse> {
    return this.get<DomainListResponse>("/admin/domains");
  }

  async addDomain(data: AddDomainRequest): Promise<VerificationInstructions> {
    return this.post<VerificationInstructions>("/admin/domains", data);
  }

  async getDomain(id: string): Promise<VerificationInstructions> {
    return this.get<VerificationInstructions>(`/admin/domains/${id}`);
  }

  async verifyDomain(id: string): Promise<VerifyDomainResponse> {
    return this.post<VerifyDomainResponse>(`/admin/domains/${id}/verify`, {});
  }

  async removeDomain(id: string): Promise<void> {
    return this.delete<void>(`/admin/domains/${id}`);
  }

  // SAML Configuration
  async getSamlConfig(): Promise<SamlConfig | null> {
    try {
      return await this.get<SamlConfig>("/admin/saml/config");
    } catch {
      return null;
    }
  }

  async createSamlConfig(data: CreateSamlConfigRequest): Promise<SamlConfig> {
    return this.post<SamlConfig>("/admin/saml/config", data);
  }

  async updateSamlConfig(data: UpdateSamlConfigRequest): Promise<SamlConfig> {
    return this.patch<SamlConfig>("/admin/saml/config", data);
  }

  async deleteSamlConfig(): Promise<void> {
    return this.delete<void>("/admin/saml/config");
  }

  async enableSaml(): Promise<void> {
    return this.post<void>("/admin/saml/config/enable", {});
  }

  async disableSaml(): Promise<void> {
    return this.post<void>("/admin/saml/config/disable", {});
  }

  async getSamlMetadata(): Promise<string> {
    return this.get<string>("/admin/saml/metadata");
  }
}

export const organizationClient = new OrganizationClient();
