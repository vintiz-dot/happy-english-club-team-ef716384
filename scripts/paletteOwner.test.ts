import { describe, expect, test } from "bun:test";
import { isAdminPage, paletteFor } from "../src/lib/paletteOwner";

describe("one Ctrl+K palette per page", () => {
  test("an admin on an admin-only page gets the admin quick-jump", () => {
    for (const p of ["/admin", "/admin/classes/abc", "/students", "/students/1/tuition", "/teachers", "/teachers/9", "/classes", "/families", "/families/3"]) {
      expect(paletteFor("admin", p)).toBe("admin");
    }
  });

  test("an admin anywhere else gets the general bar", () => {
    for (const p of ["/teacher/dashboard", "/teacher/books", "/schedule", "/dashboard", "/tuition", "/vocabulary"]) {
      expect(paletteFor("admin", p)).toBe("general");
    }
  });

  test("a teacher never gets the admin one, on any page", () => {
    for (const p of ["/admin", "/students", "/teachers", "/teacher/dashboard", "/schedule", "/"]) {
      expect(paletteFor("teacher", p)).toBe("general");
    }
  });

  test("other roles get none", () => {
    for (const r of ["student", "family", null, undefined]) {
      expect(paletteFor(r, "/admin")).toBeNull();
      expect(paletteFor(r, "/student/dashboard")).toBeNull();
    }
  });

  test("/teacher/... is not /teachers", () => {
    expect(isAdminPage("/teacher/payroll")).toBe(false);
    expect(isAdminPage("/teachers")).toBe(true);
    expect(isAdminPage("/administrator")).toBe(false);
  });
});
