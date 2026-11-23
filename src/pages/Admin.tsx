import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import OverviewTab from "@/components/admin/tabs/OverviewTab";
import FinanceTab from "@/components/admin/tabs/FinanceTab";
import ReportsTab from "@/components/admin/tabs/ReportsTab";
import AccountInfoTab from "@/components/admin/tabs/AccountInfoTab";
import AutomationTab from "@/components/admin/tabs/AutomationTab";
import DataTab from "@/components/admin/tabs/DataTab";
import ActivityTab from "@/components/admin/tabs/ActivityTab";
import ClassesTab from "@/components/admin/tabs/ClassesTab";
import { PayrollTab } from "@/components/admin/tabs/PayrollTab";
import { AdminJournalViewEnhanced } from "@/components/admin/AdminJournalViewEnhanced";
import { AssignmentsOverview } from "@/components/admin/AssignmentsOverview";
import { AnnouncementManager } from "@/components/admin/AnnouncementManager";
import ExamReportsTab from "@/components/admin/tabs/ExamReportsTab";
import StarsSyncTab from "@/components/admin/tabs/StarsSyncTab";
import AiActionsTab from "@/components/admin/tabs/AiActionsTab";
import AuditClipsTab from "@/components/admin/tabs/AuditClipsTab";
import ReceptionTab from "@/components/admin/tabs/ReceptionTab";
import { motion, AnimatePresence } from "framer-motion";
import { useIvory } from "@/hooks/useIvory";
import { dur, useMotionLevel } from "@/components/fx/motion";

const Admin = ({ defaultTab }: { defaultTab?: string } = {}) => {
  const [searchParams] = useSearchParams();
  const tab = defaultTab || searchParams.get("tab") || "overview";
  // Every tab but audit clips is in the system (R21); audit clips keeps today's.
  const ivory = useIvory();
  const level = useMotionLevel();

  const renderContent = () => {
    switch (tab) {
      case "classes":
        return <ClassesTab />;
      case "assignments":
        return <AssignmentsOverview />;
      case "journal":
        return <AdminJournalViewEnhanced />;
      case "exam-reports":
        return <ExamReportsTab />;
      case "finance":
        return <FinanceTab />;
      case "payroll":
        return <PayrollTab />;
      case "reports":
        return <ReportsTab />;
      case "account":
        return <AccountInfoTab />;
      case "automation":
        return <AutomationTab />;
      case "data":
        return <DataTab />;
      case "activity":
        return <ActivityTab />;
      case "announcements":
        return <AnnouncementManager />;
      case "stars-sync":
        return <StarsSyncTab />;
      case "ai-actions":
        return <AiActionsTab />;
      case "audit-clips":
        return <AuditClipsTab />;
      case "reception":
        return <ReceptionTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          // In the system the tab change is a cross-fade: 140 ms out, 240 ms in, no
          // movement (brief D1). Motion level off swaps at once. Audit clips keeps today's.
          initial={{ opacity: 0, y: ivory ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: ivory ? 0 : -20, transition: { duration: ivory ? (level === "off" ? 0 : dur.press) : 0.3 } }}
          transition={{ duration: ivory ? (level === "off" ? 0 : dur.reveal) : 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
};

export default Admin;
