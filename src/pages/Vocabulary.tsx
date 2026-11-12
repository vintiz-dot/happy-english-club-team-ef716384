import { useCallback, useEffect } from "react";
import { VocabularyIndex } from "@/components/vocabulary/VocabularyIndex";
import { VocabularyPractice } from "@/components/vocabulary/VocabularyPractice";
import { WordExplorer } from "@/components/vocabulary/WordExplorer";
import { ClassSelectorModal } from "@/components/vocabulary/ClassSelectorModal";
import { useVocabularyStore } from "@/hooks/useVocabularyStore";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Brain, Search, Layers } from "lucide-react";
import Layout from "@/components/Layout";
import { SrsReviewDeck } from "@/components/student/SrsReviewDeck";

// Labels are always shown (DS s.15: nav labels are always visible); at 375 the
// icon steps aside so four labels fit, and a two-word label may wrap.
const TRIGGER = "relative min-w-0 flex-1 gap-2 whitespace-normal px-2 text-center sm:whitespace-nowrap sm:px-3";
const TRIGGER_ICON = "hidden h-4 w-4 shrink-0 sm:block";

export default function Vocabulary() {
  const { user } = useAuth();
  const store = useVocabularyStore(user?.id);
  const stats = store.getStats();
  const wordsForReview = store.getWordsForReview();

  return (
    <Layout title="Smart Vocabulary">
      <ClassSelectorModal userId={user?.id} />
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="font-display text-hec-display font-medium text-hec-ink">
            Smart Vocabulary
          </h1>
          <p className="text-hec-small text-hec-ink-soft tabular-nums">
            {stats.total > 0
              ? `${stats.total} words · ${stats.mastered} mastered${stats.dueForReview > 0 ? ` · ${stats.dueForReview} due` : ""}`
              : "Look up a word, write your own examples, save it to your word bank."}
          </p>
        </div>

        <Tabs defaultValue="explore" className="w-full">
          <div className="mb-6 flex justify-center">
            <TabsList className="flex w-full max-w-md overflow-visible">
              <TabsTrigger value="explore" className={TRIGGER}>
                <Search className={TRIGGER_ICON} />
                <span>Explore</span>
              </TabsTrigger>
              <TabsTrigger value="bank" className={TRIGGER}>
                <BookOpen className={TRIGGER_ICON} />
                <span>Word Bank</span>
              </TabsTrigger>
              <TabsTrigger value="practice" className={TRIGGER}>
                <Brain className={TRIGGER_ICON} />
                <span>Practice</span>
                {stats.dueForReview > 0 && (
                  <span className="absolute -right-1 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-hec-action px-1 text-hec-caption font-medium tabular-nums text-hec-on-action">
                    {stats.dueForReview > 9 ? "9+" : stats.dueForReview}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="fixit" className={TRIGGER}>
                <Layers className={TRIGGER_ICON} />
                <span>Fix-It</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="explore" className="mt-0">
            <WordExplorer onWordSaved={store.ingestSavedEntry} />
          </TabsContent>

          <TabsContent value="bank" className="mt-0">
            <VocabularyIndex
              items={store.words}
              onDelete={store.deleteWord}
              onUpdate={store.updateWord}
            />
          </TabsContent>

          <TabsContent value="practice" className="mt-0">
            <VocabularyPractice
              words={store.words}
              wordsForReview={wordsForReview}
              onUpdateMastery={store.updateMastery}
            />
          </TabsContent>

          <TabsContent value="fixit" className="mt-0">
            <SrsReviewDeck />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
