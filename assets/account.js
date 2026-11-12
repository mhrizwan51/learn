/* account.js — optional Google sign-in for learn.rizwanzubair.net.
   Saves quiz scores and lectures opened to Firestore so a student's history follows them across devices.
   Sharing with the teacher is ON by default; the student can turn it off on /account/.
   Firebase is only downloaded for people who have signed in (or click Sign in), so anonymous visitors pay nothing. */
(function () {
  'use strict';
  var CFG = {
    apiKey: 'AIzaSyDqfsN67HxOWEjUydVVdpmn5eRe7YWc__c',
    authDomain: 'rizwanzubair-learn.firebaseapp.com',
    projectId: 'rizwanzubair-learn',
    storageBucket: 'rizwanzubair-learn.firebasestorage.app',
    messagingSenderId: '812932470780',
    appId: '1:812932470780:web:16314acb06be8eae3a4479'
  };
  var TEACHER = 'rizwan@rizwanzubair.net';
  var SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  var FLAG = 'rza:signedin';
  var ls = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    raw: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { } },
    keys: function () { var a = []; try { for (var i = 0; i < localStorage.length; i++) a.push(localStorage.key(i)); } catch (e) { } return a; }
  };

  var fb = null, loading = null, user = null, profile = null, ready = false, subs = [];
  function emit() { subs.forEach(function (f) { try { f(user, profile); } catch (e) { console.error(e); } }); paintLink(); }

  function load() {
    if (fb) return Promise.resolve(fb);
    if (loading) return loading;
    loading = Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')])
      .then(function (m) {
        var app = m[0].initializeApp(CFG);
        fb = { A: m[1], F: m[2], auth: m[1].getAuth(app), db: m[2].getFirestore(app) };
        fb.A.onAuthStateChanged(fb.auth, onAuth);
        return fb;
      });
    return loading;
  }

  function uref() { return fb.F.doc(fb.db, 'users', user.uid); }

  function onAuth(u) {
    user = u || null; profile = null;
    if (!user) { ls.del(FLAG); ready = true; emit(); markVisit(); return; }
    ls.set(FLAG, 1);
    var F = fb.F;
    F.getDoc(uref()).then(function (snap) {
      var base = { name: user.displayName || '', email: user.email || '', photo: user.photoURL || '', updated: F.serverTimestamp() };
      if (!snap.exists()) {
        base.shareWithTeacher = true; base.created = F.serverTimestamp();
        return F.setDoc(uref(), base).then(function () { return F.getDoc(uref()); });
      }
      return F.updateDoc(uref(), base).then(function () { return F.getDoc(uref()); });
    }).then(function (snap) {
      profile = snap.data(); ready = true; emit();
      return sync();
    }).then(function () { emit(); markVisit(); }).catch(function (e) { console.error('account', e); ready = true; emit(); });
  }

  /* ---- quiz results ---- */
  function qid(key) { return key.replace(/:/g, '_'); }              // quiz:fd02:1 -> quiz_fd02_1
  function parseKey(key) { var m = /^quiz:(([a-z]+)\d+):(\d)$/.exec(key); return m && { lecture: m[1], course: m[2], idx: +m[3] }; }

  function sync() {
    var F = fb.F, col = F.collection(uref(), 'quiz');
    return F.getDocs(col).then(function (qs) {
      var remote = {}; qs.forEach(function (d) { remote[d.id] = d.data(); });
      var writes = [];
      // local -> remote
      ls.keys().forEach(function (k) {
        var meta = parseKey(k); if (!meta) return;
        var v = ls.get(k); if (!v || v.best == null) return;
        var r = remote[qid(k)];
        if (!r || (r.best || 0) < v.best || (r.when || 0) < (v.when || 0)) {
          writes.push(F.setDoc(F.doc(col, qid(k)), {
            lecture: meta.lecture, course: meta.course, idx: meta.idx,
            best: Math.max(v.best, r ? r.best || 0 : 0),
            last: (r && (r.when || 0) > (v.when || 0)) ? r.last : v.last,
            when: Math.max(v.when || 0, r ? r.when || 0 : 0),
            attempts: r && r.attempts ? r.attempts : 1,
            updated: F.serverTimestamp()
          }, { merge: true }));
        }
      });
      // remote -> local (so the "Best so far" labels work on this device too)
      Object.keys(remote).forEach(function (id) {
        var r = remote[id], k = 'quiz:' + r.lecture + ':' + r.idx, v = ls.get(k) || {};
        if ((v.best || 0) < (r.best || 0) || (v.when || 0) < (r.when || 0))
          ls.set(k, { best: Math.max(v.best || 0, r.best || 0), last: (v.when || 0) > (r.when || 0) ? v.last : r.last, when: Math.max(v.when || 0, r.when || 0) });
      });
      // pending lecture visits made while signed out
      ls.keys().forEach(function (k) {
        var m = /^visit:([a-z]+\d+)$/.exec(k); if (!m) return;
        var v = ls.get(k); if (!v || !v.pending) return;
        writes.push(writeVisit(m[1], v.title || '', v.pending).then(function () { v.pending = 0; ls.set(k, v); }));
      });
      if (window.quizBest) try { window.quizBest(); } catch (e) { }
      return Promise.all(writes);
    });
  }

  function saveQuiz(key, rec) {
    if (!user || !fb) return Promise.resolve();
    var meta = parseKey(key); if (!meta) return Promise.resolve();
    var F = fb.F;
    return F.setDoc(F.doc(F.collection(uref(), 'quiz'), qid(key)), {
      lecture: meta.lecture, course: meta.course, idx: meta.idx,
      best: rec.best, last: rec.last, when: rec.when,
      attempts: F.increment(1), updated: F.serverTimestamp()
    }, { merge: true }).catch(function (e) { console.error('saveQuiz', e); });
  }

  /* ---- lectures opened ---- */
  function writeVisit(id, title, n) {
    var F = fb.F;
    return F.setDoc(F.doc(F.collection(uref(), 'visits'), id), {
      lecture: id, course: id.replace(/\d+$/, ''), title: String(title).slice(0, 200),
      count: F.increment(n || 1), last: F.serverTimestamp()
    }, { merge: true });
  }
  var visited = false;
  function currentLecture() {
    if (window.QUIZ && window.QUIZ.lecture && !window.QUIZ.embed) return { id: window.QUIZ.lecture.id, title: window.QUIZ.lecture.title };
    if (typeof window.START === 'string' && /^[a-z]{2}\d+$/.test(window.START)) {
      var h = document.querySelector('#page .lhead h1'); return { id: window.START, title: h ? h.textContent : '' };
    }
    return null;
  }
  function markVisit() {
    if (visited) return; var cl = currentLecture(); if (!cl) return; visited = true;
    var k = 'visit:' + cl.id, v = ls.get(k) || { count: 0, pending: 0 };
    v.count = (v.count || 0) + 1; v.last = Date.now(); v.title = cl.title;
    if (user && fb) { ls.set(k, v); writeVisit(cl.id, cl.title, 1).catch(function (e) { console.error('visit', e); }); }
    else { v.pending = (v.pending || 0) + 1; ls.set(k, v); }
  }

  /* ---- sharing toggle ---- */
  function setShare(on) {
    if (!user) return Promise.reject(new Error('Not signed in'));
    return fb.F.updateDoc(uref(), { shareWithTeacher: !!on, updated: fb.F.serverTimestamp() }).then(function () { profile.shareWithTeacher = !!on; emit(); });
  }

  function signIn() {
    return load().then(function () {
      var p = new fb.A.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
      return fb.A.signInWithPopup(fb.auth, p);
    });
  }
  function signOut() { return load().then(function () { return fb.A.signOut(fb.auth); }); }

  function loadMine() {
    var F = fb.F;
    return Promise.all([F.getDocs(F.collection(uref(), 'quiz')), F.getDocs(F.collection(uref(), 'visits'))]).then(function (r) {
      var q = [], v = []; r[0].forEach(function (d) { q.push(d.data()); }); r[1].forEach(function (d) { v.push(d.data()); });
      return { quiz: q, visits: v };
    });
  }
  function deleteMine() {
    var F = fb.F;
    return Promise.all([F.getDocs(F.collection(uref(), 'quiz')), F.getDocs(F.collection(uref(), 'visits'))]).then(function (r) {
      var ps = []; r.forEach(function (s) { s.forEach(function (d) { ps.push(F.deleteDoc(d.ref)); }); });
      return Promise.all(ps);
    }).then(function () { return F.deleteDoc(uref()); }).then(function () { return signOut(); });
  }

  /* ---- header link ---- */
  function paintLink() {
    var nav = document.querySelector('.rzbar nav'); if (!nav) return;
    var a = document.getElementById('rza-link');
    if (!a) { a = document.createElement('a'); a.id = 'rza-link'; a.style.cssText = 'color:#C8AF72;font-weight:600'; nav.appendChild(a); }
    var from = encodeURIComponent(location.pathname + location.search);
    if (user) { a.textContent = 'My progress'; a.href = '/account/'; }
    else { a.textContent = 'Sign in'; a.href = '/account/?from=' + from; a.title = 'Sign in to save your quiz scores and lecture history'; }
  }

  /* called by quiz.js when a quiz finishes */
  function quizDone(key, rec) {
    if (user) { saveQuiz(key, rec); return; }
    var box = document.getElementById('qresult'); if (!box || document.getElementById('rza-nudge')) return;
    var p = document.createElement('p'); p.id = 'rza-nudge'; p.style.cssText = 'margin:12px 0 0;font-size:14px;color:#5b6678';
    p.innerHTML = 'This score is saved on this device only. <a href="/account/?from=' + encodeURIComponent(location.pathname) + '">Sign in</a> to keep your scores and lecture history in your account.';
    box.appendChild(p);
  }

  window.RZA = {
    TEACHER: TEACHER, load: load, signIn: signIn, signOut: signOut, setShare: setShare, saveQuiz: saveQuiz, quizDone: quizDone,
    loadMine: loadMine, deleteMine: deleteMine, fb: function () { return fb; },
    user: function () { return user; }, profile: function () { return profile; }, ready: function () { return ready; },
    onChange: function (f) { subs.push(f); if (ready) f(user, profile); }
  };

  function start() {
    paintLink();
    if (ls.raw(FLAG) || document.documentElement.hasAttribute('data-rza-always')) load().catch(function (e) { console.error('account', e); ready = true; emit(); });
    else { ready = true; markVisit(); emit(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
