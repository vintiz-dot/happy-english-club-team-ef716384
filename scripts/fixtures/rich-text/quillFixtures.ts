/**
 * Realistic HTML as the old Quill editor (react-quill-new, Quill 2, and the
 * Quill 1 rows from before it) stored it. Every name, sentence and link here
 * is invented; no row was copied from the database.
 */
export interface QuillFixture {
  name: string;
  html: string;
}

const UI = '<span class="ql-ui" contenteditable="false"></span>';

export const QUILL_FIXTURES: QuillFixture[] = [
  {
    name: "bold, italic, underline in one paragraph",
    html: "<p>Read <strong>page 12</strong> and answer <em>questions 1-5</em>. <u>Write neatly.</u></p>",
  },
  {
    name: "Quill 2 bullet list (written as <ol> with data-list)",
    html: `<ol><li data-list="bullet">${UI}Bring your workbook</li><li data-list="bullet">${UI}Bring a pencil</li><li data-list="bullet">${UI}Learn the five new words</li></ol>`,
  },
  {
    name: "Quill 2 numbered list with an indented bullet list inside",
    html:
      `<ol><li data-list="ordered">${UI}Unit 3 vocabulary</li>` +
      `<li data-list="bullet" class="ql-indent-1">${UI}cat, dog, rabbit</li>` +
      `<li data-list="bullet" class="ql-indent-1">${UI}parrot</li>` +
      `<li data-list="ordered">${UI}Workbook page 20</li>` +
      `<li data-list="ordered" class="ql-indent-1">${UI}Exercise A</li>` +
      `<li data-list="ordered" class="ql-indent-2">${UI}only the odd numbers</li>` +
      `<li data-list="ordered">${UI}Sing the song</li></ol>`,
  },
  {
    name: "bullet and numbered items switching at the same level",
    html: `<ol><li data-list="bullet">${UI}Listen</li><li data-list="ordered">${UI}Repeat</li><li data-list="ordered">${UI}Write</li><li data-list="bullet">${UI}Check</li></ol>`,
  },
  {
    name: "Quill 1 lists (<ul> and <ol>, indent classes)",
    html: '<ul><li>Red</li><li class="ql-indent-1">light red</li><li class="ql-indent-1">dark red</li><li>Blue</li></ul><ol><li>First</li><li>Second</li></ol>',
  },
  {
    name: "headings and alignment",
    html:
      '<h1>Weekend homework</h1><h2 class="ql-align-center">Speaking</h2><h3>Part 1</h3>' +
      '<p class="ql-align-right">Due Friday</p><p class="ql-align-center"><strong>Good luck!</strong></p>' +
      '<p class="ql-align-justify">Read the story about the brave little fox and tell your family what happened at the end.</p>',
  },
  {
    name: "indented paragraphs, one deeper than the reader draws",
    html: '<p>Steps:</p><p class="ql-indent-1">Open the book</p><p class="ql-indent-2">Find the picture of the zoo</p><p class="ql-indent-5">Count the animals</p>',
  },
  {
    name: "a link opening a video",
    html: '<p>Watch <a href="https://www.youtube.com/watch?v=abc123XYZ" rel="noopener noreferrer" target="_blank">this video</a> then answer.</p>',
  },
  {
    name: "a bold link and bold-italic text",
    html: '<p><strong><em>Remember:</em></strong> print the <a href="https://example.com/worksheets/unit-4.pdf" rel="noopener noreferrer" target="_blank"><strong>worksheet</strong></a> first.</p>',
  },
  {
    name: "text colour and highlight (Quill writes them on spans and on <strong>)",
    html:
      '<p><span style="color: rgb(230, 0, 0);">Important:</span> bring your book. ' +
      '<span style="background-color: rgb(255, 255, 0);">Test on Monday</span>. ' +
      '<strong style="color: rgb(0, 102, 204);">Blue and bold</strong></p>',
  },
  {
    name: "strike, subscript, superscript",
    html: "<p><s>Thursday</s> Friday. Water is H<sub>2</sub>O and the square of x is x<sup>2</sup>.</p>",
  },
  {
    name: "empty lines between paragraphs",
    html: "<p>Dear class,</p><p><br></p><p>Please practise every day.</p><p><br></p><p><br></p><p>Teacher Lan</p>",
  },
  {
    name: "a quote and a code block",
    html: '<blockquote>Practice makes perfect.</blockquote><pre class="ql-syntax" spellcheck="false">say("Hello, world!")\n</pre>',
  },
  {
    name: "a student's answer with a numbered list",
    html:
      "<p>My name is Minh. I like <strong>football</strong> and <em>drawing</em>.</p>" +
      `<ol><li data-list="ordered">${UI}I wake up at six o'clock.</li><li data-list="ordered">${UI}I have breakfast with my sister.</li><li data-list="ordered">${UI}I go to school by bike.</li></ol>`,
  },
  {
    name: "a long Vietnamese name and a very long word",
    html: "<p>Nguyễn Thị Phương Thảo wrote: Supercalifragilisticexpialidocious is the longest word I know!</p>",
  },
  {
    name: "pasted styles Quill kept (font family, size, black text)",
    html: '<p><span style="font-family: Arial; font-size: 14pt; color: rgb(0, 0, 0);">Pasted from a document</span></p>',
  },
  {
    name: "a centred list item",
    html: `<ol><li data-list="bullet" class="ql-align-center">${UI}Stand up</li><li data-list="bullet">${UI}Sit down</li></ol>`,
  },
  {
    name: "a line break inside a paragraph (pasted)",
    html: "<p>Roses are red,<br>violets are blue.</p>",
  },
];

/** Quill content whose meaning the editor deliberately changes (asserted separately). */
export const QUILL_CHECKLIST = `<ol><li data-list="checked">${UI}Read the story</li><li data-list="unchecked">${UI}Draw the fox</li></ol>`;

/** What Word puts on the clipboard for a two-level list and some formatting. */
export const WORD_PASTE =
  '<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><style>p.MsoNormal{margin:0}</style></head><body>' +
  '<p class="MsoNormal" style="margin-left:0cm;font-family:Calibri;mso-fareast-font-family:Calibri"><b><span style="font-size:14.0pt;color:black">Homework for Monday</span></b><o:p></o:p></p>' +
  '<p class="MsoListParagraphCxSpFirst" style="text-indent:-18.0pt;mso-list:l0 level1 lfo1"><span style="font-family:Symbol;mso-list:Ignore">·<span style="font:7.0pt &quot;Times New Roman&quot;">&nbsp;&nbsp;&nbsp;</span></span>Read page 4</p>' +
  '<p class="MsoListParagraphCxSpMiddle" style="margin-left:72.0pt;text-indent:-18.0pt;mso-list:l0 level2 lfo1"><span style="font-family:&quot;Courier New&quot;;mso-list:Ignore">o<span>&nbsp;&nbsp;</span></span>only the <i>first</i> part</p>' +
  '<p class="MsoListParagraphCxSpLast" style="text-indent:-18.0pt;mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">·<span>&nbsp;</span></span>Answer the questions</p>' +
  '<p class="MsoNormal"><span style="color:#C00000">Bring the book!</span><o:p></o:p></p>' +
  "</body></html>";

/** What Google Docs puts on the clipboard (the famous font-weight:normal <b> wrapper). */
export const GOOGLE_DOCS_PASTE =
  '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1a2b3c4d-7fff-1234-5678-9abcdef01234">' +
  '<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;text-decoration:none;vertical-align:baseline;white-space:pre-wrap;">Spelling test</span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:italic;text-decoration:none;white-space:pre-wrap;"> on Friday</span></p>' +
  '<ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial,sans-serif;color:#000000;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;font-weight:400;text-decoration:underline;white-space:pre-wrap;">elephant</span></p></li>' +
  '<li dir="ltr" style="list-style-type:disc;font-size:11pt;" aria-level="1"><p dir="ltr" role="presentation"><a href="https://example.org/words" style="text-decoration:none;"><span style="color:#1155cc;text-decoration:underline;">giraffe</span></a></p></li></ul>' +
  '<p dir="ltr"><span style="font-size:11pt;color:#ff0000;font-weight:400;">Practise at home</span></p></b>';
