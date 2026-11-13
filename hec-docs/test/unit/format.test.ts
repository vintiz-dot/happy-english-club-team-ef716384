import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeRich, printLinks, formatDate, formatNumber } from "../../src/format.ts";
import { FILENAME_STRATEGIES, safeFileName, sanitizeFilename } from "../../src/filenames.ts";

test("rich text: scripts, images, handlers, iframes and javascript: links are removed", () => {
  const out = sanitizeRich('<p onclick="x()">Hi<script>alert(1)</script><img src="https://t/x.png"><a href="javascript:alert(1)">x</a><iframe src="https://e"></iframe></p>');
  assert.equal(out, "<p>Hi<a>x</a></p>");
});

test("rich text: mirrors cleanRichHtml (tables lose structure and their header row)", () => {
  const out = sanitizeRich("<table><thead><tr><th>Verb</th></tr></thead><tbody><tr><td>go</td><td>went</td></tr></tbody></table>");
  assert.equal(out, "gowent");
});

test("rich text: only meaningful inline styles and Quill classes survive; indents cap at 3", () => {
  const out = sanitizeRich('<p class="ql-indent-7 foo" style="color: red; width: 900px; background: url(x)">a&nbsp;b</p>');
  assert.equal(out, '<p class="ql-indent-3" style="color:red">a b</p>');
});

test("links print their address when the text is not the URL", () => {
  assert.equal(printLinks('<a href="https://a.b/c">track</a>'), '<a href="https://a.b/c">track</a><span class="link-href"> (https://a.b/c)</span>');
  assert.equal(printLinks('<a href="https://a.b/c">https://a.b/c</a>'), '<a href="https://a.b/c">https://a.b/c</a>');
});

test("dates and numbers format exactly like the browser given an explicit locale", () => {
  assert.equal(formatDate("2026-11-19T23:59:00+07:00", "en-US", { year: "numeric", month: "long", day: "numeric" }, "Asia/Ho_Chi_Minh"), "November 19, 2026");
  assert.equal(formatNumber(2130000, "vi-VN"), "2.130.000");
});

test("filenames are byte-identical to the app's, quirks included", () => {
  assert.equal(FILENAME_STRATEGIES.homework({ homework: { title: "Unit 6: My Weekend – Bài tập" } }), "Unit_6__My_Weekend___B_i_t_p_homework.pdf");
  assert.equal(sanitizeFilename("Nguyễn Đức Bảo"), "Nguyen__uc_Bao"); // NFD does not decompose Đ
  assert.equal(safeFileName('Nguyễn Thị: "Minh" Anh'), "Nguyễn Thị- -Minh- Anh");
  assert.equal(FILENAME_STRATEGIES["progress-report"]({ studentName: "Nguyễn Thị Minh Anh" }), "Nguyễn Thị Minh Anh - Progress Report.pdf");
  assert.equal(FILENAME_STRATEGIES["profile-card"]({ name: "Minh Anh" }), "Minh Anh-profile.png");
});
