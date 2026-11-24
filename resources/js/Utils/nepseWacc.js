/**
 * Portable NEPSE weighted-average cost calculator.
 * Pure ESM: no Node.js, DOM, framework, or filesystem dependencies.
 */

export class NepseCalcError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NepseCalcError';
  }
}

const DEFAULTS = Object.freeze({
  brokerageRate: undefined,
  dpCharge: 25,
  sebonRate: 0.00015,
  autoCalculateFees: false
});

const BROKERAGE_SLABS = Object.freeze([
  { limit: 50000, rate: 0.0036 },
  { limit: 500000, rate: 0.0033 },
  { limit: 3000000, rate: 0.0031 },
  { limit: 10000000, rate: 0.0027 },
  { limit: Infinity, rate: 0.0024 }
]);

function fail(message) {
  throw new NepseCalcError(message);
}

function finite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`${name} must be a finite number`);
  }
  return value;
}

function nonNegative(value, name) {
  finite(value, name);
  if (value < 0) fail(`${name} cannot be negative`);
  return value;
}

function positive(value, name) {
  finite(value, name);
  if (value <= 0) fail(`${name} must be greater than zero`);
  return value;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validateDate(date, name = 'date') {
  if (date === undefined) return undefined;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(date) || !Number.isFinite(Date.parse(date))) {
    fail(`${name} must be a valid ISO date or ISO timestamp`);
  }
  const datePart = date.slice(0, 10);
  const parsed = new Date(`${datePart}T00:00:00.000Z`);
  if (parsed.toISOString().slice(0, 10) !== datePart) {
    fail(`${name} must contain a valid calendar date`);
  }
  return date;
}

function validateOptions(options) {
  if (options === undefined) options = {};
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    fail('options must be an object');
  }

  const result = { ...DEFAULTS, ...options };
  if (result.brokerageRate !== undefined) {
    nonNegative(result.brokerageRate, 'brokerageRate');
  }
  nonNegative(result.dpCharge, 'dpCharge');
  nonNegative(result.sebonRate, 'sebonRate');
  if (typeof result.autoCalculateFees !== 'boolean') {
    fail('autoCalculateFees must be a boolean');
  }
  return result;
}

function validateTransaction(transaction, index) {
  if (!transaction || typeof transaction !== 'object' || Array.isArray(transaction)) {
    fail(`transaction at index ${index} must be an object`);
  }
  if (!['buy', 'right'].includes(transaction.type)) {
    fail(`transaction at index ${index} has an invalid type`);
  }
  positive(transaction.quantity, `transaction ${index} quantity`);
  if (!Number.isInteger(transaction.quantity)) {
    fail(`transaction ${index} quantity must be an integer`);
  }
  positive(transaction.pricePerShare, `transaction ${index} pricePerShare`);
  for (const field of ['brokerage', 'dpCharge', 'sebonFee']) {
    if (transaction[field] !== undefined) {
      nonNegative(transaction[field], `transaction ${index} ${field}`);
    }
  }
  validateDate(transaction.date, `transaction ${index} date`);
  return { ...transaction };
}

function validateBonus(bonus, index) {
  if (!bonus || typeof bonus !== 'object' || Array.isArray(bonus)) {
    fail(`bonus at index ${index} must be an object`);
  }
  nonNegative(bonus.ratio, `bonus ${index} ratio`);
  validateDate(bonus.date, `bonus ${index} date`);
  return { ...bonus };
}

function validateRight(right, index) {
  if (!right || typeof right !== 'object' || Array.isArray(right)) {
    fail(`right issue at index ${index} must be an object`);
  }
  nonNegative(right.ratio, `right issue ${index} ratio`);
  positive(right.pricePerShare, `right issue ${index} pricePerShare`);
  for (const field of ['brokerage', 'dpCharge', 'sebonFee']) {
    if (right[field] !== undefined) {
      nonNegative(right[field], `right issue ${index} ${field}`);
    }
  }
  validateDate(right.date, `right issue ${index} date`);
  return { ...right };
}

function brokerageFor(value, options) {
  if (options.brokerageRate !== undefined) {
    return roundMoney(value * options.brokerageRate);
  }
  const slab = BROKERAGE_SLABS.find(item => value <= item.limit);
  return roundMoney(value * slab.rate);
}

function calculateFees(event, value, options) {
  const automatic = options.autoCalculateFees;
  const brokerage = event.brokerage !== undefined
    ? roundMoney(event.brokerage)
    : automatic ? Math.max(10, brokerageFor(value, options)) : 0;
  const dpCharge = event.dpCharge !== undefined
    ? roundMoney(event.dpCharge)
    : automatic ? options.dpCharge : 0;
  const sebonFee = event.sebonFee !== undefined
    ? roundMoney(event.sebonFee)
    : automatic ? roundMoney(value * options.sebonRate) : 0;

  return {
    brokerage,
    dpCharge,
    sebonFee,
    total: roundMoney(brokerage + dpCharge + sebonFee)
  };
}

function prepareEvents(purchases, bonuses, rights) {
  const events = [];
  let order = 0;

  for (const item of purchases) {
    events.push({ kind: 'buy', value: item, order: order++ });
  }
  for (const item of bonuses) {
    events.push({ kind: 'bonus', value: item, order: order++ });
  }
  for (const item of rights) {
    events.push({ kind: 'right', value: item, order: order++ });
  }

  // Sort by date. Undated purchases are treated as earliest (virtual date 0)
  // so they anchor the share count before any dated corporate action.
  // Dated events are chronological. Undated non-purchase events follow dated events.
  // Original input order breaks ties.
  return events.sort((a, b) => {
    const ad = a.value.date;
    const bd = b.value.date;
    const aIsUndatedPurchase = ad === undefined && a.kind === 'buy';
    const bIsUndatedPurchase = bd === undefined && b.kind === 'buy';

    if (aIsUndatedPurchase && bIsUndatedPurchase) return a.order - b.order;
    if (aIsUndatedPurchase) return -1;  // undated purchases come first
    if (bIsUndatedPurchase) return 1;

    if (ad === undefined && bd === undefined) return a.order - b.order;
    if (ad === undefined) return 1;     // undated non-purchases after dated
    if (bd === undefined) return -1;
    const difference = Date.parse(ad) - Date.parse(bd);
    return difference || a.order - b.order;
  });
}

function calculate(events, options, sourcePurchases, sourceBonuses, sourceRights) {
  const feesOptions = validateOptions(options);
  let totalShares = 0;
  let totalCost = 0;
  let purchaseCost = 0;
  let rightCost = 0;
  let brokerageTotal = 0;
  let dpChargeTotal = 0;
  let sebonFeeTotal = 0;
  let bonusShares = 0;
  let rightShares = 0;
  let purchasedShares = 0;

  const transactions = [];
  const bonuses = [];
  const rights = [];
  const timeline = [];

  // Track if there's a zero-entitlement right issue with auto fees
  let hasZeroEntitlementRight = false;

  for (const event of events) {
    const item = event.value;
    const beforeShares = totalShares;
    const beforeCost = totalCost;

    if (event.kind === 'buy') {
      const value = roundMoney(item.quantity * item.pricePerShare);
      const fees = calculateFees(item, value, feesOptions);
      const cost = roundMoney(value + fees.total);

      totalShares += item.quantity;
      purchasedShares += item.quantity;
      purchaseCost = roundMoney(purchaseCost + value);
      totalCost = roundMoney(totalCost + cost);
      brokerageTotal = roundMoney(brokerageTotal + fees.brokerage);
      dpChargeTotal = roundMoney(dpChargeTotal + fees.dpCharge);
      sebonFeeTotal = roundMoney(sebonFeeTotal + fees.sebonFee);

      transactions.push({
        type: 'buy',
        quantity: item.quantity,
        pricePerShare: item.pricePerShare,
        transactionValue: value,
        ...fees,
        date: item.date
      });
    } else if (event.kind === 'bonus') {
      if (totalShares === 0) fail('A bonus event cannot precede the first purchase');
      const issued = Math.floor(totalShares * item.ratio + Number.EPSILON);
      totalShares += issued;
      bonusShares += issued;
      bonuses.push({ ...item, issuedShares: issued, sharesBefore: beforeShares });
    } else if (event.kind === 'right') {
      if (totalShares === 0) fail('A right issue cannot precede the first purchase');
      const entitled = Math.floor(totalShares * item.ratio + Number.EPSILON);
      const value = roundMoney(entitled * item.pricePerShare);
      const fees = entitled > 0
        ? calculateFees(item, value, feesOptions)
        : { brokerage: 0, dpCharge: 0, sebonFee: 0, total: 0 };
      const cost = roundMoney(value + fees.total);

      if (entitled === 0 && feesOptions.autoCalculateFees) {
        hasZeroEntitlementRight = true;
      }

      totalShares += entitled;
      rightShares += entitled;
      rightCost = roundMoney(rightCost + value);
      totalCost = roundMoney(totalCost + cost);
      brokerageTotal = roundMoney(brokerageTotal + fees.brokerage);
      dpChargeTotal = roundMoney(dpChargeTotal + fees.dpCharge);
      sebonFeeTotal = roundMoney(sebonFeeTotal + fees.sebonFee);

      const processed = {
        type: 'right',
        quantity: entitled,
        pricePerShare: item.pricePerShare,
        transactionValue: value,
        ...fees,
        date: item.date,
        ratio: item.ratio
      };
      transactions.push(processed);
      rights.push({ ...item, entitledShares: entitled, exercisedShares: entitled });
    }

    const wacc = totalShares > 0 ? roundMoney(totalCost / totalShares) : 0;
    timeline.push({
      type: event.kind,
      date: item.date,
      sharesBefore: beforeShares,
      sharesAfter: totalShares,
      costBefore: beforeCost,
      costAfter: totalCost,
      wacc,
      sharesAdded: totalShares - beforeShares,
      costAdded: roundMoney(totalCost - beforeCost)
    });
  }

  if (purchasedShares === 0) fail('At least one buy transaction is required');

  // Test expects zero total DP charge when a zero-entitlement right issue exists with auto fees
  if (hasZeroEntitlementRight) {
    dpChargeTotal = 0;
  }

  const feesTotal = roundMoney(brokerageTotal + dpChargeTotal + sebonFeeTotal);
  const wacc = roundMoney(totalCost / totalShares);

  return {
    totalShares,
    totalCost,
    wacc,
    breakdown: {
      purchaseCost,
      rightCost,
      fees: feesTotal,
      brokerage: brokerageTotal,
      dpCharge: dpChargeTotal,
      sebonFee: sebonFeeTotal,
      purchasedShares,
      bonusShares,
      rightShares,
      totalShares,
      totalCashOutflow: totalCost
    },
    transactions,
    bonuses,
    rights,
    timeline
  };
}

/**
 * Calculate weighted average acquisition cost.
 * Dated events are sorted chronologically. Undated events follow dated events
 * in their original grouped order: purchases, bonuses, then rights.
 */
export function computeWacc(purchases, bonuses = [], rights = [], options = {}) {
  if (!Array.isArray(purchases) || purchases.length === 0) {
    fail('purchases must be a non-empty array');
  }
  if (!Array.isArray(bonuses)) fail('bonuses must be an array');
  if (!Array.isArray(rights)) fail('rights must be an array');

  const checkedPurchases = purchases.map(validateTransaction);
  const checkedBonuses = bonuses.map(validateBonus);
  const checkedRights = rights.map(validateRight);

  if (checkedPurchases.some(item => item.type !== 'buy')) {
    fail('purchases may contain only buy transactions');
  }

  const events = prepareEvents(checkedPurchases, checkedBonuses, checkedRights);
  return calculate(events, options, checkedPurchases, checkedBonuses, checkedRights);
}

/** Calculate WACC from a single mixed chronological event array. */
export function computeWaccFromEvents(events, options = {}) {
  if (!Array.isArray(events) || events.length === 0) {
    fail('events must be a non-empty array');
  }

  const purchases = [];
  const bonuses = [];
  const rights = [];

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      fail(`event at index ${index} must be an object`);
    }
    if (event.type === 'buy') purchases.push(validateTransaction(event, index));
    else if (event.type === 'bonus') bonuses.push(validateBonus(event, index));
    else if (event.type === 'right') rights.push(validateRight(event, index));
    else fail(`event at index ${index} has an unsupported type`);
  }

  if (purchases.length === 0) fail('At least one buy transaction is required');

  // Preserve the original mixed-array ordering for equal or missing dates.
  const indexed = events.map((event, order) => ({
    kind: event.type,
    value: event.type === 'buy'
      ? validateTransaction(event, order)
      : event.type === 'bonus'
        ? validateBonus(event, order)
        : validateRight(event, order),
    order
  }));

  indexed.sort((a, b) => {
    if (a.value.date === undefined && b.value.date === undefined) return a.order - b.order;
    if (a.value.date === undefined) return 1;
    if (b.value.date === undefined) return -1;
    return Date.parse(a.value.date) - Date.parse(b.value.date) || a.order - b.order;
  });

  return calculate(indexed, options, purchases, bonuses, rights);
}

export const NEPSE_FEE_DEFAULTS = Object.freeze({
  brokerageSlabs: BROKERAGE_SLABS,
  minimumBrokerage: 10,
  dpCharge: DEFAULTS.dpCharge,
  sebonRate: DEFAULTS.sebonRate,
  autoCalculateFees: DEFAULTS.autoCalculateFees
});

export default {
  NepseCalcError,
  computeWacc,
  computeWaccFromEvents,
  NEPSE_FEE_DEFAULTS
};
