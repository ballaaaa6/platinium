const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'DB' },
  { id: 'agents', label: 'Agents', icon: 'AG', future: true },
  { id: 'tasks', label: 'Tasks', icon: 'TK', future: true },
  { id: 'workflows', label: 'Workflows', icon: 'WF', future: true },
  { id: 'schedules', label: 'Schedules', icon: 'SC', future: true },
  { id: 'memory', label: 'Memory', icon: 'ME', future: true },
  { id: 'assets', label: 'Assets', icon: 'AS' },
  { id: 'settings', label: 'Settings', icon: 'ST', future: true },
];

export function createSidebar({ onNavigate }) {
  const element = document.createElement('aside');
  element.className = 'sidebar';
  element.innerHTML = `
    <div class="brand-block">
      <div class="brand-mark">OF</div>
      <div>
        <div class="brand-name">OFFICE / OS</div>
        <div class="brand-caption">Local simulation</div>
      </div>
    </div>
    <div class="sidebar-section-label">Workspace</div>
    <nav class="sidebar-nav" aria-label="Primary navigation"></nav>
    <div class="sidebar-footer">
      <span class="status-dot"></span>
      <span>Runtime foundation</span>
    </div>
  `;

  const nav = element.querySelector('.sidebar-nav');
  const buttons = new Map();

  NAV_ITEMS.forEach((item) => {
    const button = document.createElement('button');
    button.className = 'nav-item';
    button.type = 'button';
    button.dataset.page = item.id;
    button.disabled = Boolean(item.future);
    button.innerHTML = `<span class="nav-icon">${item.icon}</span><span>${item.label}</span>${item.future ? '<span class="nav-soon">Soon</span>' : ''}`;
    button.addEventListener('click', () => onNavigate(item.id));
    nav.appendChild(button);
    buttons.set(item.id, button);
  });

  return {
    element,
    setActive(page) {
      buttons.forEach((button, id) => button.classList.toggle('is-active', id === page));
    },
  };
}
