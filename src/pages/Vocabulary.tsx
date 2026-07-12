import { useEffect } from "react";
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

export default function Vocabulary() {
  const { user } = useAuth();
  const store = useVocabularyStore(user?.id);
  const stats = store.getStats();
  const wordsForReview = store.getWordsForReview();

  return (
    <Layout title="Smart Vocabulary">
      <ClassSelectorModal userId={user?.id} />
      <div className="max-w-3xl mx-auto space-y-10 py-12 gemini-stagger">
        {/* Header — minimal, centered */}
        <div className="text-center space-y-2 gemini-reveal">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground/90">
            Smart Vocabulary
          </h1>
          <p className="text-muted-foreground text-sm">
            {stats.total > 0
              ? `${stats.total} words · ${stats.mastered} mastered${stats.dueForReview > 0 ? ` · ${stats.dueForReview} due` : ""}`
              : "Look up a word, write your own examples, save it to your word bank."}
          </p>
        </div>

        {/* Tabs — minimal pill */}
        <Tabs defaultValue="explore" className="w-full">
          <div className="flex justify-center mb-8 gemini-reveal" style={{ animationDelay: "80ms" }}>
            <TabsList className="grid w-full max-w-md grid-cols-4 p-1 bg-slate-100 dark:bg-[hsl(240_8%_12%)] border border-slate-200/60 dark:border-[hsl(240_8%_18%)] rounded-full h-11">
              <TabsTrigger
                value="explore"
                className="rounded-full text-sm font-medium text-muted-foreground data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(240_8%_18%)] data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300 gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Explore</span>
              </TabsTrigger>
              <TabsTrigger
                value="bank"
                className="rounded-full text-sm font-medium text-muted-foreground data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(240_8%_18%)] data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300 gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Word Bank</span>
              </TabsTrigger>
              <TabsTrigger
                value="practice"
                className="rounded-full text-sm font-medium text-muted-foreground data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(240_8%_18%)] data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300 gap-1.5 relative"
              >
                <Brain className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Practice</span>
                {stats.dueForReview > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500/80 text-white text-[9px] font-bold flex items-center justify-center">
                    {stats.dueForReview > 9 ? "9+" : stats.dueForReview}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="fixit"
                className="rounded-full text-sm font-medium text-muted-foreground data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(240_8%_18%)] data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-300 gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fix-It</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="explore" className="mt-0 outline-none gemini-reveal" style={{ animationDelay: "160ms" }}>
            <WordExplorer onWordSaved={store.ingestSavedEntry} />
          </TabsContent>

          <TabsContent value="bank" className="mt-0 outline-none gemini-reveal" style={{ animationDelay: "160ms" }}>
            <VocabularyIndex
              items={store.words}
              onDelete={store.deleteWord}
              onUpdate={store.updateWord}
            />
          </TabsContent>

          <TabsContent value="practice" className="mt-0 outline-none gemini-reveal" style={{ animationDelay: "160ms" }}>
            <VocabularyPractice
              words={store.words}
              wordsForReview={wordsForReview}
              onUpdateMastery={store.updateMastery}
            />
          </TabsContent>

          <TabsContent value="fixit" className="mt-0 outline-none gemini-reveal" style={{ animationDelay: "160ms" }}>
            <SrsReviewDeck />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
