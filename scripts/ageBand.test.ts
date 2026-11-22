import { describe, expect, test } from "bun:test";
import { ageProfile } from "../src/lib/ageBand";

// docs/EXPERIENCE_DESIGN_BRIEF.md F1 and F4. Month is 1-12; the date is the date in Hanoi.

const at = (year: number, month: number) => ({ year, month });

// The rule StudentDashboard used before the age engine, kept here as the reference for
// "same answer on screen": a Vietnamese child starts Grade 1 in the September of the year
// they turn 6; Grade 3 and below take the young scale; no date of birth is the standard scale.
function oldIsYoungLearner(dateOfBirth: string | null, today: { year: number; month: number }): boolean {
  const born = Number((dateOfBirth || "").slice(0, 4));
  if (!born) return false;
  const schoolYear = today.month >= 9 ? today.year : today.year - 1;
  return schoolYear - born - 5 <= 3;
}

describe("grade boundaries: the grade changes on 1 September, not on a birthday", () => {
  // Born in 2018: Grade 1 in school year 2024 (Sept 2024 - Aug 2025), Grade 2 in 2025.
  test("31 August is still the old school year, 1 September the new one", () => {
    expect(ageProfile("2018-06-15", at(2025, 8)).grade).toBe(1);
    expect(ageProfile("2018-06-15", at(2025, 9)).grade).toBe(2);
  });

  test("the early / young boundary falls on 1 September", () => {
    expect(ageProfile("2018-06-15", at(2025, 8)).band).toBe("early");
    expect(ageProfile("2018-06-15", at(2025, 9)).band).toBe("young");
  });

  test("the young / junior boundary falls on 1 September", () => {
    // born 2017: Grade 3 until 31 Aug 2026, Grade 4 from 1 Sept 2026
    expect(ageProfile("2017-06-15", at(2026, 8))).toMatchObject({ grade: 3, band: "young" });
    expect(ageProfile("2017-06-15", at(2026, 9))).toMatchObject({ grade: 4, band: "junior" });
  });

  test("the junior / teen boundary falls on 1 September", () => {
    // born 2014: Grade 6 until 31 Aug 2026, Grade 7 from 1 Sept 2026
    expect(ageProfile("2014-06-15", at(2026, 8))).toMatchObject({ grade: 6, band: "junior" });
    expect(ageProfile("2014-06-15", at(2026, 9))).toMatchObject({ grade: 7, band: "teen" });
  });

  test("every band, in the school year starting September 2026", () => {
    const band = (year: number) => ageProfile(`${year}-06-15`, at(2026, 10));
    expect(band(2023)).toMatchObject({ grade: -2, band: "early" }); // pre-school, age 3
    expect(band(2022)).toMatchObject({ grade: -1, band: "early" });
    expect(band(2021)).toMatchObject({ grade: 0, band: "early" });
    expect(band(2020)).toMatchObject({ grade: 1, band: "early" });
    expect(band(2019)).toMatchObject({ grade: 2, band: "young" });
    expect(band(2018)).toMatchObject({ grade: 3, band: "young" });
    expect(band(2017)).toMatchObject({ grade: 4, band: "junior" });
    expect(band(2015)).toMatchObject({ grade: 6, band: "junior" });
    expect(band(2014)).toMatchObject({ grade: 7, band: "teen" });
    expect(band(2008)).toMatchObject({ grade: 13, band: "teen" });
  });

  test("a known date gives known: true", () => {
    expect(ageProfile("2018-06-15", at(2026, 10)).known).toBe(true);
  });
});

describe("December versus January of adjacent years", () => {
  test("born 31 Dec 2017 and 1 Jan 2018 differ by a day and by a grade", () => {
    const december = ageProfile("2017-12-31", at(2026, 10));
    const january = ageProfile("2018-01-01", at(2026, 10));
    expect(december).toMatchObject({ grade: 4, band: "junior" });
    expect(january).toMatchObject({ grade: 3, band: "young" });
  });

  test("two classmates born in the same year share a band all year", () => {
    for (const month of [9, 10, 12, 1, 4, 8]) {
      const year = month >= 9 ? 2026 : 2027;
      const early = ageProfile("2018-01-02", at(year, month));
      const late = ageProfile("2018-12-30", at(year, month));
      expect(late.band).toBe(early.band);
      expect(late.grade).toBe(early.grade);
    }
  });

  test("a birthday never moves the child to a new band", () => {
    // born 15 June 2018: the grade is the same before and after the birthday month
    expect(ageProfile("2018-06-15", at(2026, 5)).grade).toBe(ageProfile("2018-06-15", at(2026, 7)).grade);
  });
});

describe("missing, malformed, future and implausible dates are treated as missing", () => {
  const unknown = { band: "junior", grade: null, known: false, youngScale: false };

  test("missing", () => {
    expect(ageProfile(null, at(2026, 10))).toEqual(unknown);
    expect(ageProfile(undefined, at(2026, 10))).toEqual(unknown);
    expect(ageProfile("", at(2026, 10))).toEqual(unknown);
    expect(ageProfile("   ", at(2026, 10))).toEqual(unknown);
  });

  test("malformed", () => {
    for (const bad of ["2018/06/15", "15-06-2018", "June 2018", "2018", "2018-06", "abcd-ef-gh", "2018-13-01", "2018-00-10", "2018-06-00", "2018-02-30", "2019-02-29"]) {
      expect(ageProfile(bad, at(2026, 10))).toEqual(unknown);
    }
  });

  test("a leap day is a real date", () => {
    expect(ageProfile("2016-02-29", at(2026, 10)).known).toBe(true);
  });

  test("in the future", () => {
    expect(ageProfile("2030-01-01", at(2026, 10))).toEqual(unknown);
    expect(ageProfile("2027-01-01", at(2026, 10))).toEqual(unknown);
  });

  test("under 3 or over 19", () => {
    expect(ageProfile("2025-01-01", at(2026, 10))).toEqual(unknown); // 1
    expect(ageProfile("2024-06-15", at(2026, 10))).toEqual(unknown); // 2
    expect(ageProfile("2023-11-15", at(2026, 10))).toEqual(unknown); // 2 (turns 3 in November)
    expect(ageProfile("2023-10-15", at(2026, 10)).known).toBe(true); // 3
  });

  test("age 19 is the last plausible age, 20 is not", () => {
    expect(ageProfile("2007-10-15", at(2026, 10)).known).toBe(true); // 19
    expect(ageProfile("2006-10-15", at(2026, 10)).known).toBe(false); // 20
    expect(ageProfile("1990-05-05", at(2026, 10)).known).toBe(false);
  });

  test("an ISO timestamp from the database is read by its date", () => {
    expect(ageProfile("2018-06-15T00:00:00+00:00", at(2026, 10))).toEqual(ageProfile("2018-06-15", at(2026, 10)));
  });
});

describe("youngScale", () => {
  test("is true for early and young, false for junior and teen", () => {
    expect(ageProfile("2020-06-15", at(2026, 10)).youngScale).toBe(true); // early
    expect(ageProfile("2018-06-15", at(2026, 10)).youngScale).toBe(true); // young
    expect(ageProfile("2017-06-15", at(2026, 10)).youngScale).toBe(false); // junior
    expect(ageProfile("2012-06-15", at(2026, 10)).youngScale).toBe(false); // teen
  });

  test("equals the old isYoungLearner() answer for every birth year 2008-2023 at three dates", () => {
    const dates = [at(2026, 9), at(2026, 12), at(2027, 6)];
    for (const today of dates) {
      for (let year = 2008; year <= 2023; year++) {
        const dob = `${year}-06-15`;
        const profile = ageProfile(dob, today);
        expect(profile.known).toBe(true);
        expect(profile.youngScale).toBe(oldIsYoungLearner(dob, today));
      }
    }
  });

  test("no date of birth is the standard scale, as before", () => {
    expect(ageProfile(null, at(2026, 10)).youngScale).toBe(oldIsYoungLearner(null, at(2026, 10)));
  });
});
