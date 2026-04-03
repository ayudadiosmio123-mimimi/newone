// ═══════════════════════════════════════════════════════
//  EmprendeTributario MX — Asistente Inteligente
//  3-layer validation: JSON check → Main model → Validator
// ═══════════════════════════════════════════════════════

(function () {

  // ─────────────────────────────────────────────────────
  //  CONFIG  ← paste your OpenRouter key here
  // ─────────────────────────────────────────────────────
    var CFG = {
    API_KEY:         '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',
    // Updated 2026 stable free models
    MAIN_MODEL:      'google/gemma-3-27b-it:free', 
    VALIDATOR_MODEL: 'meta-llama/llama-3.2-3b-instruct:free',
    API_URL:         'https://openrouter.ai/api/v1/chat/completions',
    MAX_TOKENS:      600,
    SCORE_THRESHOLD: 1
    };

  // ─────────────────────────────────────────────────────
  //  LAYER 1 — Topic validation data (JSON)
  //  Score: each keyword hit = +1. If total >= SCORE_THRESHOLD → pass.
  //  If ANY hard_block keyword found → instant reject regardless of score.
  // ─────────────────────────────────────────────────────
  var TOPIC_DATA = {

    // Keywords that strongly indicate an on-topic question (ES + EN)
    allowed_keywords: [
      // Fiscal / Tax
      'rfc','sat','curp','impuesto','isr','iva','cfdi','cff','resico','régimen','regimen',
      'fiscal','tributari','contribuy','declaraci','factura','pac','buzón','buzon',
      'deduc','retenci','retencion','contabilidad','e.firma','efirma','sello digital',
      'csd','rmf','evasion','evasión','fraude fiscal','art.','artículo','articulo',
      'persona física','persona moral','sa de cv','sociedad','constituci',
      'obligacion','obligación','pago provisional','annual','anual','mensual',
      'plataforma digital','625','626','612','601','zona fronteriza','piedras negras',
      'tax','taxes','tax law','mexican tax','invoice','income tax','vat',
      'taxpayer','fiscal regime','tax culture','sat portal','tax authority',
      // Emprendimiento / Entrepreneurship
      'emprender','emprendedor','emprendimiento','negocio','empresa','startup',
      'plan de negocio','validar','validación','mercado','competencia','cliente',
      'producto','servicio','ingresos','gastos','rentabilidad','financiamiento',
      'crédito','credito','formalizar','formalización','registro','constituir',
      'socio','contrato','licitación','licitacion','pyme','freelance','autoempleo',
      'idea de negocio','análisis de mercado','analisis de mercado','modelo de negocio',
      'entrepreneurship','business','startup','revenue','market','competitor',
      'formalize','register','income','expenses','profit','partner','contract',
      // UAdeC context
      'uadec','administracion','administración','contabilidad','derecho',
      'egresado','estudiante','universidad','facultad','tesis','milly','rocha'
    ],

    // If any of these appear → reject immediately (off-topic hard block)
    hard_block: [
      'receta','cocina','futbol','fútbol','deporte','película','pelicula',
      'cancion','canción','música','musica','chiste','amor','relación','relacion',
      'videojuego','juego','game','sport','movie','recipe','music','song',
      'weather','clima','tiempo','noticias ajenas','política ajena'
    ],

    // Friendly off-topic reply (shown immediately, no API call)
    off_topic_reply:
      'Lo siento, solo puedo ayudarte con temas de <strong>emprendimiento</strong> ' +
      'y <strong>cultura tributaria en México</strong>. 😊<br><br>' +
      '¿Tienes alguna pregunta sobre el SAT, RFC, RESICO, CFDI o cómo formalizar tu negocio?',

    // Fallback when validator rejects the main model response
    validation_fail_reply:
      'No pude generar una respuesta adecuada para esa pregunta. ' +
      'Por favor intenta reformularla enfocándote en <strong>emprendimiento</strong> ' +
      'o <strong>obligaciones fiscales en México</strong>.'
  };

  // ─────────────────────────────────────────────────────
  //  SYSTEM PROMPT — sent to main model every request
  // ─────────────────────────────────────────────────────
  var SYSTEM_PROMPT =
    'Eres el Asistente Inteligente de EmprendeTributario MX, ' +
    'tesis de Milly Rocha, UAdeC, Facultad de Administración, Contabilidad y Derecho, ' +
    'Piedras Negras, Coahuila, México, 2026. ' +
    'Eres amable, profesional y motivador.\n\n' +

    'REGLA ABSOLUTA: Solo responde preguntas sobre:\n' +
    '- Emprendimiento en México (validar ideas, mercado, plan de negocio, formalización).\n' +
    '- Cultura tributaria y leyes fiscales mexicanas (RFC, RESICO, IVA, CFDI, SAT, etc.).\n' +
    'Si la pregunta es ajena a estos temas, responde EXACTAMENTE:\n' +
    '"FUERA_DE_TEMA"\n' +
    'No añadas nada más.\n\n' +

    'CONOCIMIENTO FISCAL CLAVE:\n' +
    '- RFC: art. 27 CFF — inscripción en 30 días naturales.\n' +
    '- RESICO (626): ISR 1%–2.5%, hasta $3.5 M anuales, personas físicas.\n' +
    '- Régimen 601: ISR 30% personas morales (SA de C.V.).\n' +
    '- Régimen 612: profesionistas independientes (contadores, abogados).\n' +
    '- Régimen 625: plataformas digitales, apps, creadores de contenido.\n' +
    '- CFDI: arts. 29 y 29-A CFF — obligatorio, requiere PAC.\n' +
    '- IVA: 16% general; 8% en Piedras Negras (zona fronteriza).\n' +
    '- Evasión fiscal: art. 108 CFF — delito grave.\n' +
    '- RMF 2026: CFDI deben amparar operaciones reales.\n\n' +

    'ESTILO:\n' +
    '- Responde en español salvo que el usuario escriba en inglés.\n' +
    '- Sé conciso, claro y usa **negritas** para términos clave.\n' +
    '- NUNCA sugieras evasión fiscal.';

  // ─────────────────────────────────────────────────────
  //  VALIDATOR PROMPT — sent to validator model
  // ─────────────────────────────────────────────────────
  var VALIDATOR_PROMPT =
    'You are a strict content validator. ' +
    'A user asked a question about Mexican taxes or entrepreneurship, ' +
    'and an AI provided a response. ' +
    'Your job: decide if the response is appropriate, on-topic, and helpful. ' +
    'Reply with ONLY one word: VALID or INVALID. ' +
    'Reply INVALID if the response: contains harmful info, suggests tax evasion, ' +
    'is completely off-topic, or is empty/incoherent. ' +
    'Reply VALID otherwise. No other words.';

  // ─────────────────────────────────────────────────────
  //  0. Font Awesome
  // ─────────────────────────────────────────────────────
  if (!document.getElementById('fa-cdn')) {
    var fa = document.createElement('link');
    fa.id  = 'fa-cdn'; fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
    document.head.appendChild(fa);
  }

  // ─────────────────────────────────────────────────────
  //  1. Styles
  // ─────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#cb-btn{position:fixed;bottom:28px;right:28px;z-index:9000;width:60px;height:60px;',
    'border-radius:50%;background:#0D1B2A;border:2px solid #C9A84C;color:#C9A84C;',
    'font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;',
    'box-shadow:0 6px 24px rgba(0,0,0,0.45);transition:transform .2s,background .2s;}',
    '#cb-btn:hover{transform:scale(1.09);background:#1A2E44;}',
    '#cb-dot{position:absolute;top:3px;right:3px;width:13px;height:13px;',
    'background:#C9A84C;border-radius:50%;border:2px solid #0D1B2A;}',

    '#cb-box{position:fixed;bottom:104px;right:28px;z-index:8999;width:380px;height:520px;',
    'border-radius:14px;background:#0f172a;border:1px solid rgba(201,168,76,0.5);',
    'display:flex;flex-direction:column;overflow:hidden;',
    'box-shadow:0 12px 48px rgba(0,0,0,0.55);font-family:"Source Sans 3",Arial,sans-serif;',
    'transform:scale(0.9) translateY(16px);opacity:0;pointer-events:none;',
    'transition:transform .25s cubic-bezier(.34,1.3,.64,1),opacity .22s ease;}',
    '#cb-box.cb-open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}',

    '#cb-head{background:#0D1B2A;border-bottom:1px solid rgba(201,168,76,0.3);',
    'padding:14px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0;}',
    '#cb-avatar{width:42px;height:42px;border-radius:50%;background:rgba(201,168,76,0.1);',
    'border:1px solid rgba(201,168,76,0.35);display:flex;align-items:center;',
    'justify-content:center;color:#C9A84C;font-size:18px;flex-shrink:0;}',
    '#cb-head-title{font-size:14px;font-weight:700;color:#C9A84C;line-height:1.25;}',
    '#cb-head-sub{font-size:11px;color:rgba(255,255,255,0.4);margin-top:3px;',
    'display:flex;align-items:center;gap:5px;}',
    '#cb-online-dot{width:7px;height:7px;background:#22c55e;border-radius:50%;display:inline-block;}',
    '#cb-close{margin-left:auto;background:none;border:none;color:rgba(255,255,255,0.35);',
    'font-size:16px;cursor:pointer;width:32px;height:32px;',
    'display:flex;align-items:center;justify-content:center;border-radius:50%;',
    'transition:background .15s,color .15s;}',
    '#cb-close:hover{background:rgba(255,255,255,0.08);color:#C9A84C;}',

    '#cb-msgs{flex:1;overflow-y:auto;padding:16px 14px;display:flex;',
    'flex-direction:column;gap:8px;}',
    '#cb-msgs::-webkit-scrollbar{width:4px;}',
    '#cb-msgs::-webkit-scrollbar-thumb{background:#1A2E44;border-radius:2px;}',

    '.cb-msg-bot{align-self:flex-start;max-width:86%;background:#1a2235;',
    'border:1px solid #1e3a5f;color:#e2e8f0;padding:10px 14px;',
    'border-radius:4px 14px 14px 14px;font-size:13.5px;line-height:1.65;word-break:break-word;}',
    '.cb-msg-bot strong,.cb-msg-bot b{color:#C9A84C;}',
    '.cb-msg-user{align-self:flex-end;max-width:80%;',
    'background:linear-gradient(135deg,#1d4ed8,#1e40af);color:#dbeafe;',
    'padding:10px 14px;border-radius:14px 4px 14px 14px;',
    'font-size:13.5px;line-height:1.65;word-break:break-word;}',
    '.cb-time{font-size:10px;color:rgba(255,255,255,0.2);text-align:center;user-select:none;}',

    '.cb-typing{display:flex;gap:5px;padding:3px 0;align-items:center;}',
    '.cb-dot-anim{width:7px;height:7px;background:#C9A84C;border-radius:50%;',
    'animation:cbBlink 1.3s infinite;opacity:0.7;}',
    '.cb-dot-anim:nth-child(2){animation-delay:.22s;}',
    '.cb-dot-anim:nth-child(3){animation-delay:.44s;}',
    '@keyframes cbBlink{0%,60%,100%{transform:translateY(0);opacity:.7;}',
    '30%{transform:translateY(-5px);opacity:1;}}',

    '#cb-foot{padding:10px 12px 13px;border-top:1px solid #1A2E44;',
    'background:#0D1B2A;flex-shrink:0;}',
    '#cb-input-row{display:flex;gap:8px;align-items:flex-end;background:#1a2235;',
    'border:1px solid #243047;border-radius:10px;padding:9px 12px;transition:border-color .2s;}',
    '#cb-input-row:focus-within{border-color:#C9A84C;}',
    '#cb-textarea{flex:1;background:transparent;border:none;outline:none;color:#f1f5f9;',
    'font-size:13.5px;resize:none;max-height:80px;line-height:1.45;font-family:inherit;}',
    '#cb-textarea::placeholder{color:#475569;}',
    '#cb-send{width:36px;height:36px;background:#C9A84C;border:none;border-radius:8px;',
    'cursor:pointer;color:#0D1B2A;font-size:14px;flex-shrink:0;',
    'display:flex;align-items:center;justify-content:center;',
    'transition:background .2s,transform .15s;}',
    '#cb-send:hover{background:#E8CC7A;transform:scale(1.06);}',
    '#cb-send:active{transform:scale(0.95);}',
    '#cb-send:disabled{opacity:0.45;cursor:not-allowed;transform:none;}',
    '#cb-footer-note{text-align:center;font-size:10px;color:#2a4a6a;margin-top:8px;letter-spacing:.02em;}',
    '#cb-layer-badge{font-size:9px;color:#2a4a6a;text-align:center;margin-top:4px;letter-spacing:.03em;}',
    '@media(max-width:440px){#cb-box{width:calc(100vw - 24px);right:12px;height:480px;}',
    '#cb-btn{right:12px;bottom:16px;}}'
  ].join('');
  document.head.appendChild(style);

  // ─────────────────────────────────────────────────────
  //  2. HTML
  // ─────────────────────────────────────────────────────
  var btn = document.createElement('button');
  btn.id = 'cb-btn';
  btn.setAttribute('aria-label', 'Abrir asistente');
  btn.innerHTML = '<i class="fa-solid fa-comments"></i><span id="cb-dot"></span>';

  var box = document.createElement('div');
  box.id  = 'cb-box';
  box.innerHTML =
    '<div id="cb-head">' +
      '<div id="cb-avatar"><i class="fa-solid fa-scale-balanced"></i></div>' +
      '<div>' +
        '<div id="cb-head-title">Asistente EmprendeTributario</div>' +
        '<div id="cb-head-sub"><span id="cb-online-dot"></span> En línea &nbsp;·&nbsp; UAdeC 2026</div>' +
      '</div>' +
      '<button id="cb-close" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>' +
    '</div>' +
    '<div id="cb-msgs"></div>' +
    '<div id="cb-foot">' +
      '<div id="cb-input-row">' +
        '<textarea id="cb-textarea" placeholder="Escribe tu pregunta..." rows="1"></textarea>' +
        '<button id="cb-send" aria-label="Enviar"><i class="fa-solid fa-paper-plane"></i></button>' +
      '</div>' +
      '<div id="cb-footer-note">' +
        '<i class="fa-solid fa-lock" style="font-size:9px;margin-right:3px;"></i>' +
        'Milly Rocha &nbsp;·&nbsp; UAdeC &nbsp;·&nbsp; Piedras Negras &nbsp;·&nbsp; 2026' +
      '</div>' +
      '<div id="cb-layer-badge">' +
        '<i class="fa-solid fa-shield-halved" style="font-size:9px;margin-right:3px;"></i>' +
        'Validación en 3 capas activa' +
      '</div>' +
    '</div>';

  document.body.appendChild(btn);
  document.body.appendChild(box);

  // ─────────────────────────────────────────────────────
  //  3. References & state
  // ─────────────────────────────────────────────────────
  var msgs      = document.getElementById('cb-msgs');
  var textarea  = document.getElementById('cb-textarea');
  var sendBtn   = document.getElementById('cb-send');
  var closeBtn  = document.getElementById('cb-close');
  var dot       = document.getElementById('cb-dot');
  var history   = [];   // conversation history for main model
  var busy      = false;
  var isOpen    = false;
  var welcomed  = false;

  // ─────────────────────────────────────────────────────
  //  4. Open / close
  // ─────────────────────────────────────────────────────
  function openChat() {
    isOpen = true;
    box.classList.add('cb-open');
    dot.style.display = 'none';
    setTimeout(function () { textarea.focus(); }, 260);
  }
  function closeChat() {
    isOpen = false;
    box.classList.remove('cb-open');
  }
  btn.addEventListener('click', function () {
    if (!isOpen) { showWelcome(); openChat(); } else closeChat();
  });
  closeBtn.addEventListener('click', closeChat);

  // ─────────────────────────────────────────────────────
  //  5. UI helpers
  // ─────────────────────────────────────────────────────
  function timeLabel() {
    var d = new Date();
    return ('0'+d.getHours()).slice(-2) + ':' + ('0'+d.getMinutes()).slice(-2);
  }

  function addBotMsg(html) {
    var div = document.createElement('div');
    div.className = 'cb-msg-bot';
    div.innerHTML = html;
    msgs.appendChild(div);
    addTime('<i class="fa-solid fa-robot" style="font-size:9px;opacity:.4;margin-right:3px;"></i>' + timeLabel());
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function addUserMsg(text) {
    var div = document.createElement('div');
    div.className = 'cb-msg-user';
    div.textContent = text;
    msgs.appendChild(div);
    addTime(timeLabel() + ' <i class="fa-solid fa-check-double" style="font-size:9px;opacity:.4;margin-left:3px;"></i>');
    msgs.scrollTop = msgs.scrollHeight;
  }

  function addTime(html) {
    var t = document.createElement('div');
    t.className = 'cb-time';
    t.innerHTML = html;
    msgs.appendChild(t);
  }

  function showTyping() {
    var wrap = document.createElement('div');
    wrap.id = 'cb-typing-wrap';
    wrap.className = 'cb-msg-bot';
    wrap.innerHTML =
      '<div class="cb-typing">' +
        '<div class="cb-dot-anim"></div>' +
        '<div class="cb-dot-anim"></div>' +
        '<div class="cb-dot-anim"></div>' +
      '</div>';
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('cb-typing-wrap');
    if (el) el.remove();
  }

  // ─────────────────────────────────────────────────────
  //  6. Welcome
  // ─────────────────────────────────────────────────────
  function showWelcome() {
    if (welcomed) return;
    welcomed = true;
    addBotMsg(
      '<i class="fa-solid fa-hand-wave" style="color:#C9A84C;margin-right:6px;"></i>' +
      '¡Hola! Bienvenido al <strong>Asistente EmprendeTributario MX</strong>.<br><br>' +
      'Estoy aquí para resolver tus dudas sobre <strong>emprendimiento</strong> y ' +
      '<strong>cultura tributaria en México</strong>.<br><br>' +
      '<i class="fa-solid fa-circle-check" style="color:#C9A84C;margin-right:5px;"></i>' +
      '¿En qué puedo ayudarte hoy?'
    );
  }

  // ─────────────────────────────────────────────────────
  //  LAYER 1 — Local JSON keyword score
  //  Returns { pass: bool, reason: string }
  // ─────────────────────────────────────────────────────
  function layer1_jsonCheck(text) {
    var lower = text.toLowerCase();

    // Hard block check first
    for (var i = 0; i < TOPIC_DATA.hard_block.length; i++) {
      if (lower.indexOf(TOPIC_DATA.hard_block[i]) !== -1) {
        return { pass: false, reason: 'hard_block:' + TOPIC_DATA.hard_block[i] };
      }
    }

    // Keyword score
    var score = 0;
    for (var j = 0; j < TOPIC_DATA.allowed_keywords.length; j++) {
      if (lower.indexOf(TOPIC_DATA.allowed_keywords[j]) !== -1) {
        score++;
      }
    }

    if (score >= CFG.SCORE_THRESHOLD) {
      return { pass: true, reason: 'score:' + score };
    }

    // Very short messages (greetings, etc.) pass through to the main model
    // because the system prompt itself will handle them
    if (text.trim().split(' ').length <= 4) {
      return { pass: true, reason: 'short_message' };
    }

    return { pass: false, reason: 'score_too_low:' + score };
  }

  // ─────────────────────────────────────────────────────
  //  LAYER 2 — Main model API call
  //  Returns response string or 'FUERA_DE_TEMA'
  // ─────────────────────────────────────────────────────
    function layer2_mainModel(userText) {
    var messages = [{ role: 'system', content: SYSTEM_PROMPT }]
      .concat(history)
      .concat([{ role: 'user', content: userText }]);

    return fetch(CFG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CFG.API_KEY,
        'HTTP-Referer': 'http://localhost:5500', // Tells OpenRouter where the request is from
        'X-Title': 'EmprendeTributario MX'        // Name of your University Project
      },
      body: JSON.stringify({
        model: CFG.MAIN_MODEL,
        messages: messages,
        max_tokens: CFG.MAX_TOKENS
      })
    })
    .then(function (r) { 
      // If the provider is down, this will catch the error before parsing JSON
      if (!r.ok) return r.json().then(err => { throw new Error(err.error.message || 'Provider Error'); });
      return r.json(); 
    })
    .then(function (data) {
      if (data.error) throw new Error(data.error.message);
      var reply = '';
      if (data.choices && data.choices[0] && data.choices[0].message) {
        reply = data.choices[0].message.content || '';
      }
      return reply.trim();
    });
  }

  // ─────────────────────────────────────────────────────
  //  LAYER 3 — Validator model
  //  Returns true (valid) or false (invalid)
  // ─────────────────────────────────────────────────────
  function layer3_validate(userText, botReply) {
    var validatorMessages = [
      { role: 'system', content: VALIDATOR_PROMPT },
      {
        role: 'user',
        content:
          'User question: "' + userText + '"\n\n' +
          'AI response: "' + botReply + '"\n\n' +
          'Is this response VALID or INVALID? Reply with one word only.'
      }
    ];

    return fetch(CFG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CFG.API_KEY,
        'HTTP-Referer': 'http://localhost:5500',
        'X-Title': 'EmprendeTributario Validator'
      },
      body: JSON.stringify({
        model: CFG.VALIDATOR_MODEL,
        messages: validatorMessages,
        max_tokens: 10
      })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) return true; // if validator fails, trust main model
      var verdict = '';
      if (data.choices && data.choices[0] && data.choices[0].message) {
        verdict = (data.choices[0].message.content || '').trim().toUpperCase();
      }
      return verdict.indexOf('VALID') !== -1;
    })
    .catch(function () {
      return true; // validator error → trust main model
    });
  }

  // ─────────────────────────────────────────────────────
  //  Format reply: convert **bold** and newlines to HTML
  // ─────────────────────────────────────────────────────
  function formatReply(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  // ─────────────────────────────────────────────────────
  //  7. Main send flow (3 layers)
  // ─────────────────────────────────────────────────────
  function sendMessage() {
    var text = textarea.value.trim();
    if (!text || busy) return;

    busy = true;
    sendBtn.disabled = true;
    textarea.value = '';
    textarea.style.height = 'auto';

    addUserMsg(text);
    showTyping();

    // ── LAYER 1: local JSON check ──
    var l1 = layer1_jsonCheck(text);

    if (!l1.pass) {
      hideTyping();
      addBotMsg(
        '<i class="fa-solid fa-circle-xmark" style="color:#f87171;margin-right:6px;"></i>' +
        TOPIC_DATA.off_topic_reply
      );
      resetInput();
      return;
    }

    // ── LAYER 2: main model ──
    layer2_mainModel(text)
      .then(function (reply) {

        // If main model itself decided it's off-topic
        if (reply === 'FUERA_DE_TEMA' || reply === '') {
          hideTyping();
          addBotMsg(
            '<i class="fa-solid fa-circle-xmark" style="color:#f87171;margin-right:6px;"></i>' +
            TOPIC_DATA.off_topic_reply
          );
          resetInput();
          return;
        }

        // ── LAYER 3: validator ──
        layer3_validate(text, reply)
          .then(function (isValid) {
            hideTyping();

            if (!isValid) {
              addBotMsg(
                '<i class="fa-solid fa-triangle-exclamation" style="color:#fbbf24;margin-right:6px;"></i>' +
                TOPIC_DATA.validation_fail_reply
              );
            } else {
              // All layers passed — show response
              addBotMsg(
                '<i class="fa-solid fa-circle-check" style="color:#C9A84C;margin-right:6px;font-size:11px;"></i>' +
                formatReply(reply)
              );
              // Save to history for context
              history.push({ role: 'user',      content: text  });
              history.push({ role: 'assistant', content: reply });
              // Keep history manageable (last 10 exchanges = 20 messages)
              if (history.length > 20) history = history.slice(history.length - 20);
            }
            resetInput();
          });
      })
      .catch(function (err) {
        hideTyping();
        addBotMsg(
          '<i class="fa-solid fa-wifi" style="color:#f87171;margin-right:6px;"></i>' +
          'Error de conexión. Verifica tu clave de API o intenta de nuevo.<br>' +
          '<small style="opacity:.6;font-size:11px;">' + (err.message || '') + '</small>'
        );
        resetInput();
      });
  }

  function resetInput() {
    busy = false;
    sendBtn.disabled = false;
    textarea.focus();
  }

  // ─────────────────────────────────────────────────────
  //  8. Input listeners
  // ─────────────────────────────────────────────────────
  sendBtn.addEventListener('click', sendMessage);

  textarea.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  textarea.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 80) + 'px';
  });

})();