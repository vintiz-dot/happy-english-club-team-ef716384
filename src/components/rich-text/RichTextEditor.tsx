import { lazy, Suspense } from "react";
import type { RichTextEditorProps } from "./types";
import { resolveStrings } from "./strings";
import "./view.css";

// The editor (Tiptap + ProseMirror) is its own chunk: it downloads the first
// time a screen shows an editor, never for a page that only reads.
const EditorImpl = lazy(() => import("./EditorImpl"));

/** Start downloading the editor early, e.g. when a dialog that holds one opens. */
export function preloadRichTextEditor(): void {
  void import("./EditorImpl");
}

export function RichTextEditor(props: RichTextEditorProps) {
  const fallback = props.fallback ?? (
    <div className="rte-loading" role="status" data-hec-theme="ivory">
      {resolveStrings(props.locale, props.strings).loading}
    </div>
  );
  return (
    <Suspense fallback={fallback}>
      <EditorImpl {...props} />
    </Suspense>
  );
}

export default RichTextEditor;
