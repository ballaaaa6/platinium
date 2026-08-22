import { OfficeAgent } from './agent.js';
import { AGENT_STATES, directionForStep } from './animation.js';
import { getFramePath, DIRECTION_SEQUENCES, selectBillboardActors } from '../assets/assetCatalog.js';
import { createSeededRandom, randomBetween, shuffle } from '../utils/seededRandom.js';

export class AgentManager {
  constructor({ assetLoader, grid, group, onSelectionChange, onTick }) {
    this.assetLoader = assetLoader;
    this.grid = grid;
    this.group = group;
    this.onSelectionChange = onSelectionChange;
    this.onTick = onTick;
    this.agents = [];
    this.selectedAgent = null;
    this.paused = false;
    this.time = 0;
    this.random = createSeededRandom(555);
    this.definitions = [];
  }

  async spawn(characters, count = 20) {
    this.disposeAgents();
    this.grid.clearDynamicState();
    this.time = 0;
    this.random = createSeededRandom(555);
    this.paused = false;

    this.definitions = selectBillboardActors(characters, { seed: 555, count });
    const texturePaths = new Set();

    this.definitions.forEach((definition) => {
      Object.values(DIRECTION_SEQUENCES).forEach((sequence) => {
        sequence.forEach((frameIndex) => texturePaths.add(getFramePath(definition, frameIndex)));
      });
    });

    const textureResults = await Promise.all([...texturePaths].map(async (path) => [path, await this.assetLoader.loadTexture(path)]));
    const textures = new Map(textureResults);
    const availableCells = shuffle(this.grid.getAvailableCells(), createSeededRandom(555));

    if (availableCells.length < count) {
      throw new Error(`Only ${availableCells.length} valid spawn cells are available for ${count} agents.`);
    }

    this.definitions.forEach((definition, index) => {
      const agent = new OfficeAgent({
        definition,
        index,
        grid: this.grid,
        textures,
        group: this.group,
      });
      const cell = availableCells[index];
      agent.setCell(cell);
      this.grid.occupyCell(cell, agent.id);
      agent.idleUntil = randomBetween(this.random, 300, 1300);
      agent.walkSeed = randomBetween(this.random, 0, 1);
      this.agents.push(agent);
    });

    this.select(null);
    return this.agents;
  }

  disposeAgents() {
    this.agents.forEach((agent) => agent.dispose());
    this.agents = [];
    this.selectedAgent = null;
  }

  update(deltaSeconds) {
    if (this.paused) {
      return;
    }

    const deltaMs = Math.min(deltaSeconds * 1000, 60);
    this.time += deltaMs;

    this.agents.forEach((agent) => {
      if (agent.state === AGENT_STATES.WALKING) {
        agent.movementProgress = Math.min(1, agent.movementProgress + deltaMs / agent.movementDuration);
        agent.updateAnimation(deltaMs);
        agent.updateVisual();

        if (agent.movementProgress >= 1) {
          this.completeWalk(agent);
        }
        return;
      }

      if (this.time >= agent.idleUntil) {
        this.tryStartWalk(agent);
      }
    });

    this.onTick?.();
  }

  tryStartWalk(agent) {
    const candidates = shuffle(
      this.grid.getCardinalNeighbors(agent.cell).filter((cell) => this.grid.canEnter(cell, { avoidDoor: true })),
      this.random,
    );
    const target = candidates[0];

    if (!target || !this.grid.reserveCell(target, agent.id)) {
      agent.idleUntil = this.time + randomBetween(this.random, 280, 900);
      return;
    }

    agent.setFacing(directionForStep(agent.cell, target));
    agent.beginWalk(target, randomBetween(this.random, 500, 800));
  }

  completeWalk(agent) {
    const previousCell = agent.sourceCell;
    const targetCell = agent.targetCell;
    this.grid.releaseCell(previousCell, agent.id);
    this.grid.releaseReservation(targetCell, agent.id);
    this.grid.occupyCell(targetCell, agent.id);
    agent.finishWalk();
    agent.idleUntil = this.time + randomBetween(this.random, 350, 1500);
  }

  setPaused(paused) {
    this.paused = paused;
  }

  reset(characters) {
    return this.spawn(characters, 20);
  }

  select(agent) {
    this.agents.forEach((candidate) => candidate.setSelected(candidate === agent));
    this.selectedAgent = agent;
    this.onSelectionChange?.(agent);
  }

  getPickables() {
    return this.agents.map((agent) => agent.sprite);
  }

  get actorCount() {
    return this.agents.length;
  }
}
