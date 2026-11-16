/**
 * The editor itself. Loaded on demand by RichTextEditor (its own chunk), so a
 * page that only shows rich text never downloads ProseMirror.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useEditor, EditorContent, useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Baseline, Bold, Heading1, Heading2, Heading3, Highlighter,
  ImagePlus, IndentDecrease, IndentIncrease, Italic, Link2, List, ListOrdered, Quote, Redo2, RemoveFormatting, Strikethrough,
  Subscript, Superscript, Underline, Undo2,
} from "lucide-react";
import { editorExtensions, allowedLink, type Align } from "./extensions";
import { sanitizeRichHtml } from "./sanitize";
import { prepareForEditor, preparePaste } from "./legacy";
import { formatCounter, resolveStrings, type RichTextStrings } from "./strings";
import type { RichTextEditorProps, ToolbarPreset } from "./types";
import "./rich-text.css";

type ItemId =
  | "bold" | "italic" | "underline" | "strike" | "h1" | "h2" | "h3" | "bulletList" | "orderedList" | "indent" | "outdent"
  | "quote" | "link" | "colour" | "highlight" | "sub" | "sup" | "alignLeft" | "alignCenter" | "alignRight" | "alignJustify"
  | "image" | "clear" | "undo" | "redo";

const PRESETS: Record<ToolbarPreset, ItemId[][]> = {
  // The student's answer box: exactly the buttons Quill showed there.
  minimal: [["bold", "italic", "underline"], ["bulletList", "orderedList"], ["clear"]],
  homework: [
    ["h1", "h2", "h3"],
    ["bold", "italic", "underline", "strike"],
    ["bulletList", "orderedList", "outdent", "indent"],
    ["link", "quote"],
    ["undo", "redo", "clear"],
  ],
  full: [
    ["h1", "h2", "h3"],
    ["bold", "italic", "underline", "strike"],
    ["colour", "highlight"],
    ["bulletList", "orderedList", "outdent", "indent"],
    ["sub", "sup"],
    ["alignLeft", "alignCenter", "alignRight", "alignJustify"],
    ["link", "quote", "image"],
    ["undo", "redo", "clear"],
  ],
};

// Mid-tone text colours and pale highlights: each stays readable on both the
// light and the dark surface (highlighted text is drawn in dark ink, see css).
const TEXT_COLOURS: Array<[string, string]> = [
  ["red", "#c62828"], ["orange", "#d84315"], ["green", "#2e7d32"], ["blue", "#1565c0"], ["purple", "#7b1fa2"],
];
const HIGHLIGHTS: Array<[string, string]> = [
  ["yellow", "#fff59d"], ["green", "#c8e6c9"], ["blue", "#bbdefb"], ["pink", "#f8bbd0"],
];

const ICONS: Record<ItemId, ReactNode> = {
  bold: <Bold />, italic: <Italic />, underline: <Underline />, strike: <Strikethrough />,
  h1: <Heading1 />, h2: <Heading2 />, h3: <Heading3 />, bulletList: <List />, orderedList: <ListOrdered />,
  indent: <IndentIncrease />, outdent: <IndentDecrease />, quote: <Quote />, link: <Link2 />, colour: <Baseline />,
  highlight: <Highlighter />, sub: <Subscript />, sup: <Superscript />, alignLeft: <AlignLeft />,
  alignCenter: <AlignCenter />, alignRight: <AlignRight />, alignJustify: <AlignJustify />, image: <ImagePlus />,
  clear: <RemoveFormatting />, undo: <Undo2 />, redo: <Redo2 />,
};

function label(id: ItemId, s: RichTextStrings): string {
  const map: Record<ItemId, string> = {
    bold: s.bold, italic: s.italic, underline: s.underline, strike: s.strike, h1: s.heading1, h2: s.heading2,
    h3: s.heading3, bulletList: s.bulletList, orderedList: s.orderedList, indent: s.indent, outdent: s.outdent,
    quote: s.quote, link: s.link, colour: s.textColour, highlight: s.highlight, sub: s.subscript, sup: s.superscript,
    alignLeft: s.alignLeft, alignCenter: s.alignCenter, alignRight: s.alignRight, alignJustify: s.alignJustify,
    image: s.image, clear: s.clear, undo: s.undo, redo: s.redo,
  };
  return map[id];
}

const SHORTCUTS: Partial<Record<ItemId, string>> = {
  bold: "Mod+B", italic: "Mod+I", underline: "Mod+U", strike: "Mod+Shift+S", bulletList: "Mod+Shift+8",
  orderedList: "Mod+Shift+7", indent: "Mod+]", outdent: "Mod+[", link: "Mod+K", undo: "Mod+Z", redo: "Mod+Shift+Z",
};

function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
}

function shortcutText(id: ItemId): string | undefined {
  const s = SHORTCUTS[id];
  if (!s) return undefined;
  return isMac() ? s.replace("Mod+", "⌘").replace("Shift+", "⇧") : s.replace("Mod", "Ctrl");
}

/** Pressed / available state the toolbar draws, read once per transaction. */
function useToolbarState(editor: Editor | null) {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const align = (["center", "right", "justify"] as Align[]).find((a) => e.isActive({ align: a })) ?? "left";
      return {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        h1: e.isActive("heading", { level: 1 }),
        h2: e.isActive("heading", { level: 2 }),
        h3: e.isActive("heading", { level: 3 }),
        bulletList: e.isActive("bulletList"),
        orderedList: e.isActive("orderedList"),
        quote: e.isActive("blockquote"),
        link: e.isActive("link"),
        sub: e.isActive("subscript"),
        sup: e.isActive("superscript"),
        colour: (e.getAttributes("textStyle").color as string | undefined) ?? null,
        highlight: (e.getAttributes("textStyle").backgroundColor as string | undefined) ?? null,
        align,
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
        canIndent: e.can().indent(),
        canOutdent: e.can().outdent(),
        characters: e.storage.characterCount?.characters?.() ?? 0,
      };
    },
  });
}

type Panel = null | "link" | "colour" | "highlight";

export default function EditorImpl({
  value,
  onChange,
  placeholder,
  toolbar = "homework",
  maxLength,
  disabled = false,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  id,
  onUploadImage,
  locale = "en",
  strings: stringsOverride,
  className,
  minHeight,
  maxHeight,
  autoFocus,
  onBlur,
}: RichTextEditorProps) {
  const s = useMemo(() => resolveStrings(locale, stringsOverride), [locale, stringsOverride]);
  const images = !!onUploadImage;
  const uid = useId();
  const counterId = `${uid}-count`;
  const panelId = `${uid}-panel`;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const placeholderRef = useRef(placeholder);
  placeholderRef.current = placeholder;
  const lastHtml = useRef(value);
  const [panel, setPanel] = useState<Panel>(null);
  const [linkDraft, setLinkDraft] = useState("");
  const [linkError, setLinkError] = useState(false);
  const [uploading, setUploading] = useState<"idle" | "busy" | "failed">("idle");
  const fileInput = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // The hec tokens live under data-hec-theme. Inside a themed page the editor
  // inherits them (and the page's "young" scale); anywhere else it brings the
  // scope itself, so it is never drawn without its tokens. Decided before paint.
  const [ownTheme, setOwnTheme] = useState(true);
  useLayoutEffect(() => {
    const inherited = !!rootRef.current?.parentElement?.closest('[data-hec-theme="ivory"]');
    setOwnTheme(!inherited);
  }, []);
  const [focusIndex, setFocusIndex] = useState(0);

  const describedBy = [maxLength ? counterId : null, ariaDescribedBy].filter(Boolean).join(" ") || undefined;
  const contentAttributes: Record<string, string> = {
    role: "textbox",
    "aria-multiline": "true",
    class: "rte-content",
  };
  if (ariaLabelledBy) contentAttributes["aria-labelledby"] = ariaLabelledBy;
  else contentAttributes["aria-label"] = ariaLabel || s.editorLabel;
  if (describedBy) contentAttributes["aria-describedby"] = describedBy;
  if (id) contentAttributes.id = id;
  if (placeholder) contentAttributes["aria-placeholder"] = placeholder;
  if (disabled) contentAttributes["aria-disabled"] = "true";

  const editor = useEditor(
    {
      extensions: editorExtensions({ images, maxLength, placeholder: () => placeholderRef.current ?? "" }),
      content: prepareForEditor(sanitizeRichHtml(value, "store", { allowImages: images })),
      editable: !disabled,
      autofocus: autoFocus ? "end" : false,
      immediatelyRender: true,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: contentAttributes,
        transformPastedHTML: (html) => sanitizeRichHtml(preparePaste(html), "paste", { allowImages: images }),
      },
      onUpdate: ({ editor: e }) => {
        const html = e.isEmpty ? "" : sanitizeRichHtml(e.getHTML(), "store", { allowImages: images });
        lastHtml.current = html;
        onChangeRef.current(html);
      },
      onBlur: () => onBlur?.(),
    },
    // A new schema needs a new editor; everything else is updated in place.
    [images, maxLength],
  );

  // A value from outside (a row loaded after mount, a form reset) replaces the
  // content; the editor's own echo does not.
  useEffect(() => {
    if (!editor || value === lastHtml.current) return;
    lastHtml.current = value;
    editor.commands.setContent(prepareForEditor(sanitizeRichHtml(value, "store", { allowImages: images })), { emitUpdate: false });
  }, [value, editor, images]);

  useEffect(() => {
    if (editor && editor.isEditable === disabled) editor.setEditable(!disabled, false);
  }, [editor, disabled]);

  // Keep aria attributes current without recreating the editor.
  const attrKey = JSON.stringify(contentAttributes);
  useEffect(() => {
    if (!editor) return;
    editor.view.setProps({ attributes: contentAttributes });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, attrKey]);

  // iPhone Safari: the on-screen keyboard shrinks the VISUAL viewport only, so
  // ProseMirror's own scroll-into-view thinks a caret under the keyboard is on
  // screen. Tell it the keyboard is a bottom margin, then scroll the caret in.
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!editor || !vv) return;
    const update = () => {
      if (editor.isDestroyed) return;
      const hidden = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      editor.view.setProps({ scrollMargin: { top: 16, left: 0, right: 0, bottom: hidden + 24 }, scrollThreshold: { top: 16, left: 0, right: 0, bottom: hidden + 24 } });
      if (editor.isFocused && hidden > 0) editor.commands.scrollIntoView();
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    editor.on("focus", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      editor.off("focus", update);
    };
  }, [editor]);

  const state = useToolbarState(editor);
  const groups = PRESETS[toolbar].map((g) => g.filter((item) => item !== "image" || images)).filter((g) => g.length);
  const flat = groups.flat();

  const openLink = () => {
    if (!editor) return;
    setLinkDraft((editor.getAttributes("link").href as string) || "");
    setLinkError(false);
    setPanel("link");
  };

  useEffect(() => {
    if (!editor) return;
    // Mod-K opens the link field (Tiptap has no default for it).
    const handler = (_view: unknown, event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (toolbar !== "minimal") openLink();
        return true;
      }
      return false;
    };
    editor.view.setProps({ handleKeyDown: handler });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, toolbar]);

  const run = (item: ItemId) => {
    if (!editor || disabled) return;
    const c = editor.chain().focus();
    switch (item) {
      case "bold": c.toggleBold().run(); break;
      case "italic": c.toggleItalic().run(); break;
      case "underline": c.toggleUnderline().run(); break;
      case "strike": c.toggleStrike().run(); break;
      case "h1": c.toggleHeading({ level: 1 }).run(); break;
      case "h2": c.toggleHeading({ level: 2 }).run(); break;
      case "h3": c.toggleHeading({ level: 3 }).run(); break;
      case "bulletList": c.toggleBulletList().run(); break;
      case "orderedList": c.toggleOrderedList().run(); break;
      case "indent": c.indent().run(); break;
      case "outdent": c.outdent().run(); break;
      case "quote": c.toggleBlockquote().run(); break;
      case "sub": c.toggleSubscript().run(); break;
      case "sup": c.toggleSuperscript().run(); break;
      case "alignLeft": c.setAlign("left").run(); break;
      case "alignCenter": c.setAlign("center").run(); break;
      case "alignRight": c.setAlign("right").run(); break;
      case "alignJustify": c.setAlign("justify").run(); break;
      case "clear": c.clearFormatting().run(); break;
      case "undo": c.undo().run(); break;
      case "redo": c.redo().run(); break;
      case "link": openLink(); break;
      case "colour": setPanel(panel === "colour" ? null : "colour"); break;
      case "highlight": setPanel(panel === "highlight" ? null : "highlight"); break;
      case "image": fileInput.current?.click(); break;
    }
  };

  const pressed = (item: ItemId): boolean | undefined => {
    if (!state) return undefined;
    switch (item) {
      case "bold": case "italic": case "underline": case "strike": case "h1": case "h2": case "h3":
      case "bulletList": case "orderedList": case "quote": case "link": case "sub": case "sup":
        return state[item];
      case "alignLeft": return state.align === "left";
      case "alignCenter": return state.align === "center";
      case "alignRight": return state.align === "right";
      case "alignJustify": return state.align === "justify";
      case "colour": return !!state.colour;
      case "highlight": return !!state.highlight;
      default: return undefined;
    }
  };

  const unavailable = (item: ItemId): boolean => {
    if (disabled) return true;
    if (!state) return false;
    if (item === "undo") return !state.canUndo;
    if (item === "redo") return !state.canRedo;
    if (item === "indent") return !state.canIndent;
    if (item === "outdent") return !state.canOutdent;
    if (item === "image") return uploading === "busy";
    return false;
  };

  // Roving focus: one button in the tab order, arrows move between them.
  const onToolbarKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const buttons = Array.from(toolbarRef.current?.querySelectorAll<HTMLButtonElement>("[data-rte-item]") ?? []);
    const current = buttons.findIndex((b) => b === document.activeElement);
    if (current < 0) return;
    e.preventDefault();
    let next = current;
    if (e.key === "ArrowRight") next = (current + 1) % buttons.length;
    if (e.key === "ArrowLeft") next = (current - 1 + buttons.length) % buttons.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = buttons.length - 1;
    setFocusIndex(next);
    buttons[next].focus();
  };

  const applyLink = () => {
    if (!editor) return;
    const raw = linkDraft.trim();
    if (!raw) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setPanel(null);
      return;
    }
    const href = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    if (!allowedLink(href)) {
      setLinkError(true);
      return;
    }
    const chain = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chain.insertContent({ type: "text", text: raw, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      chain.setLink({ href }).run();
    }
    setPanel(null);
  };

  const closePanel = () => {
    setPanel(null);
    editor?.commands.focus();
  };

  const pickFile = async (file: File | undefined) => {
    if (!file || !editor || !onUploadImage) return;
    setUploading("busy");
    try {
      const url = await onUploadImage(file);
      if (!allowedLink(url)) throw new Error("not http(s)");
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      setUploading("idle");
    } catch {
      setUploading("failed");
    }
  };

  const chars = state?.characters ?? 0;
  const full = !!maxLength && chars >= maxLength;
  const style: Record<string, string> = {};
  if (minHeight) style["--rte-min-height"] = minHeight;
  if (maxHeight) style["--rte-max-height"] = maxHeight;

  let index = -1;
  return (
    <div
      className={["rte", disabled ? "rte-disabled" : "", className || ""].filter(Boolean).join(" ")}
      ref={rootRef}
      data-hec-theme={ownTheme ? "ivory" : undefined}
      style={style}
    >
      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label={s.toolbar}
        aria-controls={id}
        className="rte-toolbar"
        onKeyDown={onToolbarKey}
      >
        {groups.map((group, gi) => (
          <div className="rte-group" role="group" key={gi}>
            {group.map((item) => {
              index += 1;
              const i = index;
              const isPressed = pressed(item);
              const name = label(item, s);
              const shortcut = shortcutText(item);
              const opensPanel = item === "link" || item === "colour" || item === "highlight";
              return (
                <button
                  key={item}
                  type="button"
                  data-rte-item={item}
                  className="rte-btn"
                  tabIndex={i === Math.min(focusIndex, flat.length - 1) ? 0 : -1}
                  aria-label={name}
                  aria-pressed={isPressed}
                  aria-keyshortcuts={SHORTCUTS[item]?.replace("Mod", isMac() ? "Meta" : "Control")}
                  aria-haspopup={opensPanel ? "true" : undefined}
                  aria-expanded={opensPanel ? panel === item || (item === "link" && panel === "link") : undefined}
                  aria-controls={opensPanel && panel ? panelId : undefined}
                  title={shortcut ? `${name} (${shortcut})` : name}
                  disabled={unavailable(item)}
                  // Keep the text selection (and the phone keyboard) while tapping a button.
                  onMouseDown={(e) => e.preventDefault()}
                  onFocus={() => setFocusIndex(i)}
                  onClick={() => run(item)}
                >
                  {ICONS[item]}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {panel === "link" && (
        <div className="rte-panel" id={panelId} onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), closePanel())}>
          <label className="rte-panel-label" htmlFor={`${panelId}-url`}>{s.linkAddress}</label>
          <div className="rte-panel-row">
            <input
              id={`${panelId}-url`}
              className="rte-input"
              type="url"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="https://"
              value={linkDraft}
              aria-invalid={linkError || undefined}
              aria-describedby={linkError ? `${panelId}-error` : undefined}
              autoFocus
              onChange={(e) => { setLinkDraft(e.target.value); setLinkError(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } }}
            />
            <button type="button" className="rte-text-btn rte-primary" onClick={applyLink}>{s.linkApply}</button>
            {state?.link && (
              <button type="button" className="rte-text-btn" onClick={() => { editor?.chain().focus().extendMarkRange("link").unsetLink().run(); setPanel(null); }}>
                {s.linkRemove}
              </button>
            )}
            <button type="button" className="rte-text-btn" onClick={closePanel}>{s.linkCancel}</button>
          </div>
          {linkError && <p className="rte-error" id={`${panelId}-error`} role="alert">{s.linkInvalid}</p>}
        </div>
      )}

      {(panel === "colour" || panel === "highlight") && (
        <div
          className="rte-panel"
          id={panelId}
          role="group"
          aria-label={panel === "colour" ? s.textColour : s.highlight}
          onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), closePanel())}
        >
          <div className="rte-panel-row">
            <button
              type="button"
              className="rte-text-btn"
              aria-pressed={panel === "colour" ? !state?.colour : !state?.highlight}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const c = editor?.chain().focus();
                if (panel === "colour") c?.unsetColor().run();
                else c?.unsetBackgroundColor().run();
                setPanel(null);
              }}
            >
              {s.colourDefault}
            </button>
            {(panel === "colour" ? TEXT_COLOURS : HIGHLIGHTS).map(([name, hex]) => {
              const current = panel === "colour" ? state?.colour : state?.highlight;
              return (
                <button
                  key={name}
                  type="button"
                  className="rte-swatch"
                  aria-label={s.colourNames[name] || name}
                  title={s.colourNames[name] || name}
                  aria-pressed={!!current && current.toLowerCase() === hex}
                  style={{ ["--rte-swatch" as string]: hex }}
                  data-kind={panel}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const c = editor?.chain().focus();
                    if (panel === "colour") c?.setColor(hex).run();
                    else c?.setBackgroundColor(hex).run();
                    setPanel(null);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {images && (
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => { void pickFile(e.target.files?.[0]); e.target.value = ""; }}
        />
      )}

      <EditorContent editor={editor} className="rte-body" />

      {(maxLength || uploading !== "idle") && (
        <div className="rte-footer">
          {uploading === "busy" && <span role="status">{s.imageUploading}</span>}
          {uploading === "failed" && <span role="alert" className="rte-error">{s.imageFailed}</span>}
          {maxLength ? (
            <span id={counterId} className={full ? "rte-counter rte-counter-full" : "rte-counter"}>
              {formatCounter(s.counter, chars, maxLength)}
            </span>
          ) : null}
          {maxLength ? <span className="rte-sr" aria-live="polite">{full ? s.counterFull : ""}</span> : null}
        </div>
      )}
    </div>
  );
}
