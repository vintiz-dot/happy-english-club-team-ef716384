import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { StudentForm } from "@/components/admin/StudentForm";
import { StudentsList } from "@/components/admin/StudentsList";
import { StudentsPageFilters } from "@/components/admin/StudentsPageFilters";

const Students = () => {
  const queryClient = useQueryClient();

  // StudentsList has always accepted these, but this page rendered it with no
  // props at all — so the search and filters simply did not exist here, which
  // is the only Students page the staff nav links to.
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [filterClass, setFilterClass] = useState("all");

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">Manage student records and enrollments</p>
        </div>

        {/* Search sits above the create form: finding a student is the common
            errand, adding one is the rare one. */}
        <div className="space-y-4">
          <StudentsPageFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            filterClass={filterClass}
            onFilterClassChange={setFilterClass}
          />
          <StudentsList
            searchQuery={searchQuery}
            sortBy={sortBy}
            filterClass={filterClass}
          />
        </div>

        <StudentForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["students-list"] })} />
      </div>
    </Layout>
  );
};

export default Students;
