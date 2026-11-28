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
  // ------------------------------------------------------------ pictures
  // The TV's browser (Chromium 38 on webOS) ignores object-fit, so an <img>
  // sized to a box is STRETCHED. Pictures are background images instead,
  // and each one is measured once: its shape decides the layout, and how
  // bright and busy it is under the words decides how deep the shade is.
  var picInfo = {};
  function bgUrl(u) {
    return "url(" + String(u || "").replace(/["'()\\s]/g, function (c) { return encodeURIComponent(c); }) + ")";
  }
  function measure(url, cb) {
    if (!url) return;
    var info = picInfo[url];
    if (info) { if (cb) { if (info.ready) cb(info); else info.waiting.push(cb); } return; }
    info = picInfo[url] = { ready: false, waiting: cb ? [cb] : [] };
    var img = new Image();
    var finish = function () {
      info.ready = true;
      var w = info.waiting; info.waiting = [];
      for (var i = 0; i < w.length; i++) { try { w[i](info); } catch (e) {} }
    };
    img.onload = function () {
      info.w = img.naturalWidth; info.h = img.naturalHeight;
      sample(img, info);
      img.onload = img.onerror = null; img = null;
      finish();
    };
    img.onerror = function () {
      img.onload = img.onerror = null;
      if (img.crossOrigin) {
        // the host does not allow reading pixels: take the shape only
        img = new Image();
        img.onload = function () { info.w = img.naturalWidth; info.h = img.naturalHeight; img.onload = img.onerror = null; img = null; finish(); };
        img.onerror = function () { img = null; info.failed = true; finish(); };
        img.src = url;
      } else { img = null; info.failed = true; finish(); }
    };
    if (!/^data:/.test(url)) img.crossOrigin = "anonymous";
    img.src = url;
  }
  // Mean brightness (0-1) and busyness (spread) of the lower-left of the
  // picture, where the words sit.
  function sample(img, info) {
    try {
      var c = document.createElement("canvas"); c.width = 48; c.height = 27;
      var x = c.getContext("2d");
      x.drawImage(img, 0, 0, 48, 27);
      var d = x.getImageData(0, 12, 34, 15).data, sum = 0, sq = 0, n = 0;
      for (var i = 0; i < d.length; i += 4) {
        var l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        sum += l; sq += l * l; n++;
      }
      info.lum = sum / n;
      info.busy = Math.sqrt(Math.max(0, sq / n - info.lum * info.lum));
    } catch (e) { /* unreadable: the deepest shade is used */ }
  }
  // How dark the shade behind the words must be (0-1). An unmeasured picture
  // gets the deepest one, so words are readable whatever the picture.
  function shadeFor(info) {
    if (!info || info.lum == null) return 0.93;
    return Math.max(0.62, Math.min(0.95, 0.5 + info.lum * 0.5 + info.busy * 0.9));
  }
  function navy(a) { return "rgba(7,19,48," + (Math.round(a * 100) / 100) + ")"; }

  // One picture filling a 1920x880 frame, never stretched or squashed.
  //  - close to the screen's shape: it fills the screen with a slow pan, and
  //    the words sit on a shade fitted to that picture;
  //  - any other shape (portraits, 3:2 photos): the WHOLE picture, framed,
  //    over a soft blurred copy of itself, with the words beside it.
  var FW = 1920, FH = 880;
  function picFrame(url, capHtml, pan) {
    var info = picInfo[url];
    var a = info && info.w && info.h ? info.w / info.h : 0;
    var shade = shadeFor(info);
    var bg = bgUrl(url);
    if (a >= 1.78) {
      return '<div class="pf full"><div class="kb ' + (pan || "") + '" style="background-image:' + bg + '"></div>' +
        '<div class="scrim" style="background:linear-gradient(180deg,' + navy(0) + ' 30%,' + navy(shade) + ' 100%),linear-gradient(90deg,' +
          navy(shade * 0.8) + ' 0%,' + navy(0) + ' 62%)"></div>' +
        '<div class="pcap low">' + capHtml + "</div></div>";
    }
    var maxH = 772, maxW = 1120, h = maxH, w = a ? Math.round(maxH * a) : maxW;
    if (w > maxW) { w = maxW; h = Math.round(maxW / a); }
    var veil = Math.max(0.55, shade - 0.05);
    return '<div class="pf gallery"><div class="blur" style="background-image:' + bg + '"></div>' +
      '<div class="veil" style="background:linear-gradient(90deg,' + navy(Math.min(0.94, veil + 0.25)) + ' 0%,' + navy(veil) + ' 48%,' + navy(veil * 0.55) + ' 100%)"></div>' +
      '<div class="frame' + (a ? "" : " loose") + (pan ? " float" : "") + '" style="width:' + w + "px;height:" + h + "px;top:" + Math.round((FH - h) / 2) +
        "px;background-image:" + bg + ";background-size:" + (a ? "cover" : "contain") + '"></div>' +
      '<div class="pcap side" style="width:' + (FW - w - 64 * 3) + 'px">' + capHtml + "</div></div>";
  }

  function photo(person, size) {
    var px = size + "px";
    // a picture that fails to load leaves the initials showing underneath
    var inner = person && person.photo ? '<div class="pic" style="background-image:' + bgUrl(person.photo) + '"></div>' : "";
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

  // ------------------------------------------------------------ class time
  // From 10 minutes before a lesson to 20 after (drop-off), and for 15 after
  // it ends (pick-up), the screen is about THAT class: its welcome or its
  // well-done card, its board, its highlights, then the asks that matter
  // most while the parents are standing here (focus.js decides the windows).
  var FOCUS = window.HEC_FOCUS || null;
  var focusNow = [], focusKeyNow = "";
  function currentFocus(f) {
    if (!FOCUS || !f || HOLD) return [];
    var at = /[?&]at=(\d{1,2}):(\d{2})/.exec(location.search); // previews: ?at=17:05
    var now = FOCUS.hanoiNow(Date.now());
    if (at) now = { day: f.today || now.day, minutes: parseInt(at[1], 10) * 60 + parseInt(at[2], 10) };
    return FOCUS.classesInFocus(f.today_sessions || [], f.today || "", now);
  }
  function boardOf(f, name) {
    var cb = f.class_boards || [];
    for (var i = 0; i < cb.length; i++) if (cb[i].class_name === name) return cb[i];
    return null;
  }
  function highlightsOf(f, name) { return filter(f.highlights || [], function (h) { return h && h.video_url && (!name || h.class_name === name); }); }
  var highlightOffset = {};
  function takeHighlights(f, name, n) {
    var hs = highlightsOf(f, name), out = [], key = name || "*";
    if (!hs.length) return out;
    var start = highlightOffset[key] || 0;
    for (var i = 0; i < Math.min(n, hs.length); i++) out.push(hs[(start + i) % hs.length]);
    highlightOffset[key] = (start + out.length) % hs.length;
    return out;
  }

  function buildFocus(f, fc) {
    var list = [], i, c, b, hs, j;
    for (i = 0; i < fc.length; i++) {
      c = fc[i];
      b = boardOf(f, c.class_name);
      list.push({ t: c.mode === "arrive" ? ["Welcome, " + c.class_name, "Chào mừng lớp " + c.class_name] : ["Great work, " + c.class_name, "Lớp " + c.class_name + " giỏi lắm"],
        html: classCard(f, c, b), secs: 1.3 });
      hs = takeHighlights(f, c.class_name, 3);
      for (j = 0; j < hs.length; j++) list.push(highlightScene(hs[j]));
      if (b && (b.everyone || b.top || []).length) {
        var pieces = chunk(b.everyone || b.top, BOARD_LINES);
        list.push({ t: ["Class Stars · " + c.class_name, "Ngôi sao lớp " + c.class_name], html: boards([{ class_name: b.class_name, curriculum: b.curriculum, students: b.students, top: pieces[0] }]) });
      }
    }
    // Parents are here and proud: the asks that turn that into word of mouth.
    if (on("feedback") && f.qr && f.qr.google && f.qr.google.svg && fc[0].mode === "leave") list.push({ t: ["Proud of today?", "Ba mẹ tự hào về con?"], html: reviewAsk(f), secs: 1.2 });
    if (on("parents") && f.qr && f.qr.zalo && f.qr.zalo.svg) list.push({ t: ["Bring a friend", "Rủ bạn cùng học"], html: friendAsk(f, fc), secs: 1.2 });
    // Other classes' highlights when this class has none yet.
    if (!highlightsOf(f, fc[0].class_name).length) {
      var other = takeHighlights(f, null, 2);
      for (j = 0; j < other.length; j++) list.push(highlightScene(other[j]));
    }
    if (on("feedback") && (f.feedback || []).length) list.push({ t: ["Families Say", "Phụ huynh nói gì"], html: feedback(f, (f.feedback || []).slice(0, 2)), secs: 1.2 });
    if (on("parents")) list.push({ t: ["Why families choose HEC", "Vì sao ba mẹ chọn HEC"], html: whyHec(f), secs: 1.3 });
    return list;
  }

  // The class's own card: who is in it, and a line for the parent.
  var ARRIVE_LINES = [
    ["Chúc các con một buổi học thật vui!", "Have a wonderful lesson, everyone!"],
    ["Hôm nay con sẽ nói tiếng Anh cả buổi đấy!", "Today we speak English all lesson long!"],
    ["Ba mẹ yên tâm, thầy cô đã sẵn sàng đón con.", "Your teachers are ready and waiting."]
  ];
  var LEAVE_LINES = [
    ["Trên đường về, ba mẹ hỏi con: “Hôm nay con nói được câu gì mới?”", "On the way home, ask: “What new sentence did you say today?”"],
    ["Một lời khen của ba mẹ hôm nay là động lực lớn nhất của con.", "Your praise today is your child's biggest motivation."],
    ["Hỏi con: “Hôm nay ai được nhiều sao nhất lớp?”", "Ask: “Who earned the most stars today?”"]
  ];
  var cardTurn = 0;
  function classCard(f, c, b) {
    var arrive = c.mode === "arrive";
    var line = (arrive ? ARRIVE_LINES : LEAVE_LINES)[cardTurn++ % 3];
    var kids = b ? (b.everyone || b.top || []) : [];
    var faces = "";
    for (var i = 0; i < kids.length && i < 12; i++) {
      faces += '<div class="cc-kid rise d' + ((i % 5) + 1) + '">' + photo(kids[i], 112) + '<div class="cc-nm">' + esc(kids[i].name) + "</div>" +
        (!arrive && kids[i].rank != null && kids[i].rank <= 3 ? '<div class="cc-star">★ ' + fmt(kids[i].points) + "</div>" : "") + "</div>";
    }
    var when = arrive ? "Lesson " + c.start + (c.end ? "–" + c.end : "") + " · Bắt đầu lúc " + c.start : "Lesson finished · Tan học lúc " + (c.end || c.start);
    return '<div class="col classcard" style="height:100%">' +
      '<div class="eyebrow rise">' + esc(when) + "</div>" +
      '<div class="h-xl rise d1" style="margin-top:16px;font-size:88px">' + (arrive ? 'Welcome, <span class="gold">' + esc(c.class_name) + "</span>!" : 'Great work, <span class="gold">' + esc(c.class_name) + "</span>!") + "</div>" +
      '<div class="vi-strong rise d2">' + esc(line[0]) + '</div><div class="lead rise d2" style="margin-top:6px;color:#aebbd6">' + esc(line[1]) + "</div>" +
      (faces ? '<div class="row wrap cc-kids">' + faces + "</div>" : "") +
    "</div>";
  }
  function reviewAsk(f) {
    var g = f.qr.google;
    return '<div class="row ask" style="height:100%;-webkit-align-items:center;align-items:center"><div class="grow">' +
      '<div class="eyebrow rise">Ba mẹ tự hào về con? · Proud of today?</div>' +
      '<div class="h-xl rise d1" style="margin-top:22px;font-size:80px">Một đánh giá <span class="gold">5★</span><br>giúp thêm nhiều bạn<br>tìm thấy HEC.</div>' +
      '<div class="lead rise d2" style="margin-top:22px;color:#aebbd6">One review helps another family find a class like this one. It takes 30 seconds.</div></div>' +
      '<div class="bigqr col center rise d2"><div class="code">' + g.svg + '</div><div class="a">Đánh giá HEC trên Google</div><div class="b">Review us on Google</div></div></div>';
  }
  function friendAsk(f, fc) {
    var z = f.qr.zalo;
    return '<div class="row ask" style="height:100%;-webkit-align-items:center;align-items:center"><div class="grow">' +
      '<div class="eyebrow rise">Rủ bạn cùng học · Learn together</div>' +
      '<div class="h-xl rise d1" style="margin-top:22px;font-size:80px">Bạn của con cũng<br>muốn <span class="gold">nói tiếng Anh</span><br>tự tin như thế?</div>' +
      '<div class="vi-strong rise d2" style="max-width:1000px">Nhắn Zalo cho HEC: thầy cô tư vấn lớp phù hợp cho bạn của con, có thể học cùng lớp ' + esc(fc[0].class_name) + ".</div>" +
      '<div class="lead rise d3" style="margin-top:10px;color:#aebbd6">Does a friend want to speak English like this? Message us and we will find the right class.</div>' +
      '<div class="hotline rise d4">Zalo / Hotline <b>0975 679 889</b></div></div>' +
      '<div class="bigqr col center rise d2"><div class="code">' + z.svg + '</div><div class="a">Quét mã để nhắn Zalo</div><div class="b">Scan to chat on Zalo</div></div></div>';
  }
  // A teacher's clip from a lesson, approved by an admin. Muted: reception.
  function highlightScene(h) {
    var sc = videoScene({ video_url: h.video_url, sound: false, play_seconds: null,
      title_vi: h.caption_vi || h.title || ("Khoảnh khắc lớp " + h.class_name), title_en: h.caption_en || (h.caption_vi ? "" : "Moments from " + h.class_name),
      badge: "#HECmoments · " + h.class_name + (h.lesson_date ? " · " + h.lesson_date.split("-").reverse().slice(0, 2).join("/") : "") });
    sc.t = ["Class highlights · " + h.class_name, "Khoảnh khắc lớp " + h.class_name];
    sc.maxMs = ((h.duration_seconds || 90) + 30) * 1000;
    return sc;
  }

  function build(f) {
    var fc = currentFocus(f);
    focusNow = fc; focusKeyNow = FOCUS ? FOCUS.focusKey(fc) : "";
    if (fc.length) { var fl = buildFocus(f, fc); if (fl.length) return fl; }
    var list = [];
    var items = f.items || [];
    var ofKind = function (k) { return filter(items, function (i) { return i.kind === k; }); };

    if (on("welcome")) list.push({ t: ["Welcome", "Chào mừng ba mẹ và các con"], html: welcome(f), secs: 1.2 });
    // Pip, the mascot: today's phrase for a child to say out loud. A function,
    // so the phrase is the day's when the scene comes round.
    if (on("welcome") && on("mascot")) list.push({ t: ["Say it with Pip", "Nói cùng Pip"], html: sayWithPip });
    if (on("parents")) list.push({ t: ["Why families choose HEC", "Vì sao ba mẹ chọn HEC"], html: whyHec(f), secs: 1.5 });
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
    if (on("success")) list.push({ t: ["Our Success", "Thành tích của HEC"], html: success(f, ofKind("success")), secs: 1.2 });
    if (on("courses")) {
      var cc = chunk(f.courses || [], 6);
      for (var k = 0; k < cc.length; k++) list.push({ t: ["Our Programmes", "Chương trình học"], html: courses(cc[k]), secs: 1.3 });
      var extra = ofKind("course");
      for (var x = 0; x < extra.length; x++) list.push({ t: ["Our Programmes", "Chương trình học"], html: feature(extra[x], "Khoá học · Programme") });
    }
    if (on("parents") && f.qr && f.qr.zalo && f.qr.zalo.svg) list.push({ t: ["Talk to us", "Tư vấn cho con"], html: askZalo(f), secs: 1.2 });
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
    // Teachers' class highlights take turns with the other videos.
    if (on("videos")) {
      var hl = takeHighlights(f, null, 3);
      for (var hi = 0; hi < hl.length; hi++) vids.push(highlightScene(hl[hi]));
    }
    if (on("photos")) {
      var ph = filter(ofKind("photo"), function (p) { return !!p.image_url; });
      for (var p = 0; p < ph.length; p++) list.push({ t: ["Life at HEC", "Cuộc sống tại HEC"], html: photoHtml(ph[p]) });
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
    // Short messages for parents over a picture from the albums.
    var moms = [];
    if (on("parents")) {
      var pool = [];
      var albs = filter(ofKind("album"), function (x) { return x.images && x.images.length; });
      for (var pa = 0; pa < albs.length; pa++) for (var pb = 0; pb < albs[pa].images.length; pb++) pool.push(albs[pa].images[pb].url);
      for (var mo = 0; mo < MOMENTS.length; mo++) {
        moms.push({ t: ["Happy English Club", "Happy English Club"], html: momentHtml(MOMENTS[(momentOffset + mo) % MOMENTS.length], pool.length ? pool[(momentOffset * 7 + mo * 13) % pool.length] : null), secs: 0.8 });
      }
      momentOffset++;
    }
    // Mix: albums, videos and messages take turns, one after every few other scenes.
    var mix = [], mi = 0, vj = 0, mk = 0;
    while (mi < media.length || vj < vids.length || mk < moms.length) {
      if (mk < moms.length) mix.push(moms[mk++]);
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
          '<span class="vi-strong">Dùng tiếng Anh, không chỉ học thuộc. Chuẩn ELA Hoa Kỳ, giáo viên Mỹ, tối đa 12 học sinh mỗi lớp.</span></div>' +
        '<div class="row stats rise d3">' +
          stat(s.students, "Students learning now", "Học sinh đang theo học") +
          stat(s.classes, "Classes this term", "Lớp học") +
          stat((s.review_score || "5.0") + "★", (s.review_count || 47) + " parent reviews", (s.review_count || 47) + " đánh giá của phụ huynh") +
        "</div>" +
      "</div>" +
      '<div class="col center pipcol"><div class="rise d2">' + pip("") + "</div>" +
        '<div class="piphello rise d3">Xin chào! Hello!</div><div class="pipname rise d4">Pip · linh vật của HEC</div></div>' +
    "</div>";
  }
  // ------------------------------------------------------------ Pip, the mascot
  // assets/pip.svg is made by scripts/mascot/build-pip.mjs (SVG 1.1 + SMIL,
  // which this TV's Chromium 38 plays; a browser that does not shows him still).
  // He stands in a cream moon so the dark crest reads on the navy stage.
  function pip(cls) { return '<div class="pipmoon' + (cls ? " " + cls : "") + '"><img class="pip" src="assets/pip.svg" alt=""></div>'; }
  // One phrase a day, Sunday first. Ours, short enough for a six-year-old.
  var PIP_PHRASES = [
    ["I did my best today.", "Hôm nay con đã cố gắng hết sức."],
    ["How was your weekend?", "Cuối tuần của bạn thế nào?"],
    ["Nice to see you!", "Rất vui được gặp bạn!"],
    ["What are you reading?", "Bạn đang đọc gì thế?"],
    ["Can you help me, please?", "Bạn giúp mình với được không?"],
    ["Have a great weekend!", "Cuối tuần vui vẻ nhé!"],
    ["I love learning English.", "Con thích học tiếng Anh."]
  ];
  function sayWithPip() {
    var p = PIP_PHRASES[new Date().getDay()];
    return '<div class="row center" style="height:100%">' +
      '<div class="col center pipcol rise">' + pip("lg") + "</div>" +
      '<div class="grow" style="padding-left:70px">' +
        '<div class="eyebrow rise d1">Today’s phrase<span class="en-s">Câu nói hôm nay</span></div>' +
        '<div class="h-lg rise d2" style="margin-top:22px">“<span class="gold">' + esc(p[0]) + "</span>”</div>" +
        '<div class="lead rise d3" style="margin-top:18px">' + esc(p[1]) + "</div>" +
        '<div class="lead rise d4" style="margin-top:44px">Say it to Pip, then say it to your teacher.' +
          '<span class="vi-strong">Con nói với Pip, rồi nói với thầy cô nhé.</span></div>' +
        '<div class="pipwho rise d5">Pip là chú chim chào mào của HEC. Tên của Pip bắt đầu bằng “chào”!' +
          '<span class="en-s">Pip is HEC’s chào mào: the bird whose name begins with hello.</span></div>' +
      "</div></div>";
  }

  function stat(n, en, vi) { return '<div class="stat"><div class="n">' + esc(typeof n === "number" ? fmt(n) : n) + '</div><div class="l">' + esc(vi) + '<span class="en-s">' + esc(en) + "</span></div></div>"; }

  // ------------------------------------------------------------ for parents
  // Four reasons, each one a fact about how HEC teaches, in the parents'
  // language first, with the centre's live figures underneath as proof.
  var PILLARS = [
    ["ELA", "Chuẩn ELA Hoa Kỳ", "Con học đọc hiểu, viết và thuyết trình theo chuẩn Common Core ELA của Mỹ, không chỉ từ vựng và ngữ pháp.", "US Common Core ELA"],
    ["US", "Giáo viên Mỹ có chứng chỉ", "Cùng trợ giảng nước ngoài và Việt Nam: con nói tiếng Anh cả buổi, ba mẹ luôn có người trao đổi bằng tiếng Việt.", "US-certified teacher, foreign & Vietnamese TAs"],
    ["12", "Tối đa 12 học sinh", "Lớp nhỏ để thầy cô biết tên, hiểu điểm mạnh và kèm sát từng con.", "Never more than 12 in a class"],
    ["App", "Ba mẹ theo dõi mỗi ngày", "Điểm thưởng, bài tập, video bài nói và báo cáo tiến bộ của con, ngay trên app HEC.", "Follow your child's progress in the HEC app"]
  ];
  function whyHec(f) {
    var s = f.stats || {}, cards = "";
    for (var i = 0; i < PILLARS.length; i++) {
      var p = PILLARS[i];
      cards += '<div class="pillar card col rise d' + (i + 1) + '"><div class="pk">' + esc(p[0]) + '</div><div class="pt">' + esc(p[1]) +
        '</div><div class="pd">' + esc(p[2]) + '</div><div class="pe grow">' + esc(p[3]) + "</div></div>";
    }
    var proof = [];
    if (s.students) proof.push("<b>" + fmt(s.students) + "</b> học sinh đang theo học");
    proof.push("<b>" + esc(s.review_score || "5.0") + "★</b> từ " + esc(s.review_count || 47) + " phụ huynh");
    if (s.homework_this_month) proof.push("<b>" + fmt(s.homework_this_month) + "</b> bài tập đã nộp tháng này");
    return '<div class="col" style="height:100%">' +
      '<div class="h-lg rise" style="text-align:center">Vì sao ba mẹ <span class="gold">tin chọn</span> HEC?</div>' +
      '<div class="lead rise d1" style="text-align:center;margin-top:6px;color:#aebbd6">Why families choose Happy English Club</div>' +
      '<div class="row pillars">' + cards + "</div>" +
      '<div class="proof rise d5">' + proof.join('<span class="sep">·</span>') + "</div></div>";
  }

  function askZalo(f) {
    var z = f.qr.zalo;
    return '<div class="row ask" style="height:100%;-webkit-align-items:center;align-items:center">' +
      '<div class="grow">' +
        '<div class="eyebrow rise">Tư vấn lộ trình · Talk to us</div>' +
        '<div class="h-xl rise d1" style="margin-top:22px;font-size:84px">Con nhà mình<br>hợp với <span class="gold">lớp nào</span>?</div>' +
        '<div class="vi-strong rise d2" style="margin-top:28px;max-width:1000px">Nhắn Zalo cho HEC: thầy cô tư vấn lộ trình học phù hợp với độ tuổi và trình độ của con.</div>' +
        '<div class="lead rise d3" style="margin-top:14px;color:#aebbd6">Which class suits your child? Message us on Zalo and we will suggest the right path.</div>' +
        '<div class="hotline rise d4">Zalo / Hotline <b>0975 679 889</b></div>' +
      "</div>" +
      '<div class="bigqr col center rise d2"><div class="code">' + z.svg + '</div><div class="a">Quét mã để nhắn Zalo</div><div class="b">Scan to chat on Zalo</div></div>' +
    "</div>";
  }

  // A short line over a picture. Vietnamese first and large.
  var MOMENTS = [
    ["Mỗi buổi học, con tự tin hơn một chút.", "A little more confident, every lesson."],
    ["Con không chỉ học thuộc tiếng Anh, con dùng tiếng Anh.", "Use it, don't just memorise it."],
    ["Ở HEC, thầy cô biết tên và hiểu từng con.", "Here, every child is known by name."],
    ["Trên đường về, ba mẹ hỏi con nhé: “Hôm nay con nói được gì bằng tiếng Anh?”", "On the way home, ask: “What did you say in English today?”"],
    ["Tiếng Anh hôm nay, cánh cửa rộng mở cho con ngày mai.", "English today opens doors tomorrow."],
    ["Một lời khen của ba mẹ là động lực lớn nhất của con.", "Your praise is your child's biggest motivation."]
  ];
  var momentOffset = 0;
  function momentHtml(m, url) { measure(url); return function () { return moment(m, url); }; }
  function moment(m, url) {
    var cap = '<div class="eyebrow rise">Happy English Club</div>' +
      '<div class="t-quote rise d1">' + esc(m[0]) + "</div>" +
      '<div class="b-en rise d2" style="font-style:italic">' + esc(m[1]) + "</div>";
    if (!url) return '<div class="col center" style="height:100%;text-align:center;padding:0 160px">' + cap + "</div>";
    measure(url);
    return picFrame(url, cap, "pan-b");
  }

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
    return '<div class="findme rise">Ba mẹ tìm tên con trên bảng nhé! <span class="en-s">Find your child on the board</span></div><div class="row everyone">' + html + "</div>";
  }

  function champions(list) {
    var html = "";
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      html += '<div class="tile card row rise d' + ((i % 5) + 1) + '">' + photo(c, 130) + '<div class="txt grow"><div class="nm">' + esc(c.name) +
        '</div><div class="sub">' + esc(c.class_name || "") + '</div><div class="badge">♛ ' + fmt(c.points) + " pts</div></div></div>";
    }
    return '<div class="col center" style="height:100%"><div class="h-md rise" style="text-align:center">Chúc mừng các con <span class="gold">dẫn đầu lớp</span> tháng trước!</div>' +
      '<div class="lead rise d1" style="text-align:center;margin:6px 0 30px;color:#aebbd6">Top of their class last month</div>' +
      '<div class="row wrap tiles">' + html + "</div></div>";
  }

  function feature(item, label) {
    var media = item.image_url
      ? '<div class="pic" style="background-image:' + bgUrl(item.image_url) + '"></div>'
      : (item.student ? photo(item.student, 500) : '<div class="pic" style="background-image:url(assets/logo-gold.png);background-size:60%"></div>');
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
      html += '<div class="bignum card rise d' + (i + 1) + '"><div class="n">' + esc(nums[i][0]) + '</div><div class="l">' + esc(nums[i][2]) + '<span class="en-s">' + esc(nums[i][1]) + "</span></div></div>";
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
        '<div class="st">' + (left > 0
          ? (left <= 3 ? '<b class="hot">Chỉ còn ' + left + " chỗ!</b>" : "Còn " + left + " chỗ") + " · " + left + (left === 1 ? " place left" : " places left")
          : "Đã đủ chỗ, đăng ký danh sách chờ · Full, join the waiting list") + "</div></div></div>";
    }
    return '<div class="row wrap courses">' + html + "</div>";
  }

  // ------------------------------------------------------------ albums
  // A slideshow: up to 12 pictures a pass (an album keeps its place between
  // passes), about 6 s each with a slow pan, captions along the bottom.
  var albumOffset = {};
  var VIDEOS_PER_LOOP = 4, videoOffset = 0, videoCount = 0;
  var PANS = ["pan-a", "pan-b", "pan-c", "pan-d"];
  // A line for parents under each album picture, in turn.
  var ALBUM_LINES = [
    ["Khoảnh khắc con tự tin nói tiếng Anh", "Confidence you can see"],
    ["Học mà chơi, chơi mà học", "Learning through play"],
    ["Mỗi buổi học là một kỷ niệm đẹp", "Every lesson, a memory"],
    ["Bạn bè, thầy cô và tiếng Anh mỗi ngày", "Friends, teachers and English every day"],
    ["Con lớn lên cùng HEC", "Growing up with HEC"],
    ["Niềm vui học tập của con", "The joy of learning"]
  ];
  function albumCap(a, pic, k, total) {
    var line = ALBUM_LINES[(k + (a.sort_order || 0)) % ALBUM_LINES.length];
    return '<div class="eyebrow">' + esc(a.title_vi || a.title_en) + (a.title_vi && a.title_en ? ' &middot; <span class="en-s">' + esc(a.title_en) + "</span>" : "") + "</div>" +
      '<div class="t-vi">' + esc(line[0]) + "</div>" +
      '<div class="b-en">' + esc(line[1]) + "</div>" +
      ((pic.caption || a.body_en) ? '<div class="note-s">' + esc(pic.caption || a.body_en) + "</div>" : "") +
      '<div class="count">' + (k + 1) + " / " + total + "</div>";
  }
  function albumScene(a) {
    var all = a.images, per = Math.min(12, all.length);
    var start = albumOffset[a.id] || 0;
    var pics = [];
    for (var i = 0; i < per; i++) { pics.push(all[(start + i) % all.length]); measure(pics[i].url); }
    var nextStart = (start + per) % all.length;
    var slide = function (k) { return picFrame(pics[k].url, albumCap(a, pics[k], k, pics.length), PANS[k % PANS.length]); };
    var slides = "";
    for (var j = 0; j < pics.length; j++) {
      slides += '<div class="slide' + (j === 0 ? " show " + PANS[0] : "") + '"></div>';
    }
    var html = function () { return '<div class="album">' + slides.replace("></div>", ">" + slide(0) + "</div>") + "</div>"; };
    var t;
    return {
      t: ["Life at HEC", "Cuộc sống tại HEC"], html: html, maxMs: (pics.length * 7 + 6) * 1000,
      play: function (el, done) {
        albumOffset[a.id] = nextStart; // the next pass shows the next pictures
        var k = 0, slidesEl = el.getElementsByClassName("slide");
        // build a picture ahead; if it is still being measured, build it again
        // when it is, as long as it has not come on screen yet
        var ahead = function (n) {
          if (!slidesEl[n]) return;
          slidesEl[n].innerHTML = slide(n);
          var info = picInfo[pics[n].url];
          if (info && !info.ready) measure(pics[n].url, function () { if (n > k && slidesEl[n]) slidesEl[n].innerHTML = slide(n); });
        };
        ahead(1);
        var step = pics.length === 1 ? 9000 : 7000;
        t = setInterval(function () {
          k++;
          if (k >= pics.length) { clearInterval(t); done(); return; }
          for (var m = 0; m < slidesEl.length; m++) {
            slidesEl[m].className = "slide" + (m === k ? " show " + PANS[k % PANS.length] : (m === k - 1 ? " leaving " + PANS[(k - 1) % PANS.length] : ""));
          }
          // build the next picture ahead, free the one two back (a 2016 TV's memory)
          ahead(k + 1);
          if (k >= 2 && slidesEl[k - 2]) slidesEl[k - 2].innerHTML = "";
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
      (v.badge ? '<div class="vbadge">' + esc(v.badge) + "</div>" : "") +
      ((v.title_en || v.title_vi) ? '<div class="cap">' + (v.title_vi ? '<div class="t-vi">' + esc(v.title_vi) + "</div>" : "") +
        (v.title_en ? '<div class="b-en">' + esc(v.title_en) + "</div>" : "") + "</div>" : "") + "</div>";
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

  function photoHtml(p) { measure(p.image_url); return function () { return photoScene(p); }; }
  function photoScene(p) {
    return picFrame(p.image_url,
      (p.title_vi ? '<div class="t-vi rise">' + esc(p.title_vi) + "</div>" : "") +
      '<div class="t-en rise d1">' + esc(p.title_en) + "</div>" +
      (p.body_vi ? '<div class="b-vi rise d2">' + esc(p.body_vi) + "</div>" : "") +
      (p.body_en ? '<div class="b-en rise d2">' + esc(p.body_en) + "</div>" : ""), "pan-a");
  }

  function announcements(list) {
    var html = "";
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      var when = a.kind === "event" && a.starts_on ? "Event · " + a.starts_on.split("-").reverse().join("/") : (a.kind === "event" ? "Event" : "Notice · Thông báo");
      html += '<div class="note card col rise d' + (i + 1) + '">' + (a.image_url ? '<div class="pic" style="background-image:' + bgUrl(a.image_url) + '"></div>' : "") +
        '<div class="when">' + esc(when) + '</div><div class="h-md" style="margin-top:14px">' + esc(a.title_en) + "</div>" +
        (a.title_vi ? '<div class="vi" style="font-size:24px;margin-top:6px">' + esc(a.title_vi) + "</div>" : "") +
        (a.body_en ? '<div class="lead" style="font-size:24px;margin-top:18px">' + esc(a.body_en) + "</div>" : "") +
        (a.body_vi ? '<div class="vi" style="font-size:20px;margin-top:10px;line-height:1.4">' + esc(a.body_vi) + "</div>" : "") + "</div>";
    }
    return '<div class="row notes">' + html + "</div>";
  }

  var RELATION = { parent: "Phụ huynh", student: "Học sinh", visitor: "Khách", other: "" };
  function feedback(f, quotes) {
    var q = "";
    for (var i = 0; i < quotes.length; i++) {
      var x = quotes[i];
      q += '<div class="quote card rise d' + (i + 1) + '">' + (x.rating ? '<div class="stars">' + stars(x.rating) + "</div>" : "") +
        '<div class="q">“' + esc(x.message) + '”</div><div class="who">' + esc(x.name || "Phụ huynh HEC") +
        (RELATION[x.relation] ? " · " + esc(RELATION[x.relation]) : "") + "</div></div>";
    }
    if (!quotes.length) {
      q = '<div class="rise"><div class="eyebrow">HEC luôn lắng nghe · We are listening</div>' +
        '<div class="h-lg" style="margin-top:24px">Mỗi góp ý của ba mẹ giúp<br>HEC dạy con <span class="gold">tốt hơn</span>.</div>' +
        '<div class="vi-strong" style="margin-top:24px">Quét mã để góp ý, nhắn Zalo hoặc đánh giá HEC trên Google.</div>' +
        '<div class="lead" style="margin-top:12px;color:#aebbd6">Your words help us teach better: share feedback, chat on Zalo or leave a review.</div></div>';
    }
    var codes = f.qr || {};
    var qrs = qrBox(codes.feedback, "Góp ý cho HEC", "Share feedback", 1) +
      qrBox(codes.zalo, "Nhắn Zalo · 0975 679 889", "Chat on Zalo", 2) +
      qrBox(codes.google, "Đánh giá 5★ trên Google", "Review us on Google", 3);
    return '<div class="row" style="height:100%;-webkit-align-items:center;align-items:center"><div class="quotes">' + q + '</div><div class="qrs col">' + qrs + "</div></div>";
  }
  function qrBox(code, en, vi, d) {
    if (!code || !code.svg) return "";
    return '<div class="qr card row rise d' + d + '"><div class="code">' + code.svg + '</div><div class="qt"><div class="a">' + esc(en) + '</div><div class="b">' + esc(vi) + "</div></div></div>";
  }

  function ticker(f) {
    var bits = [];
    var top = ranked(f.leaderboard)[0];
    if (top) bits.push("<b>Dẫn đầu tháng này:</b> " + esc(top.name) + " · " + fmt(top.points) + " điểm");
    var champs = f.champions || [];
    for (var c = 0; c < champs.length && c < 8; c++) bits.push("<b>Chúc mừng</b> " + esc(champs[c].name) + " dẫn đầu lớp " + esc(champs[c].class_name || ""));
    var notes = filter(f.items || [], function (i) { return i.kind === "announcement" || i.kind === "event"; });
    for (var i = 0; i < notes.length; i++) bits.push("<b>" + esc(notes[i].title_en) + "</b>" + (notes[i].title_vi ? " · " + esc(notes[i].title_vi) : ""));
    bits.push("<b>Tư vấn lộ trình cho con · Zalo / Hotline:</b> 0975 679 889");
    bits.push("<b>Ba mẹ theo dõi</b> điểm thưởng, bài tập và báo cáo tiến bộ của con trên app HEC");
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
    if (!HOLD && feed && FOCUS && FOCUS.focusKey(currentFocus(feed)) !== focusKeyNow) {
      // a class's drop-off or pick-up window opened or closed: start its playlist
      scenes = build(feed);
      idx = -1;
    } else if (!HOLD && idx + 1 >= scenes.length && (videoCount > VIDEOS_PER_LOOP || focusNow.length || (feed && feed.highlights && feed.highlights.length)) && feed) {
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
    // a scene with pictures lays itself out now, when its pictures have been measured
    el.innerHTML = typeof sc.html === "function" ? sc.html() : sc.html;
    $("section-title").innerHTML = '<div class="vi-t">' + esc(sc.t[1]) + "</div>" + (sc.t[0] !== sc.t[1] ? '<div class="en-t">' + esc(sc.t[0]) + "</div>" : "");
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
  var awakeWanted = true, awakeLastT = -1, awakeStuck = 0;
  function keepAwake(on) {
    var k = $("keepawake");
    awakeWanted = on;
    if (!k) return;
    try {
      if (on) { var pr = k.play(); if (pr && pr["catch"]) pr["catch"](function () {}); }
      else k.pause();
    } catch (e) {}
  }
  // Watchdog (owner, 29 Nov 2026: the screensaver still came on). Every 15 s:
  // when no real video is playing, the black clip must be playing AND moving;
  // a clip that stopped, ended or froze is restarted, after two frozen checks
  // reloaded from its file. A real video scene that froze hands back to it.
  function awakeWatch() {
    var k = $("keepawake");
    if (!k) return;
    var el = $(front);
    // A real video owns the decoder; its scene moves on by itself if it stalls (30 s).
    if (el && el.getElementsByTagName("video").length) { awakeLastT = -1; awakeStuck = 0; return; }
    awakeWanted = true;
    try {
      if (k.ended || k.paused) { k.currentTime = 0; keepAwake(true); }
      if (k.currentTime === awakeLastT) {
        if (++awakeStuck >= 2) { awakeStuck = 0; k.load(); keepAwake(true); }
      } else awakeStuck = 0;
      awakeLastT = k.currentTime;
    } catch (e) {}
  }
  // A class's window opening mid-scene: cut over within 30 s, but never in
  // the middle of a video or an album.
  function focusWatch() {
    if (!feed || HOLD || !FOCUS || playing) return;
    if (FOCUS.focusKey(currentFocus(feed)) !== focusKeyNow) { clearTimeout(timer); next(); }
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
  setInterval(awakeWatch, 15 * 1000);
  setInterval(focusWatch, 30 * 1000);
  refresh();
  setInterval(refresh, REFRESH_MS);
  setTimeout(function () { location.reload(); }, RELOAD_MS);
  // webOS: the Back key must not close the display.
  document.addEventListener("keydown", function (e) { if (e.keyCode === 461 || e.keyCode === 8) { e.preventDefault(); } }, false);
})();
