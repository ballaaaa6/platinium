import {
  ASSET_ROOT,
  formatFurnitureDimensions,
  formatFurnitureFootprint,
  isBillboardReadyCharacter,
} from '../assets/assetCatalog.js';

function addText(parent, className, text) {
  const element = document.createElement('div');
  element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

export function createAssetsView({ catalogs }) {
  const element = document.createElement('section');
  element.className = 'assets-page is-hidden';
  element.innerHTML = `
    <div class="assets-header">
      <div>
        <div class="eyebrow">Runtime inventory</div>
        <h1>Assets</h1>
        <p>Prepared foundation resources available to the local office runtime.</p>
      </div>
      <div class="asset-summary" data-summary></div>
    </div>
    <div class="assets-toolbar">
      <div class="asset-tabs" role="tablist">
        <button type="button" class="asset-tab is-active" data-tab="characters">Characters</button>
        <button type="button" class="asset-tab" data-tab="furniture">Furniture</button>
        <button type="button" class="asset-tab" data-tab="map">Map</button>
      </div>
      <label class="search-box"><span>Search</span><input type="search" placeholder="Search IDs or names" data-search /></label>
    </div>
    <div class="asset-list" data-list></div>
  `;

  const list = element.querySelector('[data-list]');
  const summary = element.querySelector('[data-summary]');
  const search = element.querySelector('[data-search]');
  const tabs = [...element.querySelectorAll('[data-tab]')];
  let activeTab = 'characters';

  function renderCharacters(filter) {
    const records = catalogs.characters.filter((record) => {
      const haystack = `${record.id} ${record.symbol} ${record.asset_class} ${record.status}`.toLowerCase();
      return haystack.includes(filter);
    });
    summary.textContent = `${catalogs.characters.length} cataloged · ${catalogs.characters.filter(isBillboardReadyCharacter).length} billboard-ready`;

    records.forEach((record) => {
      const card = document.createElement('article');
      card.className = 'asset-card character-card';
      const preview = document.createElement('div');
      preview.className = 'asset-thumb sprite-thumb';
      if (record.frames?.[0]) {
        const image = document.createElement('img');
        image.src = `${ASSET_ROOT}/${record.frames[0]}`;
        image.alt = `${record.symbol} first frame`;
        preview.appendChild(image);
      } else {
        addText(preview, 'thumb-fallback', 'META');
      }
      card.appendChild(preview);
      const details = document.createElement('div');
      details.className = 'asset-card-details';
      addText(details, 'asset-id', `GFX ${String(record.id).padStart(4, '0')}`);
      addText(details, 'asset-name', record.symbol);
      addText(details, 'asset-meta', `${record.status} · ${record.frames?.length ?? 0} frames`);
      card.appendChild(details);
      list.appendChild(card);
    });
  }

  function renderFurniture(filter) {
    const records = catalogs.furniture.filter((record) => {
      const haystack = `${record.id} ${record.name} ${record.identity_label} ${record.status}`.toLowerCase();
      return haystack.includes(filter);
    });
    summary.textContent = `${catalogs.furniture.length} cataloged · GLB status from source contract`;

    records.forEach((record) => {
      const card = document.createElement('article');
      card.className = 'asset-card furniture-card';
      const cube = document.createElement('div');
      cube.className = 'asset-thumb glb-thumb';
      addText(cube, 'glb-label', 'GLB');
      card.appendChild(cube);
      const details = document.createElement('div');
      details.className = 'asset-card-details';
      addText(details, 'asset-id', `PROP ${String(record.id).padStart(4, '0')}`);
      addText(details, 'asset-name', record.name);
      addText(details, 'asset-meta', `${record.status} · ${formatFurnitureDimensions(record)} tiles`);
      addText(details, 'asset-footprint', `Footprint ${formatFurnitureFootprint(record)}`);
      card.appendChild(details);
      list.appendChild(card);
    });
  }

  function renderMap(filter) {
    summary.textContent = '1 GLB map · 24×10 logical grid';
    const haystack = 'default office glb 24 10 c08 r01 c21 r10'.includes(filter);
    if (!haystack) {
      addText(list, 'empty-list', 'No map resource matches this search.');
      return;
    }

    const card = document.createElement('article');
    card.className = 'map-contract-card';
    addText(card, 'asset-id', 'MAP / DEFAULT_OFFICE');
    addText(card, 'asset-name', 'Default Office');
    addText(card, 'asset-meta', 'default_office.glb · real 3D geometry');
    const grid = document.createElement('div');
    grid.className = 'map-contract-grid';
    [['Dimensions', '24 × 10'], ['Scale', '1 tile = 1 world unit'], ['Top door', 'C08,R01'], ['Bottom door', 'C21,R10']].forEach(([label, value]) => {
      const row = document.createElement('div');
      addText(row, 'contract-label', label);
      addText(row, 'contract-value', value);
      grid.appendChild(row);
    });
    card.appendChild(grid);
    list.appendChild(card);
  }

  function render() {
    const filter = search.value.trim().toLowerCase();
    list.replaceChildren();
    if (activeTab === 'characters') renderCharacters(filter);
    if (activeTab === 'furniture') renderFurniture(filter);
    if (activeTab === 'map') renderMap(filter);
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => {
    activeTab = tab.dataset.tab;
    tabs.forEach((candidate) => candidate.classList.toggle('is-active', candidate === tab));
    render();
  }));
  search.addEventListener('input', render);
  render();

  return { element, render };
}
