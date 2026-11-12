import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, User, Mail, Phone, Calendar, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ProfilePictureUpload } from "./ProfilePictureUpload";
import { AvatarPicker } from "./AvatarPicker";
import { useIvory } from "@/hooks/useIvory";

interface StudentProfileEditProps {
  studentId: string;
}

export function StudentProfileEdit({ studentId }: StudentProfileEditProps) {
  const queryClient = useQueryClient();
  // Also rendered on the staff student page (not migrated yet): old classes there.
  const ivory = useIvory();
  const cardCls = ivory ? undefined : "glass-lg border-primary/20";
  const titleCls = ivory ? "flex items-center gap-2" : "flex items-center gap-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent";
  const iconCls = ivory ? "h-5 w-5 text-hec-ink-soft" : "h-5 w-5 text-primary";

  const { data: student, isLoading } = useQuery({
    queryKey: ["student-profile-edit", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState({
    email: student?.email || "",
    phone: student?.phone || "",
    date_of_birth: student?.date_of_birth || "",
    status_message: (student as any)?.status_message || "",
  });

  // Update form when student data loads
  useEffect(() => {
    if (student) {
      setFormData({
        email: student.email || "",
        phone: student.phone || "",
        date_of_birth: student.date_of_birth || "",
        status_message: (student as any)?.status_message || "",
      });
    }
  }, [student]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("students")
        .update({
          email: data.email || null,
          phone: data.phone || null,
          date_of_birth: data.date_of_birth || null,
          status_message: data.status_message || null,
        } as any)
        .eq("id", studentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student-profile-edit", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student-account-info", studentId] });
      toast.success("Profile updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avatar Selection Section */}
      <Card className={cardCls}>
        <CardHeader>
          <CardTitle className={titleCls}>
            <User className={iconCls} />
            Choose Your Avatar
          </CardTitle>
          <CardDescription>Select from standard avatars or unlock premium ones by ranking top-3</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <AvatarPicker
            studentId={studentId}
            currentAvatarUrl={student?.avatar_url}
            onSelect={async (avatarUrl) => {
              console.log("🎨 Saving avatar:", avatarUrl, "for student:", studentId);
              const { error, data } = await supabase
                .from("students")
                .update({ avatar_url: avatarUrl })
                .eq("id", studentId)
                .select();
              
              if (error) {
                console.error("❌ Avatar save error:", error);
                toast.error(`Failed to update avatar: ${error.message}`);
              } else {
                console.log("✅ Avatar saved successfully:", data);
                // Invalidate all related queries
                queryClient.invalidateQueries({ queryKey: ["student", studentId] });
                queryClient.invalidateQueries({ queryKey: ["student-profile-edit", studentId] });
                queryClient.invalidateQueries({ queryKey: ["student-profile", studentId] });
                toast.success("Avatar updated successfully! Refresh to see changes.");
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Profile Picture Upload (Custom) */}
      <Card className={cardCls}>
        <CardHeader>
          <CardTitle className={titleCls}>
            <User className={iconCls} />
            Custom Profile Picture
          </CardTitle>
          <CardDescription>Or upload your own custom picture</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfilePictureUpload
            studentId={studentId}
            currentAvatarUrl={student?.avatar_url}
            studentName={student?.full_name || "Student"}
          />
        </CardContent>
      </Card>

      {/* Status Message Section */}
      <Card className={cardCls}>
        <CardHeader>
          <CardTitle className={titleCls}>
            <MessageCircle className={iconCls} />
            Status Message
          </CardTitle>
          <CardDescription>Set a fun status for your profile! (max 50 characters)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Input
              value={formData.status_message}
              onChange={(e) => {
                if (e.target.value.length <= 50) {
                  setFormData({ ...formData, status_message: e.target.value });
                }
              }}
              placeholder="On a 🔥 streak!"
              maxLength={50}
            />
            <p className={ivory ? "text-hec-caption text-hec-ink-soft text-right" : "text-xs text-muted-foreground text-right"}>{formData.status_message.length}/50</p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Section */}
      <Card className={cardCls}>
        <CardHeader>
          <CardTitle className={titleCls}>
            <Mail className={iconCls} />
            Contact Information
          </CardTitle>
          <CardDescription>Update your contact details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="h-4 w-4 inline mr-2" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="h-4 w-4 inline mr-2" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_birth">
                <Calendar className="h-4 w-4 inline mr-2" />
                Date of Birth
              </Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>

            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
