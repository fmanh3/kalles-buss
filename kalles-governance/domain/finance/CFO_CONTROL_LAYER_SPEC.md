# Specification: CFO Agent Control Layer (v1.1)

## 1. Vision
To provide a data-driven financial operating system where an AI Agent (CFO) can manage the company's economy via APIs. The system enforces the "Triple Ring" architecture:
- **Inner Ring:** The immutable Double-Entry General Ledger.
- **Middle Ring:** Intelligence (Posting Rules, Asset Lifecycle, Tax Logic).
- **Outer Ring:** External Interfaces (Bankgirot, Skatteverket, SL).

---

## 2. Domain Data Models (The CFO's Tools)

### A. Chart of Accounts (BAS-kontoplan)
Accounts must be configurable to support the Swedish BAS standard.
```typescript
interface Account {
  code: string;           // e.g., "1930"
  name: string;           // e.g., "Företagskonto / Checkräkningskonto"
  type: 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE' | 'EQUITY';
  balance_side: 'DEBIT' | 'CREDIT';
  vat_code?: string;      // Optional default VAT mapping
  is_active: boolean;
}
```

### B. Intelligent Posting Rules
Translates domain events into ledger entries using dynamic templates.
```typescript
interface PostingRule {
  id: string;
  event_type: string;     // e.g., "TRAFFIC_TOUR_COMPLETED"
  conditions: Record<string, any>; // e.g., { "line": "676" }
  template: {
    entries: [
      { account_code: string, side: 'DEBIT' | 'CREDIT', amount_expr: string }
    ]
  };
}
```

### C. Asset & Investment Registry
Tracks the lifecycle of hardware, vehicles, and leases.
```typescript
interface Asset {
  id: string;
  type: 'VEHICLE' | 'IT' | 'INFRASTRUCTURE';
  acquisition_date: string;
  acquisition_value: number;
  depreciation_years: number;
  residual_value: number;
  cost_center: string;
  status: 'ACTIVE' | 'DISPOSED' | 'FULLY_DEPRECIATED';
}
```

---

## 3. Core API Requirements

### Ledger API (The Immutable Core)
- `POST /ledger/entries`: Submit a balanced transaction (Sum(Debit) == Sum(Credit)).
- `GET /ledger/balance-sheet`: Generate a snapshot of all asset/liability accounts.
- `GET /ledger/trial-balance`: Verify that the ledger is in balance.

### CFO Management API (The Brain)
- `POST /finance/config/accounts`: Setup the BAS-kontoplan.
- `POST /finance/config/rules`: Configure how events (like "Bus Repaired") are booked.
- `POST /finance/assets`: Register a new investment.
- `POST /finance/periodization`: Schedule a manual accrual (e.g., prepaid rent).

---

## 4. Swedish Compliance Requirements
- **VAT (Moms):** Automated reporting for 25% (Standard), 6% (Transport), and 0% (Intra-community).
- **AGI (Arbetsgivardeklaration):** Coordination with HR to produce the individual-level tax report.
- **Sie-Export:** Support for exporting data in SIE-4 format for external auditing.

---

## 5. Implementation Guardrails
1. **No Hardcoding:** Account codes MUST NOT exist in the service source code (index.ts, etc). They must be fetched from the `PostingRule` data.
2. **Atomic Transactions:** A ledger entry and its corresponding sub-ledger update (e.g., VAT record) must happen in a single database transaction.
3. **Audit Trail:** Every change to a `PostingRule` must be logged with a timestamp and the agent's ID.

---

## 6. Relation to "Walking Skeleton"
This specification moves the current `kalles-finance` from a static service to a dynamic platform. It enables the implemented use cases (SL Billing, Cash Forecast) to be managed via the CFO Dashboard rather than code edits.
