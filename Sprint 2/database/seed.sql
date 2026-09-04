-- Deterministic seed generated only from the current synthetic dashboard fixture.

USE yvy_funds_manager_demo;

SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM lineage_proofs;
DELETE FROM anomalies;
DELETE FROM peer_samples;

DELETE FROM fund_kpis;
DELETE FROM performance_history;
DELETE FROM positions;

DELETE FROM allocations;
DELETE FROM funds;
DELETE FROM dataset_runs;

SET FOREIGN_KEY_CHECKS = 1;
START TRANSACTION;

INSERT INTO dataset_runs (run_id, status, generated_at, accepted_records, quarantined_records, manifest_ref, classification, publication_allowed, business_date) VALUES
  ('SPRINT2-WF-001', 'published-synthetic', '2026-08-22 00:00:00', 49, 6, 'manifest.json', 'synthetic-example', 1, '2026-08-22');

INSERT INTO funds (fund_id, label, coverage, aum_brl, nav_per_share, daily_return, quality_status, freshness_status, lineage_ref, sort_order) VALUES
  ('FUND_01', 'FUND_01', 'snapshot-and-history', 13375000, 99.25, -0.0042, 'current', 'current', 'LIN_FUND_01', 1),
  ('FUND_02', 'FUND_02', 'snapshot-and-history', 14750000, 100.5, -0.0035, 'current', 'current', 'LIN_FUND_02', 2),
  ('FUND_03', 'FUND_03', 'snapshot-and-history', 16125000, 101.75, -0.0028, 'current', 'current', 'LIN_FUND_03', 3),
  ('FUND_04', 'FUND_04', 'snapshot-and-history', 17500000, 103, -0.0021, 'incomplete', 'current', 'LIN_FUND_04', 4),
  ('FUND_05', 'FUND_05', 'snapshot-and-history', 18875000, 104.25, -0.0014, 'current', 'current', 'LIN_FUND_05', 5),
  ('FUND_06', 'FUND_06', 'snapshot-and-history', 20250000, 105.5, -0.0007, 'current', 'late', 'LIN_FUND_06', 6),
  ('FUND_07', 'FUND_07', 'snapshot-and-history', 21625000, 106.75, 0, 'current', 'current', 'LIN_FUND_07', 7),
  ('FUND_08', 'FUND_08', 'history-only', 23000000, 108, 0.0007, 'current', 'current', 'LIN_FUND_08', 8),
  ('FUND_09', 'FUND_09', 'history-only', 24375000, 109.25, 0.0014, 'current', 'current', 'LIN_FUND_09', 9),
  ('FUND_10', 'FUND_10', 'history-only', 25750000, 110.5, 0.0021, 'current', 'current', 'LIN_FUND_10', 10),
  ('FUND_11', 'FUND_11', 'history-only', 27125000, 111.75, 0.0028, 'incomplete', 'current', 'LIN_FUND_11', 11),
  ('FUND_12', 'FUND_12', 'history-only', 28500000, 113, 0.0035, 'current', 'current', 'LIN_FUND_12', 12),
  ('FUND_13', 'FUND_13', 'history-only', 29875000, 114.25, 0.0042, 'current', 'current', 'LIN_FUND_13', 13),
  ('FUND_14', 'FUND_14', 'history-only', 31250000, 115.5, 0.0049, 'current', 'current', 'LIN_FUND_14', 14);

INSERT INTO allocations (run_id, fund_id, asset_class, weight, sort_order) VALUES
  ('SPRINT2-WF-001', NULL, 'Private credit', 0.32, 1),
  ('SPRINT2-WF-001', NULL, 'Sovereign debt', 0.24, 2),
  ('SPRINT2-WF-001', NULL, 'Funds', 0.18, 3),
  ('SPRINT2-WF-001', NULL, 'Equities', 0.13, 4),
  ('SPRINT2-WF-001', NULL, 'Cash', 0.08, 5),
  ('SPRINT2-WF-001', NULL, 'Derivatives', 0.05, 6);

INSERT INTO positions (position_id, fund_id, instrument_alias, issuer_alias, custodian_alias, asset_class, value_brl, weight, price_age_days, lineage_ref, sort_order) VALUES
  ('POS_01', 'FUND_01', 'INSTR_01', 'EMET_01', 'CUSTO_01', 'Private credit', 879000, 0.0905, 7, 'LIN_POS_01', 1),
  ('POS_02', 'FUND_01', 'INSTR_02', 'EMET_02', 'CUSTO_02', 'Sovereign debt', 858000, 0.0857, 8, 'LIN_POS_02', 2),
  ('POS_03', 'FUND_01', 'INSTR_03', 'EMET_03', 'CUSTO_03', 'Funds', 837000, 0.081, 9, 'LIN_POS_03', 3),
  ('POS_04', 'FUND_01', 'INSTR_04', 'EMET_04', 'CUSTO_01', 'Equities', 816000, 0.0762, 10, 'LIN_POS_04', 4),
  ('POS_05', 'FUND_01', 'INSTR_05', 'EMET_05', 'CUSTO_02', 'Cash', 795000, 0.0714, 11, 'LIN_POS_05', 5),
  ('POS_06', 'FUND_01', 'INSTR_06', 'EMET_06', 'CUSTO_03', 'Derivatives', 774000, 0.0667, 12, 'LIN_POS_06', 6),
  ('POS_07', 'FUND_01', 'INSTR_07', 'EMET_01', 'CUSTO_01', 'Private credit', 753000, 0.0619, 13, 'LIN_POS_07', 7),
  ('POS_08', 'FUND_01', 'INSTR_08', 'EMET_02', 'CUSTO_02', 'Sovereign debt', 732000, 0.0571, 14, 'LIN_POS_08', 8),
  ('POS_09', 'FUND_01', 'INSTR_09', 'EMET_03', 'CUSTO_03', 'Funds', 711000, 0.0524, 15, 'LIN_POS_09', 9),
  ('POS_10', 'FUND_01', 'INSTR_10', 'EMET_04', 'CUSTO_01', 'Equities', 690000, 0.0476, 16, 'LIN_POS_10', 10),
  ('POS_11', 'FUND_01', 'INSTR_11', 'EMET_05', 'CUSTO_02', 'Cash', 669000, 0.0429, 17, 'LIN_POS_11', 11),
  ('POS_12', 'FUND_01', 'INSTR_12', 'EMET_06', 'CUSTO_03', 'Derivatives', 648000, 0.0381, 18, 'LIN_POS_12', 12),
  ('POS_13', 'FUND_01', 'INSTR_13', 'EMET_01', 'CUSTO_01', 'Private credit', 627000, 0.0333, 19, 'LIN_POS_13', 13),
  ('POS_14', 'FUND_01', 'INSTR_14', 'EMET_02', 'CUSTO_02', 'Sovereign debt', 606000, 0.0286, 20, 'LIN_POS_14', 14),
  ('POS_15', 'FUND_01', 'INSTR_15', 'EMET_03', 'CUSTO_03', 'Funds', 585000, 0.0238, 21, 'LIN_POS_15', 15),
  ('POS_16', 'FUND_01', 'INSTR_16', 'EMET_04', 'CUSTO_01', 'Equities', 564000, 0.019, 22, 'LIN_POS_16', 16),
  ('POS_17', 'FUND_01', 'INSTR_17', 'EMET_05', 'CUSTO_02', 'Cash', 543000, 0.0143, 23, 'LIN_POS_17', 17),
  ('POS_18', 'FUND_01', 'INSTR_18', 'EMET_06', 'CUSTO_03', 'Derivatives', 522000, 0.0095, 24, 'LIN_POS_18', 18);

INSERT INTO performance_history (fund_id, business_date, nav_index, benchmark_index, lineage_ref, sort_order) VALUES
  ('FUND_01', '2026-01-01', 100, 100, 'LIN_HIST_01', 1),
  ('FUND_01', '2026-02-01', 101.55, 100.82, 'LIN_HIST_02', 2),
  ('FUND_01', '2026-03-01', 103.1, 101.64, 'LIN_HIST_03', 3),
  ('FUND_01', '2026-04-01', 103.45, 102.46, 'LIN_HIST_04', 4),
  ('FUND_01', '2026-05-01', 105, 103.28, 'LIN_HIST_05', 5),
  ('FUND_01', '2026-06-01', 106.55, 104.1, 'LIN_HIST_06', 6),
  ('FUND_01', '2026-07-01', 106.9, 104.92, 'LIN_HIST_07', 7),
  ('FUND_01', '2026-08-01', 108.45, 105.74, 'LIN_HIST_08', 8),
  ('FUND_01', '2026-09-01', 110, 106.56, 'LIN_HIST_09', 9),
  ('FUND_01', '2026-10-01', 110.35, 107.38, 'LIN_HIST_10', 10),
  ('FUND_01', '2026-11-01', 111.9, 108.2, 'LIN_HIST_11', 11),
  ('FUND_01', '2026-12-01', 113.45, 109.02, 'LIN_HIST_12', 12);

INSERT INTO fund_kpis (kpi_id, fund_id, name, value, unit, quality_status, implementation_status, lineage_ref, sort_order) VALUES
  ('K01', NULL, 'Actif net', 0.0125, 'BRL', 'current', 'implemented-synthetic', 'LIN_KPI_K01', 1),
  ('K02', NULL, 'Valeur de part', 0.025, 'BRL/share', 'current', 'implemented-synthetic', 'LIN_KPI_K02', 2),
  ('K03', NULL, 'Nombre de parts', 0.0375, 'shares', 'current', 'implemented-synthetic', 'LIN_KPI_K03', 3),
  ('K04', NULL, 'Identite NAV', 0.05, 'BRL', 'hypothesis', 'implemented-synthetic', 'LIN_KPI_K04', 4),
  ('K05', NULL, 'Allocation par classe', 0.0625, 'percent', 'current', 'implemented-synthetic', 'LIN_KPI_K05', 5),
  ('K06', NULL, 'Poids de position', 0.075, 'percent', 'current', 'implemented-synthetic', 'LIN_KPI_K06', 6),
  ('K07', NULL, 'Concentration Top N', 0.0875, 'percent', 'current', 'implemented-synthetic', 'LIN_KPI_K07', 7),
  ('K08', NULL, 'HHI', 0.1, 'index', 'current', 'implemented-synthetic', 'LIN_KPI_K08', 8),
  ('K09', NULL, 'Exposition par indexeur', 0.1125, 'BRL', 'current', 'implemented-synthetic', 'LIN_KPI_K09', 9),
  ('K10', NULL, 'Concentration emetteur', 0.125, 'percent', 'current', 'implemented-synthetic', 'LIN_KPI_K10', 10),
  ('K11', NULL, 'Echeances', 0.1375, 'BRL', 'current', 'implemented-synthetic', 'LIN_KPI_K11', 11),
  ('K12', NULL, 'Caisse et provisions', 0.15, 'BRL', 'current', 'implemented-synthetic', 'LIN_KPI_K12', 12),
  ('K13', NULL, 'Rapprochement actif net', 0.1625, 'BRL', 'hypothesis', 'implemented-synthetic', 'LIN_KPI_K13', 13),
  ('K14', NULL, 'Encours brut et transparise', 0.175, 'BRL', 'hypothesis', 'implemented-synthetic', 'LIN_KPI_K14', 14),
  ('K15', NULL, 'Fraicheur des prix', 0.1875, 'days', 'hypothesis', 'implemented-synthetic', 'LIN_KPI_K15', 15),
  ('K16', NULL, 'Qualite du run', 0.2, 'count', 'current', 'implemented-synthetic', 'LIN_KPI_K16', 16),
  ('H01', NULL, 'Rendement quotidien', 0.2125, 'percent', 'current', 'interface-and-test', 'LIN_KPI_H01', 17),
  ('H02', NULL, 'Rendement cumule', 0.225, 'percent', 'hypothesis', 'interface-and-test', 'LIN_KPI_H02', 18),
  ('H03', NULL, 'Volatilite annualisee', 0.2375, 'percent annualized', 'hypothesis', 'interface-and-test', 'LIN_KPI_H03', 19),
  ('H04', NULL, 'Sharpe et Sortino', NULL, 'ratio', 'hypothesis', 'contract-only', 'LIN_KPI_H04', 20),
  ('H05', NULL, 'Drawdown maximal', 0.2625, 'percent', 'current', 'interface-and-test', 'LIN_KPI_H05', 21),
  ('H06', NULL, 'DV01 et stress', NULL, 'BRL', 'hypothesis', 'contract-only', 'LIN_KPI_H06', 22),
  ('H07', NULL, 'Comparaison aux pairs', 0.2875, 'percentile', 'hypothesis', 'adapter-interface', 'LIN_KPI_H07', 23),
  ('H08', NULL, 'Attribution et flux', NULL, 'BRL', 'hypothesis', 'contract-only', 'LIN_KPI_H08', 24);

INSERT INTO peer_samples (peer_id, run_id, return_index, status, sort_order) VALUES
  ('PEER_01', 'SPRINT2-WF-001', 99.7, 'sample', 1),
  ('PEER_02', 'SPRINT2-WF-001', 101.4, 'sample', 2),
  ('PEER_03', 'SPRINT2-WF-001', 103.1, 'sample', 3),
  ('PEER_04', 'SPRINT2-WF-001', 104.8, 'sample', 4),
  ('PEER_05', 'SPRINT2-WF-001', 106.5, 'sample', 5),
  ('PEER_06', 'SPRINT2-WF-001', 108.2, 'sample', 6);

INSERT INTO anomalies (anomaly_id, run_id, rule_id, severity, status, title, record_ref, action, sort_order) VALUES
  ('ANOM_EXPORT_EMPTY_SECTION_38_CSV', 'SPRINT2-WF-001', 'DQ23', 'info', 'open', 'Section present but empty', 'REC_EXPORT_EMPTY_SECTION_38_CSV', 'review', 1),
  ('ANOM_DURATION', 'SPRINT2-WF-001', 'DQ12', 'warning', 'open', 'Duration cannot be converted', 'REC_DURATION', 'quarantine', 2),
  ('ANOM_STALE', 'SPRINT2-WF-001', 'DQ15', 'warning', 'open', 'Stale price', 'REC_STALE', 'review', 3),
  ('ANOM_NAV_NEGATIVE', 'SPRINT2-WF-001', 'DQ07', 'blocking', 'open', 'Non-positive NAV', 'REC_NAV_NEGATIVE', 'quarantine', 4),
  ('ANOM_DRAWDOWN', 'SPRINT2-WF-001', 'DQ24', 'blocking', 'open', 'Drawdown outside valid domain', 'REC_DRAWDOWN', 'quarantine', 5),
  ('ANOM_FORBIDDEN', 'SPRINT2-WF-001', 'DQ20', 'blocking', 'open', 'Forbidden name detected in input', 'REC_FORBIDDEN', 'quarantine', 6),
  ('ANOM_PRIVATE_ID', 'SPRINT2-WF-001', 'DQ21', 'blocking', 'open', 'Private identifier detected in input', 'REC_PRIVATE_ID', 'quarantine', 7),
  ('ANOM_PEER_B', 'SPRINT2-WF-001', 'DQ22', 'warning', 'open', 'Duplicate synthetic peer', 'REC_PEER_B', 'quarantine', 8),
  ('ANOM_EMPTY', 'SPRINT2-WF-001', 'DQ23', 'info', 'open', 'Section present but empty', 'REC_EMPTY', 'review', 9),
  ('ANOM_BRIDGE', 'SPRINT2-WF-001', 'DQ30', 'warning', 'open', 'Fund-of-funds relationship pending validation', 'REC_BRIDGE', 'review', 10);

INSERT INTO lineage_proofs (screen_value_id, kpi_id, lineage_ref, source_id, source_record_id, run_id, business_date, sort_order) VALUES
  ('executive-aum', 'K01', 'LIN_KPI_K01', 'SRC_SYNTHETIC_FIXTURES', 'REC_SNAPSHOT_01', 'SPRINT2-WF-001', '2026-08-22', 1),
  ('allocation-credit', 'K05', 'LIN_KPI_K05', 'SRC_SYNTHETIC_FIXTURES', 'REC_POSITION_01', 'SPRINT2-WF-001', '2026-08-22', 2),
  ('quality-blocking', 'K16', 'LIN_KPI_K16', 'SRC_SYNTHETIC_FIXTURES', 'REC_QUALITY_01', 'SPRINT2-WF-001', '2026-08-22', 3);

COMMIT;
