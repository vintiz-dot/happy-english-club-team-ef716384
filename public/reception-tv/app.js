/* HEC reception display.
 *
 * ES5 ONLY. The LG 43UH610T runs webOS 3.0, whose browser engine is
 * Chromium 38: no arrow functions, let/const, template strings, fetch,
 * Object.assign, Array.prototype.find/includes or CSS variables.
 *
 * Reads the reception-feed edge function with the display token from
 * config.js, keeps the last good feed in localStorage so a Wi-Fi drop never
 * blanks the screen, and rotates through the scenes for ever.
 * `?demo=1` loads demo-feed.js instead (made-up names; for previews only).
 */
(function () {
  "use strict";

  var CFG = window.HEC_RECEPTION || {};
  // A browser (not the packaged app) gets its token from the admin's link,
  // #token=..., and keeps it on that device so a reload still works.
  (function () {
    var m = location.hash.match(/token=([a-f0-9]{48})/);
    try {
      if (m) localStorage.setItem("hec-reception-token", m[1]);
      if (!CFG.token) CFG.token = (m && m[1]) || localStorage.getItem("hec-reception-token") || "";
    } catch (e) { if (!CFG.token && m) CFG.token = m[1]; }
  })();
  var DEMO = /[?&]demo=1/.test(location.search);
  var HOLD = (location.search.match(/[?&]scene=(\d+)/) || [])[1]; // previews: stay on one scene
  var REFRESH_MS = 3 * 60 * 1000;
  var RELOAD_MS = 6 * 60 * 60 * 1000; // a fresh page every 6h keeps a 2016 TV's memory in check
  var CACHE_KEY = "hec-reception-feed-v1";

  var feed = null;
  var scenes = [];
  var idx = -1;
  var timer = null;
  var front = "scene-a";

  // ------------------------------------------------------------ helpers
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmt(n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  // Children with points (a rank); the others are listed after them with "–".
  function ranked(list) { return filter(list || [], function (p) { return p && p.rank != null; }); }
  function rankText(p) { return p && p.rank != null ? String(p.rank) : "\u2013"; }
  var EVERYONE_PER_PAGE = 30;
  var BOARD_LINES = 10;
  function chunk(list, n) { var out = []; for (var i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); return out; }
  function filter(list, fn) { var out = []; for (var i = 0; i < (list || []).length; i++) if (fn(list[i])) out.push(list[i]); return out; }
  function initials(name) {
    var p = String(name || "?").replace(/^\s+|\s+$/g, "").split(/\s+/);
    // Vietnamese names put the given name last; show it with the family initial.
    var a = p[p.length - 1] || "?";
    return (p.length > 1 ? p[0].charAt(0) : "") + a.charAt(0);
  }
  function photo(person, size) {
    var px = size + "px";
    var inner = person && person.photo
      ? '<img src="' + esc(person.photo) + '" alt="" onerror="this.style.display=\'none\'">'
      : "";
    return '<div class="ph" style="width:' + px + ";height:" + px + '"><div class="ini" style="font-size:' +
      Math.round(size * 0.36) + 'px">' + esc(initials(person && person.name)) + "</div>" + inner + "</div>";
  }
  function bi(en, vi, cls) {
    return '<div class="' + (cls || "") + '">' + esc(en) + (vi ? '<span class="vi" style="display:block;font-size:0.62em;margin-top:6px">' + esc(vi) + "</span>" : "") + "</div>";
  }
  function stars(n) { var s = ""; for (var i = 0; i < 5; i++) s += i < n ? "★" : "☆"; return s; }
  var MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function monthName(ym) { if (!ym) return ""; var m = parseInt(ym.slice(5, 7), 10); return MONTHS_EN[m - 1] + " " + ym.slice(0, 4); }
  function monthVi(ym) { if (!ym) return ""; return "Tháng " + parseInt(ym.slice(5, 7), 10) + "/" + ym.slice(0, 4); }

  // ------------------------------------------------------------ stage scaling
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    var st = $("stage");
    var t = "scale(" + s + ")";
    st.style.webkitTransform = t; st.style.transform = t;
    st.style.left = Math.round((window.innerWidth - 1920 * s) / 2) + "px";
    st.style.top = Math.round((window.innerHeight - 1080 * s) / 2) + "px";
  }

  // ------------------------------------------------------------ clock (Hanoi)
  var DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var DAYS_VI = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
  function tick() {
    var d = new Date(Date.now() + 7 * 3600 * 1000); // Hanoi, whatever the TV's zone
    var hh = d.getUTCHours(), mm = d.getUTCMinutes();
    $("clock-time").innerHTML = (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
    $("clock-date").innerHTML = esc(DAYS_EN[d.getUTCDay()] + ", " + d.getUTCDate() + " " + MONTHS_EN[d.getUTCMonth()]) +
      " · " + esc(DAYS_VI[d.getUTCDay()] + ", " + d.getUTCDate() + "/" + (d.getUTCMonth() + 1));
  }

  // ------------------------------------------------------------ data
  function load(done) {
    if (DEMO) { done(window.HEC_DEMO_FEED || null); return; }
    var xhr = new XMLHttpRequest();
    xhr.open("POST", CFG.feedUrl, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    if (CFG.apiKey) { xhr.setRequestHeader("apikey", CFG.apiKey); xhr.setRequestHeader("Authorization", "Bearer " + CFG.apiKey); }
    xhr.timeout = 20000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      var data = null;
      if (xhr.status === 200) { try { data = JSON.parse(xhr.responseText); } catch (e) { data = null; } }
      done(data && !data.error ? data : null);
    };
    xhr.ontimeout = function () { done(null); };
    xhr.send(JSON.stringify({ token: CFG.token || "", screen: CFG.screen || "browser" }));
  }
  function refresh() {
    load(function (data) {
      var online = !!data;
      $("status").className = online ? "" : "off";
      if (data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) {}
      } else {
        try { data = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch (e) { data = null; }
      }
      if (!data) { if (!feed) showSetup(); return; }
      var first = !feed;
      feed = data;
      scenes = build(feed);
      ticker(feed);
      if (first) next();
    });
  }

  // ------------------------------------------------------------ scenes
  function on(sec) { return !feed || !feed.settings || !feed.settings.sections || feed.settings.sections[sec] !== false; }

  function build(f) {
    var list = [];
    var items = f.items || [];
    var ofKind = function (k) { return filter(items, function (i) { return i.kind === k; }); };

    if (on("welcome")) list.push({ t: ["Welcome", "Chào mừng"], html: welcome(f), secs: 1.2 });
    if (on("leaderboard") && ranked(f.leaderboard).length) list.push({ t: ["Leaderboard · " + monthName(f.month), "Bảng xếp hạng · " + monthVi(f.month)], html: leaderboard(f), secs: 1.4 });
    // Every student and their points, EVERYONE_PER_PAGE to a page (owner,
    // 17 Nov 2026: "show every student in the reception tv").
    var all = f.everyone || f.leaderboard || [];
    if (on("leaderboard") && all.length) {
      var ev = chunk(all, EVERYONE_PER_PAGE);
      for (var e = 0; e < ev.length; e++) {
        list.push({ t: ["Every Student · " + monthName(f.month) + (ev.length > 1 ? " (" + (e + 1) + "/" + ev.length + ")" : ""),
          "Tất cả học sinh · " + monthVi(f.month)], html: everyone(ev[e], e * EVERYONE_PER_PAGE), secs: 1.3 });
      }
    }
    if (on("classes")) {
      // A class longer than one board carries on on the next ("2/2").
      var parts = [];
      var cb = f.class_boards || [];
      for (var ci = 0; ci < cb.length; ci++) {
        var pieces = chunk(cb[ci].everyone || cb[ci].top || [], BOARD_LINES);
        for (var pi = 0; pi < pieces.length; pi++) {
          parts.push({ class_name: cb[ci].class_name + (pieces.length > 1 ? " (" + (pi + 1) + "/" + pieces.length + ")" : ""),
            curriculum: cb[ci].curriculum, students: cb[ci].students, top: pieces[pi] });
        }
      }
      var bc = chunk(parts, 3);
      for (var i = 0; i < bc.length; i++) list.push({ t: ["Class Stars", "Ngôi sao của lớp"], html: boards(bc[i]) });
    }
    if (on("awards")) {
      var ch = chunk(f.champions || [], 6);
      for (var c = 0; c < ch.length; c++) list.push({ t: ["Champions of " + monthName(f.champions_month), "Quán quân " + monthVi(f.champions_month)], html: champions(ch[c]) });
      var aw = ofKind("award");
      for (var a = 0; a < aw.length; a++) list.push({ t: ["Student Awards", "Giải thưởng học sinh"], html: feature(aw[a], "Award · Giải thưởng") });
    }
    if (on("success")) list.push({ t: ["Our Success", "Thành tích của chúng tôi"], html: success(f, ofKind("success")), secs: 1.2 });
    if (on("courses")) {
      var cc = chunk(f.courses || [], 6);
      for (var k = 0; k < cc.length; k++) list.push({ t: ["Our Programmes", "Chương trình học"], html: courses(cc[k]), secs: 1.3 });
      var extra = ofKind("course");
      for (var x = 0; x < extra.length; x++) list.push({ t: ["Our Programmes", "Chương trình học"], html: feature(extra[x], "Programme · Khoá học") });
    }
    // Albums and videos are spread through the loop (see the end of build).
    // Videos take turns: VIDEOS_PER_LOOP a loop, moving on each time round.
    var media = [];
    if (on("albums")) {
      var al = filter(ofKind("album"), function (x) { return x.images && x.images.length; });
      for (var ai = 0; ai < al.length; ai++) media.push(albumScene(al[ai]));
    }
    var vids = [];
    if (on("videos")) {
      var vs = filter(ofKind("video"), function (x) { return !!x.video_url; });
      var take = Math.min(VIDEOS_PER_LOOP, vs.length);
      for (var vi = 0; vi < take; vi++) vids.push(videoScene(vs[(videoOffset + vi) % vs.length]));
      videoCount = vs.length;
    }
    if (on("photos")) {
      var ph = filter(ofKind("photo"), function (p) { return !!p.image_url; });
      for (var p = 0; p < ph.length; p++) list.push({ t: ["Life at HEC", "Cuộc sống tại HEC"], html: photoScene(ph[p]) });
    }
    if (on("announcements")) {
      var notes = ofKind("announcement").concat(ofKind("event"));
      var nc = chunk(notes, 3);
      for (var n = 0; n < nc.length; n++) list.push({ t: ["News & Events", "Tin tức & Sự kiện"], html: announcements(nc[n]) });
    }
    if (on("feedback")) {
      var fb = chunk(f.feedback || [], 2);
      if (!fb.length) fb = [[]];
      for (var q = 0; q < fb.length; q++) list.push({ t: ["Families Say", "Phụ huynh nói gì"], html: feedback(f, fb[q]), secs: 1.3 });
    }
    // Mix: albums and videos alternate, one after every two other scenes.
    var mix = [], mi = 0, vj = 0;
    while (mi < media.length || vj < vids.length) {
      if (mi < media.length) mix.push(media[mi++]);
      if (vj < vids.length) mix.push(vids[vj++]);
    }
    if (mix.length) {
      var core = list, out = [], gap = Math.max(1, Math.floor(core.length / (mix.length + 1))), k = 0;
      for (var ci = 0; ci < core.length; ci++) {
        out.push(core[ci]);
        if ((ci + 1) % gap === 0 && k < mix.length && ci > 0) out.push(mix[k++]);
      }
      while (k < mix.length) out.push(mix[k++]);
      list = out;
    }
    if (!list.length) list.push({ t: ["Welcome", "Chào mừng"], html: welcome(f) });
    return list;
  }

  function welcome(f) {
    var s = f.stats || {};
    return '<div class="row welcome center">' +
      '<div class="left">' +
        '<div class="eyebrow rise">English the ELA way · Hanoi</div>' +
        '<div class="h-xl rise d1" style="margin-top:22px">Use it,<br>don’t just <span class="gold">memorise</span> it.</div>' +
        '<div class="lead rise d2" style="margin-top:26px">US Common Core ELA with a US-certified teacher and foreign &amp; Vietnamese TAs. Never more than 12 in a class.' +
          '<span class="vi" style="display:block;font-size:24px;margin-top:10px">Tiếng Anh theo chuẩn ELA Hoa Kỳ — tối đa 12 học sinh mỗi lớp.</span></div>' +
        '<div class="row stats rise d3">' +
          stat(s.students, "Students learning now", "Học sinh đang học") +
          stat(s.classes, "Classes this term", "Lớp học") +
          stat((s.review_score || "5.0") + "★", (s.review_count || 47) + " parent reviews", "Đánh giá của phụ huynh") +
        "</div>" +
      "</div>" +
      '<div class="col center"><img class="logo-big rise d2" src="assets/logo-gold.png" alt=""></div>' +
    "</div>";
  }
  function stat(n, en, vi) { return '<div class="stat"><div class="n">' + esc(typeof n === "number" ? fmt(n) : n) + '</div><div class="l">' + esc(en) + '<span class="vi">' + esc(vi) + "</span></div></div>"; }

  function leaderboard(f) {
    var top = ranked(f.leaderboard).slice(0, 10);
    var order = [top[1], top[0], top[2]];
    var heights = [160, 200, 125];
    var pods = "";
    for (var i = 0; i < 3; i++) {
      var p = order[i];
      if (!p) { pods += '<div class="pod"></div>'; continue; }
      pods += '<div class="pod rise d' + (i + 1) + '">' +
        (p.rank === 1 ? '<div class="crown">♛</div>' : "") +
        photo(p, p.rank === 1 ? 170 : 140) +
        '<div class="name">' + esc(p.name) + '</div><div class="cls">' + esc(p.class_name || "") + "</div>" +
        '<div class="block" style="height:' + heights[i] + 'px"><div class="rk">' + p.rank + '</div><div class="pts">' + fmt(p.points) + " pts</div></div></div>";
    }
    var rest = "";
    for (var j = 3; j < top.length; j++) {
      var r = top[j];
      rest += '<div class="item card row rise d4" style="-webkit-align-items:center;align-items:center"><div class="rk">' + r.rank + "</div>" + photo(r, 56) +
        '<div style="margin-left:14px;min-width:0" class="grow"><div class="nm">' + esc(r.name) + '</div><div class="pt">' + fmt(r.points) + " pts</div></div></div>";
    }
    return '<div class="row podium">' + pods + '</div><div class="row wrap rest">' + rest + "</div>";
  }

  function boards(list) {
    var html = "";
    for (var i = 0; i < list.length; i++) {
      var b = list[i], lines = "";
      var dense = b.top.length > 6;
      for (var j = 0; j < b.top.length; j++) {
        var s = b.top[j];
        lines += '<div class="line row">' + '<div class="rk">' + rankText(s) + "</div>" + photo(s, dense ? 46 : 74) +
          '<div class="nm grow">' + esc(s.name) + '</div><div class="pt">' + fmt(s.points) + "</div></div>";
      }
      html += '<div class="board card col rise d' + (i + 1) + (dense ? " dense" : "") + '"><div class="bh">' + esc(b.class_name) + '</div><div class="bs">' +
        esc((b.curriculum || "") + (b.students ? " · " + b.students + " students" : "")) + "</div>" + lines + "</div>";
    }
    return '<div class="row boards">' + html + "</div>";
  }

  function everyone(list, offset) {
    var cols = chunk(list, 10), html = "";
    for (var c = 0; c < cols.length; c++) {
      var lines = "";
      for (var j = 0; j < cols[c].length; j++) {
        var p = cols[c][j];
        lines += '<div class="ev-line row">' + '<div class="rk">' + rankText(p) + "</div>" + photo(p, 44) +
          '<div class="grow ev-who"><div class="nm">' + esc(p.name) + '</div><div class="cls">' + esc(p.class_name || "") + "</div></div>" +
          '<div class="pt">' + fmt(p.points) + "</div></div>";
      }
      html += '<div class="ev-col card col rise d' + (c + 1) + '">' + lines + "</div>";
    }
    return '<div class="row everyone">' + html + "</div>";
  }

  function champions(list) {
    var html = "";
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      html += '<div class="tile card row rise d' + ((i % 5) + 1) + '">' + photo(c, 130) + '<div class="txt grow"><div class="nm">' + esc(c.name) +
        '</div><div class="sub">' + esc(c.class_name || "") + '</div><div class="badge">♛ ' + fmt(c.points) + " pts</div></div></div>";
    }
    return '<div class="col center" style="height:100%"><div class="lead rise" style="text-align:center;margin-bottom:34px">Top of their class last month · <span class="vi">Dẫn đầu lớp tháng trước</span></div>' +
      '<div class="row wrap tiles">' + html + "</div></div>";
  }

  function feature(item, label) {
    var media = item.image_url
      ? '<img src="' + esc(item.image_url) + '" alt="">'
      : (item.student ? photo(item.student, 500) : '<img src="assets/logo-gold.png" alt="" style="object-fit:contain;padding:120px">');
    return '<div class="row feature">' +
      '<div class="media rise">' + media + "</div>" +
      '<div class="copy">' +
        '<div class="ribbon rise d1">' + esc(label) + "</div>" +
        (item.student ? '<div class="h-md rise d2" style="margin-top:30px;color:#e2c078">' + esc(item.student.name) + "</div>" : "") +
        '<div class="h-lg rise d2" style="margin-top:' + (item.student ? 10 : 30) + 'px">' + esc(item.title_en) + "</div>" +
        (item.title_vi ? '<div class="vi rise d3" style="font-size:32px;margin-top:10px">' + esc(item.title_vi) + "</div>" : "") +
        (item.body_en ? '<div class="lead rise d3" style="margin-top:30px">' + esc(item.body_en) + "</div>" : "") +
        (item.body_vi ? '<div class="vi rise d4" style="font-size:24px;margin-top:14px;line-height:1.45">' + esc(item.body_vi) + "</div>" : "") +
      "</div></div>";
  }

  function success(f, wins) {
    var s = f.stats || {};
    var nums = [
      [fmt(s.students), "Students learning", "Học sinh đang theo học"],
      [s.attendance_rate != null ? s.attendance_rate + "%" : "≤ 12", s.attendance_rate != null ? "Attendance this month" : "Students per class", s.attendance_rate != null ? "Tỉ lệ đi học tháng này" : "Học sinh mỗi lớp"],
      [fmt(s.homework_this_month), "Homework handed in this month", "Bài tập đã nộp tháng này"],
      [fmt(s.points_this_month), "Points earned this month", "Điểm thưởng tháng này"]
    ];
    var html = "";
    for (var i = 0; i < nums.length; i++) {
      html += '<div class="bignum card rise d' + (i + 1) + '"><div class="n">' + esc(nums[i][0]) + '</div><div class="l">' + esc(nums[i][1]) + '<span class="vi">' + esc(nums[i][2]) + "</span></div></div>";
    }
    var w = "";
    for (var j = 0; j < wins.length && j < 6; j++) {
      w += '<div class="win card row rise d' + ((j % 5) + 1) + '" style="-webkit-align-items:center;align-items:center"><div class="wv">' + esc(wins[j].stat_value || "★") +
        '</div><div class="grow"><div class="wt">' + esc(wins[j].title_en) + "</div>" + (wins[j].title_vi ? '<div class="vi" style="font-size:20px;margin-top:4px">' + esc(wins[j].title_vi) + "</div>" : "") + "</div></div>";
    }
    return '<div class="row bignums">' + html + '</div><div class="row wrap wins">' + w + "</div>";
  }

  function courses(list) {
    var html = "";
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var pct = c.seats_max ? Math.min(100, Math.round((c.seats_taken / c.seats_max) * 100)) : 0;
      var left = Math.max(0, (c.seats_max || 0) - (c.seats_taken || 0));
      html += '<div class="course card col rise d' + ((i % 5) + 1) + '">' +
        '<div class="cn">' + esc(c.name) + '</div><div class="cc">' + esc(filter([c.curriculum, c.age_range], function (x) { return !!x; }).join(" · ")) + "</div>" +
        '<div class="cd">' + esc(c.description_en || "") + '</div><div class="cdv">' + esc(c.description_vi || "") + "</div>" +
        '<div class="seats grow col" style="-webkit-justify-content:flex-end;justify-content:flex-end"><div class="bar"><div style="width:' + pct + '%"></div></div>' +
        '<div class="st">' + (left > 0 ? left + (left === 1 ? " place left" : " places left") + " · còn " + left + " chỗ" : "Full · đã đủ chỗ") + "</div></div></div>";
    }
    return '<div class="row wrap courses">' + html + "</div>";
  }

  // ------------------------------------------------------------ albums
  // A slideshow: up to 12 pictures a pass (an album keeps its place between
  // passes), about 6 s each with a slow pan, captions along the bottom.
  var albumOffset = {};
  var VIDEOS_PER_LOOP = 4, videoOffset = 0, videoCount = 0;
  var PANS = ["pan-a", "pan-b", "pan-c", "pan-d"];
  function albumScene(a) {
    var all = a.images, per = Math.min(12, all.length);
    var start = albumOffset[a.id] || 0;
    var pics = [];
    for (var i = 0; i < per; i++) pics.push(all[(start + i) % all.length]);
    var nextStart = (start + per) % all.length;
    var slides = "";
    for (var j = 0; j < pics.length; j++) {
      slides += '<div class="slide' + (j === 0 ? " show " + PANS[0] : "") + '"><img src="' + esc(pics[j].url) + '" alt=""></div>';
    }
    var html = '<div class="album">' + slides + '<div class="cap">' +
      '<div class="eyebrow">' + esc(a.title_en) + (a.title_vi ? ' &middot; <span class="vi">' + esc(a.title_vi) + "</span>" : "") + "</div>" +
      '<div class="h-md album-caption" style="margin-top:10px">' + esc(pics[0].caption || a.body_en || "") + "</div>" +
      '<div class="album-count small" style="margin-top:8px">1 / ' + pics.length + "</div></div></div>";
    var t;
    return {
      t: ["Life at HEC", "Cuộc sống tại HEC"], html: html, maxMs: (pics.length * 6 + 6) * 1000,
      play: function (el, done) {
        albumOffset[a.id] = nextStart; // the next pass shows the next pictures
        var k = 0, slidesEl = el.getElementsByClassName("slide");
        var cap = el.getElementsByClassName("album-caption")[0], cnt = el.getElementsByClassName("album-count")[0];
        var step = pics.length === 1 ? 8000 : 6000;
        t = setInterval(function () {
          k++;
          if (k >= pics.length) { clearInterval(t); done(); return; }
          for (var m = 0; m < slidesEl.length; m++) {
            slidesEl[m].className = "slide" + (m === k ? " show " + PANS[k % PANS.length] : (m === k - 1 ? " leaving " + PANS[(k - 1) % PANS.length] : ""));
          }
          if (cap) cap.innerHTML = esc(pics[k].caption || a.body_en || "");
          if (cnt) cnt.innerHTML = (k + 1) + " / " + pics.length;
        }, step);
      },
      stop: function () { clearInterval(t); }
    };
  }

  // ------------------------------------------------------------ videos
  // Uploaded and Drive videos play here; YouTube ones go to the helper (the
  // feed leaves them out). play_seconds, or to the end; muted unless the
  // admin switched sound on. A video that will not play is skipped.
  function videoScene(v) {
    var html = '<div class="videoscene"><video preload="auto"' + (v.sound ? "" : " muted") + ' src="' + esc(v.video_url) + '"></video>' +
      ((v.title_en || v.body_en) ? '<div class="cap"><div class="h-md">' + esc(v.title_en) + "</div>" +
        (v.title_vi ? '<div class="vi" style="font-size:24px;margin-top:6px">' + esc(v.title_vi) + "</div>" : "") + "</div>" : "") + "</div>";
    var cut, stall, vid;
    return {
      t: ["Life at HEC", "Cuộc sống tại HEC"], html: html,
      maxMs: (v.play_seconds ? v.play_seconds + 30 : 20 * 60) * 1000,
      play: function (el, done) {
        vid = el.getElementsByTagName("video")[0];
        keepAwake(false); // one decoder for the real video
        var finished = false;
        var end = function () { if (finished) return; finished = true; clearTimeout(cut); clearTimeout(stall); done(); };
        vid.muted = !v.sound;
        vid.onended = end;
        vid.onerror = function () { setTimeout(end, 1500); };
        vid.onplaying = function () {
          clearTimeout(stall);
          if (v.play_seconds) { clearTimeout(cut); cut = setTimeout(end, v.play_seconds * 1000); }
        };
        stall = setTimeout(end, 30000); // never started (network, codec): move on
        try { var pr = vid.play(); if (pr && pr["catch"]) pr["catch"](function () {}); } catch (e) {}
      },
      stop: function () {
        clearTimeout(cut); clearTimeout(stall);
        if (vid) { vid.onended = null; vid.onerror = null; vid.onplaying = null; }
        keepAwake(true);
      }
    };
  }

  function photoScene(p) {
    return '<div class="photo"><img src="' + esc(p.image_url) + '" alt=""><div class="cap">' +
      '<div class="h-lg rise">' + esc(p.title_en) + "</div>" +
      (p.title_vi ? '<div class="vi rise d1" style="font-size:30px;margin-top:8px">' + esc(p.title_vi) + "</div>" : "") +
      (p.body_en ? '<div class="lead rise d2" style="margin-top:14px">' + esc(p.body_en) + "</div>" : "") + "</div></div>";
  }

  function announcements(list) {
    var html = "";
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      var when = a.kind === "event" && a.starts_on ? "Event · " + a.starts_on.split("-").reverse().join("/") : (a.kind === "event" ? "Event" : "Notice · Thông báo");
      html += '<div class="note card col rise d' + (i + 1) + '">' + (a.image_url ? '<img src="' + esc(a.image_url) + '" alt="">' : "") +
        '<div class="when">' + esc(when) + '</div><div class="h-md" style="margin-top:14px">' + esc(a.title_en) + "</div>" +
        (a.title_vi ? '<div class="vi" style="font-size:24px;margin-top:6px">' + esc(a.title_vi) + "</div>" : "") +
        (a.body_en ? '<div class="lead" style="font-size:24px;margin-top:18px">' + esc(a.body_en) + "</div>" : "") +
        (a.body_vi ? '<div class="vi" style="font-size:20px;margin-top:10px;line-height:1.4">' + esc(a.body_vi) + "</div>" : "") + "</div>";
    }
    return '<div class="row notes">' + html + "</div>";
  }

  var RELATION = { parent: "Parent · Phụ huynh", student: "Student · Học sinh", visitor: "Visitor · Khách", other: "" };
  function feedback(f, quotes) {
    var q = "";
    for (var i = 0; i < quotes.length; i++) {
      var x = quotes[i];
      q += '<div class="quote card rise d' + (i + 1) + '">' + (x.rating ? '<div class="stars">' + stars(x.rating) + "</div>" : "") +
        '<div class="q">“' + esc(x.message) + '”</div><div class="who">' + esc(x.name || "A HEC family") +
        (RELATION[x.relation] ? " · " + esc(RELATION[x.relation]) : "") + "</div></div>";
    }
    if (!quotes.length) {
      q = '<div class="rise"><div class="eyebrow">We are listening · Chúng tôi lắng nghe</div>' +
        '<div class="h-lg" style="margin-top:24px">Your words help us<br>teach <span class="gold">better</span>.</div>' +
        '<div class="lead" style="margin-top:24px">Scan a code to tell us how your child is doing, chat with us on Zalo, or leave a review.' +
        '<span class="vi" style="display:block;font-size:24px;margin-top:10px">Quét mã để góp ý, nhắn Zalo hoặc đánh giá trên Google.</span></div></div>';
    }
    var codes = f.qr || {};
    var qrs = qrBox(codes.feedback, "Share feedback", "Góp ý cho HEC", 1) +
      qrBox(codes.zalo, "Chat on Zalo", "Nhắn tin Zalo · 0975 679 889", 2) +
      qrBox(codes.google, "Review us on Google", "Đánh giá trên Google", 3);
    return '<div class="row" style="height:100%;-webkit-align-items:center;align-items:center"><div class="quotes">' + q + '</div><div class="qrs col">' + qrs + "</div></div>";
  }
  function qrBox(code, en, vi, d) {
    if (!code || !code.svg) return "";
    return '<div class="qr card row rise d' + d + '"><div class="code">' + code.svg + '</div><div class="qt"><div class="a">' + esc(en) + '</div><div class="b">' + esc(vi) + "</div></div></div>";
  }

  function ticker(f) {
    var bits = [];
    var top = ranked(f.leaderboard)[0];
    if (top) bits.push("<b>Top of the month:</b> " + esc(top.name) + " · " + fmt(top.points) + " pts");
    var notes = filter(f.items || [], function (i) { return i.kind === "announcement" || i.kind === "event"; });
    for (var i = 0; i < notes.length; i++) bits.push("<b>" + esc(notes[i].title_en) + "</b>" + (notes[i].title_vi ? " · " + esc(notes[i].title_vi) : ""));
    bits.push("<b>Zalo / Hotline:</b> 0975 679 889");
    bits.push("<b>25 Ngõ 242 Láng, Đống Đa, Hà Nội</b> · hanoienglish.com");
    var track = $("ticker-track");
    track.innerHTML = "<span>" + bits.join("</span><span>") + "</span><span>" + bits.join("</span><span>") + "</span>";
  }
  var tickX = 0;
  function scrollTicker() {
    var track = $("ticker-track");
    var half = track.scrollWidth / 2;
    tickX -= 1.5;
    if (half > 0 && -tickX >= half) tickX = 0;
    var t = "translateX(" + tickX + "px)";
    track.style.webkitTransform = t; track.style.transform = t;
  }

  function dots() {
    var html = "";
    for (var i = 0; i < scenes.length; i++) html += '<span class="d' + (i === idx ? " on" : "") + '"></span>';
    $("dots").innerHTML = html;
  }

  // A scene may bring its own player (albums, videos): sc.play(el, done)
  // runs once the scene is in and calls done() when it has finished;
  // sc.stop() runs when the scene leaves. A safety timer always moves on.
  var playing = null;
  function stopPlaying() {
    if (playing && playing.stop) { try { playing.stop(); } catch (e) {} }
    playing = null;
  }
  function next() {
    if (!scenes.length) return;
    stopPlaying();
    if (!HOLD && idx + 1 >= scenes.length && videoCount > VIDEOS_PER_LOOP && feed) {
      // round again: the next videos take their turn
      videoOffset = (videoOffset + VIDEOS_PER_LOOP) % videoCount;
      scenes = build(feed);
      idx = -1;
    }
    idx = HOLD ? Math.min(scenes.length, +HOLD) - 1 : (idx + 1) % scenes.length;
    var sc = scenes[idx];
    var back = front === "scene-a" ? "scene-b" : "scene-a";
    var el = $(back), old = $(front);
    releaseMedia(old);
    el.innerHTML = sc.html;
    $("section-title").innerHTML = '<div class="en">' + esc(sc.t[0]) + '</div><div class="vi">' + esc(sc.t[1]) + "</div>";
    // let the new content lay out before fading it in
    setTimeout(function () { old.className = "scene"; el.className = "scene on"; }, 30);
    setTimeout(function () { if (old.className === "scene") old.innerHTML = ""; }, 1200);
    front = back;
    dots();
    var base = ((feed && feed.settings && feed.settings.scene_seconds) || 14) * 1000;
    clearTimeout(timer);
    var mine = idx;
    if (sc.play) {
      playing = sc;
      sc.play(el, function () { if (idx === mine && !HOLD) { clearTimeout(timer); next(); } });
      if (!HOLD) timer = setTimeout(next, sc.maxMs || 20 * 60 * 1000);
    } else if (!HOLD) {
      timer = setTimeout(next, Math.round(base * (sc.secs || 1)));
    }
  }

  // Free a video's decoder: a 2016 TV has few, and a paused video keeps one.
  function releaseMedia(root) {
    var vids = root.getElementsByTagName("video");
    for (var i = 0; i < vids.length; i++) {
      try { vids[i].pause(); vids[i].removeAttribute("src"); vids[i].load(); } catch (e) {}
    }
  }

  function showSetup() {
    $("section-title").innerHTML = '<div class="en">Setting up</div><div class="vi">Đang cài đặt</div>';
    $("scene-a").className = "scene on";
    $("scene-a").innerHTML = '<div class="col center" style="height:100%;text-align:center"><img src="assets/logo-gold.png" style="width:360px" alt="">' +
      '<div class="h-md" style="margin-top:40px">Connecting to Happy English Club…</div>' +
      '<div class="lead" style="margin-top:16px">If this stays, check the Wi-Fi and the display token in Admin › Reception.</div></div>';
  }

  // ------------------------------------------------------------ keep the TV awake
  // Consumer webOS shows its screensaver after a few idle minutes and denies a
  // developer app the call that would refuse it. It does not start one while a
  // video plays, so a 2-second black clip loops invisibly in a corner. It
  // pauses while a real video plays (the TV may have one video decoder).
  function keepAwake(on) {
    var k = $("keepawake");
    if (!k) return;
    try {
      if (on) { var pr = k.play(); if (pr && pr["catch"]) pr["catch"](function () {}); }
      else k.pause();
    } catch (e) {}
  }

  // ------------------------------------------------------------ start
  // For checking the loop from the inspector: the scene titles in order.
  window.__hecSceneTitles = function () { var o = []; for (var i = 0; i < scenes.length; i++) o.push(scenes[i].t[0]); return o; };
  window.addEventListener("resize", fit);
  fit();
  tick();
  setInterval(tick, 10 * 1000);
  setInterval(scrollTicker, 33);
  keepAwake(true);
  refresh();
  setInterval(refresh, REFRESH_MS);
  setTimeout(function () { location.reload(); }, RELOAD_MS);
  // webOS: the Back key must not close the display.
  document.addEventListener("keydown", function (e) { if (e.keyCode === 461 || e.keyCode === 8) { e.preventDefault(); } }, false);
})();
