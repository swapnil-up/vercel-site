/**
 * Portable booklet page-imposition engine.
 *
 * Computes the page order and rotation metadata for printing an N-page
 * document as a folded, saddle-stitched 2-up booklet on A4 paper.
 *
 * This module performs no PDF parsing, rendering, file I/O, or DOM work.
 */

export class ImpositionError extends Error {
  constructor(message) {
    super(message);
    this.name = "ImpositionError";
  }
}

/**
 * @typedef {Object} PagePosition
 * @property {number} sourcePage Original PDF page number (1-based).
 * @property {number} sheet Sheet index (0-based, outermost first).
 * @property {'front'|'back'} side Printed side of the sheet.
 * @property {'left'|'right'} position Position on the landscape sheet.
 * @property {0|180} rotation Clockwise rotation in degrees.
 */

/**
 * Compute the printer-facing page placement sequence for a folded booklet.
 *
 * Every sheet contains four logical pages:
 * - Front: outer page on the left, inner page on the right.
 * - Back: next inner page on the left, next outer page on the right.
 *
 * Entries are ordered outermost sheet to innermost sheet, with front before
 * back and left before right on each side.
 *
 * @param {number} totalPages Number of pages in the original PDF.
 * @param {'2up'} [mode='2up'] Imposition mode.
 * @returns {PagePosition[]} Ordered page placement records.
 * @throws {ImpositionError} If the page count or mode is unsupported.
 */
export function computeImposition(totalPages, mode = "2up") {
  if (mode !== "2up") {
    throw new ImpositionError(`Unsupported imposition mode: ${String(mode)}`);
  }

  if (!Number.isInteger(totalPages)) {
    throw new ImpositionError("totalPages must be an integer.");
  }

  if (totalPages < 8) {
    throw new ImpositionError("totalPages must be at least 8.");
  }

  if (totalPages % 4 !== 0) {
    throw new ImpositionError("totalPages must be a multiple of 4.");
  }

  const sheetCount = totalPages / 4;
  const placements = [];

  for (let sheet = 0; sheet < sheetCount; sheet += 1) {
    const outerLeft = totalPages - 2 * sheet;
    const innerRight = 2 * sheet + 1;
    const innerLeft = 2 * sheet + 2;
    const outerRight = totalPages - 2 * sheet - 1;

    placements.push(
      {
        sourcePage: outerLeft,
        sheet,
        side: "front",
        position: "left",
        rotation: 180,
      },
      {
        sourcePage: innerRight,
        sheet,
        side: "front",
        position: "right",
        rotation: 0,
      },
      {
        sourcePage: innerLeft,
        sheet,
        side: "back",
        position: "left",
        rotation: 0,
      },
      {
        sourcePage: outerRight,
        sheet,
        side: "back",
        position: "right",
        rotation: 180,
      },
    );
  }

  return placements;
}

export default computeImposition;
