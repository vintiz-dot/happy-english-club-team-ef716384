/**
 * The editor's schema: every format the stored HTML can hold, whatever
 * toolbar a screen shows. A row written with colours on one screen keeps
 * them when it is edited on a screen whose toolbar has no colour button
 * (Quill behaved the same way: formats are registered, toolbars only choose).
 *
 * Only MIT Tiptap packages; no Pro extensions, no cloud service.
 */
import { Extension, Mark, mergeAttributes, type AnyExtension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import Heading from "@tiptap/extension-heading";
import Blockquote from "@tiptap/extension-blockquote";
import HardBreak from "@tiptap/extension-hard-break";
// Subpath imports: the package indexes also pull in task lists, drop/gap cursors and more.
import { BulletList } from "@tiptap/extension-list/bullet-list";
import { OrderedList } from "@tiptap/extension-list/ordered-list";
import { ListItem } from "@tiptap/extension-list/item";
import { ListKeymap } from "@tiptap/extension-list/keymap";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TextStyle } from "@tiptap/extension-text-style/text-style";
import { Color } from "@tiptap/extension-text-style/color";
import { BackgroundColor } from "@tiptap/extension-text-style/background-color";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions/placeholder";
import { CharacterCount } from "@tiptap/extensions/character-count";
import { UndoRedo } from "@tiptap/extensions/undo-redo";
import { safeHttpUrl } from "@/lib/safeUrl";
import { STORE_MAX_INDENT } from "./sanitize";

export type Align = "left" | "center" | "right" | "justify";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    safeLink: {
      setLink: (attrs: { href: string }) => ReturnType;
      unsetLink: () => ReturnType;
    };
    blockFormat: {
      /** In a list: nest the item. Elsewhere: one Quill indent step. */
      indent: () => ReturnType;
      outdent: () => ReturnType;
      setAlign: (align: Align) => ReturnType;
      /** Quill's "clean": every inline and block format off. */
      clearFormatting: () => ReturnType;
    };
  }
}

const BLOCKS = ["paragraph", "heading"];

function indentFromClass(el: HTMLElement): number {
  const m = /(?:^|\s)ql-indent-(\d+)(?:\s|$)/.exec(el.getAttribute("class") || "");
  return m ? Math.min(Number(m[1]), STORE_MAX_INDENT) : 0;
}

function alignFrom(el: HTMLElement): Align | null {
  const m = /(?:^|\s)ql-align-(center|right|justify)(?:\s|$)/.exec(el.getAttribute("class") || "");
  if (m) return m[1] as Align;
  const s = (el.style?.textAlign || "").toLowerCase();
  return s === "center" || s === "right" || s === "justify" ? s : null;
}

/** Quill's indent and alignment, stored as Quill stored them (classes). */
export const BlockFormat = Extension.create({
  name: "blockFormat",

  addGlobalAttributes() {
    return [
      {
        types: BLOCKS,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => indentFromClass(el as HTMLElement),
            renderHTML: (attrs) => (attrs.indent > 0 ? { class: `ql-indent-${attrs.indent}` } : {}),
          },
          align: {
            default: null,
            parseHTML: (el) => alignFrom(el as HTMLElement),
            renderHTML: (attrs) => (attrs.align && attrs.align !== "left" ? { class: `ql-align-${attrs.align}` } : {}),
          },
        },
      },
    ];
  },

  addCommands() {
    const shiftIndent =
      (delta: number) =>
      () =>
      ({ editor, state, tr, dispatch, commands }: any) => {
        if (editor.isActive("listItem")) {
          return delta > 0 ? commands.sinkListItem("listItem") : commands.liftListItem("listItem");
        }
        const { from, to } = state.selection;
        let changed = false;
        state.doc.nodesBetween(from, to, (node: any, pos: number) => {
          if (!BLOCKS.includes(node.type.name)) return true;
          const next = Math.max(0, Math.min(STORE_MAX_INDENT, (node.attrs.indent || 0) + delta));
          if (next !== node.attrs.indent) {
            changed = true;
            if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
          }
          return false;
        });
        return changed;
      };
    return {
      indent: shiftIndent(1),
      outdent: shiftIndent(-1),
      setAlign:
        (align: Align) =>
        ({ state, tr, dispatch }: any) => {
          const { from, to } = state.selection;
          let found = false;
          state.doc.nodesBetween(from, to, (node: any, pos: number) => {
            if (!BLOCKS.includes(node.type.name)) return true;
            found = true;
            if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, align: align === "left" ? null : align });
            return false;
          });
          return found;
        },
      clearFormatting:
        () =>
        ({ chain }: any) =>
          chain()
            .unsetAllMarks()
            .clearNodes()
            .command(({ state, tr, dispatch }: any) => {
              const { from, to } = state.selection;
              state.doc.nodesBetween(from, to, (node: any, pos: number) => {
                if (!BLOCKS.includes(node.type.name)) return true;
                if (dispatch && (node.attrs.indent || node.attrs.align)) {
                  tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: 0, align: null });
                }
                return false;
              });
              return true;
            })
            .run(),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-]": () => this.editor.commands.indent(),
      "Mod-[": () => this.editor.commands.outdent(),
    };
  },
});

/**
 * A link mark that only ever holds an http(s) address (checked by safeUrl on
 * read, on paste and on set). Written here rather than taken from
 * @tiptap/extension-link: that one brings linkifyjs (about 30 kB) for
 * auto-linking, which the old editor never did either.
 */
export const SafeLink = Mark.create({
  name: "link",
  priority: 1000,
  keepOnSplit: false,
  inclusive: false,
  exitable: true,

  addAttributes() {
    return { href: { default: null, parseHTML: (el) => safeHttpUrl((el as HTMLElement).getAttribute("href")) ?? null } };
  },

  parseHTML() {
    return [{ tag: "a[href]", getAttrs: (el) => (safeHttpUrl((el as HTMLElement).getAttribute("href")) ? null : false) }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["a", mergeAttributes(HTMLAttributes, { target: "_blank", rel: "noopener noreferrer" }), 0];
  },

  addCommands() {
    return {
      setLink:
        (attrs: { href: string }) =>
        ({ chain }: any) =>
          safeHttpUrl(attrs.href) ? chain().setMark(this.name, { href: safeHttpUrl(attrs.href) }).run() : false,
      unsetLink:
        () =>
        ({ chain }: any) =>
          chain().unsetMark(this.name, { extendEmptyMarkRange: true }).run(),
    };
  },
});

export interface SchemaOptions {
  /** Kept for callers; the picture node is always in the schema (old rows hold pictures). */
  images?: boolean;
}

/** Transaction meta: "this replaces the content from outside" - never refused by the limit. */
export const LOAD_META = "rteLoad";

/**
 * maxLength without ever losing words already written. CharacterCount's own
 * limit trims an over-long row on its first transaction and refuses one set
 * after mount; here only GROWTH past the limit is stopped (typing, or a paste,
 * which is cut to fit). A longer existing text loads whole and can be shortened.
 */
export const TextLimit = Extension.create<{ limit: number | null }>({
  name: "textLimit",
  addOptions() {
    return { limit: null };
  },
  addProseMirrorPlugins() {
    const limit = this.options.limit;
    const size = (doc: any) => doc.textBetween(0, doc.content.size, undefined, " ").length;
    return [
      new Plugin({
        key: new PluginKey("textLimit"),
        filterTransaction: (tr, state) => {
          if (!limit || !tr.docChanged || tr.getMeta(LOAD_META)) return true;
          const before = size(state.doc);
          const after = size(tr.doc);
          if (after <= limit || after <= before) return true;
          if (!tr.getMeta("paste")) {
            // Replacing the whole document is loading a row (setContent), not typing.
            const end = state.doc.content.size;
            return tr.steps.some((s: any) => s.from === 0 && s.to === end);
          }
          // A paste: keep what fits.
          const room = Math.max(0, limit - before);
          const pos = tr.selection.$head.pos;
          const grown = after - before;
          tr.deleteRange(Math.max(0, pos - (grown - room)), pos);
          return size(tr.doc) <= Math.max(limit, before);
        },
      }),
    ];
  },
});

export interface EditorExtensionOptions extends SchemaOptions {
  placeholder?: () => string;
  maxLength?: number;
}

/** True for a link the editor may store: http(s) only, via safeUrl. */
export function allowedLink(url: string): boolean {
  return !!safeHttpUrl(url);
}

/** The schema alone: what tests and headless round-trips load. */
export function schemaExtensions({ images = false }: SchemaOptions = {}): AnyExtension[] {
  const list: AnyExtension[] = [
    Document,
    Paragraph,
    Text,
    HardBreak,
    Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
    Blockquote,
    CodeBlock,
    BulletList,
    OrderedList,
    ListItem,
    Bold,
    Italic,
    Underline,
    Strike,
    Code,
    Subscript,
    Superscript,
    TextStyle,
    Color,
    BackgroundColor,
    SafeLink,

    BlockFormat,
  ];
  // Inline, like the old editor's <p><img></p>, so a stored picture round-trips byte for byte.
  // base64 is parsed only after sanitizeRichHtml has passed it (png/jpeg/gif/webp, size-capped).
  list.push(Image.configure({ inline: true, allowBase64: true }));
  void images;
  return list;
}

/** Schema plus the editing behaviour: history, list keys, placeholder, limit. */
export function editorExtensions(options: EditorExtensionOptions = {}): AnyExtension[] {
  return [
    ...schemaExtensions(options),
    ListKeymap,
    UndoRedo,
    Placeholder.configure({ placeholder: () => options.placeholder?.() ?? "" }),
    // Counting only (no limit: its trim/refuse would lose existing words); TextLimit stops growth.
    CharacterCount.configure({ limit: null }),
    TextLimit.configure({ limit: options.maxLength && options.maxLength > 0 ? options.maxLength : null }),
  ];
}
