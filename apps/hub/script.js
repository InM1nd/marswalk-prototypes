const STATUS_LABEL = {
  planned: 'Planned',
  in_progress: 'In progress',
  live: 'Live',
};

const EFFORT_LABEL = { low: 'Low effort', medium: 'Medium effort', high: 'High effort' };
const WOW_LABEL = { low: 'Wow · low', medium: 'Wow · mid', high: 'Wow · high' };

function renderCard(proto, index) {
  // "in_progress" is clickable too as long as it has a real url (e.g. a local
  // dev server) — the badge still honestly says "In progress", it's just reachable.
  const isClickable = (proto.status === 'live' || proto.status === 'in_progress') && proto.url !== '#';
  const Tag = isClickable ? 'a' : 'div';

  const el = document.createElement(Tag);
  el.className = `card ${isClickable ? 'card--live' : 'card--disabled'}`;
  if (isClickable) el.href = proto.url; // same-tab navigation

  const media = proto.image
    ? `<img src="${proto.image}" alt="${proto.title} demo screenshot" loading="lazy" />`
    : `<span class="card__placeholder" aria-hidden="true">${proto.icon}</span>`;

  el.innerHTML = `
    <div class="card__media">
      ${media}
      <span class="card__index">${String(index + 1).padStart(2, '0')}</span>
      <span class="card__status ${proto.status === 'live' ? 'card__status--live' : ''}">${STATUS_LABEL[proto.status] ?? proto.status}</span>
    </div>
    <div class="card__body">
      <p class="card__subtitle">${proto.subtitle}</p>
      <h3 class="card__title">${proto.title}</h3>
      <p class="card__description">${proto.description}</p>
    </div>
    <ul class="card__stack">
      ${proto.stack.map((s) => `<li>${s}</li>`).join('')}
    </ul>
    <div class="card__footer">
      <span class="card__cta">${isClickable ? 'Open demo <span aria-hidden="true">↗</span>' : 'Coming soon'}</span>
    </div>
  `;
  return el;
}

function renderIdeaCard(idea) {
  const el = document.createElement('article');
  el.className = `card card--idea${idea.recommended ? ' card--recommended' : ''}`;
  const status = idea.url ? 'Live' : idea.recommended ? 'Recommended' : 'Backlog';

  el.innerHTML = `
    <div class="card__media">
      ${idea.image ? `<img src="${idea.image}" alt="${idea.title} concept mockup" loading="lazy" />` : `<span class="card__placeholder" aria-hidden="true">${idea.icon}</span>`}
      <span class="card__status ${idea.url || idea.recommended ? 'card__status--live' : ''}">${status}</span>
    </div>
    <div class="card__body">
      <p class="card__subtitle">${idea.subtitle}</p>
      <h3 class="card__title">${idea.title}</h3>
      <p class="card__description">${idea.description}</p>
      <p class="card__why"><span>Why it sells</span>${idea.why}</p>
    </div>
    <ul class="card__stack card__stack--fit">
      ${idea.fit.map((f) => `<li>${f}</li>`).join('')}
    </ul>
    <div class="card__footer">
      <span class="card__meta">${EFFORT_LABEL[idea.effort] ?? idea.effort} · ${WOW_LABEL[idea.wow] ?? idea.wow}</span>
      ${idea.url ? `<a class="card__cta" href="${idea.url}">Open demo <span aria-hidden="true">↗</span></a>` : ''}
    </div>
  `;
  return el;
}

function renderIdeas() {
  const meta = window.GAME_IDEAS_META;
  document.getElementById('ideas-hero').innerHTML = `
    <p class="eyebrow">${meta.eyebrow}</p>
    <h1 class="display display--md">${meta.title.replaceAll('.', '<b>.</b>')}</h1>
    <p class="hero__subtitle">${meta.subtitle}</p>
    <p class="hero__note">${meta.note}</p>
  `;

  document.getElementById('ideas-spectrum').innerHTML = `
    <div class="section__head">
      <p class="eyebrow">Capability spectrum</p>
    </div>
    <dl class="spectrum">
      ${meta.spectrum.map((row) => `<div class="spectrum__row"><dt>${row.label}</dt><dd>${row.items}</dd></div>`).join('')}
    </dl>
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
    btn.addEventListener('click', () => {
      setTab(btn.dataset.tab);
      window.scrollTo({ top: 0 });
    });
  });
}

function render() {
  document.getElementById('grid').replaceChildren(...window.PROTOTYPES.map((p, i) => renderCard(p, i)));
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
