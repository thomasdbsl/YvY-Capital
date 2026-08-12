# Short Description

Daily consolidated position of the asset manager's funds, extracted from INOA (fund administration/accounting): NAV, net asset value (AUM), and complete asset portfolio marked-to-market, per business day and per fund.

## Database Description (Summary)

Fund administration database, extracted from INOA: it is the daily consolidated position of each fund of the asset manager — a snapshot, per business day, of the net asset value (AUM) and the NAV per share, combined with the complete asset portfolio with prices marked-to-market by ANBIMA. Although INOA delivers this in a single report (the *PortfolioView* screen), each extraction decomposes into distinct logical tables: the daily fund summary (NAV, AUM, number of shares, and returns, at the fund $\times$ date grain), positions/portfolio (one row per contract, with quantity, price, value, exposure, indexer, maturity, duration, yield, issuer, and custodian), instrument master data (attributes of each asset, deduplicated), provisions and cash entries (fees and adjustments that affect AUM outside of performance), aggregated portfolio by asset (sum of various contracts of the same asset into a single row), and transactions (subscriptions and redemptions pending pricing; inflows and outflows of unitholders, subject to anonymization per LGPD) — all with the fund identifier masked in the repositories due to branding restrictions, and with return variations recalculated in the pipeline from the NAV series, instead of using the pre-calculated values from INOA.

## Database Description (Overview)

Fund administration database, extracted from INOA. It consists of the daily consolidated position of each of the asset manager's funds: a snapshot, per business day, of the NAV and net asset value (AUM) combined with the complete asset portfolio, with prices marked-to-market by ANBIMA. Although INOA delivers everything in a single report (the *PortfolioView* screen), each fund's daily extraction decomposes into the following logical tables, which serve as the pipeline's input:

## Tables (Name + Short Description)

**Daily Fund Summary (NAV & AUM)** - Daily snapshot per fund, containing net asset value (AUM), share value / NAV (net and gross), number of shares, and return variations across windows (daily, monthly, year-to-date, 6-month, and 12-month). *Grain: one record per fund per business day.*

**Positions / Portfolio** - Detailed portfolio composition, one row per position, containing quantity, price, value, P&L, exposure, indexer, maturity, duration, yield, issuer, sector, custodian, and price source. *Grain: fund $\times$ date $\times$ contract.*

**Instrument Master Data** — Reference and registration attributes of each asset (name, ISIN, issuer, sector, indexer, rate, issuance and maturity dates, fixed-income type), deduplicated from the positions. *Grain: one record per instrument.*

**Provisions and Cash Entries** - Fees and provisions that affect AUM outside of asset performance (management, custody, CVM, ANBIMA, audit, futures adjustments, repo settlements). *Grain: one record per provision per date.*

**Aggregated Portfolio by Asset** - A derived view that sums multiple contracts of the same asset into a single row; it is the "human-readable" view of the portfolio composition. *Grain: fund $\times$ date $\times$ asset.*

**Transactions (Subscriptions and Redemptions Pending Pricing)** - Inflows and outflows of unitholders pending NAV pricing; they explain AUM variations that do not stem from asset performance. *Grain: one record per pricing event.* *May contain unitholder data - subject to anonymization (LGPD).*


**Governance Notes:**
* The fund identifier must appear **masked** in any table uploaded to the repository (project branding restriction).
* The "variations" in the summary come **pre-calculated** by INOA — they serve as validation, but official returns must be recalculated within the pipeline based on the historical NAV series.
