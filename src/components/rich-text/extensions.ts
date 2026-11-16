/**
 * The editor's schema: every format the stored HTML can hold, whatever
 * toolbar a screen shows. A row written with colours on one screen keeps
 * them when it is edited on a screen whose toolbar has no colour button
 * (Quill behaved the same way: formats are registered, toolbars only choose).
 *
 * Only MIT Tiptap packages; no Pro extensions, no cloud service.
 */
import { Extension, type AnyExtension } from "@tiptap/core";
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
import { BulletList, OrderedList, ListItem, ListKeymap } from "@tiptap/extension-list";
import Link from "@tiptap/extension-link";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TextStyle, Color, BackgroundColor } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import { Placeholder, CharacterCount, UndoRedo } from "@tiptap/extensions";
import { safeHttpUrl } from "@/lib/safeUrl";
import { STORE_MAX_INDENT } from "./sanitize";

export type Align = "left" | "center" | "right" | "justify";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
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

export interface SchemaOptions {
  /** Include the image node (only when the host passes an upload adapter). */
  images?: boolean;
}

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
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: "https",
      isAllowedUri: (url) => allowedLink(url),
      shouldAutoLink: (url) => allowedLink(/^https?:\/\//i.test(url) ? url : `https://${url}`),
      HTMLAttributes: { target: "_blank", rel: "noopener noreferrer", class: null },
    }),
    BlockFormat,
  ];
  if (images) list.push(Image.configure({ inline: false, allowBase64: false }));
  return list;
}

/** Schema plus the editing behaviour: history, list keys, placeholder, limit. */
export function editorExtensions(options: EditorExtensionOptions = {}): AnyExtension[] {
  return [
    ...schemaExtensions(options),
    ListKeymap,
    UndoRedo,
    Placeholder.configure({ placeholder: () => options.placeholder?.() ?? "" }),
    CharacterCount.configure({ limit: options.maxLength && options.maxLength > 0 ? options.maxLength : null }),
  ];
}
