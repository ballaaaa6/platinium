import * as THREE from 'three';
import { createAssetLoader, parseCellsCsv } from './assets/assetLoader.js';
import { ASSET_PATHS, loadCatalogs } from './assets/assetCatalog.js';
import { AgentManager } from './agents/agentManager.js';
import { createOfficeCamera, resizeOfficeCamera } from './world/camera.js';
import { FurnitureManager } from './world/furniture.js';
import { OfficeGrid } from './world/grid.js';
import { loadOfficeMap } from './world/map.js';
import { createWorldScene } from './world/scene.js';
import { createAssetsView } from './ui/assetsView.js';
import { createDashboardHeader } from './ui/dashboard.js';
import { createInspector } from './ui/inspector.js';
import { createSidebar } from './ui/sidebar.js';

export class OfficeApp {
  constructor(root) {
    this.root = root;
    this.gridVisible = true;
    this.buildShell();
    this.setupWorldRenderer();
    this.startRenderLoop();
    this.initialize().catch((error) => this.showError(error));
  }

  buildShell() {
    this.shell = document.createElement('div');
    this.shell.className = 'app-shell';

    const sidebar = createSidebar({ onNavigate: (page) => this.navigate(page) });
    this.sidebar = sidebar;
    this.shell.appendChild(sidebar.element);

    this.mainStage = document.createElement('main');
    this.mainStage.className = 'main-stage';
    this.dashboardPage = document.createElement('section');
    this.dashboardPage.className = 'dashboard-page';
    this.mainStage.appendChild(this.dashboardPage);

    this.worldShell = document.createElement('div');
    this.worldShell.className = 'world-shell';
    this.worldCanvas = document.createElement('div');
    this.worldCanvas.className = 'world-canvas';
    this.worldCanvas.setAttribute('aria-label', 'Three.js Default Office 3D viewport');
    this.worldShell.appendChild(this.worldCanvas);

    const worldHud = document.createElement('div');
    worldHud.className = 'world-hud';
    worldHud.innerHTML = `
      <div class="hud-chip"><span class="hud-dot"></span>REAL GLB MAP</div>
      <div class="hud-chip">24 × 10 LOGICAL GRID</div>
      <div class="hud-chip hud-chip-muted">Drag-free local preview</div>
    `;
    this.worldShell.appendChild(worldHud);

    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.className = 'loading-overlay';
    this.loadingOverlay.innerHTML = `
      <div class="loading-card">
        <div class="loading-spinner"></div>
        <div class="eyebrow">Booting office runtime</div>
        <h2 data-loading-title>Loading asset foundation</h2>
        <p data-loading-message>Reading the prepared GLB and billboard catalogs…</p>
      </div>
    `;
    this.worldShell.appendChild(this.loadingOverlay);

    this.dashboardHeader = createDashboardHeader({
      onPause: () => this.togglePause(),
      onReset: () => this.resetAgents(),
      onGridToggle: () => this.toggleGrid(),
    });
    this.dashboardPage.appendChild(this.dashboardHeader.element);
    this.dashboardPage.appendChild(this.worldShell);

    this.inspector = createInspector();
    this.shell.appendChild(this.mainStage);
    this.shell.appendChild(this.inspector.element);
    this.root.replaceChildren(this.shell);
  }

  setupWorldRenderer() {
    const { scene, mapGroup, furnitureGroup, actorGroup, gridGroup } = createWorldScene();
    this.scene = scene;
    this.mapGroup = mapGroup;
    this.furnitureGroup = furnitureGroup;
    this.actorGroup = actorGroup;
    this.gridGroup = gridGroup;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.className = 'office-canvas';
    this.worldCanvas.appendChild(this.renderer.domElement);

    const rect = this.worldCanvas.getBoundingClientRect();
    this.camera = createOfficeCamera(rect.width, rect.height);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    const resize = () => {
      const bounds = this.worldCanvas.getBoundingClientRect();
      this.renderer.setSize(bounds.width, bounds.height, false);
      resizeOfficeCamera(this.camera, bounds.width, bounds.height);
    };

    this.resizeObserver = new ResizeObserver(resize);
    this.resizeObserver.observe(this.worldCanvas);
    resize();

    this.worldCanvas.addEventListener('pointerdown', (event) => this.handleWorldPointerDown(event));
  }

  startRenderLoop() {
    let previousTime = performance.now();
    const render = (time) => {
      const delta = Math.min((time - previousTime) / 1000, 0.06);
      previousTime = time;
      this.agentManager?.update(delta);
      this.inspector.update(this.agentManager?.selectedAgent ?? null);
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  }

  async initialize() {
    this.setLoading('Loading asset catalogs', 'Checking the 269 characters and 590 furniture records…');
    this.assetLoader = createAssetLoader();
    const [catalogs, cellResponse] = await Promise.all([
      loadCatalogs(),
      fetch(ASSET_PATHS.cells),
    ]);

    if (!cellResponse.ok) {
      throw new Error(`Unable to load ${ASSET_PATHS.cells} (${cellResponse.status}).`);
    }

    this.catalogs = catalogs;
    if (catalogs.characters.length !== 269) {
      throw new Error(`Expected 269 character catalog records, received ${catalogs.characters.length}.`);
    }
    if (catalogs.furniture.length !== 590) {
      throw new Error(`Expected 590 furniture catalog records, received ${catalogs.furniture.length}.`);
    }

    this.grid = new OfficeGrid();
    this.grid.applyCellRecords(parseCellsCsv(await cellResponse.text()));

    this.setLoading('Loading map geometry', 'Placing the supplied Default Office GLB at canonical tile scale…');
    await loadOfficeMap({ assetLoader: this.assetLoader, mapGroup: this.mapGroup });

    this.setLoading('Loading furniture proof', 'Loading six supplied GLB props and their logical footprints…');
    this.furnitureManager = new FurnitureManager({
      assetLoader: this.assetLoader,
      grid: this.grid,
      group: this.furnitureGroup,
    });
    await this.furnitureManager.load(this.catalogs.furniture);

    this.setLoading('Loading billboard actors', 'Preparing exactly 20 real PNG actors with directional frames…');
    this.agentManager = new AgentManager({
      assetLoader: this.assetLoader,
      grid: this.grid,
      group: this.actorGroup,
      onSelectionChange: (agent) => this.inspector.update(agent),
      onTick: () => this.inspector.update(this.agentManager?.selectedAgent ?? null),
    });
    await this.agentManager.spawn(this.catalogs.characters, 20);
    this.dashboardHeader.setAgentCount(this.agentManager.actorCount);

    this.assetsView = createAssetsView({ catalogs: this.catalogs });
    this.mainStage.appendChild(this.assetsView.element);
    this.sidebar.setActive('dashboard');
    window.__OFFICE_APP__ = this;
    this.setLoading('Runtime ready', 'Real map, furniture, billboards, and collision metadata are live.');
    window.setTimeout(() => this.loadingOverlay.classList.add('is-hidden'), 450);
  }

  setLoading(title, message) {
    this.loadingOverlay.classList.remove('is-hidden', 'is-error');
    this.loadingOverlay.querySelector('[data-loading-title]').textContent = title;
    this.loadingOverlay.querySelector('[data-loading-message]').textContent = message;
  }

  showError(error) {
    const message = error instanceof Error ? error.message : String(error);
    this.loadingOverlay.classList.remove('is-hidden');
    this.loadingOverlay.classList.add('is-error');
    this.loadingOverlay.querySelector('.loading-spinner').classList.add('is-failed');
    this.loadingOverlay.querySelector('[data-loading-title]').textContent = 'Runtime validation failed';
    this.loadingOverlay.querySelector('[data-loading-message]').textContent = message;
    console.error('[Office Dashboard]', error);
  }

  togglePause() {
    if (!this.agentManager) {
      return;
    }

    const paused = !this.agentManager.paused;
    this.agentManager.setPaused(paused);
    this.dashboardHeader.setPaused(paused);
  }

  async resetAgents() {
    if (!this.agentManager || !this.catalogs) {
      return;
    }

    this.dashboardHeader.setPaused(false);
    this.setLoading('Resetting actors', 'Returning the seeded 20-agent layout and reservations…');
    await this.agentManager.reset(this.catalogs.characters);
    this.inspector.update(null);
    window.setTimeout(() => this.loadingOverlay.classList.add('is-hidden'), 250);
  }

  toggleGrid() {
    this.gridVisible = !this.gridVisible;
    this.gridGroup.visible = this.gridVisible;
    this.dashboardHeader.setGridVisible(this.gridVisible);
  }

  navigate(page) {
    if (!this.assetsView && page === 'assets') {
      return;
    }

    const isDashboard = page === 'dashboard';
    this.sidebar.setActive(page);
    this.dashboardPage.classList.toggle('is-hidden', !isDashboard);
    this.assetsView?.element.classList.toggle('is-hidden', isDashboard);

    if (!isDashboard) {
      this.assetsView?.render();
    }
  }

  handleWorldPointerDown(event) {
    if (!this.agentManager || this.dashboardPage.classList.contains('is-hidden')) {
      return;
    }

    const bounds = this.worldCanvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(this.agentManager.getPickables(), false);
    const agent = intersections.find((hit) => hit.object.userData.agent)?.object.userData.agent ?? null;
    this.agentManager.select(agent);
  }
}
