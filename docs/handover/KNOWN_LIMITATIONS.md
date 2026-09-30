# Known limitations

This file records the boundaries of the technically verified 1.0.0 source release. It is not a statement of YvY acceptance or production deployment.

| Item | Current boundary | Required evidence or action |
| --- | --- | --- |
| Peer benchmarking | Adapter and tests exist; no certified peer dataset is connected | YvY authorization, source, entity/category mapping and permitted methodology |
| Stress and DV01 | Source values are preserved; exact scale, units and interpretation remain unconfirmed | Written partner confirmation with representative examples |
| Hosting | Local MAMP/PHP environment; no YvY production target supplied | Host, HTTPS/origin, operator, permissions, retention and scheduling decisions |
| Partner acceptance | Technical tests are not business acceptance | Executive/Analyst UAT and written outcome |
| Ingestion concurrency | OS-managed lock protects one host/shared lock directory | Single designated ingestion host; cross-host coordination before multi-host scheduling |
| Source freshness | Data reflects authorized export dates, not live market time | Agreed delivery schedule and stale-data thresholds |
| Incomplete source history | Some metrics or holdings are unavailable; quarantine can reduce coverage | Corrected/extended authorized exports, not artificial zero replacement |
| Fund-universe changes | Existing aliases cannot be reassigned, and referenced funds cannot be silently removed | Controlled mapping review before importing a changed universe |
| Recovery | Backups are not encrypted by the script | Protected storage, encryption/retention and restore ownership defined by operator |
| Browser support | Automated Chromium is the current regression baseline | Test other browsers before claiming support |

## Verification and publication boundary

The gap matrix records the actual upgrade, fresh installation, controlled replay, manual browser review, full regression, performance and clean-extraction evidence. Version 1.0.0 passed the complete suite from the extracted source package. Its backup restored all 29 tables and 13,360 rows with matching content hashes; restored API and twelve-view browser checks passed. Failed-attempt monitoring has the pre-schema/database-outage limitations described in the operations guide.

Raw source files and the source ZIP were historically tracked in the public repository. Their removal from current Git tracking preserves the local originals but does not remove historical copies. History has not been rewritten. Any historical confidentiality remediation is a separate repository-owner decision; the release archive contains no raw partner dataset or database dump. Git publication status and commit identity must be verified from Git, not inferred from the package version.
