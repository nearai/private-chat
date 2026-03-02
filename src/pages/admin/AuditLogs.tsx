import { useState, useEffect } from "react";
import { toast } from "sonner";
import AuditLogTable from "@/components/admin/audit/AuditLogTable";
import AuditLogFilters from "@/components/admin/audit/AuditLogFilters";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/common/PermissionGate";
import { auditClient } from "@/api/audit/client";
import type { AuditLog, AuditLogQuery } from "@/types/enterprise";

const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState<AuditLogQuery>({
    limit: 50,
    offset: 0,
  });

  useEffect(() => {
    loadLogs();
  }, [query]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const response = await auditClient.queryLogs(query);
      setLogs(response.logs);
      setTotal(response.total);
    } catch (error) {
      toast.error("Failed to load audit logs");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryChange = (updates: Partial<AuditLogQuery>) => {
    setQuery((prev) => ({ ...prev, ...updates }));
  };

  const handleExport = async (format: "json" | "csv") => {
    try {
      const buffer = await auditClient.exportLogs(query, format);
      const mimeType = format === "json" ? "application/json" : "text/csv";
      const blob = new Blob([buffer], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to export audit logs");
      console.error(error);
    }
  };

  const handlePrevPage = () => {
    if (query.offset && query.offset > 0) {
      handleQueryChange({ offset: Math.max(0, query.offset - (query.limit || 50)) });
    }
  };

  const handleNextPage = () => {
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    if (offset + limit < total) {
      handleQueryChange({ offset: offset + limit });
    }
  };

  const currentPage = Math.floor((query.offset || 0) / (query.limit || 50)) + 1;
  const totalPages = Math.ceil(total / (query.limit || 50));

  return (
    <PermissionGate
      permission="audit:read"
      fallback={
        <div className="py-8 text-center text-muted-foreground">
          You don't have permission to view audit logs.
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-xl">Audit Logs</h2>
          <span className="text-muted-foreground text-sm">
            {total} total entries
          </span>
        </div>

        <AuditLogFilters
          query={query}
          onQueryChange={handleQueryChange}
          onExport={handleExport}
        />

        <AuditLogTable logs={logs} isLoading={isLoading} />

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="small"
                onClick={handlePrevPage}
                disabled={(query.offset || 0) === 0}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="small"
                onClick={handleNextPage}
                disabled={(query.offset || 0) + (query.limit || 50) >= total}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
};

export default AdminAuditLogsPage;
