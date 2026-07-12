import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Search, AlertTriangle, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminUsersManager } from "@/components/admin/AdminUsersManager";
import { UsersManager } from "@/components/admin/UsersManager";
import { PageHero } from "@/components/quest/PageHero";

const DataTab = () => {
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [importResult, setImportResult] = useState<any>(null);
  const [integrityResult, setIntegrityResult] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logQuery, setLogQuery] = useState("");
  const [logLimit, setLogLimit] = useState("100");
  const { toast } = useToast();

  const exportData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-data-export');
      
      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `happy-english-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `All data exported successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const importData = async (file: File) => {
    setLoading(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const { data: result, error } = await supabase.functions.invoke('admin-data-import', {
        body: data,
      });

      if (error) throw error;

      setImportResult(result);
      toast({
        title: dryRun ? "Dry run complete" : "Import successful",
        description: dryRun ? "Review results below" : "Data imported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runIntegrityScan = async () => {
    setLoading(true);
    setIntegrityResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-integrity-scan');
      
      if (error) throw error;

      setIntegrityResult(data);
      toast({
        title: "Integrity scan complete",
        description: `Found ${Object.values(data.summary).reduce((a: any, b: any) => a + b, 0)} issues`,
      });
    } catch (error: any) {
      toast({
        title: "Scan failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-activity-logs', {
        body: { q: logQuery, limit: parseInt(logLimit) }
      });

      if (error) throw error;

      setLogs(data.logs || []);
      toast({
        title: "Logs loaded",
        description: `${data.logs?.length || 0} log entries retrieved`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to load logs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="System"
        title="Data Management"
        subtitle="Export, import, and audit your system data."
        variant="citrus"
      />

      <Tabs defaultValue="export">
        <TabsList>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="integrity">Integrity</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="account">Account Management</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export All Data
              </CardTitle>
              <CardDescription>Download complete system data as JSON</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={exportData} disabled={loading}>
                <Download className="h-4 w-4 mr-2" />
                Export to JSON
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Data
              </CardTitle>
              <CardDescription>Upload and restore system data from JSON</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="dryRun"
                  checked={dryRun}
                  onCheckedChange={(checked) => setDryRun(checked === true)}
                />
                <Label htmlFor="dryRun">Dry run (validate only, don't apply)</Label>
              </div>

              <div>
                <Input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importData(file);
                  }}
                  disabled={loading}
                />
              </div>

              {importResult && (
                <div className="p-4 bg-muted rounded-lg">
                  <pre className="text-xs overflow-auto max-h-64">
                    {JSON.stringify(importResult, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Data Integrity Scan
              </CardTitle>
              <CardDescription>Check for orphaned records and inconsistencies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={runIntegrityScan} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Run Scan
              </Button>

              {integrityResult && (
                <div className="space-y-4">
                  <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                    {Object.entries(integrityResult.summary).map(([key, count]: [string, any]) => (
                      <Card key={key}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">
                            {key.replace(/_/g, ' ')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold ${count > 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {count}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium mb-2">Detailed Issues:</p>
                    <pre className="text-xs overflow-auto max-h-96">
                      {JSON.stringify(integrityResult.issues, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Log
              </CardTitle>
              <CardDescription>View recent system activities and changes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  placeholder="Filter by action..."
                  value={logQuery}
                  onChange={(e) => setLogQuery(e.target.value)}
                  className="flex-1"
                />
                <Select value={logLimit} onValueChange={setLogLimit}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={fetchLogs} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Load
                </Button>
              </div>

              {logs.length > 0 && (
                <div className="border rounded-lg overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Entity ID</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">
                            {new Date(log.occurred_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium">{log.action}</TableCell>
                          <TableCell>{log.entity}</TableCell>
                          <TableCell className="text-xs font-mono">{log.entity_id?.slice(0, 8)}</TableCell>
                          <TableCell>
                            <details className="cursor-pointer">
                              <summary className="text-xs text-muted-foreground">View</summary>
                              <pre className="text-xs mt-2 p-2 bg-muted rounded">
                                {JSON.stringify(log.diff, null, 2)}
                              </pre>
                            </details>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UsersManager />
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Account Management</CardTitle>
              <CardDescription>Create and manage administrator accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminUsersManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataTab;
