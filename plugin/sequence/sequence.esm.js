/*!
 * reveal.js-sequence 1.0.0
 * Walk a procedure step by step, or a course of events along a real time axis —
 * both from the same markup. Steps advance as native reveal fragments, so the
 * remote, the speaker view and the URL keep working. The reasoning behind each
 * step hides behind a discreet "…" until you want it.
 * Führt Handlungsabläufe Schritt für Schritt und Verläufe auf einer Zeitachse.
 * @author  Florian Loyns
 * @license MIT
 * Docs & options: see README.
 */

'use strict';

  function injectCSS(o){
    if (document.getElementById('sequence-css')) return;
    var css =
      /* Der Ablauf fuellt den Folienkoerper, damit die Schiene oben sitzt
         und nicht in einem mittig zentrierten Block schwebt. */
      ".reveal .sequence{display:flex;flex-direction:column;width:100%;flex:1;text-align:left}"
    + ".reveal .seq-stage{flex:1;min-height:0}"
      /* Schiene: schmal und ruhig – sie orientiert, sie soll nicht auffallen */
    + ".reveal .seq-rail{display:flex;align-items:center;margin:0 0 30px}"
    + ".reveal .seq-seg{flex:1;height:2px;background:" + o.line + "}"
    + ".reveal .seq-seg.done{background:" + o.muted + "}"
    + ".reveal .seq-dot{flex:0 0 auto;width:25px;height:25px;border-radius:50%;border:2px solid " + o.line + ";"
      + "background:#fff;color:#BDC7D1;font-size:13px;font-weight:700;font-family:inherit;padding:0;"
      + "display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.15s}"
    + ".reveal .seq-dot.done{border-color:" + o.muted + ";background:" + o.muted + ";color:#fff}"
    + ".reveal .seq-dot.now{border-color:" + o.accent + ";background:" + o.accent + ";color:#fff;width:31px;height:31px;font-size:15px}"
      /* Der aktuelle Schritt: reine Typografie. Kein Kasten, keine Farbfüllung –
         Farbe bleibt in diesem Hausstil für Bedeutung reserviert. */
    + ".reveal .seq-stage .t{font-size:33px;font-weight:800;line-height:1.16;margin:0 0 12px;color:#0B1818}"
    + ".reveal .seq-stage .d{font-size:22px;line-height:1.38;color:#22312f;max-width:92%}"
    + ".reveal .seq-stage .w{margin-top:17px;padding-left:16px;border-left:2px solid " + o.accent + ";"
      + "font-size:19px;line-height:1.42;color:#5A6A75;max-width:88%}"
    + ".reveal .seq-dots{font-family:inherit;font-size:19px;font-weight:800;line-height:1;color:" + o.accent + ";"
      + "background:transparent;border:1.5px solid " + o.line + ";border-radius:8px;padding:0 10px 5px;"
      + "margin-left:9px;cursor:pointer;vertical-align:middle}"
    + ".reveal .seq-dots:hover{border-color:" + o.accent + "}"
      /* Zeitachse */
    + ".reveal .seq-tl{position:relative;height:150px;margin:6px 0 10px}"
    + ".reveal .seq-axis{position:absolute;left:0;right:0;top:74px;height:2px;background:" + o.line + ";border-radius:2px}"
    + ".reveal .seq-fill{position:absolute;left:0;top:74px;height:2px;background:" + o.muted + ";border-radius:2px}"
    + ".reveal .seq-pt{position:absolute;top:74px;transform:translate(-50%,-50%);width:17px;height:17px;border-radius:50%;"
      + "border:2px solid " + o.line + ";background:#fff;padding:0;cursor:pointer;transition:.15s}"
    + ".reveal .seq-pt.done{border-color:" + o.muted + ";background:" + o.muted + "}"
    + ".reveal .seq-pt.now{border-color:" + o.accent + ";background:" + o.accent + ";width:23px;height:23px}"
    + ".reveal .seq-cap{position:absolute;transform:translateX(-50%);font-size:15px;font-weight:700;"
      + "color:#9AA6B2;white-space:nowrap}"
    + ".reveal .seq-cap.up{top:42px}.reveal .seq-cap.dn{top:96px}"
    + ".reveal .seq-cap.now{color:" + o.accent + ";font-weight:800}"
      /* die Fragmente, die das Weiterschalten tragen, sind unsichtbar */
    + ".reveal .seq-f{position:absolute;width:0;height:0;overflow:hidden;opacity:0 !important;visibility:hidden !important}"
      /* Im Druck und in der Übersicht steht der ganze Ablauf da – ein Handout
         mit nur einem sichtbaren Schritt wäre wertlos. */
    + "@media print{.reveal .seq-rail,.reveal .seq-tl,.reveal .seq-stage{display:none}"
      + ".reveal .sequence .step{display:block !important;margin:0 0 14px;padding-left:14px;border-left:2px solid " + o.line + "}"
      + ".reveal .sequence .step .t{font-size:20px;font-weight:800}"
      + ".reveal .sequence .step .d{font-size:17px}.reveal .sequence .step .w{font-size:15px;color:#5A6A75}}"
    + "@media (prefers-reduced-motion:reduce){.reveal .seq-dot,.reveal .seq-pt{transition:none}}";
    var s = document.createElement('style');
    s.id = 'sequence-css'; s.textContent = css;
    document.head.appendChild(s);
  }

  function txt(el){ return el ? el.innerHTML : ''; }

  /* Einen Schritt in seine drei Bestandteile zerlegen. Bewusst nachsichtig:
     Titel als .t, als Überschrift oder als Attribut – alles wird erkannt. */
  function parse(step){
    var t = step.querySelector('.t, h3, h4, h5');
    var w = step.querySelector('.w, .why');
    var d = step.querySelector('.d');
    var title = step.getAttribute('data-title') || txt(t);
    var why = txt(w);
    var desc;
    if (d) desc = txt(d);
    else {
      var rest = step.cloneNode(true);
      [].forEach.call(rest.querySelectorAll('.t, h3, h4, h5, .w, .why'), function(x){ x.parentNode.removeChild(x); });
      desc = rest.innerHTML.trim();
    }
    var tt = step.getAttribute('data-t');
    return {
      title: title, desc: desc, why: why,
      t: (tt !== null && tt !== '' && !isNaN(parseFloat(tt))) ? parseFloat(tt) : null,
      cap: step.getAttribute('data-cap') || (tt || '')
    };
  }

  var Plugin = {
    id: 'sequence',

    init: function (deck) {
      var d = document;
      var c = (deck.getConfig && deck.getConfig().sequence) || {};
      var o = {
        why: c.why || 'dots',
        accent: c.accent || '#2C4A6E',
        muted: c.muted || '#C3CDD7',
        line: c.line || '#E7EBEF'
      };
      injectCSS(o);
      var all = [];

      function build(host){
        if (host.getAttribute('data-seq-init')) return;
        host.setAttribute('data-seq-init', '1');

        var steps = [].map.call(host.querySelectorAll(':scope > .step'), parse);
        if (steps.length < 2) return;
        var timeMode = steps.every(function(s){ return s.t !== null; });
        var why = host.getAttribute('data-why') || o.why;

        [].forEach.call(host.querySelectorAll(':scope > .step'), function(el){ el.style.display = 'none'; });

        var head = d.createElement('div');
        head.className = timeMode ? 'seq-tl' : 'seq-rail';
        var stage = d.createElement('div');
        stage.className = 'seq-stage';
        host.appendChild(head);
        host.appendChild(stage);

        /* Ein unsichtbares Fragment je Schritt ab dem zweiten: Schritt 1 steht
           beim Öffnen der Folie schon da, jeder Klick schaltet eines weiter. */
        var frags = [];
        for (var i = 1; i < steps.length; i++){
          var f = d.createElement('span');
          f.className = 'fragment seq-f';
          f.setAttribute('data-fragment-index', i - 1);
          host.appendChild(f);
          frags.push(f);
        }

        var seq = { host: host, steps: steps, head: head, stage: stage, frags: frags,
                    timeMode: timeMode, why: why, cur: 0 };
        all.push(seq);
        render(seq);
        fillOrderQuiz(seq);
      }

      function goto(seq, i){
        var idx = deck.getIndices();
        deck.slide(idx.h, idx.v, i - 1);   // Schritt 1 = "kein Fragment gezeigt"
      }

      function drawRail(seq){
        var h = seq.head; h.innerHTML = '';
        seq.steps.forEach(function(s, i){
          if (i){
            var seg = d.createElement('div');
            seg.className = 'seq-seg' + (i <= seq.cur ? ' done' : '');
            h.appendChild(seg);
          }
          var b = d.createElement('button');
          b.type = 'button';
          b.className = 'seq-dot' + (i < seq.cur ? ' done' : (i === seq.cur ? ' now' : ''));
          b.textContent = i + 1;
          b.setAttribute('aria-label', 'Schritt ' + (i + 1) + ': ' + (s.title || ''));
          b.addEventListener('mousedown', function(e){ e.preventDefault(); });
          b.addEventListener('click', function(e){ e.stopPropagation(); goto(seq, i); b.blur(); });
          h.appendChild(b);
        });
      }

      function drawAxis(seq){
        var h = seq.head; h.innerHTML = '';
        var vals = seq.steps.map(function(s){ return s.t; });
        var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
        var span = (max - min) || 1;
        var pos = function(v){ return 3 + ((v - min) / span) * 94; };
        var axis = d.createElement('div'); axis.className = 'seq-axis'; h.appendChild(axis);
        var fill = d.createElement('div'); fill.className = 'seq-fill';
        fill.style.width = pos(seq.steps[seq.cur].t) + '%'; h.appendChild(fill);
        seq.steps.forEach(function(s, i){
          var b = d.createElement('button');
          b.type = 'button';
          b.className = 'seq-pt' + (i < seq.cur ? ' done' : (i === seq.cur ? ' now' : ''));
          b.style.left = pos(s.t) + '%';
          b.setAttribute('aria-label', (s.cap || '') + ': ' + (s.title || ''));
          b.addEventListener('mousedown', function(e){ e.preventDefault(); });
          b.addEventListener('click', function(e){ e.stopPropagation(); goto(seq, i); b.blur(); });
          h.appendChild(b);
          if (s.cap){
            var cap = d.createElement('div');
            cap.className = 'seq-cap ' + (i % 2 ? 'dn' : 'up') + (i === seq.cur ? ' now' : '');
            cap.style.left = pos(s.t) + '%';
            cap.textContent = s.cap;
            h.appendChild(cap);
          }
        });
      }

      function render(seq){
        if (seq.timeMode) drawAxis(seq); else drawRail(seq);
        var s = seq.steps[seq.cur];
        var html = '';
        if (s.title) html += '<div class="t">' + s.title + '</div>';
        html += '<div class="d">' + s.desc;
        if (s.why && seq.why === 'dots') html += '<button type="button" class="seq-dots" aria-label="Begründung anzeigen">&#8230;</button>';
        html += '</div>';
        if (s.why && seq.why === 'open') html += '<div class="w">' + s.why + '</div>';
        seq.stage.innerHTML = html;
        var btn = seq.stage.querySelector('.seq-dots');
        if (btn){
          btn.addEventListener('mousedown', function(e){ e.preventDefault(); });
          btn.addEventListener('click', function(e){
            e.stopPropagation();
            btn.parentNode.removeChild(btn);
            var w = d.createElement('div'); w.className = 'w'; w.innerHTML = s.why;
            seq.stage.appendChild(w);
          });
        }
      }

      /* Aus demselben Ablauf die Reihenfolge-Frage füllen:
         <div class="quiz" data-type="order" data-seq="#ablauf-dk"></div>
         Läuft vor dem Quiz-Plugin, deshalb steht das Markup rechtzeitig. */
      function fillOrderQuiz(seq){
        var id = seq.host.getAttribute('id');
        if (!id) return;
        [].forEach.call(d.querySelectorAll('.quiz[data-seq="#' + id + '"]'), function(q){
          if (q.querySelector('.quiz-options')) return;
          var box = d.createElement('div');
          box.className = 'quiz-options';
          seq.steps.forEach(function(s, i){
            var b = d.createElement('button');
            b.className = 'quiz-opt';
            b.setAttribute('data-order', i + 1);
            b.innerHTML = s.title || s.desc;
            box.appendChild(b);
          });
          q.appendChild(box);
        });
      }

      function sync(){
        all.forEach(function(seq){
          var shown = 0;
          seq.frags.forEach(function(f){ if (f.classList.contains('visible')) shown++; });
          if (shown !== seq.cur){ seq.cur = shown; render(seq); }
        });
      }

      function run(){
        [].forEach.call(d.querySelectorAll('.sequence'), build);
        sync();
      }

      run();
      if (deck.on){
        deck.on('ready', run);
        deck.on('slidechanged', function(){ run(); });
        deck.on('fragmentshown', sync);
        deck.on('fragmenthidden', sync);
      }

      Plugin.rebuild = run;
    }
  };


export default Plugin;
