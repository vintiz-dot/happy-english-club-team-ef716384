import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StudentsPageFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  filterClass: string;
  onFilterClassChange: (value: string) => void;
}

export const StudentsPageFilters = ({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterClass,
  onFilterClassChange,
}: StudentsPageFiltersProps) => {
  const { data: classes } = useQuery({
    queryKey: ["active-classes-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="sticky top-0 z-10 bg-background pb-4 space-y-3 border-b">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search students by name, email, or family..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger aria-label="Sort by">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="updated">Recently Updated</SelectItem>
            <SelectItem value="enrollment">Enrollment Date</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterClass} onValueChange={onFilterClassChange}>
          <SelectTrigger aria-label="Filter by class">
            <SelectValue placeholder="Filter by class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes?.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
