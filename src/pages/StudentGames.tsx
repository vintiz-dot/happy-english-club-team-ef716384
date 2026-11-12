import Layout from "@/components/Layout";
import { StudentNavBar } from "@/components/student/StudentNavBar";
import { Gamepad2, Sparkles } from "lucide-react";

export default function StudentGames() {
  return (
    <Layout>
      <StudentNavBar />
      <div className="container mx-auto px-4 py-10">
        <div
          className="mx-auto max-w-2xl rounded-hec-lg border border-hec-line bg-hec-surface p-6 text-center shadow-hec-1 sm:p-10"
        >
          <div
            className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-hec-sunken"
          >
            <Gamepad2 className="h-12 w-12 text-hec-ink-soft" />
          </div>
          <h1 className="mb-3 flex items-center justify-center gap-2 font-display text-hec-display font-medium text-hec-ink">
            Games <Sparkles className="h-6 w-6 text-hec-brass" />
          </h1>
          <p className="mb-2 text-hec-h3 text-hec-ink">Coming soon!</p>
          <p className="text-hec-small text-hec-ink-soft">
            We're building fun mini-games to help you learn English. Check back soon!
          </p>
        </div>
      </div>
    </Layout>
  );
}
