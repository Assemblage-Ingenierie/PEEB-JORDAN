# PEEB Jordan — Audit report → Excel import row

You are extracting structured data from a building energy-audit report so it can be pasted into the **PEEB Jordan import template** (Excel). Your job is to produce **one JSON object per building** that strictly matches the schema below.

---

## How to use this prompt

1. Paste the audit report (PDF text, screenshots, or a summary) below this block.
2. Read the **Schema** and **Rules** carefully.
3. Output a single JSON object (or an array if multiple buildings) following the schema.
4. End with a **Self-check** section listing missing/uncertain fields.

Do **not** invent values — leave the field empty (`""` for text, `null` for numbers, `false` for booleans) when the audit doesn't state it.

---

## Schema — keys, units, semantics

All keys are exact technical keys (do not translate them). Group by the three sections.

### 1. General Information

| Key | Type | Allowed values / unit | Notes |
|---|---|---|---|
| `name` | text | unique | Building name as stated in the audit |
| `typology` | text | `School` / `Hospital` / `Administration` / `University` | Map "Office", "Municipality", "Ministry", "Governorate building" → `Administration` |
| `governorate` | text | Jordanian governorate | E.g. `Amman`, `Zarqa`, `Irbid`, `Aqaba`, `Ma'an`, `Karak`, `Tafileh`, `Mafraq`, `Ajloun`, `Jerash`, `Madaba`, `Balqa` |
| `region` | text | `North` / `Central` / `South` | Leave empty — derived from governorate |
| `address` | text | full street | |
| `area` | number | m² (no thousands separator) | Total gross floor area |
| `yearBuilt` | number | YYYY | |
| `floors` | number | above-ground only | |
| `baselineEUI` | number | kWh/m²/yr | Pre-works EUI, electric + thermal combined |
| `operatingHours` | text | free | e.g. "Sun–Thu 08:00–16:00" |
| `lat` / `lng` | number | decimal degrees | |
| `existingAudit` | boolean | `true` if the report you're reading is the audit | almost always `true` here |
| `auditAuthor` | text | name / organisation | |
| `auditDate` | text | `YYYY-MM-DD` | |
| `auditFileUrl` | text | URL (Drive link, etc.) | |
| `fundingSource` | text | e.g. `KfW`, `JREEEF`, `AFD`, `World Bank` | **Filling a value auto-excludes the building from PEEB grant.** Leave empty unless the audit says external funding is already committed. |
| `siteObservations` | text | free | Short summary of site visit, constraints |

### 2. Refurbishment Program

#### Totals & overrides

| Key | Type | Unit | Notes |
|---|---|---|---|
| `totalBaselineKwh` | number | kWh/yr | Baseline total annual consumption (electricity + fuel converted to kWh) |
| `totalProjectKwh` | number | kWh/yr | Post-works total annual consumption |
| `gainOverride` | — | — | **DO NOT FILL.** Derived automatically from Baseline − Project. |
| `eeCapexOverride` | number | JOD | Optional: only fill if the audit explicitly states a different EE CAPEX total than the sum of measures (e.g. shared overheads). |
| `designProgress` | text | `ongoing` / `completed` / empty | Audit context: usually empty (not started) |
| `worksProgress` | text | `ongoing` / `completed` / empty | Audit context: usually empty |

#### Per-measure columns

Repeat the same 4–5 keys for each measure: `insulation`, `windows`, `hvac`, `lighting`, `pv`, `solarThermal`, `structure`, `accessibility`, `hygieneAndSecurity`.

| Key | Type | Unit | Notes |
|---|---|---|---|
| `{measure}_selected` | boolean | `true` / `false` | `true` if the measure is part of the refurbishment plan |
| `{measure}_capex` | — | — | **DO NOT FILL.** Derived from `{measure}_capex_total ÷ area`. |
| `{measure}_capex_total` | number | JOD | Absolute CAPEX of the measure (turnkey, all-in) |
| `{measure}_savings` | number | 0 – 1 | **See "Savings semantics" below.** EE measures only — leave empty for `structure`, `accessibility`, `hygieneAndSecurity`. |
| `{measure}_notes` | text | free | Short note: scope, brands, audit-stated payback, kWh saved |

### 3. Investment

| Key | Type | Allowed values | Notes |
|---|---|---|---|
| `priority` | text | `High` / `Medium` / `Low` | Default `Medium` when not stated |
| `peebSelected` | boolean | | `false` by default (PEEB selection is decided later) |
| `manuallyIneligible` | boolean | | `false` by default |
| `afdLoan` | number | JOD | 0 by default |
| `nationalBudget` | number | JOD | 0 by default |
| `others` | number | JOD | 0 by default |

---

## Savings semantics — the critical point

The `{measure}_savings` field is a value between 0 and 1, but the interpretation differs:

### Energy-Efficiency core measures (`insulation`, `windows`, `hvac`, `lighting`)

`{measure}_savings` = **share of the total energy savings attributable to this measure**.

- The sum across the **selected** EE-core measures **must equal 1.00 (100%)**.
- Example: if HVAC saves 32 171 kWh/yr and lighting saves 45 959 kWh/yr (total = 78 130 kWh/yr), then
  `hvac_savings = 0.4117` and `lighting_savings = 0.5883`.
- The headline EE Gain itself comes from `totalBaselineKwh` − `totalProjectKwh` (not from these shares).
  The shares are a **breakdown** of those savings between measures.

### Renewable Energies (`pv`, `solarThermal`)

`{measure}_savings` = **renewable production / project (post-EE) consumption**, capped at 1.0.

- 1.0 means the renewable production fully covers the post-EE demand.
- Anything above 1.0 means net-export to the grid — set to 1.0 anyway (the app caps at 1.0; surplus doesn't reduce net consumption further).
- Example: PV annual yield = 151 850 kWh, post-EE demand = 68 138 kWh → ratio = 2.23 → write **`pv_savings = 1.0`**.
- The app will compute `Compl. PV Gain (%) = q × (1 − EE Gain/100) × 100` internally.

### Global Refurbishment measures (`structure`, `accessibility`, `hygieneAndSecurity`)

No savings field — they don't reduce energy. Just fill `_selected`, `_capex_total`, `_notes`.

---

## Rules

1. **Currency**: all amounts in **JOD**. If the audit gives JOD/m² or USD, convert to JOD total. State the conversion in `notes`.
2. **Numbers**: no thousands separators, dot as decimal (e.g. `60300`, not `60,300`; `0.4509`, not `0,4509`).
3. **Booleans**: `true` / `false` (lowercase).
4. **Dates**: `YYYY-MM-DD`.
5. **Do not fill** the keys flagged "DO NOT FILL" — they are recomputed by the app.
6. **Typology must be one of the 4 allowed values.** Map every variant (e.g. "Government Office" → `Administration`, "School for Girls" → `School`).
7. **EE shares**: before outputting, verify that the sum of `_savings` over selected EE-core measures equals 1.0 (± 0.001). If a measure isn't selected, leave its `_savings` field empty (don't include it in the sum).
8. **No EE gain compounding**: do **not** derive EE Gain from the per-measure shares. Always provide `totalBaselineKwh` and `totalProjectKwh` so the app computes it.
9. **Match the audit verbatim** for `name`, `auditAuthor`, `auditDate`. Use the audit's own building name even if it differs from common knowledge.
10. **Notes are short and informative**: include the audit-stated kWh/yr saving and payback for each measure when available.

---

## Output format

Produce one JSON object per building. Wrap multiple buildings in an array.

```json
{
  "name": "Al Zarqa Governorate Building",
  "typology": "Administration",
  "governorate": "Zarqa",
  "region": "",
  "address": "",
  "area": 4263,
  "yearBuilt": 1985,
  "floors": 4,
  "baselineEUI": 35.6,
  "operatingHours": "Sun–Thu 08:00–15:00",
  "lat": null,
  "lng": null,
  "existingAudit": true,
  "auditAuthor": "...",
  "auditDate": "2024-06-15",
  "auditFileUrl": "",
  "fundingSource": "",
  "siteObservations": "...",
  "totalBaselineKwh": 151851,
  "totalProjectKwh": 68138,
  "eeCapexOverride": null,
  "designProgress": "",
  "worksProgress": "",

  "insulation_selected": false, "insulation_capex_total": 0, "insulation_savings": null, "insulation_notes": "",
  "windows_selected":    false, "windows_capex_total":    0, "windows_savings":    null, "windows_notes":    "",
  "hvac_selected":       true,  "hvac_capex_total":       60300, "hvac_savings":     0.4117, "hvac_notes":     "Replace 51 split units (COP 1.6→3.2), 32 171 kWh/yr, payback 7.3 yr",
  "lighting_selected":   true,  "lighting_capex_total":   12665, "lighting_savings": 0.5883, "lighting_notes": "LED retrofit, 867 fixtures, 45 959 kWh/yr, payback ~1 yr",

  "pv_selected":         true,  "pv_capex_total":         97340, "pv_savings":       1.0,    "pv_notes":       "97 kWp roof-top, yield 151 850 kWh ≈ 223% of post-EE consumption, capped at 1.0",
  "solarThermal_selected": true,"solarThermal_capex_total": 1600,"solarThermal_savings": 0.0867,"solarThermal_notes": "600 L/day, 20 m² roof, 5 909 kWh/yr saved",

  "structure_selected": false, "structure_capex_total": 0, "structure_notes": "",
  "accessibility_selected": false, "accessibility_capex_total": 0, "accessibility_notes": "",
  "hygieneAndSecurity_selected": false, "hygieneAndSecurity_capex_total": 0, "hygieneAndSecurity_notes": "",

  "priority": "Medium",
  "peebSelected": false,
  "manuallyIneligible": false,
  "afdLoan": 0,
  "nationalBudget": 0,
  "others": 0
}
```

---

## Self-check (must appear at the end)

End your reply with this checklist, filled in:

```
✓ Typology in {School, Hospital, Administration, University} ?
✓ EE-core selected measures: sum of savings = 1.00 ?     → got X.XX
✓ totalBaselineKwh and totalProjectKwh both provided ?
✓ All capex_total values in JOD (no /m²) ?
✓ Booleans lowercase ?
✓ Dates YYYY-MM-DD ?
- Fields left empty because the audit doesn't state them:
    • …
- Assumptions made (with rationale):
    • …
```

---

## Now: read the audit report below and produce the JSON.
