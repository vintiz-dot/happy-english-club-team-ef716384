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
import { motion, AnimatePresence } from "framer-motion";

const Admin = ({ defaultTab }: { defaultTab?: string } = {}) => {
  const [searchParams] = useSearchParams();
  const tab = defaultTab || searchParams.get("tab") || "overview";

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
      default:
        return <OverviewTab />;
    }
  };

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
};

export default Admin;
