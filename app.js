// ── Section navigation ──
const sectionMap = { inicio: 0, cultura: 1, fiscal: 2, emprendimiento: 3, guia: 4 };

function show(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-link')[sectionMap[id]].classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Accordion ──
function toggleAcc(header) {
  const body  = header.nextElementSibling;
  const arrow = header.querySelector('.acc-arrow');
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  arrow.classList.toggle('open', !isOpen);
}

// ── Career tabs ──
function showCarrera(id, tab) {
  document.querySelectorAll('.carrera-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ctab').forEach(t => t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  tab.classList.add('active');
}