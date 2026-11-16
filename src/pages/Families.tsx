import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { FamilyForm } from "@/components/admin/FamilyForm";
import { FamiliesList } from "@/components/admin/FamiliesList";

const Families = () => {
  const queryClient = useQueryClient();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-hec-h1 font-medium text-hec-ink">Families</h1>
          <p className="text-hec-small text-hec-ink-soft">Manage family accounts and information</p>
        </div>

        <FamilyForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["families-list"] })} />
        <FamiliesList />
      </div>
    </Layout>
  );
};

export default Families;