export const GRID_COLUMNS = 24;
export const GRID_ROWS = 10;
export const TILE_WORLD_UNITS = 1;

export const DOOR_CELLS = Object.freeze([
  Object.freeze({ column: 8, row: 1, label: 'Top door' }),
  Object.freeze({ column: 21, row: 10, label: 'Bottom door' }),
]);

export function cellKey(cell) {
  return `C${String(cell.column).padStart(2, '0')},R${String(cell.row).padStart(2, '0')}`;
}

export function parseCellKey(key) {
  const match = /^C(\d+),R(\d+)$/i.exec(key);
  return match ? { column: Number(match[1]), row: Number(match[2]) } : null;
}

export class OfficeGrid {
  constructor() {
    this.walkable = new Set();
    this.blocked = new Set();
    this.furnitureBlocked = new Map();
    this.occupied = new Map();
    this.reserved = new Map();
    this.doorKeys = new Set(DOOR_CELLS.map(cellKey));

    for (let row = 1; row <= GRID_ROWS; row += 1) {
      for (let column = 1; column <= GRID_COLUMNS; column += 1) {
        this.walkable.add(cellKey({ column, row }));
      }
    }
  }

  applyCellRecords(records) {
    records.forEach((record) => {
      const cell = { column: Number(record.column), row: Number(record.row) };
      const key = cellKey(cell);

      if (String(record.walkable).toLowerCase() === 'true') {
        this.walkable.add(key);
      } else {
        this.walkable.delete(key);
        this.blocked.add(key);
      }
    });
  }

  isInsideOffice(cell) {
    return Boolean(cell)
      && cell.column >= 1
      && cell.column <= GRID_COLUMNS
      && cell.row >= 1
      && cell.row <= GRID_ROWS;
  }

  cellToWorld(cell) {
    if (!this.isInsideOffice(cell)) {
      throw new Error(`Cell ${JSON.stringify(cell)} is outside the office grid.`);
    }

    return {
      x: (cell.column - (GRID_COLUMNS / 2 + 0.5)) * TILE_WORLD_UNITS,
      z: (cell.row - (GRID_ROWS / 2 + 0.5)) * TILE_WORLD_UNITS,
    };
  }

  worldToCell(x, z) {
    const cell = {
      column: Math.floor((x / TILE_WORLD_UNITS) + GRID_COLUMNS / 2) + 1,
      row: Math.floor((z / TILE_WORLD_UNITS) + GRID_ROWS / 2) + 1,
    };

    return this.isInsideOffice(cell) ? cell : null;
  }

  getCellCenter(cell) {
    return this.cellToWorld(cell);
  }

  isDoorway(cell) {
    return this.doorKeys.has(cellKey(cell));
  }

  isWalkable(cell) {
    const key = cellKey(cell);
    return this.isInsideOffice(cell) && this.walkable.has(key) && !this.blocked.has(key);
  }

  isFurnitureBlocked(cell) {
    return this.furnitureBlocked.has(cellKey(cell));
  }

  isOccupied(cell, exceptId = null) {
    const occupant = this.occupied.get(cellKey(cell));
    return Boolean(occupant) && occupant !== exceptId;
  }

  isReserved(cell, exceptId = null) {
    const reserver = this.reserved.get(cellKey(cell));
    return Boolean(reserver) && reserver !== exceptId;
  }

  canEnter(cell, { avoidDoor = true, exceptId = null } = {}) {
    return this.isWalkable(cell)
      && !this.isFurnitureBlocked(cell)
      && !this.isOccupied(cell, exceptId)
      && !this.isReserved(cell, exceptId)
      && (!avoidDoor || !this.isDoorway(cell));
  }

  reserveCell(cell, agentId) {
    if (!this.canEnter(cell, { exceptId: agentId })) {
      return false;
    }

    this.reserved.set(cellKey(cell), agentId);
    return true;
  }

  releaseReservation(cell, agentId) {
    const key = cellKey(cell);

    if (this.reserved.get(key) === agentId) {
      this.reserved.delete(key);
    }
  }

  occupyCell(cell, agentId) {
    if (!this.isWalkable(cell) || this.isFurnitureBlocked(cell) || this.isOccupied(cell, agentId)) {
      return false;
    }

    this.occupied.set(cellKey(cell), agentId);
    return true;
  }

  releaseCell(cell, agentId) {
    const key = cellKey(cell);

    if (this.occupied.get(key) === agentId) {
      this.occupied.delete(key);
    }
  }

  addFurnitureFootprint(origin, footprint, furnitureId) {
    const width = Math.max(1, Number.parseInt(footprint?.x ?? 1, 10));
    const depth = Math.max(1, Number.parseInt(footprint?.z ?? 1, 10));
    const cells = [];

    for (let row = origin.row; row < origin.row + depth; row += 1) {
      for (let column = origin.column; column < origin.column + width; column += 1) {
        const cell = { column, row };

        if (!this.isInsideOffice(cell)) {
          throw new Error(`Furniture ${furnitureId} footprint leaves the office at ${cellKey(cell)}.`);
        }

        this.furnitureBlocked.set(cellKey(cell), furnitureId);
        cells.push(cell);
      }
    }

    return cells;
  }

  getCardinalNeighbors(cell) {
    return [
      { column: cell.column, row: cell.row - 1 },
      { column: cell.column + 1, row: cell.row },
      { column: cell.column, row: cell.row + 1 },
      { column: cell.column - 1, row: cell.row },
    ].filter((candidate) => this.isInsideOffice(candidate));
  }

  getAvailableCells({ avoidDoors = true } = {}) {
    const cells = [];

    for (let row = 1; row <= GRID_ROWS; row += 1) {
      for (let column = 1; column <= GRID_COLUMNS; column += 1) {
        const cell = { column, row };

        if (this.canEnter(cell, { avoidDoor: avoidDoors })) {
          cells.push(cell);
        }
      }
    }

    return cells;
  }

  clearDynamicState() {
    this.occupied.clear();
    this.reserved.clear();
  }
}
