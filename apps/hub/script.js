const STATUS_LABEL = {
  planned: 'Planned',
  in_progress: 'In progress',
  live: 'Live',
};

const EFFORT_LABEL = { low: 'Low effort', medium: 'Medium effort', high: 'High effort' };
const WOW_LABEL = { low: 'Wow · low', medium: 'Wow · mid', high: 'Wow · high' };

function renderCard(proto) {
  // "in_progress" is clickable too as long as it has a real url (e.g. a local
  // dev server) — the badge still honestly says "In progress", it's just reachable.
  const isClickable = (proto.status === 'live' || proto.status === 'in_progress') && proto.url !== '#';
  const Tag = isClickable ? 'a' : 'div';

  const el = document.createElement(Tag);
  el.className = `card ${isClickable ? 'card--live' : 'card--disabled'}`;
  el.style.setProperty('--card-accent', proto.accent);
  if (isClickable) {
    el.href = proto.url; // same-tab navigation — the doc link below stays _blank
  }

  el.innerHTML = `
    <div class="card__top">
      <span class="card__icon">${proto.icon}</span>
      <span class="card__status ${proto.status === 'live' ? 'card__status--live' : ''}">${STATUS_LABEL[proto.status] ?? proto.status}</span>
    </div>
    <div class="card__body">
      <h2 class="card__title">${proto.title}</h2>
      <p class="card__subtitle">${proto.subtitle}</p>
      <p class="card__description">${proto.description}</p>
    </div>
    <ul class="card__stack">
      ${proto.stack.map((s) => `<li>${s}</li>`).join('')}
    </ul>
    <div class="card__footer">
      <span class="card__cta">${isClickable ? 'Open demo →' : 'Coming soon'}</span>
    </div>
  `;

  el.addEventListener('pointermove', (e) => {
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--y', `${e.clientY - rect.top}px`);
  });

  return el;
}

function renderIdeaCard(idea) {
  const el = document.createElement('article');
  el.className = `card card--idea${idea.recommended ? ' card--recommended' : ''}`;
  el.style.setProperty('--card-accent', idea.accent);

  el.innerHTML = `
    ${idea.image ? `<div class="card__preview"><img src="${idea.image}" alt="${idea.title} concept mockup" loading="lazy" /></div>` : ''}
    <div class="card__top">
      <span class="card__icon">${idea.icon}</span>
      <span class="card__status ${idea.recommended ? 'card__status--live' : ''}">
        ${idea.recommended ? 'Recommended' : 'Backlog'}
      </span>
    </div>
    <div class="card__body">
      <h2 class="card__title">${idea.title}</h2>
      <p class="card__subtitle">${idea.subtitle}</p>
      <p class="card__description">${idea.description}</p>
      <p class="card__why"><span>Why it sells</span>${idea.why}</p>
    </div>
    <ul class="card__stack card__stack--fit">
      ${idea.fit.map((f) => `<li>${f}</li>`).join('')}
    </ul>
    <ul class="card__stack">
      ${idea.stack.map((s) => `<li>${s}</li>`).join('')}
    </ul>
    <div class="card__footer">
      <span class="card__meta">${EFFORT_LABEL[idea.effort] ?? idea.effort}</span>
      <span class="card__meta">${WOW_LABEL[idea.wow] ?? idea.wow}</span>
    </div>
  `;

  el.addEventListener('pointermove', (e) => {
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--y', `${e.clientY - rect.top}px`);
  });

  return el;
}

function renderIdeas() {
  const meta = window.GAME_IDEAS_META;
  const hero = document.getElementById('ideas-hero');
  hero.innerHTML = `
    <p class="hero__eyebrow">${meta.eyebrow}</p>
    <h1 class="hero__title">${meta.title}</h1>
    <p class="hero__subtitle">${meta.subtitle}</p>
    <p class="hero__note">${meta.note}</p>
  `;

  const spectrum = document.getElementById('ideas-spectrum');
  spectrum.innerHTML = `
    <h2 class="spectrum__title">Capability spectrum</h2>
    <ul class="spectrum__list">
      ${meta.spectrum
        .map(
          (row) => `
        <li class="spectrum__item">
          <span class="spectrum__label">${row.label}</span>
          <span class="spectrum__items">${row.items}</span>
        </li>`,
        )
        .join('')}
    </ul>
  `;

  const ideas = [...window.GAME_IDEAS].sort((a, b) => Number(b.recommended) - Number(a.recommended));
  document.getElementById('ideas-grid').replaceChildren(...ideas.map(renderIdeaCard));
}

const TABS = ['prototypes', 'ideas', 'metrics'];

function setTab(tab) {
  if (!TABS.includes(tab)) tab = TABS[0];

  TABS.forEach((id) => {
    const panel = document.getElementById(`panel-${id}`);
    const btn = document.getElementById(`tab-${id}`);
    const isActive = id === tab;

    panel.hidden = !isActive;
    panel.classList.toggle('panel--hidden', !isActive);
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  const url = new URL(window.location.href);
  if (tab === TABS[0]) url.searchParams.delete('tab');
  else url.searchParams.set('tab', tab);
  window.history.replaceState({}, '', url);
}

function bindTabs() {
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => setTab(btn.dataset.tab));
  });
}

function render() {
  document.getElementById('grid').replaceChildren(...window.PROTOTYPES.map(renderCard));
  renderIdeas();
  bindTabs();

  setTab(new URLSearchParams(window.location.search).get('tab'));

  document.getElementById('footer-date').textContent = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

render();
