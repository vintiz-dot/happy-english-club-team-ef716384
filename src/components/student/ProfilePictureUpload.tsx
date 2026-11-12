import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAvatarUrl } from "@/lib/avatars";
import { useIvory } from "@/hooks/useIvory";

interface ProfilePictureUploadProps {
  studentId?: string;
  currentAvatarUrl?: string | null;
  studentName: string;
}

export function ProfilePictureUpload({ 
  studentId,
  currentAvatarUrl,
  studentName 
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false);
  // Also rendered on the staff student page (not migrated yet): old classes there.
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Client-side validation
      if (!file.type.startsWith("image/")) {
        throw new Error("Please upload an image file");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image must be less than 5MB");
      }

      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to upload a profile picture");
      }

      // Create form data with the file
      const formData = new FormData();
      formData.append('file', file);
      if (studentId) {
        formData.append('studentId', studentId);
      }

      // Call the edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-student-avatar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload profile picture');
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["student-profile"] });
      if (data.studentId) {
        queryClient.invalidateQueries({ queryKey: ["student", data.studentId] });
      }
      toast.success("Profile picture updated successfully");
    },
    onError: (error: Error) => {
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

  const initials = studentName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className={iv("h-32 w-32 border border-hec-line", "h-32 w-32 ring-4 ring-primary/10 transition-all group-hover:ring-primary/20")}>
          <AvatarImage src={getAvatarUrl(currentAvatarUrl) || undefined} alt={studentName} className="object-cover" />
          <AvatarFallback className={iv("bg-hec-sunken text-hec-h1 text-hec-ink", "text-2xl bg-gradient-to-br from-primary/20 to-primary/10")}>{initials}</AvatarFallback>
        </Avatar>
        <div className={iv("absolute inset-0 bg-hec-action/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-hec-1 flex items-center justify-center", "absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center")}>
          <Camera className={iv("h-8 w-8 text-hec-on-action", "h-8 w-8 text-white")} />
        </div>
      </div>
      
      <div className="w-full max-w-xs">
        <input
          type="file"
          id="avatar-upload"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />
        <label htmlFor="avatar-upload" className="w-full">
          <Button
            type="button"
            variant="default"
            size="lg"
            disabled={uploading}
            onClick={() => document.getElementById("avatar-upload")?.click()}
            className="w-full font-semibold"
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
      
      <p className={iv("text-hec-caption text-hec-ink-soft text-center", "text-xs text-muted-foreground text-center")}>
        Maximum file size: 5MB<br />
        Supported formats: JPG, PNG, WEBP
      </p>
    </div>
  );
}
