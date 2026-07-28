export const ACCOUNT_NUDGE_FIRST_LOAD = 5;
export const ACCOUNT_NUDGE_SECOND_LOAD = 10;
export const ACCOUNT_NUDGE_DISABLED_LOAD = Number.MAX_SAFE_INTEGER;

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
  return normalizeLoad(currentLoad) < ACCOUNT_NUDGE_SECOND_LOAD
    ? ACCOUNT_NUDGE_SECOND_LOAD
    : ACCOUNT_NUDGE_DISABLED_LOAD;
}
