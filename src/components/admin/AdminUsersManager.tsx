import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserPlus, UserMinus, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface UserWithRole extends User {
  isAdmin: boolean;
}

export function AdminUsersManager() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const { toast } = useToast();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin-users", {
        body: { action: "listUsers" },
      });

      if (error) {
        // The real reason lives in the response body; error.message is only
        // ever the generic "non-2xx status code".
        let detail = error.message;
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) detail = body.error;
        } catch { /* keep the generic message */ }
        throw new Error(detail);
      }
      if (data?.error) throw new Error(data.error);

      setUsers(data.users || []);
    } catch (error: any) {
      toast({
        title: "Error loading users",
        description: error.message || "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setCreateLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin-users", {
        body: { action: "create", email, password },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Admin created",
        description: `Admin user ${email} created successfully`,
      });

      setEmail("");
      setPassword("");
      setConfirmPassword("");
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error creating admin",
        description: error.message || "Failed to create admin user",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handlePromote = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin-users", {
        body: { action: "promote", userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "User promoted",
        description: "User promoted to admin successfully",
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error promoting user",
        description: error.message || "Failed to promote user",
        variant: "destructive",
      });
    }
  };

  const handleRevoke = async () => {
    if (!selectedUser) return;

    try {
      const { data, error } = await supabase.functions.invoke("manage-admin-users", {
        body: { action: "revoke", userId: selectedUser },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Admin revoked",
        description: "Admin role revoked successfully",
      });

      loadUsers();
      setRevokeDialogOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast({
        title: "Error revoking admin",
        description: error.message || "Failed to revoke admin role",
        variant: "destructive",
      });
    }
  };

  const handleCreateTestAdmin = () => {
    setEmail("test@admin.com");
    setPassword("abcabc!");
    setConfirmPassword("abcabc!");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Create Admin User
          </CardTitle>
          <CardDescription>Create a new admin account with full privileges</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createLoading}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Admin
              </Button>
              <Button type="button" variant="outline" onClick={handleCreateTestAdmin}>
                Use Test Admin
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage admin roles for existing users</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground">No users found</p>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium flex items-center gap-2">
                      {user.email}
                      {user.isAdmin && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                          <Shield className="h-3 w-3" />
                          Admin
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ID: {user.id.slice(0, 8)}... • Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!user.isAdmin ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePromote(user.id)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Promote to Admin
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user.id);
                          setRevokeDialogOpen(true);
                        }}
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Revoke Admin
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Revoke Admin Role?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove admin privileges from this user. They will no longer be able to
              access admin features or manage other users. This action is logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-destructive text-destructive-foreground">
              Revoke Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
