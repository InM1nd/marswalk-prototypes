const STATUS_LABEL = {
  planned: 'Planned',
  in_progress: 'In progress',
  live: 'Live',
};

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
      <a class="card__doc" href="${proto.docHref}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Plan →</a>
    </div>
  `;

  el.addEventListener('pointermove', (e) => {
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--y', `${e.clientY - rect.top}px`);
  });

  return el;
}

function render() {
  const grid = document.getElementById('grid');
  grid.replaceChildren(...window.PROTOTYPES.map(renderCard));

  document.getElementById('footer-date').textContent = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

render();
