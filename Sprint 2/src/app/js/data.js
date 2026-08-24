const classes = ["Private credit", "Sovereign debt", "Funds", "Equities", "Cash", "Derivatives"];

function fallbackFunds() {
  return Array.from({ length: 14 }, (_, index) => {
    const number = index + 1;
    return {
      id: `FUND_${String(number).padStart(2, "0")}`,
      label: `FUND_${String(number).padStart(2, "0")}`,
      coverage: number <= 7 ? "snapshot-and-history" : "history-only",
      aum_brl: 12_000_000 + number * 1_375_000,
      nav_per_share: 98 + number * 1.25,
      daily_return: (number - 7) * 0.0007,
      quality_status: [4, 11].includes(number) ? "incomplete" : "current",
      freshness_status: number === 6 ? "late" : "current",
      lineage_ref: `LIN_FUND_${String(number).padStart(2, "0")}`,
    };
  });
}

function fallbackPositions() {
  return Array.from({ length: 18 }, (_, index) => {
    const number = index + 1;
    return {
      id: `POS_${String(number).padStart(2, "0")}`,
      fund_id: "FUND_01",
      instrument: `INSTR_${String(number).padStart(2, "0")}`,
      issuer: `EMET_${String((index % 6) + 1).padStart(2, "0")}`,
      custodian: `CUSTO_${String((index % 3) + 1).padStart(2, "0")}`,
      asset_class: classes[index % classes.length],
      value_brl: 900_000 - number * 21_000,
      weight: (20 - number) / 210,
      price_age_days: 6 + number,
      lineage_ref: `LIN_POS_${String(number).padStart(2, "0")}`,
    };
  });
}

function fallbackHistory() {
  return Array.from({ length: 12 }, (_, index) => ({
    date: `2026-${String(index + 1).padStart(2, "0")}-01`,
    fund_id: "FUND_01",
    nav_index: 100 + index * 1.15 + (index % 3) * 0.4,
    benchmark_index: 100 + index * 0.82,
    lineage_ref: `LIN_HIST_${String(index + 1).padStart(2, "0")}`,
  }));
}

function fallbackKpis() {
  const ids = [...Array.from({ length: 16 }, (_, index) => `K${String(index + 1).padStart(2, "0")}`), ...Array.from({ length: 8 }, (_, index) => `H${String(index + 1).padStart(2, "0")}`)];
  return ids.map((id, index) => ({
    id,
    name: id.startsWith("K") ? `Snapshot KPI ${id}` : `Historical KPI ${id}`,
    value: ["H04", "H06", "H08"].includes(id) ? null : 0.0125 * (index + 1),
    unit: id === "K01" ? "BRL" : "percent",
    quality_status: ["K13", "K14", "H04", "H06", "H08"].includes(id) ? "hypothesis" : "current",
    lineage_ref: `LIN_KPI_${id}`,
  }));
}

export function createFallbackData() {
  return {
    meta: { run_id: "SPRINT2-WF-001", classification: "synthetic-example", generated_at: "2026-08-22T00:00:00Z", publication_allowed: true, business_date: "2026-08-22" },
    funds: fallbackFunds(),
    positions: fallbackPositions(),
    history: fallbackHistory(),
    kpis: fallbackKpis(),
    allocation: [
      { asset_class: "Private credit", weight: 0.32 },
      { asset_class: "Sovereign debt", weight: 0.24 },
      { asset_class: "Funds", weight: 0.18 },
      { asset_class: "Equities", weight: 0.13 },
      { asset_class: "Cash", weight: 0.08 },
      { asset_class: "Derivatives", weight: 0.05 },
    ],
    anomalies: [
      { anomaly_id: "ANOM_DURATION", rule_id: "DQ12", severity: "warning", status: "open", title: "Duration cannot be converted", record_ref: "REC_DURATION", action: "quarantine" },
      { anomaly_id: "ANOM_STALE", rule_id: "DQ15", severity: "warning", status: "open", title: "Stale price", record_ref: "REC_STALE", action: "review" },
      { anomaly_id: "ANOM_NAV", rule_id: "DQ07", severity: "blocking", status: "open", title: "Non-positive NAV", record_ref: "REC_NAV_NEGATIVE", action: "quarantine" },
      { anomaly_id: "ANOM_BRIDGE", rule_id: "DQ30", severity: "warning", status: "open", title: "Fund-of-funds relationship pending validation", record_ref: "REC_BRIDGE", action: "review" },
    ],
    runs: [{ run_id: "SPRINT2-WF-001", status: "published-synthetic", generated_at: "2026-08-22T00:00:00Z", accepted_records: 49, quarantined_records: 5, manifest_ref: "manifest.json" }],
    lineage_proofs: [
      { screen_value_id: "executive-aum", kpi_id: "K01", lineage_ref: "LIN_KPI_K01", source_id: "SRC_SYNTHETIC_FIXTURES", source_record_id: "REC_SNAPSHOT_01", run_id: "SPRINT2-WF-001", business_date: "2026-08-22" },
      { screen_value_id: "allocation-credit", kpi_id: "K05", lineage_ref: "LIN_KPI_K05", source_id: "SRC_SYNTHETIC_FIXTURES", source_record_id: "REC_POSITION_01", run_id: "SPRINT2-WF-001", business_date: "2026-08-22" },
      { screen_value_id: "quality-blocking", kpi_id: "K16", lineage_ref: "LIN_KPI_K16", source_id: "SRC_SYNTHETIC_FIXTURES", source_record_id: "REC_QUALITY_01", run_id: "SPRINT2-WF-001", business_date: "2026-08-22" },
    ],
    peer_sample: Array.from({ length: 6 }, (_, index) => ({ peer_id: `PEER_${String(index + 1).padStart(2, "0")}`, return_index: 99 + index * 1.7, status: "sample" })),
  };
}

export async function loadData() {
  try {
    const response = await fetch("../pipeline/output/serving_data.json", { cache: "no-store" });
    if (!response.ok) throw new Error("generated dataset unavailable");
    const data = await response.json();
    if (data?.meta?.classification !== "synthetic-example") throw new Error("unsafe dataset classification");
    return data;
  } catch {
    return createFallbackData();
  }
}
