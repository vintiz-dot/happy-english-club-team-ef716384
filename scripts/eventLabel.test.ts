import { describe, expect, test } from "bun:test";
import { eventAccessibleName } from "../src/components/calendar/lib/eventLabel";

// axe's label-content-name-mismatch: the visible text, punctuation and case
// ignored, must sit inside the accessible name. The fix goes further and
// starts the name with it.
const norm = (s: string) => s.toLowerCase().replace(/[\p{P}\p{S}]/gu, "").replace(/\s+/g, " ").trim();

describe("calendar chip names start with what the chip shows", () => {
  test("month chip: time and class first, then teacher and status", () => {
    const name = eventAccessibleName(["17:30 Starters 1", false], ["Ms Lan", "Held", null]);
    expect(name).toBe("17:30 Starters 1, Ms Lan, Held");
    expect(norm(name).startsWith(norm("17:30 Starters 1"))).toBe(true);
  });

  test("month chip with its count showing keeps the count in place", () => {
    const name = eventAccessibleName(["17:30 Starters 1", "8"], ["Ms Lan", "Held"]);
    expect(name).toBe("17:30 Starters 1, 8, Ms Lan, Held");
    expect(norm(name).startsWith(norm("17:30 Starters 1 8"))).toBe(true);
  });

  test("week block: class, times line, teacher line, then what is not shown", () => {
    const visible = ["Starters 1", "17:30–18:30 (+5m) · 8", "Ms Lan"];
    const name = eventAccessibleName(visible, [false, false, "Held", "Ran 5 minutes long"]);
    expect(name).toBe("Starters 1, 17:30–18:30 (+5m) · 8, Ms Lan, Held, Ran 5 minutes long");
    expect(norm(name).startsWith(norm(visible.join(" ")))).toBe(true);
  });

  test("a short block says the times and teacher it has no room for, after the name", () => {
    const name = eventAccessibleName(["Starters 1", false, false], ["17:30 to 18:30", "Ms Lan", "Scheduled"]);
    expect(name).toBe("Starters 1, 17:30 to 18:30, Ms Lan, Scheduled");
  });

  test("nothing missing is said as an empty piece, nothing shown is said twice", () => {
    expect(eventAccessibleName(["17:30 Movers 2"], [undefined, "", "Held"])).toBe("17:30 Movers 2, Held");
    expect(eventAccessibleName(["Starters 1", "Ms Lan"], ["Ms Lan", "Held"])).toBe("Starters 1, Ms Lan, Held");
  });
});
