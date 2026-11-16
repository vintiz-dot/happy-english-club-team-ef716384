import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useIvory } from "@/hooks/useIvory";

interface TeacherProfilePictureUploadProps {
  teacherId: string;
  currentAvatarUrl?: string | null;
  teacherName: string;
}

export function TeacherProfilePictureUpload({ 
  teacherId, 
  currentAvatarUrl,
  teacherName 
}: TeacherProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  // Also rendered on the admin's /teachers/:id: old classes until the staff area is listed (R21).
  const ivory = useIvory();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Validate file
      if (!file.type.startsWith("image/")) {
        throw new Error("Please upload an image file");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image must be less than 5MB");
      }

      // Delete old avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split("/").pop();
        if (oldPath) {
          await supabase.storage
            .from("teacher-avatars")
            .remove([`${teacherId}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${teacherId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("teacher-avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("teacher-avatars")
        .getPublicUrl(filePath);

      // Update teacher record
      const { error: updateError } = await supabase
        .from("teachers")
        .update({ avatar_url: publicUrl })
        .eq("id", teacherId);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher", teacherId] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Profile picture updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to upload profile picture");
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setUploading(false);
    }
  };

  const initials = teacherName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className={ivory ? "h-32 w-32 ring-1 ring-hec-line" : "h-32 w-32 ring-4 ring-primary/10 transition-all group-hover:ring-primary/20"}>
          <AvatarImage src={currentAvatarUrl || undefined} alt={teacherName} />
          <AvatarFallback className={ivory ? "text-hec-h2 bg-hec-sunken text-hec-ink-soft" : "text-2xl bg-gradient-to-br from-primary/20 to-primary/10"}>{initials}</AvatarFallback>
        </Avatar>
        <div className={ivory ? "absolute inset-0 bg-hec-ink/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-hec-1 ease-hec flex items-center justify-center" : "absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"}>
          <Camera className={ivory ? "h-8 w-8 text-hec-paper" : "h-8 w-8 text-white"} />
        </div>
      </div>
      
      <div className="w-full max-w-xs">
        <input
          type="file"
          id="teacher-avatar-upload"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />
        <label htmlFor="teacher-avatar-upload" className="w-full">
          <Button
            type="button"
            variant="default"
            size="lg"
            disabled={uploading}
            onClick={() => document.getElementById("teacher-avatar-upload")?.click()}
            className={ivory ? "w-full" : "w-full font-semibold"}
            asChild
          >
            <span>
              {uploading ? (
                <>
                  <Loader2 className={ivory ? "h-5 w-5 animate-spin" : "h-5 w-5 mr-2 animate-spin"} />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className={ivory ? "h-5 w-5" : "h-5 w-5 mr-2"} />
                  Edit Profile Picture
                </>
              )}
            </span>
          </Button>
        </label>
      </div>

      <p className={ivory ? "text-hec-caption text-hec-ink-soft text-center" : "text-xs text-muted-foreground text-center"}>
        Maximum file size: 5MB<br />
        Supported formats: JPG, PNG, WEBP
      </p>
    </div>
  );
}
