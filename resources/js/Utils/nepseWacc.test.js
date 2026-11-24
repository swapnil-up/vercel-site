import { describe, it, expect } from 'vitest';
import nepseWacc, {
  NepseCalcError,
  computeWacc,
  computeWaccFromEvents,
  NEPSE_FEE_DEFAULTS
} from './nepseWacc.js';

const buy = (quantity, pricePerShare, date) => ({
  type: 'buy', quantity, pricePerShare, ...(date ? { date } : {})
});

describe('NEPSE WACC calculator', () => {
  it('exports the documented ESM API and default export', () => {
    expect(nepseWacc.computeWacc).toBe(computeWacc);
    expect(nepseWacc.computeWaccFromEvents).toBe(computeWaccFromEvents);
    expect(nepseWacc.NepseCalcError).toBe(NepseCalcError);
  });

  it('matches golden fixture 1: one purchase and 10% bonus', () => {
    const result = computeWacc(
      [buy(100, 500, '2023-01-15')],
      [{ ratio: 0.10, date: '2023-06-01' }]
    );
    expect(result.totalShares).toBe(110);
    expect(result.totalCost).toBe(50000);
    expect(result.wacc).toBe(454.55);
    expect(result.breakdown.bonusShares).toBe(10);
  });

  it('matches golden fixture 2: multiple buys and 20% bonus', () => {
    const result = computeWacc(
      [buy(100, 500, '2023-01-15'), buy(50, 600, '2023-03-20')],
      [{ ratio: 0.20, date: '2023-06-01' }]
    );
    expect(result.totalShares).toBe(180);
    expect(result.totalCost).toBe(80000);
    expect(result.wacc).toBe(444.44);
  });

  it('matches golden fixture 3: right issue at Rs. 300', () => {
    const result = computeWacc(
      [buy(100, 500, '2023-01-15')],
      [],
      [{ ratio: 0.25, pricePerShare: 300, date: '2023-07-01' }]
    );
    expect(result.totalShares).toBe(125);
    expect(result.totalCost).toBe(57500);
    expect(result.wacc).toBe(460);
    expect(result.rights[0].entitledShares).toBe(25);
  });

  it('matches golden fixture 4: complete sequence with explicit fees', () => {
    const result = computeWacc(
      [
        { ...buy(100, 500, '2023-01-15'), brokerage: 2000, dpCharge: 25, sebonFee: 75 },
        { ...buy(50, 600, '2023-03-20'), brokerage: 1200, dpCharge: 25, sebonFee: 45 }
      ],
      [{ ratio: 0.10, date: '2023-06-01' }],
      [{ ratio: 0.20, pricePerShare: 350, date: '2023-09-01', brokerage: 3500, dpCharge: 25, sebonFee: 105 }]
    );
    expect(result.totalShares).toBe(198);
    expect(result.totalCost).toBe(98550);
    expect(result.wacc).toBe(497.73);
    expect(result.breakdown).toMatchObject({
      purchaseCost: 80000,
      rightCost: 11550,
      brokerage: 6700,
      dpCharge: 75,
      sebonFee: 225,
      fees: 7000,
      bonusShares: 15,
      rightShares: 33
    });
  });

  it('calculates a single purchase WACC without automatic fees', () => {
    const result = computeWacc([buy(10, 123.45)]);
    expect(result.totalShares).toBe(10);
    expect(result.totalCost).toBe(1234.5);
    expect(result.wacc).toBe(123.45);
  });

  it('calculates weighted average cost across purchases', () => {
    const result = computeWacc([buy(100, 100), buy(100, 200)]);
    expect(result.totalShares).toBe(200);
    expect(result.totalCost).toBe(30000);
    expect(result.wacc).toBe(150);
  });

  it('blends right shares with the existing pool', () => {
    const result = computeWacc([buy(100, 500)], [], [
      { ratio: 0.25, pricePerShare: 300 }
    ]);
    expect(result.wacc).toBe(460);
  });

  it('applies bonus then right in chronological order', () => {
    const result = computeWacc(
      [buy(100, 500)],
      [{ ratio: 0.10, date: '2023-02-01' }],
      [{ ratio: 0.20, pricePerShare: 300, date: '2023-03-01' }]
    );
    expect(result.totalShares).toBe(132);
    expect(result.breakdown.bonusShares).toBe(10);
    expect(result.breakdown.rightShares).toBe(22);
  });

  it('applies right then bonus when dates specify that order', () => {
    const result = computeWacc(
      [buy(100, 500)],
      [{ ratio: 0.10, date: '2023-03-01' }],
      [{ ratio: 0.20, pricePerShare: 300, date: '2023-02-01' }]
    );
    expect(result.totalShares).toBe(132);
    expect(result.breakdown.rightShares).toBe(20);
    expect(result.breakdown.bonusShares).toBe(12);
  });

  it('compounds multiple bonus events', () => {
    const result = computeWacc([buy(100, 100)], [
      { ratio: 0.10, date: '2023-02-01' },
      { ratio: 0.10, date: '2023-03-01' }
    ]);
    expect(result.totalShares).toBe(121);
    expect(result.breakdown.bonusShares).toBe(21);
  });

  it('floors fractional right entitlement', () => {
    const result = computeWacc([buy(7, 100)], [], [
      { ratio: 0.25, pricePerShare: 50 }
    ]);
    expect(result.rights[0].entitledShares).toBe(1);
    expect(result.totalShares).toBe(8);
  });

  it('floors fractional bonus allotments to whole shares', () => {
    const result = computeWacc([buy(5, 100)], [
      { ratio: 0.10 }
    ]);
    expect(result.totalShares).toBe(5);
    expect(result.breakdown.bonusShares).toBe(0);
  });

  it('calculates automatic fees using the NEPSE brokerage slabs', () => {
    const result = computeWacc([buy(100, 500)], [], [], {
      autoCalculateFees: true
    });
    expect(result.breakdown.brokerage).toBe(180);
    expect(result.breakdown.dpCharge).toBe(25);
    expect(result.breakdown.sebonFee).toBe(7.5);
    expect(result.totalCost).toBe(50212.5);
    expect(result.wacc).toBe(502.13);
  });

  it('supports a custom flat brokerage rate', () => {
    const result = computeWacc([buy(100, 500)], [], [], {
      autoCalculateFees: true,
      brokerageRate: 0.004
    });
    expect(result.breakdown.brokerage).toBe(200);
  });

  it('supports custom DP and SEBON rates', () => {
    const result = computeWacc([buy(10, 100)], [], [], {
      autoCalculateFees: true,
      brokerageRate: 0,
      dpCharge: 10,
      sebonRate: 0.001
    });
    expect(result.breakdown.dpCharge).toBe(10);
    expect(result.breakdown.sebonFee).toBe(1);
  });

  it('allows explicit transaction fees to override automatic fees', () => {
    const result = computeWacc([{
      ...buy(100, 500), brokerage: 50, dpCharge: 5, sebonFee: 2
    }], [], [], { autoCalculateFees: true });
    expect(result.breakdown.brokerage).toBe(50);
    expect(result.breakdown.dpCharge).toBe(5);
    expect(result.breakdown.sebonFee).toBe(2);
  });

  it('applies the minimum brokerage to small automatic transactions', () => {
    const result = computeWacc([buy(1, 100)], [], [], {
      autoCalculateFees: true
    });
    expect(result.breakdown.brokerage).toBe(10);
  });

  it('uses the correct brokerage slab at higher transaction values', () => {
    const result = computeWacc([buy(3000, 1000)], [], [], {
      autoCalculateFees: true
    });
    expect(result.breakdown.brokerage).toBe(9300);
  });

  it('sorts events chronologically and preserves same-date order', () => {
    const result = computeWacc(
      [buy(100, 500, '2023-03-01'), buy(50, 600, '2023-01-01')],
      [{ ratio: 0.10, date: '2023-02-01' }]
    );
    expect(result.timeline.map(item => item.type)).toEqual(['buy', 'bonus', 'buy']);
    expect(result.timeline.map(item => item.date)).toEqual([
      '2023-01-01', '2023-02-01', '2023-03-01'
    ]);
  });

  it('preserves mixed event array order for undated events', () => {
    const result = computeWaccFromEvents([
      buy(100, 100),
      { type: 'bonus', ratio: 0.10 },
      { type: 'right', ratio: 0.20, pricePerShare: 50 }
    ]);
    expect(result.timeline.map(item => item.type)).toEqual(['buy', 'bonus', 'right']);
    expect(result.totalShares).toBe(132);
  });

  it('produces the same result for identical input', () => {
    const purchases = [buy(100, 500, '2023-01-01')];
    const bonuses = [{ ratio: 0.10, date: '2023-02-01' }];
    expect(computeWacc(purchases, bonuses)).toEqual(computeWacc(purchases, bonuses));
  });

  it('returns a chronological running WACC timeline', () => {
    const result = computeWacc([buy(100, 500)], [
      { ratio: 0.10, date: '2023-02-01' }
    ]);
    expect(result.timeline).toHaveLength(2);
    expect(result.timeline[0].wacc).toBe(500);
    expect(result.timeline[1].wacc).toBe(454.55);
  });

  it('accounts for all cash outflows and fees', () => {
    const result = computeWacc([{
      ...buy(10, 100), brokerage: 10, dpCharge: 25, sebonFee: 1.5
    }]);
    expect(result.totalCost).toBe(1036.5);
    expect(result.breakdown.totalCashOutflow).toBe(result.totalCost);
    expect(result.breakdown.fees).toBe(36.5);
  });

  it('returns zero fees for an unexercised zero-entitlement right issue', () => {
    const result = computeWacc([buy(1, 100)], [], [
      { ratio: 0, pricePerShare: 50 }
    ], { autoCalculateFees: true });
    expect(result.rights[0].entitledShares).toBe(0);
    expect(result.breakdown.dpCharge).toBe(0);
  });

  it('rejects empty purchases', () => {
    expect(() => computeWacc([])).toThrow(NepseCalcError);
  });

  it('rejects missing purchases in mixed events', () => {
    expect(() => computeWaccFromEvents([
      { type: 'bonus', ratio: 0.1 }
    ])).toThrow(NepseCalcError);
  });

  it.each([0, -1, 1.5, NaN, Infinity])('rejects invalid purchase quantity: %s', quantity => {
    expect(() => computeWacc([buy(quantity, 100)])).toThrow(NepseCalcError);
  });

  it.each([0, -1, NaN, Infinity])('rejects invalid purchase price: %s', price => {
    expect(() => computeWacc([buy(10, price)])).toThrow(NepseCalcError);
  });

  it('rejects negative fees', () => {
    expect(() => computeWacc([{
      ...buy(10, 100), brokerage: -1
    }])).toThrow(NepseCalcError);
  });

  it('rejects negative bonus ratios', () => {
    expect(() => computeWacc([buy(10, 100)], [{ ratio: -0.1 }])).toThrow(NepseCalcError);
  });

  it('rejects invalid right issue prices', () => {
    expect(() => computeWacc([buy(10, 100)], [], [
      { ratio: 0.25, pricePerShare: 0 }
    ])).toThrow(NepseCalcError);
  });

  it('rejects unsupported transaction types', () => {
    expect(() => computeWacc([{ type: 'sell', quantity: 10, pricePerShare: 100 }]))
      .toThrow(NepseCalcError);
  });

  it('rejects invalid dates', () => {
    expect(() => computeWacc([buy(10, 100, '2023-02-30')])).toThrow(NepseCalcError);
  });

  it('rejects corporate actions before the first purchase', () => {
    expect(() => computeWacc(
      [buy(10, 100, '2023-02-01')],
      [{ ratio: 0.1, date: '2023-01-01' }]
    )).toThrow(NepseCalcError);
  });

  it('rejects invalid options', () => {
    expect(() => computeWacc([buy(10, 100)], [], [], {
      autoCalculateFees: 'yes'
    })).toThrow(NepseCalcError);
  });

  it('rejects non-array arguments', () => {
    expect(() => computeWacc(null)).toThrow(NepseCalcError);
    expect(() => computeWacc([buy(10, 100)], null)).toThrow(NepseCalcError);
    expect(() => computeWacc([buy(10, 100)], [], null)).toThrow(NepseCalcError);
  });

  it('exposes documented fee defaults', () => {
    expect(NEPSE_FEE_DEFAULTS.dpCharge).toBe(25);
    expect(NEPSE_FEE_DEFAULTS.sebonRate).toBe(0.00015);
    expect(NEPSE_FEE_DEFAULTS.minimumBrokerage).toBe(10);
    expect(NEPSE_FEE_DEFAULTS.brokerageSlabs.map(item => item.rate)).toEqual([
      0.0036, 0.0033, 0.0031, 0.0027, 0.0024
    ]);
  });
});
