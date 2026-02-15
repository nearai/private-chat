import type { AuditLog, AuditLogQuery } from "@/types/enterprise";
import { ApiClient } from "../base-client";

interface AuditLogListResponse {
  logs: AuditLog[];
  limit: number;
  offset: number;
  total: number;
}

class AuditClient extends ApiClient {
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

  async queryLogs(query: AuditLogQuery): Promise<AuditLogListResponse> {
    const params = new URLSearchParams();

    if (query.workspace_id) params.append("workspace_id", query.workspace_id);
    if (query.actor_id) params.append("actor_id", query.actor_id);
    if (query.action) params.append("action", query.action);
    if (query.resource_type) params.append("resource_type", query.resource_type);
    if (query.resource_id) params.append("resource_id", query.resource_id);
    if (query.status) params.append("status", query.status);
    if (query.from_date) params.append("from_date", query.from_date);
    if (query.to_date) params.append("to_date", query.to_date);
    if (query.limit) params.append("limit", query.limit.toString());
    if (query.offset) params.append("offset", query.offset.toString());

    const queryString = params.toString();
    const url = queryString
      ? `/admin/audit-logs?${queryString}`
      : "/admin/audit-logs";

    return this.get<AuditLogListResponse>(url);
  }

  async exportLogs(
    query: AuditLogQuery,
    format: "json" | "csv" = "json"
  ): Promise<ArrayBuffer> {
    const params = new URLSearchParams();

    if (query.workspace_id) params.append("workspace_id", query.workspace_id);
    if (query.actor_id) params.append("actor_id", query.actor_id);
    if (query.action) params.append("action", query.action);
    if (query.resource_type) params.append("resource_type", query.resource_type);
    if (query.from_date) params.append("from_date", query.from_date);
    if (query.to_date) params.append("to_date", query.to_date);
    params.append("format", format);

    const queryString = params.toString();
    const url = `/admin/audit-logs/export?${queryString}`;

    // Use requestWithoutJson for binary response
    return this.get<ArrayBuffer>(url);
  }

  // Helper to download exported file
  async downloadExport(
    query: AuditLogQuery,
    format: "json" | "csv" = "json"
  ): Promise<void> {
    const data = await this.exportLogs(query, format);
    const blob = new Blob([data], {
      type: format === "json" ? "application/json" : "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Common query shortcuts
  async getRecentLogs(limit = 50): Promise<AuditLogListResponse> {
    return this.queryLogs({ limit, offset: 0 });
  }

  async getLogsByUser(
    userId: string,
    limit = 50
  ): Promise<AuditLogListResponse> {
    return this.queryLogs({ actor_id: userId, limit, offset: 0 });
  }

  async getLogsByAction(
    action: string,
    limit = 50
  ): Promise<AuditLogListResponse> {
    return this.queryLogs({ action, limit, offset: 0 });
  }

  async getLogsByResource(
    resourceType: string,
    resourceId?: string,
    limit = 50
  ): Promise<AuditLogListResponse> {
    return this.queryLogs({
      resource_type: resourceType,
      resource_id: resourceId,
      limit,
      offset: 0,
    });
  }

  async getLogsByDateRange(
    fromDate: string,
    toDate: string,
    limit = 50
  ): Promise<AuditLogListResponse> {
    return this.queryLogs({
      from_date: fromDate,
      to_date: toDate,
      limit,
      offset: 0,
    });
  }
}

export const auditClient = new AuditClient();
