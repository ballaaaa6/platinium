const TOP_WALL_CELL = Object.freeze({ column: 6, row: 1 });
const FLOOR_CELL = Object.freeze({ column: 12, row: 5 });
const FOREGROUND_PROP_CELL = Object.freeze({ column: 10, row: 5 });
const OVERLAP_CELLS = Object.freeze([
  Object.freeze({ column: 12, row: 4 }),
  Object.freeze({ column: 12, row: 5 }),
]);

function setActorFixture(app, actorCells, visibleActorIndices, furnitureId = null) {
  app.agentManager.setPaused(true);
  app.dashboardHeader.setPaused(true);
  app.agentManager.select(null);
  app.grid.clearDynamicState();

  app.agentManager.agents.forEach((agent, index) => {
    agent.root.visible = visibleActorIndices.includes(index);
  });

  app.furnitureManager.loaded.forEach(({ item, object }) => {
    object.visible = furnitureId === null || item.id === furnitureId;
  });

  actorCells.forEach(({ index, cell, facing = 'SOUTH' }) => {
    const agent = app.agentManager.agents[index];
    if (!agent) {
      throw new Error(`Depth fixture actor index ${index} is unavailable.`);
    }

    agent.setCell(cell);
    agent.setFacing(facing);
    agent.setFrame(0);
  });
}

function occupyFixtureCells(app, indices) {
  indices.forEach((index) => {
    const agent = app.agentManager.agents[index];
    app.grid.occupyCell(agent.cell, agent.id);
  });
}

export function createPlatinumBillboardDepthHarness(app) {
  if (!app?.agentManager || !app?.furnitureManager) {
    throw new Error('The Platinum billboard depth harness requires a ready OfficeApp.');
  }

  return Object.freeze({
    setTopWallCase() {
      setActorFixture(app, [{ index: 0, cell: { ...TOP_WALL_CELL } }], [0]);
      occupyFixtureCells(app, [0]);
      return { case: 'top-wall', cell: { ...TOP_WALL_CELL }, actorId: app.agentManager.agents[0].id };
    },

    setFloorCase() {
      setActorFixture(app, [{ index: 0, cell: { ...FLOOR_CELL } }], [0]);
      occupyFixtureCells(app, [0]);
      return { case: 'floor', cell: { ...FLOOR_CELL }, actorId: app.agentManager.agents[0].id };
    },

    setForegroundPropCase() {
      setActorFixture(app, [{ index: 0, cell: { ...FOREGROUND_PROP_CELL } }], [0], 559);
      return {
        case: 'foreground-prop',
        cell: { ...FOREGROUND_PROP_CELL },
        actorId: app.agentManager.agents[0].id,
        furnitureId: 559,
      };
    },

    setTwoActorCase() {
      setActorFixture(
        app,
        [
          { index: 0, cell: { ...OVERLAP_CELLS[0] }, facing: 'SOUTH' },
          { index: 1, cell: { ...OVERLAP_CELLS[1] }, facing: 'NORTH' },
        ],
        [0, 1],
      );
      occupyFixtureCells(app, [0, 1]);
      return {
        case: 'two-actors',
        cells: OVERLAP_CELLS.map((cell) => ({ ...cell })),
        actorIds: [app.agentManager.agents[0].id, app.agentManager.agents[1].id],
      };
    },

    async reset() {
      app.agentManager.agents.forEach((agent) => {
        agent.root.visible = true;
      });
      app.furnitureManager.loaded.forEach(({ object }) => {
        object.visible = true;
      });
      app.gridVisible = true;
      app.gridGroup.visible = true;
      app.dashboardHeader.setGridVisible(true);
      await app.agentManager.reset(app.catalogs.characters);
      app.dashboardHeader.setPaused(false);
      app.inspector.update(null);
      return { case: 'reset', actors: app.agentManager.actorCount };
    },
  });
}

export function installPlatinumBillboardDepthHarness(app) {
  if (!import.meta.env.DEV) {
    return null;
  }

  const harness = createPlatinumBillboardDepthHarness(app);
  window.__OFFICE_DEPTH_TEST__ = harness;
  return harness;
}
