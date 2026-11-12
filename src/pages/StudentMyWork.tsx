import Layout from "@/components/Layout";
import { MyWorkGallery } from "@/components/student/MyWorkGallery";
import { FileImage } from "lucide-react";

export default function StudentMyWork() {
  return (
    <Layout title="My Work">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-md border border-hec-line bg-hec-sunken">
            <FileImage className="h-6 w-6 text-hec-ink-soft" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">My Work</h1>
            <p className="text-hec-small text-hec-ink-soft">
              Classwork your teacher scanned and shared with you — with their notes.
            </p>
          </div>
        </div>
        <MyWorkGallery />
      </div>
    </Layout>
  );
}
