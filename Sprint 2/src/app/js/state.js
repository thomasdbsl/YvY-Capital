const listeners = new Set();

export const state = {
  data: null,
  view: "overview",
  role: "direction",
  selectedFund: "FUND_01",
  period: "12m",
  scenario: "current",
  dataStatus: "loading",
  errorMessage: null,
  selectedSnapshot: null,
  allocationFilter: null,
  workflowStep: 0,
  selectedAnomaly: null,
  query: "",
};

export function setState(patch, options = {}) {
  Object.assign(state, patch);
  if (!options.silent) listeners.forEach((listener) => listener(state));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
