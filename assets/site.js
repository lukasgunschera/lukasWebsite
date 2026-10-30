/* Lukas Gunschera — site script.
   Reads the plain-text files in /content, renders the current page, and keeps the
   publication list in sync with OpenAlex. You should not need to edit this file:
   all text lives in the /content folder. */
(function(){
"use strict";

var script = document.currentScript || document.querySelector('script[src*="site.js"]');
var ROOT = new URL("../", script.src);
var shell = document.querySelector("[data-page]");
var PAGE = shell ? shell.getAttribute("data-page") : "";
var NEEDS = {home:["about","publications","talks"], publications:["publications"], talks:["talks"],
             policy:["policy"], teaching:["teaching"], engagement:["engagement"], cv:["cv"]};
var ALL = ["about","publications","talks","policy","teaching","engagement","cv"];
var need = NEEDS[PAGE] || [];
var texts = {};

/* ———————————— helpers ———————————— */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function boldMe(html){ return html.replace(/(Gunschera,\s?L\.\s?J\.)/g, "<b>$1</b>"); }
function resolve(u){
  u = String(u || "").trim();
  if (!u || /^(https?:|mailto:|#|\/\/)/i.test(u)) return u;
  try { return new URL(u.replace(/^\//, ""), ROOT).href; } catch(_) { return u; }
}
function linkOf(field){
  var m = /^([^:]{1,40}?):\s+(\S.*)$/.exec(field), label, url;
  if (m && !/^https?$/i.test(m[1])) { label = m[1]; url = m[2]; }
  else { url = field; label = /\.pdf(\?|#|$)/i.test(field) ? "PDF" : "Link"; }
  return {label: label, url: resolve(url)};
}
function pageHref(name){ var a = document.querySelector('[data-nav="' + name + '"]'); return a ? a.getAttribute("href") : name; }
function sget(k){ try { return sessionStorage.getItem(k); } catch(_) { return null; } }
function sset(k, v){ try { sessionStorage.setItem(k, v); } catch(_) {} }
function lget(k){ try { return JSON.parse(localStorage.getItem(k) || "null"); } catch(_) { return null; } }
function lset(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(_) {} }

/* The content format: "## Heading" starts a section, "#" lines are notes,
   every other line is one entry with fields separated by "|". */
function parse(text){
  var sections = [], cur = {title: "", rows: [], raw: []};
  sections.push(cur);
  String(text || "").split(/\r?\n/).forEach(function(line){
    var l = line.trim();
    if (/^##\s+/.test(l)) { cur = {title: l.replace(/^##\s+/, ""), rows: [], raw: []}; sections.push(cur); return; }
    if (l.charAt(0) === "#") return;
    cur.raw.push(l);
    if (l) cur.rows.push(l.split("|").map(function(s){ return s.trim(); }));
  });
  return sections.filter(function(s){ return s.title || s.rows.length; });
}
function allRows(text){ return parse(text).reduce(function(a, s){ return a.concat(s.rows); }, []); }

/* One entry: When | Title | Details | Label | Link | Link … */
function entryHTML(r, opts){
  opts = opts || {};
  var when = opts.when != null ? opts.when : (r[0] || "");
  var links = r.slice(4).filter(Boolean).map(linkOf);
  var tags = (r[3] ? '<span class="tag">' + esc(r[3]) + "</span>" : "") + (opts.extraTag || "");
  return '<li><span class="when">' + esc(when) + '</span><div>' +
    '<p class="e-title">' + esc(r[1] || "") + tags + "</p>" +
    (r[2] ? '<p class="e-details">' + boldMe(esc(r[2])) + "</p>" : "") +
    (links.length ? '<p class="e-links">' + links.map(function(a){ return '<a href="' + esc(a.url) + '">' + esc(a.label) + "</a>"; }).join("") + "</p>" : "") +
    "</div></li>";
}
function sectionsHTML(text){
  return parse(text).map(function(s){
    var simple = s.rows.every(function(r){ return r.length === 1; });
    var body = simple
      ? '<ul class="chips">' + s.rows.map(function(r){ return "<li>" + esc(r[0]) + "</li>"; }).join("") + "</ul>"
      : '<ul class="entries">' + s.rows.map(function(r){ return entryHTML(r); }).join("") + "</ul>";
    return '<section class="sec">' + (s.title ? '<h2 class="sec-head">' + esc(s.title) + "</h2>" : "") + body + "</section>";
  }).join("");
}
function setCount(n){ var c = $("count"); if (c) c.textContent = n ? String(n) : ""; }
function setMeta(html){ var m = $("meta"); if (m) m.innerHTML = html; }

/* ———————————— publications ———————————— */
var P = {filter: "all", q: "", oa: null, state: "idle", checked: 0, added: 0, orcid: "", hidden: [], list: []};
function norm(s){ return String(s || "").toLowerCase().replace(/<[^>]+>/g, "").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function tkey(s){ return norm(s).slice(0, 64); }
function isDoi(s){ return /^(https?:\/\/(dx\.)?doi\.org\/)?10\./i.test(String(s || "").trim()); }
function ndoi(d){ return String(d || "").toLowerCase().trim().replace(/^https?:\/\/(dx\.)?doi\.org\//, "").replace(/^doi:\s*/, "").replace(/_v\d+$/, ""); }
function isPub(w){ return w.status === "published"; }
function href(w){ return w.doi ? "https://doi.org/" + w.doi : resolve(w.url); }
function strip(a){ return a.replace(/[*†][*†,]*$/, ""); }   /* author markers: * equal contribution, ** shared senior, *,** both */

function buildPubs(text){
  P.orcid = ""; P.hidden = []; P.featured = []; P.links = [];
  var list = [];
  allRows(text).forEach(function(r, i){
    var k = (r[0] || "").toLowerCase();
    if (k === "orcid") { P.orcid = r[1] || ""; return; }
    if (k === "hide") { P.hidden.push(isDoi(r[1]) ? ndoi(r[1]) : tkey(r[1])); return; }
    if (k === "feature" || k === "featured") { if (r[1]) P.featured.push(isDoi(r[1]) ? ndoi(r[1]) : tkey(r[1])); return; }
    if (k === "links") {                      /* links | DOI or exact title | Preregistration: URL | Data: URL | Code: URL */
      var items = r.slice(2).filter(Boolean).filter(function(f){         /* each item must be "Label: https://..." */
        var ok = /^[^:]{1,40}?:\s+https?:\/\/\S+$/i.test(f) || /^https?:\/\/\S+$/i.test(f);
        if (!ok && window.console) console.warn("publications.txt: ignored link \"" + f + "\" (needs a full https:// address)");
        return ok;
      }).map(linkOf);
      if (r[1] && items.length) P.links.push({key: isDoi(r[1]) ? ndoi(r[1]) : tkey(r[1]), items: items});
      return;
    }
    /* Only lines that start with a known status are papers; anything else (e.g. a typo) is ignored */
    if (STATUSES.indexOf(k) < 0) { if (window.console) console.warn("publications.txt: ignored line starting with \"" + r[0] + "\""); return; }
    var loc = r[5] || "";
    list.push({status: k || "published", year: r[1] || "", authors: (r[2] || "").split(";").map(function(a){ return a.trim(); }).filter(Boolean),
      title: r[3] || "", venue: r[4] || "", doi: isDoi(loc) ? loc.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "") : "",
      url: isDoi(loc) ? "" : loc, note: r[6] || "", order: i});
  });
  if (P.oa) P.added = merge(list, P.oa.results);
  list = list.filter(function(w){ return !matches(w, P.hidden); });    /* "hide" applies to every entry */
  list.forEach(function(w){                                              /* optional Preregistration, Data, Code links */
    w.extra = [];
    P.links.forEach(function(l){ if (matches(w, [l.key])) w.extra = w.extra.concat(l.items); });
    w.extra.sort(function(a, b){ return linkRank(a.label) - linkRank(b.label); });
  });
  P.list = list;
  return list;
}
var STATUSES = ["published", "preprint", "under review", ""];   /* an empty status counts as published, as before */
/* Research-output links always appear in this order; a paper can have any of them, or none */
function linkRank(label){
  var l = String(label).toLowerCase();
  if (/^pre-?reg/.test(l)) return 1; if (/^data/.test(l)) return 2; if (/^code/.test(l)) return 3; if (/^materials/.test(l)) return 4; return 5;
}
function matches(w, keys){ return keys.some(function(k){ return (w.doi && ndoi(w.doi) === k) || tkey(w.title) === k; }); }
/* Papers chosen with "feature | DOI or title" lines, in the order they are listed */
function featuredPubs(){
  var out = [];
  P.featured.forEach(function(k){
    var w = P.list.filter(function(x){ return matches(x, [k]); })[0];
    if (w && out.indexOf(w) < 0) out.push(w);
  });
  return out;
}

var KEEP = {"article":1, "preprint":1, "review":1, "book-chapter":1, "letter":1};
var SKIP_DOI = /^10\.(17605|5281)\//;     /* OSF project/registration pages and Zenodo data or code deposits */
var STOP = {"with":1, "from":1, "that":1, "this":1, "their":1, "into":1, "over":1, "during":1, "using":1, "between":1, "among":1};
function src(r){ return (r.primary_location || {}).source || {}; }
function isRepo(r){ return r.type === "preprint" || src(r).type === "repository" || /^10\.31234\//.test(ndoi(r.doi)); }
function rawDoi(d){ return String(d || "").trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, ""); }
function version(d){ var m = /_v(\d+)$/i.exec(d || ""); return m ? +m[1] : 0; }
function oaName(n){
  n = String(n || "").trim();
  if (/,/.test(n)) { var q = n.split(","); return q[0].trim() + ", " + q[1].trim().split(/\s+/).map(function(x){ return x.charAt(0).toUpperCase() + "."; }).join(" "); }
  var p = n.split(/\s+/); if (p.length < 2) return n;
  var i = p.length - 1; while (i > 1 && /^(van|von|der|den|de|del|da|di|du|la|le|ter|ten)$/i.test(p[i-1])) i--;
  return p.slice(i).join(" ") + ", " + p.slice(0, i).map(function(g){ return g.split("-").map(function(x){ return x.replace(/\./g, "").charAt(0).toUpperCase() + "."; }).join("-"); }).join(" ");
}
function words(s){ var o = {}; norm(s).split(" ").forEach(function(t){ if (t.length > 3 && !STOP[t]) o[t] = 1; }); return Object.keys(o); }
function surnames(list){ return list.map(function(a){ return norm(strip(a).split(",")[0]).split(" ").pop(); }); }
/* Same work under a different title (e.g. a preprint renamed on publication)? */
function similar(a, b){
  var wa = words(a.title), wb = words(b.title); if (!wa.length || !wb.length) return false;
  var shared = wa.filter(function(t){ return wb.indexOf(t) > -1; }).length;
  if (shared / Math.min(wa.length, wb.length) < 0.75) return false;
  var sa = surnames(a.authors), sb = surnames(b.authors);
  return sa.filter(function(x){ return sb.indexOf(x) > -1; }).length >= 2;
}
function update(hit, r, full, d){
  hit.cites = Math.max(hit.cites || 0, r.cited_by_count || 0);
  if (r.open_access && r.open_access.oa_url && !hit.oa) hit.oa = r.open_access.oa_url;
  if (r.publication_date && !hit.date) hit.date = r.publication_date;
  if (!isPub(hit) && !isRepo(r) && src(r).display_name) {          /* the preprint is now in a journal */
    hit.preprint = href(hit); hit.status = "published"; hit.venue = src(r).display_name;
    hit.year = r.publication_year || hit.year; hit.note = ""; hit.date = r.publication_date || hit.date;
    if (full) { hit.doi = full; hit.url = ""; }
  }
  if (isPub(hit) && !hit.doi && full && !isRepo(r)) hit.doi = full;
  if (!isPub(hit) && !hit.doi && full && isRepo(r)) { hit.doi = full; hit.url = ""; }   /* preprint DOI for an entry listed by link */
  if (hit.doi && full && ndoi(hit.doi) === d && version(full) > version(hit.doi)) hit.doi = full;   /* link the newest preprint version */
}
function merge(list, results){
  var byDoi = {}, byTitle = {}, added = {};
  list.forEach(function(w){ if (w.doi) byDoi[ndoi(w.doi)] = w; byTitle[tkey(w.title)] = w; });
  (results || []).forEach(function(r){
    if (!r || !KEEP[r.type]) return;
    var title = (r.display_name || r.title || "").replace(/<[^>]+>/g, "").replace(/\.$/, "").trim(); if (!title) return;
    var full = rawDoi(r.doi), d = ndoi(r.doi), tk = tkey(title);
    if (d && SKIP_DOI.test(d)) return;
    if ((d && P.hidden.indexOf(d) > -1) || P.hidden.indexOf(tk) > -1) return;
    var hit = (d && byDoi[d]) || byTitle[tk];
    if (hit) { update(hit, r, full, d); return; }
    if (!d) return;                                                   /* only add works that have a DOI */
    var authors = (r.authorships || []).map(function(a){ return oaName(a.author && a.author.display_name); }).filter(Boolean);
    if (!authors.some(function(a){ return /gunschera/i.test(a); })) return;
    var w = {status: isRepo(r) ? "preprint" : "published", year: r.publication_year || "", date: r.publication_date || "",
      authors: authors, title: title, venue: src(r).display_name || (/^10\.31234\//.test(d) ? "PsyArXiv" : ""),
      doi: full, url: "", cites: r.cited_by_count || 0, oa: (r.open_access || {}).oa_url || "", note: "", order: 1000, auto: true};
    if (list.some(function(x){ return similar(x, w); })) return;      /* another version of a listed work */
    var prev = added[d] || Object.keys(added).map(function(k){ return added[k]; }).filter(function(x){ return similar(x, w); })[0];
    if (!prev) { added[d] = w; return; }
    if ((!isPub(prev) && isPub(w)) || (prev.status === w.status && version(full) > version(prev.doi))) {
      Object.keys(added).forEach(function(k){ if (added[k] === prev) delete added[k]; });
      added[d] = w;
    }
  });
  var n = 0; Object.keys(added).forEach(function(k){ list.push(added[k]); n++; });
  return n;
}
function getJSON(url){
  var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  var t = setTimeout(function(){ if (ctl) ctl.abort(); }, 8000);
  return fetch(url, ctl ? {signal: ctl.signal} : {}).then(function(r){ clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json(); });
}
/* Live from OpenAlex first; if that is not possible, the newest of the browser's last
   result and the saved copy in content/openalex.json. */
function syncOpenAlex(){
  if (P.state !== "idle" || !P.orcid) return;
  var KEY = "openalex:" + P.orcid, cached = lget(KEY);
  function use(c){ P.oa = c; P.checked = c.t; P.state = "done"; render(); }
  if (cached && Date.now() - cached.t < 12 * 3600e3) { use(cached); return; }
  P.state = "loading";
  var base = "https://api.openalex.org/works?per-page=200&select=id,doi,title,display_name,publication_year,publication_date,type,primary_location,authorships,cited_by_count,open_access&filter=author.orcid:";
  getJSON(base + P.orcid)
    .then(function(j){ var c = {t: Date.now(), results: j.results || []}; lset(KEY, c); use(c); })
    .catch(function(){
      return getJSON(new URL("content/openalex.json", ROOT).href)
        .then(function(saved){ use(cached && cached.t > (saved.t || 0) ? cached : saved); })
        .catch(function(){ if (cached) use(cached); else { P.state = "failed"; render(); } });
    });
}

function yearText(w){ return w.year ? String(w.year) : (w.status === "under review" ? "under review" : "n.d."); }
function authorsHTML(a){
  var out = a.map(function(x){ var m = (x.match(/[*†][*†,]*$/) || [""])[0], n = strip(x);
    return (/gunschera/i.test(n) ? "<b>" + esc(n) + "</b>" : esc(n)) + (m ? "<sup>" + m + "</sup>" : ""); });
  if (out.length > 1) out[out.length - 1] = "&amp; " + out[out.length - 1];
  return out.join(", ");
}
function apaText(w){
  var a = w.authors.map(strip), s = a.length > 1 ? a.slice(0, -1).join(", ") + ", & " + a[a.length - 1] : (a[0] || "");
  return s + " (" + yearText(w) + "). " + w.title + ". " + (w.venue ? w.venue + ". " : "") + (href(w) || "");
}
function bibText(w){
  var key = norm(strip(w.authors[0] || "").split(",")[0]).replace(/\s/g, "") + (w.year || "") + (norm(w.title).split(" ").filter(function(t){ return t.length > 3; })[0] || "");
  var named = w.authors.map(strip).filter(function(a){ return !/^(…|\.\.\.)$/.test(a); });
  var etal = named.length < w.authors.length;
  var type = isPub(w) ? "article" : "misc", f = ["  title = {" + w.title + "}", "  author = {" + (etal ? w.authors.map(strip).slice(0, w.authors.map(strip).indexOf("…")).join(" and ") + " and others" : named.join(" and ")) + "}"];
  if (w.year) f.push("  year = {" + w.year + "}");
  if (w.venue) f.push((type === "article" ? "  journal = {" : "  howpublished = {") + w.venue + "}");
  if (w.doi) f.push("  doi = {" + w.doi + "}"); else if (w.url) f.push("  url = {" + resolve(w.url) + "}");
  if (!isPub(w)) f.push("  note = {" + (w.note || (w.status === "preprint" ? "Preprint" : "Under review")) + "}");
  return "@" + type + "{" + key + ",\n" + f.join(",\n") + "\n}";
}
function pubHTML(w){
  var i = P.list.indexOf(w), h = href(w);
  var title = h ? '<a href="' + esc(h) + '">' + esc(w.title) + "</a>" : esc(w.title);
  var tag = w.status === "preprint" ? '<span class="tag">Preprint</span>' : (w.status === "under review" && w.year ? '<span class="tag">Under review</span>' : "");
  var venue = [w.venue ? "<i>" + esc(w.venue) + "</i>" : "", w.note ? esc(w.note) : ""].filter(Boolean).join(" · ");
  return "<li>" +
    '<p class="p-title">' + title + tag + "</p>" +
    '<p class="authors">' + authorsHTML(w.authors) + "</p>" +
    (venue ? '<p class="venue">' + venue + "</p>" : "") +
    '<p class="actions">' + (h ? '<a href="' + esc(h) + '">' + (w.doi ? "DOI" : "Link") + "</a>" : "") +
      (isPub(w) && w.oa && w.oa !== h && !/doi\.org\//i.test(w.oa) ? '<a href="' + esc(w.oa) + '">Free PDF</a>' : "") +
      (w.preprint ? '<a href="' + esc(w.preprint) + '">Preprint</a>' : "") +
      (w.extra || []).map(function(x){ return '<a href="' + esc(x.url) + '">' + esc(x.label) + "</a>"; }).join("") +
      '<button type="button" data-cite="' + i + '" aria-expanded="false" aria-controls="cite-' + i + '">Cite</button>' +
      (w.cites ? '<span class="cited">Cited by ' + w.cites + "</span>" : "") + "</p>" +
    '<div class="cite" id="cite-' + i + '" hidden>' +
      '<div class="row"><div class="row-head"><span>APA</span><button type="button" data-copy="apa-' + i + '">Copy</button></div><p id="apa-' + i + '">' + esc(apaText(w)) + "</p></div>" +
      '<div class="row"><div class="row-head"><span>BibTeX</span><button type="button" data-copy="bib-' + i + '">Copy</button></div><pre id="bib-' + i + '">' + esc(bibText(w)) + "</pre></div>" +
    "</div></li>";
}
function sortPubs(a, b){
  var ya = +a.year || 9999, yb = +b.year || 9999;
  return yb - ya || (b.date || "").localeCompare(a.date || "") || a.order - b.order;
}
function syncMeta(){
  var d = P.checked ? new Date(P.checked).toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric"}) : "";
  if (P.state === "done") return '<span><span class="dot live"></span>Synced with OpenAlex · ' + d + "</span>" + (P.added ? "<span>" + P.added + " added automatically</span>" : "");
  if (P.state === "failed") return '<span><span class="dot"></span>Showing saved list</span>';
  return '<span><span class="dot"></span>Checking OpenAlex…</span>';
}

/* ———————————— pages ———————————— */
var R = {};

R.home = function(){
  var secs = parse(texts.about), intro = secs[0] && !secs[0].title ? secs[0] : {raw: []};
  var paras = intro.raw.join("\n").split(/\n\s*\n/).map(function(p){ return p.replace(/\s+/g, " ").trim(); }).filter(Boolean);
  /* First paragraph sits beside the photo; any further paragraphs run full width below it */
  var html = function(list){ return list.map(function(p){ return "<p>" + esc(p) + "</p>"; }).join(""); };
  if ($("bio-lead")) { $("bio-lead").innerHTML = html(paras.slice(0, 1)); $("bio-rest").innerHTML = html(paras.slice(1)); }
  else if ($("bio")) $("bio").innerHTML = html(paras);
  var interests = secs.filter(function(s){ return /interest/i.test(s.title); })[0];
  $("interests").innerHTML = interests ? interests.rows.map(function(r){ return "<li>" + esc(r[0]) + "</li>"; }).join("") : "";

  buildPubs(texts.publications);
  var picked = featuredPubs();
  var pubs = picked.length ? picked : P.list.filter(function(w){ return w.year; }).sort(sortPubs).slice(0, 3);
  var talks = allRows(texts.talks).slice(0, 3);
  $("home-lists").innerHTML =
    '<section class="sec"><h2 class="sec-head">' + (picked.length ? "Selected publications and preprints" : "Latest publications") +
      '<a href="' + esc(pageHref("publications")) + '">All publications →</a></h2><ul class="home-list">' +
      pubs.map(function(w){ var h = href(w);
        var tag = w.status === "preprint" ? '<span class="tag">Preprint</span>' : "";   /* "In review" already shows in the date column */
        return '<li><span class="when">' + esc(w.year || "In review") + '</span><div><p class="e-title">' + (h ? '<a href="' + esc(h) + '">' + esc(w.title) + "</a>" : esc(w.title)) + tag + "</p>" +
          '<p class="e-details">' + authorsHTML(w.authors) + "</p>" +
          (w.venue ? '<p class="e-details"><i>' + esc(w.venue) + "</i></p>" : "") + "</div></li>"; }).join("") +
    '</ul></section><section class="sec"><h2 class="sec-head">Recent talks<a href="' + esc(pageHref("talks")) + '">All talks →</a></h2><ul class="home-list">' +
      talks.map(function(r){ return entryHTML(r); }).join("") + "</ul></section>";
  syncOpenAlex();
};

R.publications = function(){
  buildPubs(texts.publications);
  var c = $("content");
  if (!$("pub-groups")) {
    c.innerHTML = '<div class="controls"><div class="seg" role="group" aria-label="Show">' +
      '<button type="button" data-f="all" aria-pressed="true">All<span class="n" id="n-all"></span></button>' +
      '<button type="button" data-f="published" aria-pressed="false">Journal articles<span class="n" id="n-pub"></span></button>' +
      '<button type="button" data-f="preprint" aria-pressed="false">Preprints &amp; under review<span class="n" id="n-pre"></span></button></div>' +
      '<label class="sr" for="pub-search">Search publications</label><input class="search" id="pub-search" type="search" placeholder="Search title, author, journal" autocomplete="off"></div>' +
      '<div id="pub-groups"></div><p class="legend">* equal contribution · ** shared senior authorship</p>';
    c.querySelector(".seg").addEventListener("click", function(e){
      var b = e.target.closest("button"); if (!b) return;
      P.filter = b.getAttribute("data-f");
      c.querySelectorAll(".seg button").forEach(function(x){ x.setAttribute("aria-pressed", String(x === b)); });
      drawPubs();
    });
    $("pub-search").addEventListener("input", function(e){ P.q = norm(e.target.value); drawPubs(); });
  }
  drawPubs();
  syncOpenAlex();
};
function drawPubs(){
  var all = P.list, pub = all.filter(isPub).length;
  $("n-all").textContent = all.length; $("n-pub").textContent = pub; $("n-pre").textContent = all.length - pub;
  setCount(all.length);
  setMeta("<span>" + pub + " journal articles · " + (all.length - pub) + " preprints and manuscripts</span>" + syncMeta());
  var list = all.filter(function(w){
    if (P.filter === "published" && !isPub(w)) return false;
    if (P.filter === "preprint" && isPub(w)) return false;
    if (P.q && norm([w.title, w.authors.join(" "), w.venue, w.year].join(" ")).indexOf(P.q) < 0) return false;
    return true;
  }).sort(sortPubs);
  var groups = [], byKey = {};
  list.forEach(function(w){ var k = w.year ? String(w.year) : "Under review"; if (!byKey[k]) { byKey[k] = []; groups.push(k); } byKey[k].push(w); });
  $("pub-groups").innerHTML = groups.length ? groups.map(function(k){
    return '<div class="group"><p class="group-label">' + esc(k) + '</p><ul class="pubs">' + byKey[k].map(pubHTML).join("") + "</ul></div>";
  }).join("") : '<p class="empty">No publications match this search.</p>';
}

var MONTHS = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
R.talks = function(){
  var rows = allRows(texts.talks), groups = [], byYear = {}, now = new Date(), years = [];
  rows.forEach(function(r){
    var y = ((r[0] || "").match(/(19|20)\d{2}/g) || []).pop() || "Other";
    if (!byYear[y]) { byYear[y] = []; groups.push(y); }
    byYear[y].push(r); if (y !== "Other") years.push(+y);
  });
  $("content").innerHTML = groups.map(function(y){
    return '<div class="group"><p class="group-label">' + esc(y) + '</p><ul class="entries">' + byYear[y].map(function(r){
      var m = MONTHS[(r[0] || "").slice(0, 3).toLowerCase()], when = (r[0] || "").replace(y, "").trim();
      var end = /\d{4}/.test(y) ? new Date(+y, m != null ? m + 1 : 12, 0) : null;
      return entryHTML(r, {when: when, extraTag: end && end > now ? '<span class="tag hot">Upcoming</span>' : ""});
    }).join("") + "</ul></div>";
  }).join("");
  setCount(rows.length);
  if (years.length) setMeta("<span>" + rows.length + " talks and posters · " + Math.min.apply(null, years) + "–" + Math.max.apply(null, years) + "</span>");
};

["policy", "teaching", "engagement", "cv"].forEach(function(p){
  R[p] = function(){ $("content").innerHTML = sectionsHTML(texts[p]); };
});

function render(){ if (R[PAGE] && need.every(function(n){ return texts[n] != null; })) R[PAGE](); }

/* ———————————— shared interactions ———————————— */
document.addEventListener("click", function(e){
  var c = e.target.closest("[data-cite]");
  if (c) { var p = $("cite-" + c.getAttribute("data-cite")); p.hidden = !p.hidden; c.setAttribute("aria-expanded", String(!p.hidden)); c.textContent = p.hidden ? "Cite" : "Close"; return; }
  var cp = e.target.closest("[data-copy]");
  if (cp) {
    var el = $(cp.getAttribute("data-copy")), orig = cp.textContent;
    var done = function(m){ cp.textContent = m; setTimeout(function(){ cp.textContent = orig; }, 1500); };
    var sel = function(){ var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); done("Selected"); };
    try { navigator.clipboard.writeText(el.innerText).then(function(){ done("Copied"); }, sel); } catch(_) { sel(); }
  }
});
var addr = "lukas.gunschera" + "@" + "mrc-cbu.cam.ac.uk";
document.querySelectorAll("[data-email]").forEach(function(a){ a.href = "mailto:" + addr; a.title = addr; });

/* ———————————— load content ———————————— */
function load(name){
  return fetch(new URL("content/" + name + ".txt", ROOT).href, {cache: "no-cache"})
    .then(function(r){ if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function(t){ sset("txt:" + name, t); return t; });
}
var fromCache = need.length && need.every(function(n){ var t = sget("txt:" + n); if (t != null) texts[n] = t; return t != null; });
if (fromCache) render();                       /* instant render when moving between pages */
Promise.all(need.map(load)).then(function(arr){
  var changed = false;
  need.forEach(function(n, i){ if (texts[n] !== arr[i]) { texts[n] = arr[i]; changed = true; } });
  if (changed) render();
}).catch(function(){
  if (!fromCache && $("content")) $("content").innerHTML = '<p class="empty">This page could not load its content. Please refresh, or open the <a href="' + esc(resolve("media/cv.pdf")) + '">CV (PDF)</a>.</p>';
});
(window.requestIdleCallback || function(f){ setTimeout(f, 1500); })(function(){
  ALL.forEach(function(n){ if (sget("txt:" + n) == null) load(n).catch(function(){}); });
});
})();
