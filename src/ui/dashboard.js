export function createDashboardHeader({ onPause, onReset, onGridToggle }) {
  const element = document.createElement('header');
  element.className = 'dashboard-header';
  element.innerHTML = `
    <div class="header-copy">
      <div class="eyebrow">Workspace / Dashboard</div>
      <h1>Office Dashboard</h1>
      <div class="header-meta">
        <span class="meta-pill"><span class="status-dot"></span><span data-agent-count>Active Agents: 20</span></span>
        <span class="meta-pill">Map: Default Office 24×10</span>
        <span class="meta-pill">Mode: Local Simulation</span>
      </div>
    </div>
    <div class="header-actions">
      <button class="control-button is-primary" type="button" data-pause>Pause</button>
      <button class="control-button" type="button" data-reset>Reset Agents</button>
      <button class="control-button" type="button" data-grid>Hide Grid</button>
    </div>
  `;

  const pauseButton = element.querySelector('[data-pause]');
  const countLabel = element.querySelector('[data-agent-count]');
  const gridButton = element.querySelector('[data-grid]');

  pauseButton.addEventListener('click', onPause);
  element.querySelector('[data-reset]').addEventListener('click', onReset);
  gridButton.addEventListener('click', onGridToggle);

  return {
    element,
    setAgentCount(count) {
      countLabel.textContent = `Active Agents: ${count}`;
    },
    setPaused(paused) {
      pauseButton.textContent = paused ? 'Resume' : 'Pause';
      pauseButton.classList.toggle('is-paused', paused);
    },
    setGridVisible(visible) {
      gridButton.textContent = visible ? 'Hide Grid' : 'Show Grid';
    },
  };
}
