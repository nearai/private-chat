import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuditLogQuery } from "@/types/enterprise";

interface AuditLogFiltersProps {
  query: AuditLogQuery;
  onQueryChange: (query: Partial<AuditLogQuery>) => void;
  onExport?: (format: "json" | "csv") => void;
}

export function AuditLogFilters({
  query,
  onQueryChange,
  onExport,
}: AuditLogFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleReset = () => {
    onQueryChange({
      action: undefined,
      resource_type: undefined,
      resource_id: undefined,
      actor_id: undefined,
      status: undefined,
      from_date: undefined,
      to_date: undefined,
      offset: 0,
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap gap-4">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block font-medium text-sm">Action</label>
          <input
            type="text"
            value={query.action || ""}
            onChange={(e) =>
              onQueryChange({ action: e.target.value || undefined, offset: 0 })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="e.g., create, update, delete"
          />
        </div>

        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block font-medium text-sm">Resource Type</label>
          <input
            type="text"
            value={query.resource_type || ""}
            onChange={(e) =>
              onQueryChange({
                resource_type: e.target.value || undefined,
                offset: 0,
              })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="e.g., conversation, workspace"
          />
        </div>

        <div className="min-w-[150px] flex-1">
          <label className="mb-1 block font-medium text-sm">Status</label>
          <select
            value={query.status || ""}
            onChange={(e) =>
              onQueryChange({ status: e.target.value || undefined, offset: 0 })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {showAdvanced && (
        <div className="flex flex-wrap gap-4 border-border border-t pt-2">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block font-medium text-sm">From Date</label>
            <input
              type="datetime-local"
              value={query.from_date?.slice(0, 16) || ""}
              onChange={(e) =>
                onQueryChange({
                  from_date: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                  offset: 0,
                })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block font-medium text-sm">To Date</label>
            <input
              type="datetime-local"
              value={query.to_date?.slice(0, 16) || ""}
              onChange={(e) =>
                onQueryChange({
                  to_date: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                  offset: 0,
                })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block font-medium text-sm">Actor ID</label>
            <input
              type="text"
              value={query.actor_id || ""}
              onChange={(e) =>
                onQueryChange({
                  actor_id: e.target.value || undefined,
                  offset: 0,
                })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="User ID"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="small"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? "Hide Advanced" : "Show Advanced"}
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="small" onClick={handleReset}>
            Reset
          </Button>

          {onExport && (
            <>
              <Button
                variant="ghost"
                size="small"
                onClick={() => onExport("csv")}
              >
                Export CSV
              </Button>
              <Button
                variant="ghost"
                size="small"
                onClick={() => onExport("json")}
              >
                Export JSON
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuditLogFilters;
