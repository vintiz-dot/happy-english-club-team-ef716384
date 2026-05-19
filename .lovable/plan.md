Copy the three uploaded files to their inferred destinations based on filename and imports:

1. `user-uploads://VocabularyPractice-2.tsx` → `src/components/vocabulary/VocabularyPractice.tsx` (overwrite)
2. `user-uploads://WordExplorer-4.tsx` → `src/components/vocabulary/WordExplorer.tsx` (overwrite)
3. `user-uploads://grammarChecker.ts` → `src/lib/grammarChecker.ts` (new file — imported by WordExplorer as `@/lib/grammarChecker`)

Also install the new dependency `harper.js` required by `grammarChecker.ts`.

No edge function or DB changes needed.