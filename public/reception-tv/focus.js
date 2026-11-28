/* HEC reception display: which classes the screen is about right now.
 *
 * ES5 ONLY (Chromium 38 on the reception TV). Pure: no DOM, no clock of its
 * own, so `scripts/pgtest/reception-focus.test.mjs` runs it in Node.
 *
 * Owner, 29 Nov 2026: a class that starts at 17:10 is the screen's subject
 * from 10 minutes before it starts until 20 minutes after (drop-off), and
 * again for 15 minutes once it ends (pick-up). Outside those windows the
 * screen plays its usual loop.
 */
(function (root) {
  "use strict";

  var ARRIVE_BEFORE = 10, ARRIVE_AFTER = 20, LEAVE_AFTER = 15;

  // "17:10" or "17:10:00" -> minutes after midnight; anything else -> null.
  function mins(s) {
    var m = /^(\d{1,2}):(\d{2})/.exec(String(s || ""));
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
  }

  // Hanoi wall clock (UTC+7, no daylight saving) from a UTC timestamp in ms.
  function hanoiNow(ms) {
    var d = new Date(ms + 7 * 3600 * 1000);
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return { day: d.getUTCFullYear() + "-" + p(d.getUTCMonth() + 1) + "-" + p(d.getUTCDate()), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
  }

  /**
   * sessions: [{ class_name, start, end }] for `day` (the feed's today_sessions).
   * Returns the classes in focus at `minutes`, pick-up first (the parents are
   * there for longest then), each { class_name, mode: "arrive" | "leave", start, end }.
   * A class appears once; when two of its lessons overlap a window, the
   * pick-up one wins.
   */
  function classesInFocus(sessions, day, now) {
    if (!sessions || !now || day !== now.day) return [];
    var t = now.minutes, byClass = {}, out = [], i, s, a, b, mode;
    for (i = 0; i < sessions.length; i++) {
      s = sessions[i];
      if (!s || !s.class_name) continue;
      a = mins(s.start); b = mins(s.end);
      if (a == null) continue;
      if (b == null || b < a) b = a;
      mode = null;
      if (t >= b && t < b + LEAVE_AFTER) mode = "leave";
      else if (t >= a - ARRIVE_BEFORE && t < a + ARRIVE_AFTER) mode = "arrive";
      if (!mode) continue;
      if (byClass[s.class_name] && byClass[s.class_name].mode === "leave") continue;
      byClass[s.class_name] = { class_name: s.class_name, mode: mode, start: String(s.start).slice(0, 5), end: String(s.end || "").slice(0, 5) };
    }
    for (var k in byClass) if (byClass.hasOwnProperty(k)) out.push(byClass[k]);
    out.sort(function (x, y) {
      if (x.mode !== y.mode) return x.mode === "leave" ? -1 : 1;
      return x.start < y.start ? -1 : x.start > y.start ? 1 : (x.class_name < y.class_name ? -1 : 1);
    });
    return out;
  }

  // One string per focus set, so the display rebuilds only when it changes.
  function focusKey(list) {
    var parts = [];
    for (var i = 0; i < (list || []).length; i++) parts.push(list[i].mode + ":" + list[i].class_name);
    return parts.join("|");
  }

  root.HEC_FOCUS = { classesInFocus: classesInFocus, focusKey: focusKey, hanoiNow: hanoiNow, mins: mins,
    ARRIVE_BEFORE: ARRIVE_BEFORE, ARRIVE_AFTER: ARRIVE_AFTER, LEAVE_AFTER: LEAVE_AFTER };
})(typeof window !== "undefined" ? window : this);
