import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlaceholderCard } from "@/components/ui/loading";

interface TeacherProfileAuditProps {
  teacherId: string;
}

export function TeacherProfileAudit({ teacherId }: TeacherProfileAuditProps) {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["teacher-audit", teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .eq("entity", "teacher")
        .eq("entity_id", teacherId)
        .order("occurred_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "default";
      case "update":
        return "secondary";
      case "delete":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
        <CardDescription>History of changes to this teacher's profile</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PlaceholderCard rows={3} />
        ) : !auditLogs || auditLogs.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No audit records found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead>Actor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {new Date(log.occurred_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionColor(log.action) as any}>{log.action}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(log.diff, null, 2)}
                    </pre>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.actor_user_id?.slice(0, 8) || "System"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
