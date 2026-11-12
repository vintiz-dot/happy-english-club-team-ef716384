import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
        <Avatar className="h-32 w-32 border border-hec-line">
          <AvatarImage src={currentAvatarUrl || undefined} alt={teacherName} />
          <AvatarFallback className="bg-hec-sunken font-display text-hec-h1 text-hec-ink-soft">{initials}</AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-hec-action/60 opacity-0 transition-opacity duration-hec-1 ease-hec group-hover:opacity-100">
          <Camera className="h-8 w-8 text-hec-on-action" />
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
            className="w-full"
            asChild
          >
            <span>
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5 mr-2" />
                  Edit Profile Picture
                </>
              )}
            </span>
          </Button>
        </label>
      </div>
      
      <p className="text-center text-hec-caption text-hec-ink-soft">
        Maximum file size: 5MB<br />
        Supported formats: JPG, PNG, WEBP
      </p>
    </div>
  );
}
