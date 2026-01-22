import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditLog } from "@/types/enterprise";

interface AuditLogTableProps {
  logs: AuditLog[];
  isLoading?: boolean;
}

export function AuditLogTable({ logs, isLoading }: AuditLogTableProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-500/10 text-green-500";
      case "failure":
        return "bg-red-500/10 text-red-500";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No audit logs found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Timestamp</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Resource</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="text-muted-foreground text-sm">
              {formatDate(log.created_at)}
            </TableCell>
            <TableCell className="font-medium">{log.action}</TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span className="text-sm">{log.resource_type}</span>
                {log.resource_id && (
                  <span className="max-w-[150px] truncate text-muted-foreground text-xs">
                    {log.resource_id}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span className="text-sm capitalize">{log.actor_type}</span>
                {log.actor_id && (
                  <span className="max-w-[100px] truncate text-muted-foreground text-xs">
                    {log.actor_id}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <span
                className={`rounded px-2 py-0.5 text-xs capitalize ${getStatusColor(
                  log.status
                )}`}
              >
                {log.status}
              </span>
            </TableCell>
            <TableCell>
              {log.error_message ? (
                <span className="text-destructive text-xs" title={log.error_message}>
                  {log.error_message.slice(0, 30)}
                  {log.error_message.length > 30 ? "..." : ""}
                </span>
              ) : log.changes ? (
                <span className="text-muted-foreground text-xs">
                  {Object.keys(log.changes).length} changes
                </span>
              ) : (
                "-"
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default AuditLogTable;
