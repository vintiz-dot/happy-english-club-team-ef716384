/**
 * Every word the editor itself shows or says to a screen reader. A host app
 * passes `strings` (a whole set, or a partial override of one); nothing in the
 * component folder is written anywhere else.
 */
export interface RichTextStrings {
  toolbar: string;
  bold: string;
  italic: string;
  underline: string;
  strike: string;
  heading1: string;
  heading2: string;
  heading3: string;
  bulletList: string;
  orderedList: string;
  indent: string;
  outdent: string;
  quote: string;
  link: string;
  linkAddress: string;
  linkApply: string;
  linkRemove: string;
  linkCancel: string;
  linkInvalid: string;
  textColour: string;
  highlight: string;
  colourDefault: string;
  colourNames: Record<string, string>;
  subscript: string;
  superscript: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  alignJustify: string;
  image: string;
  imageUploading: string;
  imageFailed: string;
  clear: string;
  undo: string;
  redo: string;
  loading: string;
  /** `{count}` and `{max}` are replaced. */
  counter: string;
  /** Read out when the limit is reached. */
  counterFull: string;
  editorLabel: string;
}

export const RICH_TEXT_STRINGS_EN: RichTextStrings = {
  toolbar: "Text formatting",
  bold: "Bold",
  italic: "Italic",
  underline: "Underline",
  strike: "Strikethrough",
  heading1: "Heading 1",
  heading2: "Heading 2",
  heading3: "Heading 3",
  bulletList: "Bulleted list",
  orderedList: "Numbered list",
  indent: "Indent",
  outdent: "Outdent",
  quote: "Quote",
  link: "Link",
  linkAddress: "Link address",
  linkApply: "Apply",
  linkRemove: "Remove link",
  linkCancel: "Cancel",
  linkInvalid: "Use a web address that starts with http:// or https://",
  textColour: "Text colour",
  highlight: "Highlight",
  colourDefault: "Default",
  colourNames: { red: "Red", orange: "Orange", green: "Green", blue: "Blue", purple: "Purple", yellow: "Yellow", pink: "Pink" },
  subscript: "Subscript",
  superscript: "Superscript",
  alignLeft: "Align left",
  alignCenter: "Align centre",
  alignRight: "Align right",
  alignJustify: "Justify",
  image: "Insert picture",
  imageUploading: "Uploading picture…",
  imageFailed: "The picture could not be uploaded",
  clear: "Clear formatting",
  undo: "Undo",
  redo: "Redo",
  loading: "Loading editor…",
  counter: "{count} / {max} characters",
  counterFull: "Character limit reached",
  editorLabel: "Text editor",
};

export const RICH_TEXT_STRINGS_VI: RichTextStrings = {
  toolbar: "Định dạng văn bản",
  bold: "In đậm",
  italic: "In nghiêng",
  underline: "Gạch chân",
  strike: "Gạch ngang",
  heading1: "Tiêu đề 1",
  heading2: "Tiêu đề 2",
  heading3: "Tiêu đề 3",
  bulletList: "Danh sách dấu chấm",
  orderedList: "Danh sách đánh số",
  indent: "Thụt lề",
  outdent: "Giảm thụt lề",
  quote: "Trích dẫn",
  link: "Liên kết",
  linkAddress: "Địa chỉ liên kết",
  linkApply: "Áp dụng",
  linkRemove: "Gỡ liên kết",
  linkCancel: "Hủy",
  linkInvalid: "Hãy dùng địa chỉ web bắt đầu bằng http:// hoặc https://",
  textColour: "Màu chữ",
  highlight: "Tô sáng",
  colourDefault: "Mặc định",
  colourNames: { red: "Đỏ", orange: "Cam", green: "Xanh lá", blue: "Xanh dương", purple: "Tím", yellow: "Vàng", pink: "Hồng" },
  subscript: "Chỉ số dưới",
  superscript: "Chỉ số trên",
  alignLeft: "Căn trái",
  alignCenter: "Căn giữa",
  alignRight: "Căn phải",
  alignJustify: "Căn đều",
  image: "Chèn ảnh",
  imageUploading: "Đang tải ảnh lên…",
  imageFailed: "Không tải được ảnh lên",
  clear: "Xóa định dạng",
  undo: "Hoàn tác",
  redo: "Làm lại",
  loading: "Đang tải trình soạn thảo…",
  counter: "{count} / {max} ký tự",
  counterFull: "Đã đạt giới hạn ký tự",
  editorLabel: "Trình soạn thảo văn bản",
};

export const RICH_TEXT_STRINGS = { en: RICH_TEXT_STRINGS_EN, vi: RICH_TEXT_STRINGS_VI } as const;
export type RichTextLocale = keyof typeof RICH_TEXT_STRINGS;

export function resolveStrings(locale: RichTextLocale = "en", override?: Partial<RichTextStrings>): RichTextStrings {
  const base = RICH_TEXT_STRINGS[locale] ?? RICH_TEXT_STRINGS_EN;
  return override ? { ...base, ...override, colourNames: { ...base.colourNames, ...(override.colourNames || {}) } } : base;
}

export function formatCounter(template: string, count: number, max: number): string {
  return template.replace("{count}", String(count)).replace("{max}", String(max));
}
