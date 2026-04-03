// ── Chatbot UI ──
// Injects the floating button + chat window into the page.
// AI response logic will be added in the next step.

(function () {

  // ── 1. Inject styles ──
  const style = document.createElement('style');
  style.textContent = `
    /* Floating button */
    #cb-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9000;
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: #0D1B2A;
      border: 2px solid #C9A84C;
      color: #C9A84C;
      font-size: 22px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 18px rgba(0,0,0,0.35);
      transition: transform 0.2s, background 0.2s;
    }
    #cb-btn:hover { transform: scale(1.08); background: #1A2E44; }

    /* Notification dot */
    #cb-dot {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 11px;
      height: 11px;
      background: #C9A84C;
      border-radius: 50%;
      border: 2px solid #0D1B2A;
      display: block;
    }

    /* Chat window */
    #cb-box {
      position: fixed;
      bottom: 90px;
      right: 24px;
      z-index: 8999;
      width: 320px;
      max-height: 460px;
      border-radius: 10px;
      background: #0f172a;
      border: 1px solid #C9A84C;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.45);
      font-family: 'Source Sans 3', Arial, sans-serif;
      transform: scale(0.92) translateY(12px);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.22s ease, opacity 0.22s ease;
    }
    #cb-box.cb-open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    /* Header */
    #cb-head {
      background: #0D1B2A;
      border-bottom: 1px solid #C9A84C;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    #cb-head-icon { font-size: 20px; }
    #cb-head-title {
      font-size: 13px;
      font-weight: 600;
      color: #C9A84C;
      line-height: 1.2;
    }
    #cb-head-sub {
      font-size: 10px;
      color: rgba(255,255,255,0.45);
      margin-top: 1px;
    }
    #cb-close {
      margin-left: auto;
      background: none;
      border: none;
      color: rgba(255,255,255,0.45);
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 0 2px;
    }
    #cb-close:hover { color: #C9A84C; }

    /* Messages area */
    #cb-msgs {
      flex: 1;
      overflow-y: auto;
      padding: 12px 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    #cb-msgs::-webkit-scrollbar { width: 3px; }
    #cb-msgs::-webkit-scrollbar-thumb { background: #1A2E44; }

    /* Bubbles */
    .cb-msg-bot {
      align-self: flex-start;
      max-width: 88%;
      background: #1a2235;
      border: 1px solid #243047;
      color: #e2e8f0;
      padding: 8px 11px;
      border-radius: 3px 10px 10px 10px;
      font-size: 12.5px;
      line-height: 1.6;
      word-break: break-word;
    }
    .cb-msg-user {
      align-self: flex-end;
      max-width: 82%;
      background: #1d4ed8;
      color: #dbeafe;
      padding: 8px 11px;
      border-radius: 10px 3px 10px 10px;
      font-size: 12.5px;
      line-height: 1.6;
      word-break: break-word;
    }

    /* Typing dots */
    .cb-typing { display: flex; gap: 4px; padding: 2px 0; align-items: center; }
    .cb-dot {
      width: 6px; height: 6px;
      background: #C9A84C;
      border-radius: 50%;
      animation: cbBlink 1.2s infinite;
      opacity: 0.7;
    }
    .cb-dot:nth-child(2) { animation-delay: 0.2s; }
    .cb-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes cbBlink {
      0%,60%,100% { transform: translateY(0); }
      30%          { transform: translateY(-4px); }
    }

    /* Input row */
    #cb-foot {
      padding: 8px 10px 10px;
      border-top: 1px solid #1A2E44;
      background: #111827;
      flex-shrink: 0;
    }
    #cb-input-row {
      display: flex;
      gap: 7px;
      align-items: flex-end;
      background: #1a2235;
      border: 1px solid #243047;
      border-radius: 8px;
      padding: 7px 9px;
    }
    #cb-input-row:focus-within { border-color: #C9A84C; }
    #cb-textarea {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #f1f5f9;
      font-size: 12.5px;
      resize: none;
      max-height: 64px;
      line-height: 1.4;
      font-family: inherit;
    }
    #cb-textarea::placeholder { color: #475569; }
    #cb-send {
      width: 30px;
      height: 30px;
      background: #0D1B2A;
      border: 1px solid #C9A84C;
      border-radius: 7px;
      cursor: pointer;
      color: #C9A84C;
      font-size: 14px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #cb-send:hover { background: #1A2E44; }

    @media (max-width: 400px) {
      #cb-box { width: calc(100vw - 32px); right: 16px; }
      #cb-btn { right: 16px; bottom: 16px; }
    }
  `;
  document.head.appendChild(style);

  // ── 2. Build HTML ──
  const btn = document.createElement('button');
  btn.id = 'cb-btn';
  btn.setAttribute('aria-label', 'Abrir asistente');
  btn.innerHTML = '💼<span id="cb-dot"></span>';

  const box = document.createElement('div');
  box.id = 'cb-box';
  box.setAttribute('aria-label', 'Ventana de chat');
  box.innerHTML = `
    <div id="cb-head">
      <div id="cb-head-icon">💼</div>
      <div>
        <div id="cb-head-title">Asistente EmprendeTributario</div>
        <div id="cb-head-sub">● En línea · UAdeC 2026</div>
      </div>
      <button id="cb-close" aria-label="Cerrar chat">✕</button>
    </div>
    <div id="cb-msgs"></div>
    <div id="cb-foot">
      <div id="cb-input-row">
        <textarea id="cb-textarea" placeholder="Escribe tu pregunta..." rows="1"></textarea>
        <button id="cb-send" aria-label="Enviar">➤</button>
      </div>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(box);

  // ── 3. References ──
  const msgs     = document.getElementById('cb-msgs');
  const textarea = document.getElementById('cb-textarea');
  const sendBtn  = document.getElementById('cb-send');
  const closeBtn = document.getElementById('cb-close');
  const dot      = document.getElementById('cb-dot');

  // ── 4. Open / close ──
  let isOpen = false;

  function openChat() {
    isOpen = true;
    box.classList.add('cb-open');
    dot.style.display = 'none';          // hide notification dot
    textarea.focus();
  }

  function closeChat() {
    isOpen = false;
    box.classList.remove('cb-open');
  }

  btn.addEventListener('click', function () {
    isOpen ? closeChat() : openChat();
  });
  closeBtn.addEventListener('click', closeChat);

  // ── 5. Welcome message (shown once) ──
  let welcomed = false;
  function showWelcome() {
    if (welcomed) return;
    welcomed = true;
    addBotMsg(
      '¡Hola! 👋 Bienvenido al <strong>Asistente EmprendeTributario MX</strong>.<br><br>' +
      'Estoy aquí para resolver tus dudas sobre <strong>emprendimiento</strong> y <strong>cultura tributaria en México</strong> 🇲🇽.<br><br>' +
      '¿En qué puedo ayudarte hoy?'
    );
  }

  // Show welcome as soon as chat opens for the first time
  btn.addEventListener('click', function () {
    if (!welcomed && !isOpen) showWelcome();
  }, { capture: true });  // fires before open/close toggle so message is ready

  // ── 6. Add messages ──
  function addBotMsg(html) {
    const div = document.createElement('div');
    div.className = 'cb-msg-bot';
    div.innerHTML = html;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function addUserMsg(text) {
    const div = document.createElement('div');
    div.className = 'cb-msg-user';
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  // ── 7. Send message (no AI yet — placeholder) ──
  function sendMessage() {
    const text = textarea.value.trim();
    if (!text) return;
    textarea.value = '';
    textarea.style.height = 'auto';
    addUserMsg(text);
    // AI response will be wired here in the next step
  }

  sendBtn.addEventListener('click', sendMessage);
  textarea.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  textarea.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 64) + 'px';
  });

})();