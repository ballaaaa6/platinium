function cellLabel(cell) {
  return cell ? `C${String(cell.column).padStart(2, '0')}, R${String(cell.row).padStart(2, '0')}` : '—';
}

export function createInspector() {
  const element = document.createElement('aside');
  element.className = 'inspector-panel';
  element.innerHTML = `
    <div class="panel-heading">
      <div>
        <div class="eyebrow">Live context</div>
        <h2>Inspector</h2>
      </div>
      <span class="panel-kicker">V1</span>
    </div>
    <div class="inspector-empty" data-empty>
      <div class="empty-orb">+</div>
      <p>Select an actor in the office to inspect its runtime state.</p>
    </div>
    <div class="inspector-content is-hidden" data-content>
      <div class="agent-preview-card">
        <div class="agent-preview-frame"><img data-preview alt="Selected actor billboard preview" /></div>
        <div>
          <div class="eyebrow">Selected agent</div>
          <h3 data-name>—</h3>
          <div class="agent-symbol" data-symbol>—</div>
        </div>
      </div>
      <div class="inspector-section">
        <div class="section-label">Runtime</div>
        <dl class="field-list">
          <div><dt>Graphics ID</dt><dd data-graphics>—</dd></div>
          <div><dt>OBJ_EVENT_GFX</dt><dd data-obj>—</dd></div>
          <div><dt>Current cell</dt><dd data-cell>—</dd></div>
          <div><dt>Facing</dt><dd data-facing>—</dd></div>
          <div><dt>State</dt><dd data-state>—</dd></div>
          <div><dt>Target cell</dt><dd data-target>—</dd></div>
        </dl>
      </div>
      <div class="inspector-section future-fields">
        <div class="section-label">Simulation fields</div>
        <dl class="field-list muted-fields">
          <div><dt>Role</dt><dd>—</dd></div>
          <div><dt>Current Task</dt><dd>—</dd></div>
          <div><dt>Stamina</dt><dd>—</dd></div>
          <div><dt>Mood</dt><dd>—</dd></div>
          <div><dt>Workflow</dt><dd>—</dd></div>
        </dl>
        <p class="future-note">Simulation fields will be connected later.</p>
      </div>
    </div>
  `;

  const refs = {
    empty: element.querySelector('[data-empty]'),
    content: element.querySelector('[data-content]'),
    preview: element.querySelector('[data-preview]'),
    name: element.querySelector('[data-name]'),
    symbol: element.querySelector('[data-symbol]'),
    graphics: element.querySelector('[data-graphics]'),
    obj: element.querySelector('[data-obj]'),
    cell: element.querySelector('[data-cell]'),
    facing: element.querySelector('[data-facing]'),
    state: element.querySelector('[data-state]'),
    target: element.querySelector('[data-target]'),
  };

  let lastKey = '';

  return {
    element,
    update(agent) {
      if (!agent) {
        if (lastKey !== 'empty') {
          refs.empty.classList.remove('is-hidden');
          refs.content.classList.add('is-hidden');
          lastKey = 'empty';
        }
        return;
      }

      const snapshot = agent.snapshot();
      const key = JSON.stringify(snapshot);

      if (key === lastKey) {
        return;
      }

      lastKey = key;
      refs.empty.classList.add('is-hidden');
      refs.content.classList.remove('is-hidden');
      refs.preview.src = snapshot.currentFramePath;
      refs.name.textContent = snapshot.displayName;
      refs.symbol.textContent = snapshot.symbol;
      refs.graphics.textContent = String(snapshot.graphicsId).padStart(4, '0');
      refs.obj.textContent = snapshot.symbol;
      refs.cell.textContent = cellLabel(snapshot.cell);
      refs.facing.textContent = snapshot.facing;
      refs.state.textContent = snapshot.state;
      refs.target.textContent = cellLabel(snapshot.targetCell);
    },
  };
}
