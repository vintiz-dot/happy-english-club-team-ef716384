import Layout from "@/components/Layout";
import { MyWorkGallery } from "@/components/student/MyWorkGallery";
import { FileImage } from "lucide-react";

export default function StudentMyWork() {
  return (
    <Layout title="My Work">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-md">
            <FileImage className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Work</h1>
            <p className="text-sm text-muted-foreground">
              Classwork your teacher scanned and shared with you — with their notes.
            </p>
          </div>
        </div>
        <MyWorkGallery />
      </div>
    </Layout>
  );
}
