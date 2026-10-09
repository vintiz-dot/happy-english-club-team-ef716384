import { AccountInfoManager } from "@/components/admin/AccountInfoManager";
import { AdminSecurityCard } from "@/components/admin/AdminSecurityCard";

const AccountInfoTab = () => {
  return (
    <div className="space-y-6">
      {/* How you get into the admin area sits with the other account
          settings, next to who the admins are. */}
      <AdminSecurityCard />
      <AccountInfoManager />
    </div>
  );
};

export default AccountInfoTab;
