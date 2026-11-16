/**
 * Turns stored HTML into the shape the editor's schema reads.
 *
 * Quill (1 and 2) writes lists FLAT: every item of a list, however deep, is a
 * sibling <li>, its depth in a `ql-indent-N` class and (Quill 2) its kind in
 * `data-list`, all inside one <ol>. ProseMirror reads lists as nested trees.
 * This rebuilds the tree, so a Quill row opens with the same bullets,
 * numbering and depth, and is saved as nested lists.
 *
 * Also: Quill's `<span class="ql-ui">` markers are dropped, and an empty
 * paragraph `<p><br></p>` is read as an empty paragraph (not a line break).
 * Word's pasted lists (`mso-list` paragraphs with a typed bullet) become
 * real lists here too, before the paste is sanitised.
 *
 * Runs on a detached document from DOMParser: nothing touches the page.
 */

type ListKind = "bullet" | "ordered";

interface FlatItem {
  kind: ListKind;
  depth: number;
  li: Element;
}

function parse(html: string): Document {
  return new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, "text/html");
}

function indentOf(el: Element): number {
  const m = /(?:^|\s)ql-indent-(\d+)(?:\s|$)/.exec(el.getAttribute("class") || "");
  return m ? Number(m[1]) : 0;
}

function withoutIndent(el: Element) {
  const rest = (el.getAttribute("class") || "")
    .split(/\s+/)
    .filter((c) => c && !/^ql-indent-\d+$/.test(c))
    .join(" ");
  if (rest) el.setAttribute("class", rest);
  else el.removeAttribute("class");
}

function kindOf(li: Element, parentTag: string): ListKind {
  const t = li.getAttribute("data-list");
  if (t === "ordered") return "ordered";
  if (t === "bullet" || t === "checked" || t === "unchecked") return "bullet";
  return parentTag === "ol" ? "ordered" : "bullet";
}

/** A list Quill wrote: it has data-list or indent classes on its items. */
function isFlatQuillList(list: Element): boolean {
  return Array.from(list.children).some(
    (c) => c.tagName === "LI" && (c.hasAttribute("data-list") || indentOf(c) > 0),
  );
}

function rebuild(doc: Document, items: FlatItem[]): Element[] {
  const roots: Element[] = [];
  // stack[d] = the list element currently open at depth d
  const stack: Element[] = [];
  for (const item of items) {
    const depth = Math.max(0, Math.min(item.depth, stack.length));
    stack.length = Math.min(stack.length, depth + 1);
    const tag = item.kind === "ordered" ? "OL" : "UL";
    let list = stack[depth];
    if (!list || list.tagName !== tag) {
      list = doc.createElement(tag.toLowerCase());
      if (depth === 0) roots.push(list);
      else {
        const parentList = stack[depth - 1];
        let host = parentList.lastElementChild;
        if (!host) {
          host = doc.createElement("li");
          parentList.appendChild(host);
        }
        host.appendChild(list);
      }
      stack[depth] = list;
      stack.length = depth + 1;
    }
    const li = item.li;
    li.removeAttribute("data-list");
    withoutIndent(li);
    li.querySelectorAll(":scope > .ql-ui").forEach((n) => n.remove());
    // Alignment lives on the item's paragraph in the editor's schema.
    const align = /(?:^|\s)(ql-align-(?:center|right|justify))(?:\s|$)/.exec(li.getAttribute("class") || "");
    if (align) {
      li.removeAttribute("class");
      const p = doc.createElement("p");
      p.setAttribute("class", align[1]);
      while (li.firstChild && !/^(UL|OL)$/.test(li.firstChild.nodeName)) p.appendChild(li.firstChild);
      li.insertBefore(p, li.firstChild);
    }
    list.appendChild(li);
  }
  return roots;
}

function unflattenLists(doc: Document) {
  const lists = Array.from(doc.body.querySelectorAll("ol, ul")).filter(isFlatQuillList);
  for (const list of lists) {
    if (!list.isConnected) continue;
    const parentTag = list.tagName.toLowerCase();
    const items: FlatItem[] = Array.from(list.children)
      .filter((c) => c.tagName === "LI")
      .map((li) => ({ kind: kindOf(li, parentTag), depth: indentOf(li), li }));
    const built = rebuild(doc, items);
    for (const el of built) list.parentNode!.insertBefore(el, list);
    list.remove();
  }
}

/**
 * Word writes a list as paragraphs: `<p class="MsoListParagraph"
 * style="mso-list:l0 level2 lfo1"><span style="mso-list:Ignore">·</span>Text</p>`.
 * Consecutive such paragraphs become one flat list, then nested like Quill's.
 */
function wordLists(doc: Document) {
  const paras = Array.from(doc.body.querySelectorAll("p[style*='mso-list'], p.MsoListParagraph, p.MsoListParagraphCxSpFirst, p.MsoListParagraphCxSpMiddle, p.MsoListParagraphCxSpLast"));
  if (!paras.length) return;
  const runs: Element[][] = [];
  let current: Element[] = [];
  for (const p of paras) {
    const prev = current[current.length - 1];
    if (prev && prev.nextElementSibling === p) current.push(p);
    else {
      if (current.length) runs.push(current);
      current = [p];
    }
  }
  if (current.length) runs.push(current);

  for (const run of runs) {
    const items: FlatItem[] = run.map((p) => {
      const level = /level(\d+)/i.exec(p.getAttribute("style") || "");
      const marker = p.querySelector("span[style*='mso-list:Ignore'], span[style*='mso-list: Ignore']");
      const markerText = (marker?.textContent || "").trim();
      marker?.remove();
      const li = doc.createElement("li");
      while (p.firstChild) li.appendChild(p.firstChild);
      return {
        kind: /^(\d+|[a-z]|[ivxlc]+)[.)]$/i.test(markerText) ? "ordered" : "bullet",
        depth: level ? Math.max(0, Number(level[1]) - 1) : 0,
        li,
      };
    });
    const built = rebuild(doc, items);
    for (const el of built) run[0].parentNode!.insertBefore(el, run[0]);
    run.forEach((p) => p.remove());
  }
}

/** Stored HTML (Quill or this editor) -> HTML for the editor to open. */
export function prepareForEditor(html: string | null | undefined): string {
  if (!html) return "";
  const doc = parse(html);
  doc.body.querySelectorAll(".ql-ui").forEach((n) => n.remove());
  unflattenLists(doc);
  // Quill's empty line is <p><br></p>; read it as an empty paragraph.
  doc.body.querySelectorAll("p, h1, h2, h3, h4, h5, h6").forEach((p) => {
    if (p.childNodes.length === 1 && p.firstChild!.nodeName === "BR") p.removeChild(p.firstChild!);
  });
  // A list item that held only <br> is an empty item.
  doc.body.querySelectorAll("li").forEach((li) => {
    if (li.firstChild && li.firstChild.nodeName === "BR" && (li.childNodes.length === 1 || li.childNodes[1].nodeName === "UL" || li.childNodes[1].nodeName === "OL")) {
      li.removeChild(li.firstChild);
    }
  });
  return doc.body.innerHTML;
}

/** Pasted HTML -> HTML with Word lists made real, before sanitising. */
export function preparePaste(html: string): string {
  if (!/mso-|Mso|ql-indent|data-list/.test(html)) return html;
  const doc = parse(html);
  wordLists(doc);
  doc.body.querySelectorAll(".ql-ui").forEach((n) => n.remove());
  unflattenLists(doc);
  return doc.body.innerHTML;
}
