export const ACCOUNT_NUDGE_FIRST_LOAD = 2;
export const ACCOUNT_NUDGE_REPEAT_GAP = 4;

function normalizeLoad(value, fallback = 0) {
  const load = Math.floor(Number(value));
  return Number.isFinite(load) && load >= 0 ? load : fallback;
}

export function nextPortalLoad(value) {
  return normalizeLoad(value) + 1;
}

export function accountNudgeIsDue(currentLoad, nextLoad = ACCOUNT_NUDGE_FIRST_LOAD) {
  return normalizeLoad(currentLoad) >= normalizeLoad(nextLoad, ACCOUNT_NUDGE_FIRST_LOAD);
}

export function nextAccountNudgeLoad(currentLoad) {
  return normalizeLoad(currentLoad) + ACCOUNT_NUDGE_REPEAT_GAP;
}
