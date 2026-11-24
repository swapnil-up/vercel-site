const DEFAULT_DUTIES = ["Cleaning", "Gate", "Events"];
const DEFAULT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_MAX_NODES = 500000;

export class ScheduleError extends Error {
  constructor(message) {
    super(message);
    this.name = "ScheduleError";
  }
}

function validateSequence(values, label) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new ScheduleError(`${label} must be a non-empty array`);
  }
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new ScheduleError(`${label} must contain non-empty strings`);
    }
    if (seen.has(value)) {
      throw new ScheduleError(`${label} must contain unique values`);
    }
    seen.add(value);
  }
}

function validateUnavailable(unavailable, names, days) {
  if (unavailable == null) return {};
  if (typeof unavailable !== "object" || Array.isArray(unavailable)) {
    throw new ScheduleError("unavailable must be an object or null");
  }
  const knownNames = new Set(names);
  const knownDays = new Set(days);
  for (const [person, unavailableDays] of Object.entries(unavailable)) {
    if (!knownNames.has(person)) {
      throw new ScheduleError(`Unknown person: ${person}`);
    }
    if (!Array.isArray(unavailableDays)) {
      throw new ScheduleError(`Unavailable days for ${person} must be an array`);
    }
    for (const day of unavailableDays) {
      if (typeof day !== "string" || !knownDays.has(day)) {
        throw new ScheduleError(`Unknown unavailable day: ${day}`);
      }
    }
  }
  return unavailable;
}

export function generateRoster(names, unavailable, options = {}) {
  validateSequence(names, "names");
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new ScheduleError("options must be an object");
  }

  const duties = options.duties ?? DEFAULT_DUTIES;
  const days = options.days ?? DEFAULT_DAYS;
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;

  validateSequence(duties, "duties");
  validateSequence(days, "days");
  if (!Number.isSafeInteger(maxNodes) || maxNodes < 1) {
    throw new ScheduleError("maxNodes must be a positive safe integer");
  }

  const unavailableMap = validateUnavailable(unavailable, names, days);
  const unavailableSets = new Map(
    names.map(name => [name, new Set(unavailableMap[name] ?? [])])
  );

  const slots = days.flatMap((day, dayIndex) =>
    duties.map((duty, dutyIndex) => ({ dayIndex, dutyIndex }))
  );

  const assignments = new Array(slots.length).fill(null);
  const totalLoad = new Array(names.length).fill(0);
  const dutyLoad = duties.map(() => new Array(names.length).fill(0));
  const dayPeople = days.map(() => new Set());
  let visitedNodes = 0;

  function eligible(slotIndex) {
    const { dayIndex, dutyIndex } = slots[slotIndex];
    const day = days[dayIndex];
    const candidates = [];

    for (let p = 0; p < names.length; p++) {
      const name = names[p];
      if (unavailableSets.get(name).has(day)) continue;
      if (dayPeople[dayIndex].has(name)) continue;
      if (dayIndex > 0 && assignments[(dayIndex - 1) * duties.length + dutyIndex] === name) continue;
      if (dayIndex + 1 < days.length && assignments[(dayIndex + 1) * duties.length + dutyIndex] === name) continue;
      candidates.push(p);
    }

    candidates.sort((a, b) =>
      totalLoad[a] - totalLoad[b] ||
      dutyLoad[dutyIndex][a] - dutyLoad[dutyIndex][b] ||
      a - b
    );
    return candidates;
  }

  function search(assignedCount) {
    visitedNodes++;
    if (visitedNodes > maxNodes) {
      throw new ScheduleError(`Search node limit exceeded (${maxNodes})`);
    }
    if (assignedCount === slots.length) return true;

    let selectedSlot = -1;
    let selectedCandidates = null;

    for (let i = 0; i < slots.length; i++) {
      if (assignments[i] !== null) continue;
      const candidates = eligible(i);
      if (selectedCandidates === null || candidates.length < selectedCandidates.length) {
        selectedSlot = i;
        selectedCandidates = candidates;
      }
      if (candidates.length === 0) return false;
    }

    const { dayIndex, dutyIndex } = slots[selectedSlot];
    for (const personIndex of selectedCandidates) {
      const person = names[personIndex];
      assignments[selectedSlot] = person;
      totalLoad[personIndex]++;
      dutyLoad[dutyIndex][personIndex]++;
      dayPeople[dayIndex].add(person);

      if (search(assignedCount + 1)) return true;

      dayPeople[dayIndex].delete(person);
      dutyLoad[dutyIndex][personIndex]--;
      totalLoad[personIndex]--;
      assignments[selectedSlot] = null;
    }
    return false;
  }

  if (!search(0)) {
    throw new ScheduleError("No valid duty roster exists for the supplied constraints");
  }

  return slots.map((slot, index) => ({
    day: days[slot.dayIndex],
    duty: duties[slot.dutyIndex],
    person: assignments[index]
  }));
}

export function workloadSummary(rows, names) {
  if (!Array.isArray(rows)) throw new ScheduleError("rows must be an array");
  validateSequence(names, "names");
  const summary = Object.fromEntries(names.map(name => [name, 0]));

  for (const row of rows) {
    if (!row || typeof row.person !== "string" || !Object.hasOwn(summary, row.person)) {
      throw new ScheduleError("Assignment contains an unknown person");
    }
    summary[row.person]++;
  }
  return summary;
}

/**
 * Check feasibility without running the full search.
 * Returns { feasible: boolean, warnings: string[], error: string | null }
 */
export function checkFeasibility(names, unavailable, options = {}) {
  const duties = options.duties ?? DEFAULT_DUTIES;
  const days = options.days ?? DEFAULT_DAYS;
  const warnings = [];

  if (!Array.isArray(names) || names.length === 0) {
    return { feasible: false, warnings, error: "At least one person is required" };
  }
  if (!Array.isArray(duties) || duties.length === 0) {
    return { feasible: false, warnings, error: "At least one duty is required" };
  }
  if (!Array.isArray(days) || days.length === 0) {
    return { feasible: false, warnings, error: "At least one day is required" };
  }

  const totalSlots = duties.length * days.length;
  // Max possible assignments: each person can do at most 1 duty per day
  const maxPossibleAssignments = names.length * days.length;

  if (maxPossibleAssignments < totalSlots) {
    return {
      feasible: false,
      warnings,
      error: `Impossible: ${totalSlots} slots but only ${names.length} people over ${days.length} days (max ${maxPossibleAssignments} assignments)`
    };
  }

  // Check per-day: each day needs at least duties.length available people
  for (const day of days) {
    const availableForDay = names.filter(name => !(unavailable?.[name]?.includes(day) ?? false)).length;
    if (availableForDay < duties.length) {
      return {
        feasible: false,
        warnings,
        error: `${day}: only ${availableForDay} people available for ${duties.length} duties`
      };
    }
    if (availableForDay === duties.length) {
      warnings.push(`${day}: exactly ${duties.length} people available — no flexibility`);
    }
  }

  // Check for people with zero availability
  const fullyUnavailable = names.filter(name => {
    const unavailableDays = new Set(unavailable?.[name] ?? []);
    return days.every(d => unavailableDays.has(d));
  });
  if (fullyUnavailable.length > 0) {
    warnings.push(`${fullyUnavailable.join(", ")} unavailable every day`);
  }

  // Warn if tight on people
  const minPeopleNeeded = Math.ceil(totalSlots / days.length);
  if (names.length <= minPeopleNeeded + 1) {
    warnings.push(`Only ${names.length} people for ${totalSlots} slots — schedule may be tight`);
  }

  return { feasible: true, warnings, error: null };
}

/**
 * Serialize full state for export/import
 */
export function serializeState(names, unavailable, duties, days, title) {
  return JSON.stringify({
    version: 1,
    names,
    unavailable,
    duties,
    days,
    title,
    exportedAt: new Date().toISOString()
  }, null, 2);
}

/**
 * Deserialize and validate imported state
 */
export function deserializeState(jsonText) {
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new ScheduleError("Invalid JSON");
  }
  if (!data || typeof data !== "object") {
    throw new ScheduleError("Invalid state file");
  }
  if (data.version !== 1) {
    throw new ScheduleError("Unsupported state version");
  }
  if (!Array.isArray(data.names) || !Array.isArray(data.duties) || !Array.isArray(data.days)) {
    throw new ScheduleError("Missing required arrays");
  }
  if (typeof data.unavailable !== "object" || data.unavailable === null || Array.isArray(data.unavailable)) {
    throw new ScheduleError("Invalid unavailable data");
  }
  return {
    names: data.names,
    unavailable: data.unavailable,
    duties: data.duties,
    days: data.days,
    title: typeof data.title === "string" ? data.title : "Weekly Duty Roster"
  };
}
