import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Trash2, Link, Edit, UserPlus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function UsersManager() {
  const queryClient = useQueryClient();
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedFamily, setSelectedFamily] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);

  const { data: users, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("You are not signed in.");

      const response = await supabase.functions.invoke("manage-admin-users", {
        body: { action: "listUsers" },
      });

      // functions.invoke gives a generic "non-2xx" message; the useful reason
      // (e.g. "Forbidden: Admin only") is in the response body. Without this,
      // every failure looked identical to "there are no users".
      if (response.error) {
        let detail = response.error.message;
        try {
          const body = await (response.error as any).context?.json?.();
          if (body?.error) detail = body.error;
        } catch { /* keep the generic message */ }
        throw new Error(detail);
      }
      if (response.data?.error) throw new Error(response.data.error);
      return (response.data?.users ?? []) as any[];
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ["teachers-for-link"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, user_id")
        .is("user_id", null);
      if (error) throw error;
      return data;
    },
  });

  const { data: families } = useQuery({
    queryKey: ["families-for-link"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("families")
        .select("id, name, primary_user_id")
        .is("primary_user_id", null);
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await supabase.functions.invoke("manage-admin-users", {
        body: { action: "create", email: data.email, password: data.password },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User created successfully");
      setIsCreateOpen(false);
      setNewUserEmail("");
      setNewUserPassword("");
    },
    onError: (error: any) => {
      toast.error("Failed to create user: " + error.message);
    },
  });

  const updateEmailMutation = useMutation({
    mutationFn: async (data: { userId: string; newEmail: string }) => {
      const response = await supabase.functions.invoke("manage-admin-users", {
        body: { action: "updateEmail", userId: data.userId, newEmail: data.newEmail },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Email updated successfully");
      setIsEditOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to update email: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await supabase.functions.invoke("manage-admin-users", {
        body: { action: "delete", userId },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete user: " + error.message);
    },
  });

  const linkTeacherMutation = useMutation({
    mutationFn: async (data: { userId: string; teacherId: string }) => {
      const response = await supabase.functions.invoke("manage-admin-users", {
        body: { action: "linkToTeacher", userId: data.userId, teacherId: data.teacherId },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["teachers-for-link"] });
      toast.success("User linked to teacher successfully");
      setIsLinkOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to link user: " + error.message);
    },
  });

  const linkFamilyMutation = useMutation({
    mutationFn: async (data: { userId: string; familyId: string }) => {
      const response = await supabase.functions.invoke("manage-admin-users", {
        body: { action: "linkToFamily", userId: data.userId, familyId: data.familyId },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["families-for-link"] });
      toast.success("User linked to family successfully");
      setIsLinkOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to link user: " + error.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      const response = await supabase.functions.invoke("manage-admin-users", {
        body: { action: "updateRole", userId: data.userId, role: data.role },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User role updated successfully");
      setIsRoleOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to update role: " + error.message);
    },
  });

  const handleCreate = () => {
    if (!newUserEmail || !newUserPassword) {
      toast.error("Email and password are required");
      return;
    }
    createMutation.mutate({ email: newUserEmail, password: newUserPassword });
  };

  const handleUpdateEmail = () => {
    if (!editEmail) {
      toast.error("Email is required");
      return;
    }
    updateEmailMutation.mutate({ userId: selectedUserId, newEmail: editEmail });
  };

  const handleLinkTeacher = () => {
    if (!selectedTeacher) {
      toast.error("Please select a teacher");
      return;
    }
    linkTeacherMutation.mutate({ userId: selectedUserId, teacherId: selectedTeacher });
  };

  const handleLinkFamily = () => {
    if (!selectedFamily) {
      toast.error("Please select a family");
      return;
    }
    linkFamilyMutation.mutate({ userId: selectedUserId, familyId: selectedFamily });
  };

  const handleUpdateRole = () => {
    if (!selectedRole) {
      toast.error("Please select a role");
      return;
    }
    updateRoleMutation.mutate({ userId: selectedUserId, role: selectedRole });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registered Users
            {!isError && users && (
              <Badge variant="secondary" className="font-normal">
                {users.length}
              </Badge>
            )}
          </CardTitle>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>Create a new user account</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Password"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Loading users...</p>
        ) : isError ? (
          /* An error used to fall through to "No users found", which made a
             permissions or server failure look like an empty database. */
          <div className="py-8 text-center space-y-3">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
            <div>
              <p className="font-semibold text-destructive">Couldn't load users</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto break-words">
                {(error as Error)?.message || "Unknown error"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        ) : users && users.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Linked To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.length > 0 ? (
                        user.roles.map((role: string) => (
                          <Badge key={role} variant="secondary">
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">No role</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.teacher && <Badge variant="outline">Teacher: {user.teacher.name}</Badge>}
                      {user.family && <Badge variant="outline">Family: {user.family.name}</Badge>}
                      {(user.students || []).map((s: any) => (
                        <Badge key={s.id} variant="outline">Student: {s.name}</Badge>
                      ))}
                      {!user.teacher && !user.family && !(user.students || []).length && (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Dialog
                        open={isEditOpen && selectedUserId === user.id}
                        onOpenChange={(open) => {
                          setIsEditOpen(open);
                          if (open) {
                            setSelectedUserId(user.id);
                            setEditEmail(user.email);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Email</DialogTitle>
                          </DialogHeader>
                          <div>
                            <Label htmlFor="edit-email">New Email</Label>
                            <Input
                              id="edit-email"
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                            />
                          </div>
                          <DialogFooter>
                            <Button onClick={handleUpdateEmail}>Update</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog
                        open={isRoleOpen && selectedUserId === user.id}
                        onOpenChange={(open) => {
                          setIsRoleOpen(open);
                          if (open) {
                            setSelectedUserId(user.id);
                            setSelectedRole("");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" title="Change Role">
                            <Users className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update User Role</DialogTitle>
                          </DialogHeader>
                          <div>
                            <Label>Select Role</Label>
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="teacher">Teacher</SelectItem>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="family">Family</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleUpdateRole}>Update Role</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog
                        open={isLinkOpen && selectedUserId === user.id}
                        onOpenChange={(open) => {
                          setIsLinkOpen(open);
                          if (open) {
                            setSelectedUserId(user.id);
                            setSelectedTeacher("");
                            setSelectedFamily("");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" title="Link to Teacher/Family">
                            <Link className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Link User</DialogTitle>
                            <DialogDescription>
                              Link this user to a teacher or family account
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Link to Teacher</Label>
                              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select teacher" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teachers?.map((teacher) => (
                                    <SelectItem key={teacher.id} value={teacher.id}>
                                      {teacher.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={handleLinkTeacher}
                                className="mt-2"
                                disabled={!selectedTeacher}
                                size="sm"
                              >
                                Link to Teacher
                              </Button>
                            </div>
                            <div>
                              <Label>Link to Family</Label>
                              <Select value={selectedFamily} onValueChange={setSelectedFamily}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select family" />
                                </SelectTrigger>
                                <SelectContent>
                                  {families?.map((family) => (
                                    <SelectItem key={family.id} value={family.id}>
                                      {family.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={handleLinkFamily}
                                className="mt-2"
                                disabled={!selectedFamily}
                                size="sm"
                              >
                                Link to Family
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {user.email}? This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(user.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center py-8 text-muted-foreground">No users found</p>
        )}
      </CardContent>
    </Card>
  );
}
