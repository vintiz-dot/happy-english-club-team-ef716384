import { useState } from "react";
import { Button } from "@/components/ui/button";
import { JournalEditor } from "@/components/journal/JournalEditor";
import { JournalList } from "@/components/journal/JournalList";
import { JournalViewer } from "@/components/journal/JournalViewer";
import { Plus, Users } from "lucide-react";

interface StudentJournalProps {
  studentId: string;
}

interface JournalEntry {
  id: string;
  title: string;
  content_rich: string;
  type: string;
  created_at: string;
  updated_at: string;
  owner_user_id: string;
}

// A segmented control like the Tabs on the other student screens (DS s.15): the current one raised.
const TAB =
  "min-h-hec-target flex-1 whitespace-nowrap text-hec-ink-soft hover:bg-hec-raised/60 hover:text-hec-ink aria-pressed:bg-hec-raised aria-pressed:font-medium aria-pressed:text-hec-ink aria-pressed:shadow-hec-1";

export function StudentJournal({ studentId }: StudentJournalProps) {
  const [journalType, setJournalType] = useState<"personal" | "collab_student_teacher">("personal");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"personal" | "student" | "class">("personal");

  const handleSave = () => {
    setIsCreating(false);
    setEditingId(null);
    setRefreshKey((k) => k + 1);
  };

  if (isCreating || editingId) {
    return (
      <JournalEditor
        type={isCreating ? journalType : undefined}
        entryId={editingId || undefined}
        onSave={handleSave}
        onCancel={() => {
          setIsCreating(false);
          setEditingId(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="font-display text-hec-h1 font-medium text-hec-ink">My Journals</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              setJournalType("personal");
              setIsCreating(true);
            }}
            className="flex-1 sm:flex-initial"
            size="lg"
            variant="outline"
          >
            <Plus className="h-5 w-5 mr-2" />
            Personal
          </Button>
          <Button 
            onClick={() => {
              setJournalType("collab_student_teacher");
              setIsCreating(true);
            }}
            className="flex-1 sm:flex-initial"
            size="lg"
          >
            <Users className="h-5 w-5 mr-2" />
            Collaborate
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto rounded-hec-lg bg-hec-sunken p-1" role="group" aria-label="Which journals">
        <Button
          variant="ghost"
          aria-pressed={activeTab === "personal"}
          onClick={() => setActiveTab("personal")}
          className={TAB}
        >
          Personal
        </Button>
        <Button
          variant="ghost"
          aria-pressed={activeTab === "student"}
          onClick={() => setActiveTab("student")}
          className={TAB}
        >
          About Me
        </Button>
        <Button
          variant="ghost"
          aria-pressed={activeTab === "class"}
          onClick={() => setActiveTab("class")}
          className={TAB}
        >
          Class Journals
        </Button>
      </div>

      {/* Journal Lists based on active tab */}
      {activeTab === "personal" && (
        <JournalList
          key={`personal-${refreshKey}`}
          type="personal"
          onEdit={setEditingId}
          onView={setViewingEntry}
        />
      )}

      {activeTab === "student" && (
        <JournalList
          key={`student-${refreshKey}`}
          type="student"
          studentId={studentId}
          onEdit={setEditingId}
          onView={setViewingEntry}
        />
      )}

      {activeTab === "class" && (
        <JournalList
          key={`class-${refreshKey}`}
          type="class"
          onEdit={setEditingId}
          onView={setViewingEntry}
        />
      )}

      <JournalViewer entry={viewingEntry} onClose={() => setViewingEntry(null)} />
    </div>
  );
}
