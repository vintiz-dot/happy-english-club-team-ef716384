import { AccountInfoManager } from "@/components/admin/AccountInfoManager";
import { AdminProfileCard } from "@/components/admin/AdminProfileCard";
import { AdminSecurityCard } from "@/components/admin/AdminSecurityCard";

const AccountInfoTab = () => {
  return (
    <div className="space-y-6">
      {/* Ordered the way the questions actually come up: who am I, how do
          I get in, then who else is an admin. */}
      <AdminProfileCard />
      <AdminSecurityCard />
      <AccountInfoManager />
    </div>
  );
};

export default AccountInfoTab;
