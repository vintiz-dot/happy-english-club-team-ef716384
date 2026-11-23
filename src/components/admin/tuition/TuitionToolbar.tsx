import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Search, 
  ArrowUpDown, 
  Filter, 
  X, 
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FilterChip {
  key: string;
  label: string;
  count: number;
}

interface TuitionToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  filters: FilterChip[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  confirmationFilter: string;
  onConfirmationFilterChange: (filter: string) => void;
  reviewQueueCount: number;
  month: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function TuitionToolbar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filters,
  activeFilter,
  onFilterChange,
  confirmationFilter,
  onConfirmationFilterChange,
  reviewQueueCount,
  month,
  onRefresh,
  isRefreshing,
}: TuitionToolbarProps) {
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilters = [
    activeFilter !== 'all' ? filters.find(f => f.key === activeFilter)?.label : null,
    confirmationFilter !== 'all' ? confirmationFilter.replace('_', ' ') : null,
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      {/* Main Toolbar Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => onSearchChange("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {/* Review Queue Button */}
          <Button 
            variant="outline" 
            onClick={() => navigate(`/admin/tuition-review?month=${month}`)}
            className="gap-2 whitespace-nowrap"
          >
            <AlertCircle className="h-4 w-4" />
            Review Queue
            {reviewQueueCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {reviewQueueCount}
              </Badge>
            )}
          </Button>

          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[140px] gap-2">
              <ArrowUpDown className="h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="class">Class</SelectItem>
              <SelectItem value="balance">Balance</SelectItem>
              <SelectItem value="total">Total</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter Popover */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
                {activeFilters.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFilters.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Payment Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {filters.map((filter) => (
                      <Badge
                        key={filter.key}
                        variant={activeFilter === filter.key ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/10 transition-colors duration-hec-1 ease-hec"
                        onClick={() => onFilterChange(filter.key)}
                      >
                        {filter.label} ({filter.count})
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Confirmation Status</h4>
                  <Select value={confirmationFilter} onValueChange={onConfirmationFilterChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="needs_review">Needs Review</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="auto_approved">Auto Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {activeFilters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      onFilterChange("all");
                      onConfirmationFilterChange("all");
                    }}
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active Filters Pills */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {filters.find(f => f.key === activeFilter)?.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                onClick={() => onFilterChange("all")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {confirmationFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1 capitalize">
              {confirmationFilter.replace('_', ' ')}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                onClick={() => onConfirmationFilterChange("all")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
