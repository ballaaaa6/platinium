import { DIRECTION_SEQUENCES } from '../assets/assetCatalog.js';

export const AGENT_STATES = Object.freeze({
  IDLE: 'IDLE',
  WALKING: 'WALKING',
});

export function directionForStep(source, target) {
  const deltaColumn = target.column - source.column;
  const deltaRow = target.row - source.row;

  if (Math.abs(deltaColumn) >= Math.abs(deltaRow)) {
    return deltaColumn < 0 ? 'WEST' : 'EAST';
  }

  return deltaRow < 0 ? 'NORTH' : 'SOUTH';
}

export function getDirectionFrames(direction) {
  return DIRECTION_SEQUENCES[direction] ?? DIRECTION_SEQUENCES.SOUTH;
}
