import { describe, expect, it } from 'vitest';
import computeImposition, {
  computeImposition as namedComputeImposition,
  ImpositionError,
} from './bookletImposition.js';

const expectedFor = (totalPages) => {
  const result = [];

  for (let sheet = 0; sheet < totalPages / 4; sheet += 1) {
    result.push(
      { sourcePage: totalPages - 2 * sheet, sheet, side: 'front', position: 'left', rotation: 180 },
      { sourcePage: 2 * sheet + 1, sheet, side: 'front', position: 'right', rotation: 0 },
      { sourcePage: 2 * sheet + 2, sheet, side: 'back', position: 'left', rotation: 0 },
      { sourcePage: totalPages - 2 * sheet - 1, sheet, side: 'back', position: 'right', rotation: 180 },
    );
  }

  return result;
};

const golden8 = [
  { sourcePage: 8, sheet: 0, side: 'front', position: 'left', rotation: 180 },
  { sourcePage: 1, sheet: 0, side: 'front', position: 'right', rotation: 0 },
  { sourcePage: 2, sheet: 0, side: 'back', position: 'left', rotation: 0 },
  { sourcePage: 7, sheet: 0, side: 'back', position: 'right', rotation: 180 },
  { sourcePage: 6, sheet: 1, side: 'front', position: 'left', rotation: 180 },
  { sourcePage: 3, sheet: 1, side: 'front', position: 'right', rotation: 0 },
  { sourcePage: 4, sheet: 1, side: 'back', position: 'left', rotation: 0 },
  { sourcePage: 5, sheet: 1, side: 'back', position: 'right', rotation: 180 },
];

const golden12 = [
  { sourcePage: 12, sheet: 0, side: 'front', position: 'left', rotation: 180 },
  { sourcePage: 1, sheet: 0, side: 'front', position: 'right', rotation: 0 },
  { sourcePage: 2, sheet: 0, side: 'back', position: 'left', rotation: 0 },
  { sourcePage: 11, sheet: 0, side: 'back', position: 'right', rotation: 180 },
  { sourcePage: 10, sheet: 1, side: 'front', position: 'left', rotation: 180 },
  { sourcePage: 3, sheet: 1, side: 'front', position: 'right', rotation: 0 },
  { sourcePage: 4, sheet: 1, side: 'back', position: 'left', rotation: 0 },
  { sourcePage: 9, sheet: 1, side: 'back', position: 'right', rotation: 180 },
  { sourcePage: 8, sheet: 2, side: 'front', position: 'left', rotation: 180 },
  { sourcePage: 5, sheet: 2, side: 'front', position: 'right', rotation: 0 },
  { sourcePage: 6, sheet: 2, side: 'back', position: 'left', rotation: 0 },
  { sourcePage: 7, sheet: 2, side: 'back', position: 'right', rotation: 180 },
];

const golden16 = [
  { sourcePage: 16, sheet: 0, side: 'front', position: 'left', rotation: 180 },
  { sourcePage: 1, sheet: 0, side: 'front', position: 'right', rotation: 0 },
  { sourcePage: 2, sheet: 0, side: 'back', position: 'left', rotation: 0 },
  { sourcePage: 15, sheet: 0, side: 'back', position: 'right', rotation: 180 },
  { sourcePage: 14, sheet: 1, side: 'front', position: 'left', rotation: 180 },
  { sourcePage: 3, sheet: 1, side: 'front', position: 'right', rotation: 0 },
  { sourcePage: 4, sheet: 1, side: 'back', position: 'left', rotation: 0 },
  { sourcePage: 13, sheet: 1, side: 'back', position: 'right', rotation: 180 },
  { sourcePage: 12, sheet: 2, side: 'front', position: 'left', rotation: 180 },
  { sourcePage: 5, sheet: 2, side: 'front', position: 'right', rotation: 0 },
  { sourcePage: 6, sheet: 2, side: 'back', position: 'left', rotation: 0 },
  { sourcePage: 11, sheet: 2, side: 'back', position: 'right', rotation: 180 },
  { sourcePage: 10, sheet: 3, side: 'front', position: 'left', rotation: 180 },
  { sourcePage: 7, sheet: 3, side: 'front', position: 'right', rotation: 0 },
  { sourcePage: 8, sheet: 3, side: 'back', position: 'left', rotation: 0 },
  { sourcePage: 9, sheet: 3, side: 'back', position: 'right', rotation: 180 },
];

describe('computeImposition', () => {
  it('exports the same function as both default and named exports', () => {
    expect(computeImposition).toBe(namedComputeImposition);
  });

  it('matches the exact 8-page golden fixture', () => {
    expect(computeImposition(8)).toEqual(golden8);
  });

  it('matches the exact 12-page golden fixture', () => {
    expect(computeImposition(12)).toEqual(golden12);
  });

  it('matches the exact 16-page golden fixture', () => {
    expect(computeImposition(16)).toEqual(golden16);
  });

  it.each([20, 24])('produces the expected complete ordering for %i pages', (totalPages) => {
    expect(computeImposition(totalPages)).toEqual(expectedFor(totalPages));
  });

  it.each([8, 12, 16, 20, 24])('places every page exactly once for %i pages', (totalPages) => {
    const placements = computeImposition(totalPages);
    const pages = placements.map((entry) => entry.sourcePage);

    expect(placements).toHaveLength(totalPages);
    expect([...pages].sort((a, b) => a - b)).toEqual(
      Array.from({ length: totalPages }, (_, index) => index + 1),
    );
    expect(new Set(pages).size).toBe(totalPages);
  });

  it.each([8, 12, 16, 20, 24])('returns all five required fields for %i pages', (totalPages) => {
    for (const entry of computeImposition(totalPages)) {
      expect(Object.keys(entry).sort()).toEqual([
        'position', 'rotation', 'sheet', 'side', 'sourcePage',
      ]);
    }
  });

  it.each([8, 12, 16, 20, 24])('uses only supported rotations for %i pages', (totalPages) => {
    for (const entry of computeImposition(totalPages)) {
      expect([0, 180]).toContain(entry.rotation);
    }
  });

  it.each([8, 12, 16, 20, 24])('has sequential sheets and correct side/position ordering for %i pages', (totalPages) => {
    const placements = computeImposition(totalPages);
    const sheetCount = totalPages / 4;

    for (let sheet = 0; sheet < sheetCount; sheet += 1) {
      const entries = placements.filter((entry) => entry.sheet === sheet);

      expect(entries).toHaveLength(4);
      expect(entries.map((entry) => `${entry.side}:${entry.position}`)).toEqual([
        'front:left',
        'front:right',
        'back:left',
        'back:right',
      ]);
      expect(entries.map((entry) => entry.rotation)).toEqual([180, 0, 0, 180]);
    }

    expect([...new Set(placements.map((entry) => entry.sheet))]).toEqual(
      Array.from({ length: sheetCount }, (_, index) => index),
    );
  });

  it('uses the required front/back rotation convention', () => {
    const placements = computeImposition(8);

    expect(placements.find((entry) => entry.side === 'front' && entry.position === 'left').rotation).toBe(180);
    expect(placements.find((entry) => entry.side === 'front' && entry.position === 'right').rotation).toBe(0);
    expect(placements.find((entry) => entry.side === 'back' && entry.position === 'left').rotation).toBe(0);
    expect(placements.find((entry) => entry.side === 'back' && entry.position === 'right').rotation).toBe(180);
  });

  it('defaults to 2-up mode', () => {
    expect(computeImposition(8)).toEqual(computeImposition(8, '2up'));
  });

  it('is deterministic across repeated calls', () => {
    expect(computeImposition(24)).toEqual(computeImposition(24));
  });

  it.each([6, 10, 7, 0, -4])('rejects invalid page count %i with ImpositionError', (totalPages) => {
    expect(() => computeImposition(totalPages)).toThrow(ImpositionError);
  });

  it.each([8.5, NaN, Infinity, -Infinity, '8', null, undefined])(
    'rejects non-integer page count %s with ImpositionError',
    (totalPages) => {
      expect(() => computeImposition(totalPages)).toThrow(ImpositionError);
    },
  );

  it('rejects unsupported modes with ImpositionError', () => {
    expect(() => computeImposition(8, '4up')).toThrow(ImpositionError);
    expect(() => computeImposition(8, 'invalid')).toThrow(ImpositionError);
  });

  it('provides a useful error name and extends Error', () => {
    try {
      computeImposition(6);
      throw new Error('Expected computeImposition to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ImpositionError);
      expect(error.name).toBe('ImpositionError');
    }
  });
});
