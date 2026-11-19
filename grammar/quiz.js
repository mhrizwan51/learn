/* Arabic Grammar quizzes. Expects window.QUIZ = {lecture:{id,title,url}, idx, n, quiz:{title,questions}, nav:{next}} */
(function () {
var UD = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
function ud(n) { return String(n).replace(/\d/g, function (d) { return UD[+d]; }); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
var HK = /[ً-ْٰٓ-ٕ]/g;
function isAr(w) {
  var m = w.match(HK); if (!m) return false;
  if (m.length > 1) return true;
  var bare = w.replace(/[^ء-يٱ-ۓ]/g, '');
  return !(m[0] === 'ِ' && bare.length >= 3 && /ِ[^ء-ۓ]*$/.test(w));
}
function rich(s) {
  var parts = esc(s).split(/(\s+)/), out = '', run = [];
  function flush() { if (run.length) { var t = run.join(''), tail = ''; var m = /\s+$/.exec(t); if (m) { tail = m[0]; t = t.slice(0, -tail.length); } out += '<span class="aq" lang="ar">' + t + '</span>' + tail; run = []; } }
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (/^\s+$/.test(p)) { if (run.length) run.push(p); else out += p; }
    else if (isAr(p)) run.push(p);
    else { flush(); out += p; }
  }
  flush(); return out;
}
window.gqRich = rich;
function runQuiz(Q) {
  var key = 'quiz:' + Q.lecture.id + ':' + Q.idx;
  var store = { get: function () { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }, set: function (v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { } } };
  var qs = Q.quiz.questions, n = qs.length, state = { answered: [], score: 0 };
  for (var z = 0; z < n; z++) state.answered.push(null);
  var seed = Date.now() % 100000; function rnd() { return (seed = (seed * 9301 + 49297) % 233280) / 233280; }
  var order = qs.map(function (q) { return q.type === 'mc' ? q.options.map(function (_, i) { return i; }).sort(function () { return rnd() - .5; }) : null; });
  function grade(p) { return p >= 90 ? ['A', 'بہت خوب!'] : p >= 80 ? ['B', 'اچھا ہے'] : p >= 65 ? ['C', 'ٹھیک ہے، تھوڑی اور مشق کیجیے'] : p >= 50 ? ['D', 'دہرائی کی ضرورت ہے'] : ['F', 'سبق کی ویڈیو دوبارہ دیکھیے']; }
  var root = document.getElementById('quiz');
  function render() {
    var h = '<div class="qbar"><div class="qprog"><div class="qfill" id="qfill"></div></div><div class="qscore" id="qscore">' + ud(0) + ' / ' + ud(n) + ' مکمل</div></div>';
    qs.forEach(function (q, i) {
      h += '<div class="qcard" id="qc' + i + '"><div class="qnum"><span>سوال ' + ud(i + 1) + ' / ' + ud(n) + '</span><span>' + (q.type === 'mc' ? 'درست جواب چنیے' : 'درست یا غلط؟') + '</span></div><div class="qtext">' + rich(q.q) + '</div>';
      if (q.type === 'mc') h += '<div class="qopts">' + order[i].map(function (oi) { return '<button class="qopt" data-q="' + i + '" data-o="' + oi + '">' + rich(q.options[oi]) + '</button>'; }).join('') + '</div>';
      else h += '<div class="qopts tf"><button class="qopt" data-q="' + i + '" data-o="1">درست</button><button class="qopt" data-q="' + i + '" data-o="0">غلط</button></div>';
      h += '<div class="qfb" id="qfb' + i + '" aria-live="polite"></div></div>';
    });
    h += '<div class="qresult" id="qresult"></div>';
    root.innerHTML = h;
    root.onclick = function (e) { var b = e.target.closest('.qopt'); if (b && !b.disabled) answer(+b.dataset.q, +b.dataset.o); };
    var prev = store.get(), qb = document.getElementById('qbest'); if (qb && prev && prev.best != null) qb.textContent = 'اب تک کا بہترین نتیجہ: ' + ud(prev.best) + '٪';
  }
  function answer(i, o) {
    var q = qs[i]; if (state.answered[i] !== null) return;
    var ok = q.type === 'mc' ? o === q.answer : (!!o) === !!q.answer;
    var card = document.getElementById('qc' + i);
    [].forEach.call(card.querySelectorAll('.qopt'), function (b) { var oi = +b.dataset.o; var isAns = q.type === 'mc' ? oi === q.answer : (!!oi) === !!q.answer; b.disabled = true; if (isAns) b.classList.add('right'); else if (oi === o) b.classList.add('wrong'); });
    state.answered[i] = ok; if (ok) state.score++; card.classList.add(ok ? 'ok' : 'bad');
    var correct = q.type === 'mc' ? rich(q.options[q.answer]) : (q.answer ? 'درست' : 'غلط');
    var fb = document.getElementById('qfb' + i); fb.className = 'qfb ' + (ok ? 'ok' : 'bad');
    fb.innerHTML = '<b>' + (ok ? '✓ بالکل درست۔' : '✗ درست جواب: ') + '</b>' + (ok ? '' : '<b>' + correct + '</b>') + (q.explain ? ' <span class="exp">' + rich(q.explain) + '</span>' : '');
    var done = state.answered.filter(function (a) { return a !== null; }).length;
    document.getElementById('qfill').style.width = (done / n * 100) + '%';
    document.getElementById('qscore').textContent = ud(state.score) + ' درست · ' + ud(done) + ' / ' + ud(n) + ' مکمل';
    if (done === n) finish();
    else { var nx = null; for (var k = 1; k <= n; k++) { var j = (i + k) % n; if (state.answered[j] === null) { nx = document.getElementById('qc' + j); break; } } if (nx) setTimeout(function () { nx.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 450); }
  }
  function finish() {
    var p = Math.round(state.score / n * 100), g = grade(p);
    var prev = store.get() || {}, best = Math.max(prev.best || 0, p), rec = { best: best, last: p, when: Date.now() }; store.set(rec);
    var nx = Q.nav && Q.nav.next ? '<a class="qbtn primary" href="' + Q.nav.next + '">اگلا کوئز</a>' : '<a class="qbtn primary" href="' + Q.lecture.url + '">سبق پر واپس</a>';
    document.getElementById('qresult').innerHTML = '<div class="qgrade g' + g[0] + '"><div class="big">' + g[0] + '</div><div><div class="pct">' + ud(p) + '٪ — ' + ud(n) + ' میں سے ' + ud(state.score) + ' درست</div><div class="word">' + g[1] + (best > p ? ' · بہترین ' + ud(best) + '٪' : '') + '</div></div></div><div class="qactions"><button class="qbtn" id="qretry">دوبارہ کوشش کیجیے</button>' + nx + '<a class="qbtn" href="' + Q.lecture.url + '">سبق کی ویڈیو</a></div>';
    if (window.RZA) try { window.RZA.quizDone(key, rec); } catch (e) { }
    document.getElementById('qretry').onclick = function () { runQuiz(Q); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    document.getElementById('qresult').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  render();
}
/* best scores on lesson and index pages */
window.quizBest = function () {
  [].forEach.call(document.querySelectorAll('.gqt i[data-k]'), function (el) {
    var v = null; try { v = JSON.parse(localStorage.getItem(el.dataset.k) || 'null'); } catch (e) { }
    if (v && v.best != null) { el.textContent = 'Best ' + v.best + '%'; el.className = 'done'; }
  });
};
window.quizBest();
if (window.QUIZ) runQuiz(window.QUIZ);
})();
