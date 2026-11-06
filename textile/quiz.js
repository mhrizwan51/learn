/* quiz.js — self-grading quizzes for the Textile Lecture Companion.
   Expects: window.QUIZ = {lecture:{id,course,title,n,url}, idx:1..5, quiz:{title,level,questions:[...]}, all:[{title,level}], nav:{prev,next}}
   Question: {type:'mc'|'tf'|'num', q, sketch?, options?, answer, tol?, unit?, explain} */
(function () {
function runQuiz(Q) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const key = 'quiz:' + Q.lecture.id + ':' + Q.idx;
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { } }
  };
  const qs = Q.quiz.questions; const n = qs.length;
  const state = { answered: Array(n).fill(null), score: 0 };
  // deterministic shuffle of option order per attempt
  let seed = Date.now() % 100000; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const order = qs.map(q => q.type === 'mc' ? q.options.map((_, i) => i).sort(() => rnd() - .5) : null);
  const grade = p => p >= 90 ? ['A', 'Excellent'] : p >= 80 ? ['B', 'Good'] : p >= 70 ? ['C', 'Fair'] : p >= 60 ? ['D', 'Needs revision'] : ['F', 'Go back to the lecture'];
  const figHTML = f => (f && typeof FIG === 'function') ? `<div class="qfig">${FIG(f)}</div>` : '';
  function render() {
    const root = document.getElementById('quiz'); let h = '';
    h += `<div class="qbar"><div class="qprog"><div class="qfill" id="qfill"></div></div><div class="qscore" id="qscore">0 / ${n} answered</div></div>`;
    qs.forEach((q, i) => {
      h += `<div class="qcard" id="qc${i}"><div class="qnum">Question ${i + 1} of ${n}<span class="qtype">${q.type === 'mc' ? 'Multiple choice' : q.type === 'tf' ? 'True or false' : 'Calculate'}</span></div><div class="qtext">${q.q}</div>${figHTML(q.sketch)}`;
      if (q.type === 'mc') h += `<div class="qopts">${order[i].map(oi => `<button class="qopt" data-q="${i}" data-o="${oi}">${esc(q.options[oi])}</button>`).join('')}</div>`;
      else if (q.type === 'tf') h += `<div class="qopts tf"><button class="qopt" data-q="${i}" data-o="1">True</button><button class="qopt" data-q="${i}" data-o="0">False</button></div>`;
      else h += `<div class="qnum-in"><input type="text" inputmode="decimal" id="qin${i}" placeholder="Your answer"><span class="unit">${esc(q.unit || '')}</span><button class="qcheck" data-q="${i}">Check</button></div>`;
      h += `<div class="qfb" id="qfb${i}"></div></div>`;
    });
    h += `<div class="qresult" id="qresult"></div>`;
    root.innerHTML = h;
    root.onclick = (e => {
      const b = e.target.closest('.qopt'); if (b) return answer(+b.dataset.q, +b.dataset.o);
      const c = e.target.closest('.qcheck'); if (c) return answerNum(+c.dataset.q);
    });
    root.onkeydown = e => { if (e.key === 'Enter' && e.target.id && e.target.id.startsWith('qin')) answerNum(+e.target.id.slice(3)); };
    const prev = store.get(), qb = document.getElementById('qbest'); if (qb && prev && prev.best != null) qb.textContent = `Best so far: ${prev.best}%`;
    const sk = document.getElementById('qsketch'); if (sk && Q.quiz.sketch && typeof FIG === 'function') sk.innerHTML = FIG(Q.quiz.sketch, '');
  }
  function parseNum(s) { s = String(s).trim().replace(/,/g, '').replace(/%$/, '').replace(/^rs\.?\s*/i, ''); if (!s) return NaN; const m = s.match(/^(-?\d*\.?\d+)\s*\/\s*(-?\d*\.?\d+)$/); if (m) return +m[1] / +m[2]; return Number(s); }
  function answerNum(i) {
    const q = qs[i]; if (state.answered[i] !== null) return;
    const v = parseNum(document.getElementById('qin' + i).value); if (isNaN(v)) { flash(i, 'Enter a number.'); return; }
    const tol = q.tol == null ? Math.abs(q.answer) * .01 + 1e-9 : q.tol;
    settle(i, Math.abs(v - q.answer) <= tol + 1e-9, `${fmt(q.answer)}${q.unit ? ' ' + q.unit : ''}`, fmt(v));
  }
  const fmt = v => { if (typeof v !== 'number') return v; const a = Math.abs(v); return a >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : +v.toFixed(a < 1 ? 4 : 3) + ''; };
  function answer(i, o) {
    const q = qs[i]; if (state.answered[i] !== null) return;
    const ok = q.type === 'mc' ? o === q.answer : (!!o) === !!q.answer;
    const card = document.getElementById('qc' + i);
    card.querySelectorAll('.qopt').forEach(b => { const oi = +b.dataset.o; const isAns = q.type === 'mc' ? oi === q.answer : (!!oi) === !!q.answer; b.disabled = true; if (isAns) b.classList.add('right'); else if (oi === o) b.classList.add('wrong'); });
    settle(i, ok, q.type === 'mc' ? q.options[q.answer] : (q.answer ? 'True' : 'False'));
  }
  function flash(i, msg) { const fb = document.getElementById('qfb' + i); fb.className = 'qfb hint'; fb.innerHTML = esc(msg); }
  function settle(i, ok, correct, given) {
    state.answered[i] = ok; if (ok) state.score++;
    const q = qs[i], card = document.getElementById('qc' + i); card.classList.add(ok ? 'ok' : 'bad');
    const inp = document.getElementById('qin' + i); if (inp) { inp.disabled = true; card.querySelector('.qcheck').disabled = true; }
    const fb = document.getElementById('qfb' + i); fb.className = 'qfb ' + (ok ? 'ok' : 'bad');
    fb.innerHTML = `<b>${ok ? '✓ Correct' : '✗ Not quite'}</b>${ok ? '' : ` — the answer is <b>${esc(correct)}</b>${given != null ? ` (you entered ${esc(given)})` : ''}`}.${q.explain ? ` <span class="exp">${esc(q.explain)}</span>` : ''}`;
    const done = state.answered.filter(a => a !== null).length;
    document.getElementById('qfill').style.width = (done / n * 100) + '%';
    document.getElementById('qscore').textContent = `${state.score} correct · ${done} / ${n} answered`;
    if (done === n) finish();
    else { const next = document.getElementById('qc' + (i + 1)); if (next) setTimeout(() => next.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350); }
  }
  function finish() {
    const p = Math.round(state.score / n * 100), [g, w] = grade(p);
    const prev = store.get() || {}; const best = Math.max(prev.best || 0, p); store.set({ best, last: p, when: Date.now() });
    const nx = Q.embed ? (Q.idx < 5 ? `<a class="qbtn primary" data-quiz="${Q.lecture.id}:${Q.idx + 1}">Next quiz →</a>` : `<a class="qbtn primary" data-go="${Q.lecture.id}">Back to the lecture</a>`)
      : Q.nav.next ? `<a class="qbtn primary" href="${Q.nav.next}">Next quiz →</a>` : `<a class="qbtn primary" href="${Q.lecture.url}">Back to the lecture</a>`;
    document.getElementById('qresult').innerHTML = `<div class="qgrade g${g}"><div class="big">${g}</div><div><div class="pct">${p}% — ${state.score} of ${n} correct</div><div class="word">${w}${best > p ? ` · best ${best}%` : ''}</div></div></div><div class="qactions"><button class="qbtn" id="qretry">Try again</button>${nx}</div>`;
    document.getElementById('qretry').onclick = () => { runQuiz(Q); const t = document.getElementById('quiz'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    document.getElementById('qresult').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  render();
}
window.runQuiz = runQuiz;
const Q = window.QUIZ; if (!Q) return;
  // sidebar: menu toggle + search filter (no app.js on quiz pages)
  const mb = document.getElementById('menubtn'), side = document.getElementById('side');
  if (mb) mb.onclick = () => side.classList.toggle('open');
  const qbox = document.getElementById('q');
  if (qbox) qbox.oninput = () => { const v = qbox.value.trim().toLowerCase(); document.querySelectorAll('#nav .list a').forEach(a => a.classList.toggle('hidden', v && !(a.dataset.s || '').includes(v))); document.querySelectorAll('#nav .course').forEach(c => c.classList.toggle('closed', false)); };
  document.querySelectorAll('#nav .course>button').forEach(b => b.onclick = () => b.parentElement.classList.toggle('closed'));
  runQuiz(Q);
})();
