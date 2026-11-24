import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { generateRoster, workloadSummary, ScheduleError, checkFeasibility, serializeState, deserializeState } from "./dutyRoster.js";

const golden = JSON.parse(readFileSync(new URL("./fixtures/golden.json", import.meta.url), "utf8"));
const names = ["Asha","Ravi","Sita","Hari","Mina","Kiran","Priya","Arun","Deepa","Vikram","Leela","Mohan","Nina","Raj","Zara"];
const unavailable = { Asha:["Mon","Tue"], Ravi:["Fri"], Sita:["Wed"], Hari:["Sat","Sun"], Mina:["Mon"] };
const duties = ["Cleaning","Gate","Events"];
const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

describe("generateRoster", () => {
  it("matches the committed deterministic golden fixture", () => {
    const rows = generateRoster(names, unavailable, { duties, days });
    expect(rows).toEqual(golden.assignments);
    expect(workloadSummary(rows, names)).toEqual(golden.workloadSummary);
  });

  it("fills all slots in day and duty order", () => {
    const rows = generateRoster(names, null, { duties, days });
    expect(rows).toHaveLength(21);
    expect(rows.map(row => [row.day, row.duty])).toEqual(
      days.flatMap(day => duties.map(duty => [day, duty]))
    );
  });

  it("never assigns a person twice on one day", () => {
    const rows = generateRoster(names, unavailable, { duties, days });
    for (const day of days) {
      const people = rows.filter(row => row.day === day).map(row => row.person);
      expect(new Set(people).size).toBe(people.length);
    }
  });

  it("respects unavailable days", () => {
    const rows = generateRoster(names, unavailable, { duties, days });
    for (const row of rows) {
      expect(unavailable[row.person] ?? []).not.toContain(row.day);
    }
  });

  it("prevents the same duty on adjacent days", () => {
    const rows = generateRoster(names, unavailable, { duties, days });
    for (let i = 1; i < days.length; i++) {
      for (const duty of duties) {
        const previous = rows.find(row => row.day === days[i - 1] && row.duty === duty);
        const current = rows.find(row => row.day === days[i] && row.duty === duty);
        expect(current.person).not.toBe(previous.person);
      }
    }
  });

  it("uses default duties and days", () => {
    expect(generateRoster(names, null)).toHaveLength(21);
  });

  it("treats null and empty unavailability equally", () => {
    expect(generateRoster(names, null)).toEqual(generateRoster(names, {}));
  });

  it("rejects invalid or duplicate names", () => {
    expect(() => generateRoster([], null)).toThrow(ScheduleError);
    expect(() => generateRoster(["A", "A"], null)).toThrow(ScheduleError);
    expect(() => generateRoster(["A", ""], null)).toThrow(ScheduleError);
  });

  it("rejects invalid duties and days", () => {
    expect(() => generateRoster(names, null, { duties: [] })).toThrow(ScheduleError);
    expect(() => generateRoster(names, null, { duties: ["A", "A"] })).toThrow(ScheduleError);
    expect(() => generateRoster(names, null, { days: ["Mon", "Mon"] })).toThrow(ScheduleError);
  });

  it("rejects unknown unavailable people and days", () => {
    expect(() => generateRoster(names, { Unknown: ["Mon"] })).toThrow(ScheduleError);
    expect(() => generateRoster(names, { Asha: ["Holiday"] })).toThrow(ScheduleError);
  });

  it("rejects malformed inputs and options", () => {
    expect(() => generateRoster(names, [])).toThrow(ScheduleError);
    expect(() => generateRoster(names, { Asha: "Mon" })).toThrow(ScheduleError);
    expect(() => generateRoster(names, null, null)).toThrow(ScheduleError);
    expect(() => generateRoster(names, null, { maxNodes: 0 })).toThrow(ScheduleError);
  });

  it("throws for an impossible schedule", () => {
    expect(() => generateRoster(["A", "B"], null, {
      duties: ["One", "Two", "Three"], days: ["Mon"]
    })).toThrow(ScheduleError);
  });

  it("enforces the search node limit", () => {
    expect(() => generateRoster(names, unavailable, {
      duties, days, maxNodes: 1
    })).toThrow(/node limit/i);
  });
});

describe("workloadSummary", () => {
  it("includes zero-count people in input order", () => {
    expect(workloadSummary([{ person: "A" }], ["A", "B", "C"])).toEqual({ A: 1, B: 0, C: 0 });
  });

  it("counts assignments", () => {
    expect(workloadSummary([{ person: "A" }, { person: "B" }, { person: "A" }], ["A", "B"]))
      .toEqual({ A: 2, B: 1 });
  });

  it("rejects unknown people and invalid inputs", () => {
    expect(() => workloadSummary([{ person: "X" }], ["A"])).toThrow(ScheduleError);
    expect(() => workloadSummary([], [])).toThrow(ScheduleError);
    expect(() => workloadSummary(null, ["A"])).toThrow(ScheduleError);
  });
});

describe("checkFeasibility", () => {
  const baseNames = ["A", "B", "C"];
  const baseDuties = ["D1", "D2"];
  const baseDays = ["Mon", "Tue"];

  it("passes for a simple viable case", () => {
    const r = checkFeasibility(baseNames, null, { duties: baseDuties, days: baseDays });
    expect(r.feasible).toBe(true);
    expect(r.error).toBeNull();
  });

  it("fails when not enough people for slots", () => {
    const r = checkFeasibility(["A"], null, { duties: ["D1", "D2", "D3"], days: ["Mon"] });
    expect(r.feasible).toBe(false);
    expect(r.error).toContain("Impossible");
  });

  it("fails when a day has fewer available people than duties", () => {
    const r = checkFeasibility(["A", "B"], { A: ["Mon"] }, { duties: ["D1", "D2"], days: ["Mon", "Tue"] });
    expect(r.feasible).toBe(false);
    expect(r.error).toContain("Mon");
  });

  it("warns when a day has exactly enough people", () => {
    // 2 people, A unavailable Mon, so Mon has 1 available person (B), 1 duty = exactly enough
    const r = checkFeasibility(["A", "B"], { A: ["Mon"] }, { duties: ["D1"], days: ["Mon", "Tue"] });
    expect(r.feasible).toBe(true);
    expect(r.warnings.some(w => w.includes("Mon") && w.includes("exactly"))).toBe(true);
  });

  it("warns about fully unavailable people", () => {
    const r = checkFeasibility(["A", "B"], { A: ["Mon", "Tue"] }, { duties: ["D1"], days: ["Mon", "Tue"] });
    expect(r.warnings.some(w => w.includes("A"))).toBe(true);
  });

  it("warns when tight on people", () => {
    // 2 people, 2 duties, 2 days = 4 slots, max per person = 2 days = 4 max, minPeopleNeeded = 2
    const r = checkFeasibility(["A", "B"], null, { duties: ["D1", "D2"], days: ["Mon", "Tue"] });
    expect(r.feasible).toBe(true);
    expect(r.warnings.some(w => w.includes("tight"))).toBe(true);
  });
});

describe("serializeState / deserializeState", () => {
  it("round-trips a valid state", () => {
    const names = ["A", "B"];
    const unavailable = { A: ["Mon"] };
    const duties = ["D1"];
    const days = ["Mon", "Tue"];
    const title = "Test";
    const json = serializeState(names, unavailable, duties, days, title);
    const restored = deserializeState(json);
    expect(restored.names).toEqual(names);
    expect(restored.unavailable).toEqual(unavailable);
    expect(restored.duties).toEqual(duties);
    expect(restored.days).toEqual(days);
    expect(restored.title).toBe(title);
  });

  it("rejects invalid JSON", () => {
    expect(() => deserializeState("not json")).toThrow(ScheduleError);
  });

  it("rejects wrong version", () => {
    expect(() => deserializeState('{"version": 2}')).toThrow(ScheduleError);
  });

  it("rejects missing arrays", () => {
    expect(() => deserializeState('{"version": 1}')).toThrow(ScheduleError);
  });
});
