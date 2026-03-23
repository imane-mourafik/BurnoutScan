/**
 * app.js — Frontend BurnoutScan (version GitHub Pages)
 * Utilise BurnoutEngine (engine.js) au lieu de Flask
 * Auteur : Imane Mourafik · 2025–2026
 */

const App = (() => {
  let questions = [];
  let current   = 0;
  let answers   = {};

  /* ── PARTICULES ──────────────────────────────── */
  function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({length: 55}, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.5 + 0.1,
      c: Math.random() > 0.5 ? '#4f7ef8' : '#7c3aed'
    }));

    function draw() {
      W = canvas.width; H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c + Math.floor(p.a * 255).toString(16).padStart(2,'0');
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i+1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(79,126,248,${0.1*(1-d/110)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    draw();
  }
  initParticles();

  /* ── START ───────────────────────────────────── */
  function start() {
    // Charge les questions depuis engine.js (pas de fetch réseau !)
    questions = BurnoutEngine.QUESTIONS;
    current   = 0;
    answers   = {};

    // Initialise toutes les valeurs par défaut
    questions.forEach(q => {
      if      (q.type === 'yesno')  answers[q.id] = false;
      else if (q.type === 'slider') answers[q.id] = q.default;
      else                          answers[q.id] = '';
    });

    showScreen('quiz');
    renderQuestion();
  }

  /* ── RESTART ─────────────────────────────────── */
  function restart() {
    current = 0; answers = {};
    showScreen('welcome');
    setTimeout(initParticles, 100);
  }

  /* ── NEXT ────────────────────────────────────── */
  function next() {
    const q = questions[current];
    if (q.type === 'slider') {
      const el = document.getElementById('sl_' + q.id);
      if (el) answers[q.id] = parseInt(el.value);
    } else if (q.type === 'text') {
      const el = document.getElementById('ti_' + q.id);
      if (el) answers[q.id] = el.value;
    }
    if (current < questions.length - 1) { current++; renderQuestion(); }
    else submitDiagnostic();
  }

  /* ── PREV ────────────────────────────────────── */
  function prev() {
    if (current > 0) { current--; renderQuestion(); }
  }

  /* ── RENDER QUESTION ─────────────────────────── */
  function renderQuestion() {
    const q = questions[current], total = questions.length;

    const pct = Math.round(((current+1)/total)*100);
    document.getElementById('qpFill').style.width = pct + '%';
    document.getElementById('qpText').textContent = `${current+1} / ${total}`;
    document.getElementById('secEmoji').textContent = q.section_emoji || '📋';
    document.getElementById('secLabel').textContent = q.section_label || '';
    document.getElementById('qMeta').textContent = `Q${String(current+1).padStart(2,'0')}`;
    document.getElementById('qText').textContent = q.question;

    const helpEl = document.getElementById('qHelp');
    if (q.help) { helpEl.textContent = q.help; helpEl.style.display = 'block'; }
    else         { helpEl.style.display = 'none'; }

    const zone = document.getElementById('qAnswers');
    zone.innerHTML = '';
    if      (q.type === 'yesno')  renderYesNo(q, zone);
    else if (q.type === 'slider') renderSlider(q, zone);
    else if (q.type === 'text')   renderText(q, zone);

    document.getElementById('btnPrev').style.visibility = current > 0 ? 'visible' : 'hidden';
    const btnNxt = document.getElementById('btnNxt');
    btnNxt.disabled = false;
    btnNxt.textContent = current === total-1 ? 'Voir le diagnostic ✓' : 'Suivant →';

    const card = document.getElementById('qCard');
    card.style.opacity = '0'; card.style.transform = 'translateY(10px)';
    requestAnimationFrame(() => {
      card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      card.style.opacity = '1'; card.style.transform = 'translateY(0)';
    });
  }

  /* ── YES/NO ──────────────────────────────────── */
  function renderYesNo(q, zone) {
    const saved = answers[q.id];
    [{label:'Oui', emoji:'✅', val:true, cls:'sel-yes'},
     {label:'Non', emoji:'❌', val:false, cls:'sel-no'}
    ].forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'ans-btn' + (saved === opt.val ? ' ' + opt.cls : '');
      btn.innerHTML = `<span class="ans-ico">${opt.emoji}</span><span>${opt.label}</span>`;
      btn.onclick = () => {
        answers[q.id] = opt.val;
        zone.querySelectorAll('.ans-btn').forEach(b => b.className = 'ans-btn');
        btn.className = 'ans-btn ' + opt.cls;
        if (current < questions.length - 1) setTimeout(next, 350);
      };
      zone.appendChild(btn);
    });
  }

  /* ── SLIDER ──────────────────────────────────── */
  function renderSlider(q, zone) {
    const val = answers[q.id] !== undefined ? answers[q.id] : q.default;
    answers[q.id] = parseInt(val);
    zone.innerHTML = `
      <div class="slider-wrap">
        <div class="slider-labels">
          <span>${q.labels[0]}</span><span>${q.labels[1]}</span><span>${q.labels[2]}</span>
        </div>
        <input type="range" id="sl_${q.id}" min="${q.min}" max="${q.max}" step="1" value="${val}"/>
        <div class="slider-display">
          <div class="slider-val" id="slv_${q.id}">${val}</div>
          <div class="slider-unit">${q.unit}</div>
        </div>
      </div>`;
    document.getElementById('sl_'+q.id).addEventListener('input', e => {
      const v = parseInt(e.target.value);
      answers[q.id] = v;
      document.getElementById('slv_'+q.id).textContent = v;
    });
  }

  /* ── TEXT ────────────────────────────────────── */
  function renderText(q, zone) {
    zone.innerHTML = `<input class="txt-input" id="ti_${q.id}" type="text"
      placeholder="${q.placeholder||'Votre réponse...'}" value="${answers[q.id]||''}" maxlength="80"/>`;
    const inp = document.getElementById('ti_'+q.id);
    inp.addEventListener('input', () => { answers[q.id] = inp.value; });
    inp.focus();
  }

  /* ── SUBMIT — appel direct engine.js (pas de réseau) ── */
  function submitDiagnostic() {
    showScreen('result');
    document.getElementById('scoreNum').textContent = '·';

    // Appel direct au moteur JavaScript (pas de fetch, pas de Flask !)
    const data = BurnoutEngine.analyser({ ...answers });
    console.log('[BurnoutScan] Score:', data.score, data.niveau.label);
    renderResult(data);
  }

  /* ── RENDER RESULT ───────────────────────────── */
  function renderResult(data) {
    const { score, niveau, urgence, symptomes, categories } = data;
    const prenom  = answers.prenom || '';
    const dateStr = new Date().toLocaleDateString('fr-FR',
      { day:'numeric', month:'long', year:'numeric' });

    document.getElementById('resultBg').style.background =
      `radial-gradient(ellipse 60% 40% at 50% 0%, ${niveau.color}18, transparent 70%)`;
    document.getElementById('urgencyBanner').style.display = urgence ? 'flex' : 'none';

    if (prenom) document.getElementById('resultPrenom').textContent = prenom;
    document.getElementById('resultDate').textContent = dateStr;

    animateScore(score, niveau);

    document.getElementById('verdictEmoji').textContent = niveau.emoji;
    const badge = document.getElementById('verdictBadge');
    badge.textContent = niveau.label;
    badge.style.background = niveau.color_bg;
    badge.style.color      = niveau.color;
    badge.style.border     = `1px solid ${niveau.color}40`;

    document.getElementById('verdictH1').textContent = niveau.label;
    document.getElementById('verdictP').textContent  = niveau.description;
    document.getElementById('verdictPrenom').textContent = prenom || 'l\'utilisateur';
    document.getElementById('verdictDate').textContent   = dateStr;

    renderCategories(categories);
    renderSymptoms(symptomes);
    renderRecos(niveau.recommandations || []);
    renderSources(data.sources || []);
  }

  /* ── ANIMATE SCORE ───────────────────────────── */
  function animateScore(target, niveau) {
    const numEl = document.getElementById('scoreNum');
    const ring  = document.getElementById('scoreRing');
    const circ  = 552.9;
    const cols  = {
      bienetre:      ['#22c55e','#16a34a'],
      stress_leger:  ['#f59e0b','#d97706'],
      stress_modere: ['#f97316','#ea580c'],
      stress_eleve:  ['#ef4444','#dc2626'],
      burnout:       ['#dc2626','#b91c1c'],
      danger:        ['#e11d48','#9f1239'],
    };
    const [c1,c2] = cols[niveau.id] || ['#4f7ef8','#7c3aed'];
    document.getElementById('g1').setAttribute('stop-color', c1);
    document.getElementById('g2').setAttribute('stop-color', c2);

    let cur = 0;
    const step = Math.max(1, Math.ceil(target/70));
    const t = setInterval(() => {
      cur = Math.min(cur+step, target);
      numEl.textContent = cur;
      ring.style.strokeDashoffset = circ - (cur/100)*circ;
      if (cur >= target) clearInterval(t);
    }, 18);
  }

  /* ── CATÉGORIES ──────────────────────────────── */
  function renderCategories(cats) {
    const conf = {
      physique:       {label:'Physique',       emoji:'🩺', color:'#38bdf8'},
      emotionnel:     {label:'Émotionnel',     emoji:'💭', color:'#f472b6'},
      cognitif:       {label:'Cognitif',       emoji:'🧠', color:'#a78bfa'},
      comportemental: {label:'Comportemental', emoji:'🚶', color:'#fb923c'},
      contexte:       {label:'Contextuel',     emoji:'💼', color:'#34d399'},
      combinaison:    {label:'Combinaison',    emoji:'🔗', color:'#fbbf24'},
    };
    const maxC = Math.max(...Object.values(cats), 1);
    const grid = document.getElementById('catsGrid');
    grid.innerHTML = '';
    Object.entries(conf).forEach(([k,c]) => {
      const count = cats[k]||0, pct = Math.round((count/maxC)*100);
      const card = document.createElement('div');
      card.className = 'cat-card';
      card.innerHTML = `
        <div class="cat-em">${c.emoji}</div>
        <div class="cat-nm">${c.label}</div>
        <div class="cat-ct">${count}</div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="background:${c.color}" data-w="${pct}"></div>
        </div>`;
      grid.appendChild(card);
    });
    setTimeout(() => {
      grid.querySelectorAll('.cat-bar-fill').forEach(b => b.style.width = b.dataset.w+'%');
    }, 200);
  }

  /* ── SYMPTÔMES ───────────────────────────────── */
  function renderSymptoms(syms) {
    const cols = {
      physique:       {bg:'rgba(56,189,248,0.1)',  c:'#38bdf8'},
      emotionnel:     {bg:'rgba(244,114,182,0.1)', c:'#f472b6'},
      cognitif:       {bg:'rgba(167,139,250,0.1)', c:'#a78bfa'},
      comportemental: {bg:'rgba(251,146,60,0.1)',  c:'#fb923c'},
      contexte:       {bg:'rgba(52,211,153,0.1)',  c:'#34d399'},
      combinaison:    {bg:'rgba(251,191,36,0.1)',  c:'#fbbf24'},
      urgence:        {bg:'rgba(239,68,68,0.1)',   c:'#ef4444'},
    };
    const list = document.getElementById('symptomsList');
    list.innerHTML = '';
    document.getElementById('sympCount').textContent =
      `${syms.length} symptôme${syms.length>1?'s':''}`;

    if (!syms.length) {
      list.innerHTML = '<p style="color:var(--t3);font-size:14px;padding:20px">✅ Aucun symptôme significatif détecté.</p>';
      return;
    }
    syms.forEach((s,i) => {
      const col = cols[s.cat]||{bg:'rgba(255,255,255,0.05)',c:'#666'};
      const el  = document.createElement('div');
      el.className = 'sym-item';
      el.style.animationDelay = (i*0.04)+'s';
      el.innerHTML = `
        <span class="sym-cat" style="background:${col.bg};color:${col.c}">${s.cat}</span>
        <div class="sym-body">
          <div class="sym-name">${s.nom}</div>
          <div class="sym-expl">${s.expl}</div>
          <div class="sym-src">📚 ${s.src}</div>
        </div>
        <span class="sym-pts">+${s.points} pts</span>`;
      list.appendChild(el);
    });
  }

  /* ── RECOMMANDATIONS ─────────────────────────── */
  function renderRecos(recos) {
    const list = document.getElementById('recosList');
    list.innerHTML = '';
    recos.forEach((r,i) => {
      const el = document.createElement('div');
      el.className = 'reco-item';
      el.innerHTML = `<div class="reco-num">${i+1}</div><div class="reco-text">${r}</div>`;
      list.appendChild(el);
    });
  }

  /* ── SOURCES ─────────────────────────────────── */
  function renderSources(sources) {
    const grid = document.getElementById('sourcesGrid');
    grid.innerHTML = '';
    sources.forEach(s => {
      const card = document.createElement('a');
      card.href = s.url; card.target = '_blank'; card.rel = 'noopener noreferrer';
      card.className = 'src-card' + (s.type==='emergency'?' emergency':'');
      card.innerHTML = `<div class="src-icon">${s.icon}</div><div class="src-name">${s.nom}</div><div class="src-desc">${s.desc}</div>`;
      grid.appendChild(card);
    });
  }

  /* ── UTILS ───────────────────────────────────── */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-'+id).classList.add('active');
    window.scrollTo(0,0);
  }

  return { start, restart, next, prev };
})();
