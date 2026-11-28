/**
 * Teaching > Level Defence for teachers and TAs: the admin screen limited to
 * the classes they teach. Set each child's level, open their defence,
 * record standardized results and approve the level (Manage).
 */
import Layout from "@/components/Layout";
import LevelDefenseTab from "@/components/admin/tabs/LevelDefenseTab";

export default function TeacherLevelDefense() {
  return (
    <Layout title="Level Defence">
      <LevelDefenseTab scope="teacher" />
    </Layout>
  );
}
