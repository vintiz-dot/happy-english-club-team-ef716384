// The video homework review panel on made-up data, inside the real shell (Phase 3 preview).
import Layout from "@/components/Layout";
import { VideoReviewPanel } from "@/components/video-homework/VideoReviewPanel";

export default function VideoPage() {
  return (
    <Layout title="Video review">
      <div className="mx-auto max-w-2xl">
        <VideoReviewPanel videoSubmissionId="vs-1" />
      </div>
    </Layout>
  );
}
