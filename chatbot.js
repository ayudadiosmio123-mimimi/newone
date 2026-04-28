// ═══════════════════════════════════════════════════════
//  EmprendeTributario MX — Asistente Inteligente v2
//  Architecture: single API call — model checks topic
//  AND answers in one shot. No local keyword layer.
// ═══════════════════════════════════════════════════════

(function () {

  // ─────────────────────────────────────────────────────
  //  CONFIG
  // ─────────────────────────────────────────────────────
  var first_part = 'sk-or-v1-'
  var second_part = '5ad2b442899bcb9c179df20f92bad63af2d1df0147787ece6089173550858396'
  var CFG = {
    API_KEY:    first_part + second_part,
    // Best free model for Spanish / multilingual knowledge (Apr 2026)
    // Alternatives if this hits rate limits:
    //   'meta-llama/llama-4-maverick:free'
    //   'meta-llama/llama-3.3-70b-instruct:free'
    //   'mistralai/mistral-small-3.1-24b-instruct:free'
    MODEL:      'nvidia/nemotron-3-super:free',
    API_URL:    'https://openrouter.ai/api/v1/chat/completions',
    MAX_TOKENS: 700,
    SITE_URL:   window.location.origin || 'http://localhost:5500',
    SITE_NAME:  'EmprendeTributario MX'
  };

  // ─────────────────────────────────────────────────────
  //  OFF-TOPIC reply shown to the user
  // ─────────────────────────────────────────────────────
  var OFF_TOPIC_MSG =
    'Lo siento, solo puedo ayudarte con temas de <strong>emprendimiento</strong> ' +
    'y <strong>cultura tributaria en México</strong>. 😊<br><br>' +
    '¿Tienes alguna pregunta sobre el SAT, RFC, RESICO, CFDI o cómo formalizar tu negocio?';

  // ─────────────────────────────────────────────────────
  //  SYSTEM PROMPT
  //  The model acts as topic-checker AND responder in one.
  //  If off-topic → it must return exactly: FUERA_DE_TEMA
  //  If on-topic  → it answers directly, no prefix needed.
  // ─────────────────────────────────────────────────────
  var SYSTEM_PROMPT =
    'Eres el Asistente Inteligente de EmprendeTributario MX, la plataforma de tesis de Milly Rocha (UAdeC). ' +
    'Tu objetivo es simular una conversación humana: sé cálido, profesional, empático y muy motivador.\n\n' +

    '── REGLA DE ORO DE FILTRADO ──\n' +
    'Antes de generar cualquier respuesta, clasifica la intención del usuario:\n' +
    '1. SALUDOS Y CORTESÍA: Si el usuario dice "Hola", "Gracias", "¿Quién eres?", o saludos similares, RESPONDE de forma amable y preséntate brevemente.\n' +
    '2. TEMAS PERMITIDOS: Impuestos en México (SAT, RFC, RESICO, IVA, ISR), emprendimiento, formalización de negocios, y dudas sobre esta plataforma de la UAdeC.\n' +
    '3. OTROS TEMAS: Si el usuario pregunta sobre recetas, deportes, política no fiscal, religión o cualquier tema ajeno a los puntos 1 y 2, RESPONDE ÚNICAMENTE CON:\n' +
    'FUERA_DE_TEMA\n\n' +

    '── PERSONALIDAD Y ESTILO (SIMULACIÓN HUMANA) ──\n' +
    '• No hables como un libro de leyes; habla como un mentor experto que quiere que al emprendedor le vaya bien.\n' +
    '• Usa frases como "¡Qué buena pregunta!", "Entiendo perfectamente tu duda", o "Emprender es un reto, pero aquí te ayudo".\n' +
    '• Usa **negritas** para resaltar conceptos clave.\n' +
    '• Si la pregunta es compleja, divídela en puntos fáciles de leer.\n\n' +

    '── CONOCIMIENTO EXPERTO (DATOS 2026) ──\n' +
    '• RFC: Obligatorio (art. 27 CFF) en los primeros 30 días de actividad.\n' +
    '• RESICO (626): El "rey" para nuevos emprendedores. ISR 1% al 2.5%, tope $3.5M anuales.\n' +
    '• Régimen 612: Para profesionistas (Contadores, Abogados) con gastos deducibles.\n' +
    '• Régimen 601: Para Sociedades (S.A. de C.V.) con ISR del 30%.\n' +
    '• IVA Fronterizo: 8% en Piedras Negras, Coahuila (estímulo zona norte).\n' +
    '• Facturación: Los CFDI deben seguir los arts. 29 y 29-A del CFF para ser válidos.\n' +
    '• e.firma: Tu "llave digital", vigencia de 4 años. ¡No dejes que venza!\n\n' +

    '── RESTRICCIÓN FINAL ──\n' +
    'Si detectas que el usuario intenta "engañarte" para hablar de otros temas, mantente firme y regresa al protocolo FUERA_DE_TEMA.';

  // ─────────────────────────────────────────────────────
  //  Conversation history (last 10 exchanges = 20 msgs)
  // ─────────────────────────────────────────────────────
  var history = [];

  // ─────────────────────────────────────────────────────
  //  0. Font Awesome
  // ─────────────────────────────────────────────────────
  if (!document.getElementById('fa-cdn')) {
    var fa = document.createElement('link');
    fa.id = 'fa-cdn'; fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
    document.head.appendChild(fa);
  }

  // ─────────────────────────────────────────────────────
  //  1. Styles (injected — no extra CSS file needed)
  // ─────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#cb-btn{position:fixed;bottom:28px;right:28px;z-index:99999;width:64px;height:64px;',
    'border-radius:50%;background:#ffffff;border:3px solid #C9A84C;color:#C9A84C;',
    'font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;',
    'box-shadow:0 6px 28px rgba(0,0,0,0.35);transition:transform .2s,box-shadow .2s;overflow:hidden;}',
    '#cb-btn:hover{transform:scale(1.09);box-shadow:0 8px 32px rgba(201,168,76,0.45);}',
    '#cb-dot{position:absolute;bottom:2px;right:2px;width:13px;height:13px;',
    'background:#C9A84C;border-radius:50%;border:2px solid #fff;}',

    '#cb-box{position:fixed;bottom:104px;right:28px;z-index:8999;width:380px;height:520px;',
    'border-radius:14px;background:#0f172a;border:1px solid rgba(201,168,76,0.5);',
    'display:flex;flex-direction:column;overflow:hidden;',
    'box-shadow:0 12px 48px rgba(0,0,0,0.55);font-family:"Source Sans 3",Arial,sans-serif;',
    'transform:scale(0.9) translateY(16px);opacity:0;pointer-events:none;',
    'transition:transform .25s cubic-bezier(.34,1.3,.64,1),opacity .22s ease;}',
    '#cb-box.cb-open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}',

    '#cb-head{background:#0D1B2A;border-bottom:1px solid rgba(201,168,76,0.3);',
    'padding:14px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0;}',
    '#cb-avatar{width:42px;height:42px;border-radius:50%;background:#ffffff;',
    'border:2px solid rgba(201,168,76,0.35);display:flex;align-items:center;',
    'justify-content:center;overflow:hidden;flex-shrink:0;}',
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

    '#cb-typing{align-self:flex-start;display:none;gap:5px;padding:10px 14px;',
    'background:#1a2235;border:1px solid #1e3a5f;border-radius:4px 14px 14px 14px;}',
    '#cb-typing span{width:7px;height:7px;background:#C9A84C;border-radius:50%;',
    'display:inline-block;animation:cb-bounce 1.2s ease-in-out infinite;}',
    '#cb-typing span:nth-child(2){animation-delay:.2s;}',
    '#cb-typing span:nth-child(3){animation-delay:.4s;}',
    '@keyframes cb-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}',

    '.cb-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}',
    '.cb-chip{background:rgba(201,168,76,0.08);color:#C9A84C;',
    'border:1px solid rgba(201,168,76,0.3);padding:4px 11px;border-radius:20px;',
    'font-size:11px;cursor:pointer;transition:background .15s;white-space:nowrap;}',
    '.cb-chip:hover{background:rgba(201,168,76,0.18);}',

    '#cb-footer{padding:10px 12px;border-top:1px solid rgba(201,168,76,0.15);',
    'background:#0D1B2A;display:flex;align-items:flex-end;gap:8px;flex-shrink:0;}',
    '#cb-input{flex:1;background:#1A2E44;border:1px solid rgba(201,168,76,0.25);',
    'color:#e2e8f0;border-radius:10px;padding:9px 12px;font-size:13px;resize:none;',
    'outline:none;max-height:80px;min-height:38px;line-height:1.5;font-family:inherit;',
    'transition:border-color .2s;}',
    '#cb-input:focus{border-color:rgba(201,168,76,0.55);}',
    '#cb-input::placeholder{color:rgba(255,255,255,0.25);}',
    '#cb-send{background:#C9A84C;border:none;color:#0D1B2A;width:36px;height:36px;',
    'border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;',
    'font-size:14px;transition:background .2s,transform .15s;flex-shrink:0;}',
    '#cb-send:hover:not(:disabled){background:#E8CC7A;transform:scale(1.08);}',
    '#cb-send:disabled{opacity:0.45;cursor:not-allowed;transform:none;}',

    '@media(max-width:600px){',
    '#cb-box{width:calc(100vw - 16px);right:8px;left:8px;bottom:calc(88px + env(safe-area-inset-bottom, 0px));height:calc(100vh - 160px);max-height:520px;z-index:99998;}',
    '#cb-btn{bottom:calc(20px + env(safe-area-inset-bottom, 0px));right:16px;width:62px;height:62px;z-index:99999;}}'
  ].join('');
  document.head.appendChild(style);

  // ─────────────────────────────────────────────────────
  //  2. Build DOM
  // ─────────────────────────────────────────────────────
  var btn = document.createElement('button');
  btn.id = 'cb-btn';
  btn.innerHTML = '<img src="media/Chatbot Linear Icon Chat Bot PNG Images, Instant, Headset, Sign PNG Transparent Background - Pngtree.jpg" alt="Asistente" style="width:52px;height:52px;object-fit:cover;border-radius:50%;display:block;"><span id="cb-dot"></span>';
  btn.setAttribute('aria-label', 'Abrir asistente');

  var box = document.createElement('div');
  box.id = 'cb-box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Asistente EmprendeTributario');
  box.innerHTML = [
    '<div id="cb-head">',
    '  <div id="cb-avatar"><img src="media/Chatbot Linear Icon Chat Bot PNG Images, Instant, Headset, Sign PNG Transparent Background - Pngtree.jpg" style="width:42px;height:42px;object-fit:cover;border-radius:50%;display:block;"></div>',
    '  <div>',
    '    <div id="cb-head-title">Asesor EmprendeTributario</div>',
    '    <div id="cb-head-sub"><span id="cb-online-dot"></span>En línea · SAT · Emprendimiento</div>',
    '  </div>',
    '  <button id="cb-close" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>',
    '</div>',
    '<div id="cb-msgs" role="log" aria-live="polite"></div>',
    '<div id="cb-footer">',
    '  <textarea id="cb-input" rows="1" placeholder="Escribe tu pregunta..." aria-label="Mensaje"></textarea>',
    '  <button id="cb-send" aria-label="Enviar"><i class="fa-solid fa-paper-plane"></i></button>',
    '</div>'
  ].join('');

  document.body.appendChild(btn);
  document.body.appendChild(box);

  var msgs    = document.getElementById('cb-msgs');
  var textarea = document.getElementById('cb-input');
  var sendBtn  = document.getElementById('cb-send');
  var busy     = false;

  // ─────────────────────────────────────────────────────
  //  3. Open / close
  // ─────────────────────────────────────────────────────
  btn.addEventListener('click', function () {
    var isOpen = box.classList.toggle('cb-open');
    btn.querySelector('img').style.opacity = isOpen ? '0.6' : '1';
    if (isOpen && msgs.children.length === 0) {
      showWelcome();
      textarea.focus();
    }
  });

  document.getElementById('cb-close').addEventListener('click', function () {
    box.classList.remove('cb-open');
    btn.querySelector('img').style.opacity = '1';
  });

  // ─────────────────────────────────────────────────────
  //  4. Welcome message with quick-start chips
  // ─────────────────────────────────────────────────────
  function showWelcome() {
    var now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    addTime(now);
    var el = document.createElement('div');
    el.className = 'cb-msg-bot';
    el.innerHTML =
      '¡Hola! 👋 Soy el asistente de <strong>EmprendeTributario MX</strong>.<br><br>' +
      'Puedo ayudarte con tus dudas sobre <strong>impuestos en México</strong>, ' +
      'el <strong>SAT</strong>, cómo <strong>formalizar tu negocio</strong> y mucho más.<br><br>' +
      '¿Por dónde quieres empezar?<br>' +
      '<div class="cb-chips">' +
        '<span class="cb-chip" onclick="cbChip(this)">¿Qué es el RESICO?</span>' +
        '<span class="cb-chip" onclick="cbChip(this)">¿Cómo obtengo mi RFC?</span>' +
        '<span class="cb-chip" onclick="cbChip(this)">¿Qué régimen elegir?</span>' +
        '<span class="cb-chip" onclick="cbChip(this)">¿Cómo emitir un CFDI?</span>' +
        '<span class="cb-chip" onclick="cbChip(this)">Ideas de negocio para egresados</span>' +
      '</div>';
    msgs.appendChild(el);
    scrollBottom();
  }

  // Chip click handler (global so onclick works)
  window.cbChip = function (el) {
    textarea.value = el.textContent;
    sendMessage();
  };

  // ─────────────────────────────────────────────────────
  //  5. Message helpers
  // ─────────────────────────────────────────────────────
  function addTime(t) {
    var el = document.createElement('div');
    el.className = 'cb-time';
    el.textContent = t;
    msgs.appendChild(el);
  }

  function addUserMsg(text) {
    var el = document.createElement('div');
    el.className = 'cb-msg-user';
    el.textContent = text;
    msgs.appendChild(el);
    scrollBottom();
  }

  function addBotMsg(html) {
    var el = document.createElement('div');
    el.className = 'cb-msg-bot';
    el.innerHTML = html;
    msgs.appendChild(el);
    scrollBottom();
  }

  var typingEl = null;
  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.id = 'cb-typing';
    typingEl.style.display = 'flex';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(typingEl);
    scrollBottom();
  }

  function hideTyping() {
    if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
    typingEl = null;
  }

  function scrollBottom() {
    msgs.scrollTop = msgs.scrollHeight;
  }

  // ─────────────────────────────────────────────────────
  //  6. Format reply: **bold** and newlines → HTML
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
  //  7. Single API call — model checks topic + answers
  // ─────────────────────────────────────────────────────
  function callModel(userText) {
    var messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    // Include conversation history for context
    history.forEach(function (m) { messages.push(m); });

    messages.push({ role: 'user', content: userText });

    return fetch(CFG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + CFG.API_KEY,
        'HTTP-Referer':  CFG.SITE_URL,
        'X-Title':       CFG.SITE_NAME
      },
      body: JSON.stringify({
        model:      CFG.MODEL,
        messages:   messages,
        max_tokens: CFG.MAX_TOKENS,
        temperature: 0.7
      })
    })
    .then(function (r) {
      if (!r.ok) return r.json().then(function (e) {
        throw new Error((e.error && e.error.message) || 'Error del proveedor');
      });
      return r.json();
    })
    .then(function (data) {
      if (data.error) throw new Error(data.error.message);
      var reply = '';
      if (data.choices && data.choices[0] && data.choices[0].message) {
        reply = (data.choices[0].message.content || '').trim();
      }
      return reply;
    });
  }

  // ─────────────────────────────────────────────────────
  //  8. Main send flow
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

    callModel(text)
      .then(function (reply) {
        hideTyping();

        // Model returned off-topic signal
        if (!reply || reply === 'FUERA_DE_TEMA') {
          addBotMsg(
            '<i class="fa-solid fa-circle-xmark" style="color:#f87171;margin-right:6px;"></i>' +
            OFF_TOPIC_MSG
          );
          resetInput();
          return;
        }

        // All good — show the answer
        addBotMsg(
          '<i class="fa-solid fa-circle-check" style="color:#C9A84C;margin-right:6px;font-size:11px;"></i>' +
          formatReply(reply)
        );

        // Save to history for multi-turn context
        history.push({ role: 'user',      content: text  });
        history.push({ role: 'assistant', content: reply });
        if (history.length > 20) history = history.slice(history.length - 20);

        resetInput();
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
  //  9. Input listeners
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
