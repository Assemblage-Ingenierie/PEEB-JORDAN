import { useState } from 'react';
import {
  BookOpen, Database, Calculator, Target, AlertTriangle, Plus, Filter,
  Map as MapIcon, Sliders, Building2, Coins, Users, FileSpreadsheet,
} from 'lucide-react';

// ─── Section helpers ──────────────────────────────────────────────────────────
function Section({ id, title, Icon, children }) {
  return (
    <section id={id} className="card scroll-mt-6">
      <h2 className="text-base font-bold mb-3 pb-2 flex items-center gap-2"
        style={{ color: 'var(--ai-rouge)', borderBottom: '1px dashed var(--ai-rouge)' }}>
        <Icon className="w-5 h-5" /> {title}
      </h2>
      <div className="text-sm leading-relaxed space-y-3" style={{ color: 'var(--ai-violet)' }}>
        {children}
      </div>
    </section>
  );
}
function SubTitle({ children }) {
  return <h3 className="font-bold mt-3 text-sm" style={{ color: 'var(--ai-violet)' }}>{children}</h3>;
}
function Code({ children }) {
  return (
    <code style={{
      fontFamily: 'monospace', fontSize: 12, background: 'var(--ai-gris-clair)',
      padding: '1px 6px', borderRadius: 4, color: 'var(--ai-rouge)',
    }}>{children}</code>
  );
}
function Pastille({ bg, fg, label }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: bg, color: fg, display: 'inline-block',
    }}>{label}</span>
  );
}

// ─── Table-of-contents ───────────────────────────────────────────────────────
const TOC = [
  { id: 'database',     label: 'The database',                 Icon: Database },
  { id: 'gains',        label: 'EE / PV / Total Gain',          Icon: Calculator },
  { id: 'score',        label: 'PEEB Priority Score',           Icon: Target },
  { id: 'alerts',       label: 'Alert pictograms',              Icon: AlertTriangle },
  { id: 'create',       label: 'Adding buildings',              Icon: Plus },
  { id: 'excel',        label: 'Excel import / export',         Icon: FileSpreadsheet },
  { id: 'filters',      label: 'Filtering and sorting',         Icon: Filter },
  { id: 'map',          label: 'Map view',                      Icon: MapIcon },
  { id: 'parameters',   label: 'Parameters',                    Icon: Sliders },
  { id: 'profile',      label: 'Building profile',              Icon: Building2 },
  { id: 'capex',        label: 'CAPEX in JOD vs JOD/m²',         Icon: Coins },
  { id: 'roles',        label: 'Roles & permissions',           Icon: Users },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Guide() {
  const [active, setActive] = useState('database');

  const scrollTo = (id) => {
    setActive(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5" style={{ color: 'var(--ai-rouge)' }} />
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--ai-violet)' }}>User guide</h2>
          <p className="text-xs" style={{ color: 'var(--ai-noir70)' }}>
            How the PEEB Med Jordan platform works
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6">
        {/* Sticky TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 card p-3">
            <p className="text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: 'var(--ai-violet)', opacity: .55 }}>Contents</p>
            <ul className="space-y-1">
              {TOC.map(({ id, label, Icon }) => (
                <li key={id}>
                  <button
                    onClick={() => scrollTo(id)}
                    className="w-full flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded transition-colors"
                    style={{
                      color: active === id ? 'var(--ai-rouge)' : 'var(--ai-violet)',
                      background: active === id ? 'var(--ai-rouge-clair)' : 'transparent',
                      fontWeight: active === id ? 700 : 500,
                    }}>
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Sections */}
        <div className="space-y-6">

          <Section id="database" title="The database" Icon={Database}>
            <p>
              The <strong>Buildings</strong> table lists every building monitored by the programme.
              It is organised in four vertical sections, each printed as a banner above the columns:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Building Data</strong> — name, typology, governorate, region, area, floors, year built and PEEB-selection badge.</li>
              <li><strong>Audit Data</strong> — energy-audit flag, author, audit date, baseline / projected / difference EUI, and the three Gain % columns.</li>
              <li><strong>Progress</strong> — Design and Works status pastilles (read-only here; edited from the building profile).</li>
              <li><strong>Investment</strong> — existing donor funding, political priority, EE / GR / total CAPEX, expected PEEB grant, score, per-measure icons, and the row delete button.</li>
            </ul>
            <p>
              Each row is a building. Click anywhere on the row to open its profile, <Code>Ctrl</Code> /
              <Code>⌘</Code> / middle-click to open it in a new tab. The table supports left-click
              drag-scroll to navigate horizontally.
            </p>
          </Section>

          <Section id="gains" title="EE Gain, Complementary PV Gain, Total Gain" Icon={Calculator}>
            <SubTitle>EE Gain (%)</SubTitle>
            <p>
              The headline gain from energy-efficiency works. It is driven by the building
              profile&apos;s <strong>Total Energy Saving</strong> block, in this order:
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Manual override — the <strong>Force value</strong> checkbox lets you type any %.</li>
              <li>Derived from total kWh: <Code>(1 − Project / Baseline) × 100</Code>.</li>
              <li>Compound model on the per-measure shares — only used as a fallback when neither override nor kWh totals are filled.</li>
            </ol>
            <p>This is the value also displayed in the inventory in <strong>bold black</strong>.</p>

            <SubTitle>Complementary PV Gain (%)</SubTitle>
            <p>
              The renewable contribution layered on top of EE. For each renewable measure (PV, Solar
              Thermal), you enter a value <Code>q ∈ [0; 1]</Code> = production / post-EE consumption.
              The complementary gain expressed against baseline is:
            </p>
            <p className="rounded p-2" style={{ background: 'var(--ai-gris-clair)', fontFamily: 'monospace', fontSize: 12 }}>
              Compl. PV Gain (%) = q × (1 − EE Gain / 100) × 100
            </p>
            <p>
              So if EE Gain = 55 % and PV covers the whole post-EE demand (q = 1.0),
              Compl. PV Gain = 45 %. Displayed in <strong style={{ color: '#e69138' }}>orange</strong>.
            </p>

            <SubTitle>Total Gain (%)</SubTitle>
            <p>Sum of the two, capped at 100 %:</p>
            <p className="rounded p-2" style={{ background: 'var(--ai-gris-clair)', fontFamily: 'monospace', fontSize: 12 }}>
              Total Gain = EE Gain + Compl. PV Gain  (cap 100 %)
            </p>
            <p>This is what drives the PEEB Grant tier — see the next section.</p>
          </Section>

          <Section id="score" title="PEEB Priority Score & configuration" Icon={Target}>
            <p>
              Each building gets a composite score from 0 to 100 used to rank renovation priority.
              The score is a weighted sum of indicators (energy gain, floor area, data completeness,
              cost-effectiveness, PEEB grant rate, etc.).
            </p>
            <p>
              Open <strong>Parameters → Score configuration</strong> to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Pick which indicators count and assign a weight (the total must equal 100).</li>
              <li>Set the "cap" for each indicator — the threshold above which it gives the full weight.</li>
              <li>Add or remove criteria.</li>
            </ul>
            <p>
              The score is recomputed live: change a weight or a building&apos;s data and the badge
              updates immediately.
            </p>
            <p className="text-xs" style={{ color: 'var(--ai-noir70)' }}>
              Score colour code: <Pastille bg="#22a05a" fg="white" label="≥ 70 — High" />{' '}
              <Pastille bg="#d97706" fg="white" label="40–69 — Medium" />{' '}
              <Pastille bg="var(--ai-rouge)" fg="white" label="< 40 — Low" />
            </p>
          </Section>

          <Section id="alerts" title="Alert pictograms in the database" Icon={AlertTriangle}>
            <p>The first column of the inventory shows an alert triangle when something needs attention:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <AlertTriangle className="inline w-3.5 h-3.5" style={{ color: '#d97706' }} />{' '}
                <strong style={{ color: '#d97706' }}>Amber</strong> — missing required data. Hover the icon to see the list (e.g. <em>area, year built, coordinates</em>).
              </li>
              <li>
                <AlertTriangle className="inline w-3.5 h-3.5" style={{ color: 'var(--ai-rouge)' }} />{' '}
                <strong style={{ color: 'var(--ai-rouge)' }}>Red</strong> — the building is ineligible for the PEEB grant. Either it has an existing donor funding source, or it was manually marked ineligible.
              </li>
            </ul>
            <p>The full legend is printed at the bottom of the inventory.</p>
          </Section>

          <Section id="create" title="Adding buildings" Icon={Plus}>
            <SubTitle>One building at a time</SubTitle>
            <p>
              Click <Code>Create new building</Code> in the top-right of the inventory. A blank
              profile opens — fill in the fields and click <strong>Save as new building</strong>.
              You can cancel without saving.
            </p>
            <SubTitle>Bulk via Excel</SubTitle>
            <p>
              Use <Code>Upload new buildings</Code> on the inventory. The upload dialog accepts the
              template Excel file (see next section). Existing buildings are matched by name and
              updated; new names are added. Read-only columns in the template (capex / m² and gain
              override) are ignored on import — they are recomputed by the app.
            </p>
          </Section>

          <Section id="excel" title="Excel import / export" Icon={FileSpreadsheet}>
            <p>
              <Code>Download Excel</Code> exports the live database in three vertical sections:
              <strong> General Information</strong>, <strong>Refurbishment Program</strong>,
              <strong> Investment</strong>. The header has 4 rows: section banner, technical keys,
              human labels, descriptions.
            </p>
            <p>
              <strong>Derived columns are greyed out and labelled "DO NOT FILL"</strong>:
              <Code>{'{measure}_capex'}</Code> (JOD/m², derived from the total ÷ area) and
              <Code>gainOverride</Code> (derived from baseline − project). Anything pasted in those
              cells is dropped on import.
            </p>
            <p>
              The <strong>Instructions</strong> tab inside the Excel covers every column with full
              semantics — EE shares (sum to 100 %) vs renewable q values (capped at 1.0).
            </p>
          </Section>

          <Section id="filters" title="Filtering and sorting" Icon={Filter}>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Global search</strong> — name / typology / governorate match the top search field.</li>
              <li><strong>Per-column filter</strong> — every header has a filter cell underneath. Text columns accept partial matches. Multi-select columns (typology, region, priority, PEEB, design, works, existing audit) open a dropdown of check-boxes — you can pick several values.</li>
              <li><strong>Sort</strong> — click any sortable header to toggle ascending / descending.</li>
              <li><strong>Visibility</strong> — the <Code>Columns</Code> dropdown lets you hide any column (by section).</li>
            </ul>
          </Section>

          <Section id="map" title="Map view" Icon={MapIcon}>
            <p>
              The map shows every building with GPS coordinates as a coloured marker. The marker
              colour matches the typology palette of the inventory
              (<Pastille bg="#dbeafe" fg="#1d4ed8" label="School" />{' '}
              <Pastille bg="#fee2e2" fg="#b91c1c" label="Hospital" />{' '}
              <Pastille bg="#fef9c3" fg="#854d0e" label="Administration" />{' '}
              <Pastille bg="#ede9fe" fg="#7c3aed" label="University" />).
              Click a marker to open the building profile.
            </p>
            <p>Buildings without coordinates do not appear on the map — fill the GPS fields in the profile to make them visible.</p>
          </Section>

          <Section id="parameters" title="Parameters" Icon={Sliders}>
            <p>
              Global parameters that apply to every calculation:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Currency &amp; Financial</strong> — display currency (JOD / EUR), exchange rate, energy cost (JOD / kWh).</li>
              <li><strong>Cost estimations</strong> — typology-agnostic unit costs (JOD/m²) per measure. Used as default capex when creating a new building.</li>
              <li><strong>Budget</strong> — the line items added on top of works to compute the total project budget (design &amp; supervision, contingencies, etc.). Each item is either a percentage of other items or an absolute amount. A project-level contingency applies on top of everything.</li>
              <li><strong>Score configuration</strong> — see the PEEB Priority Score section above.</li>
            </ul>
            <p>Changes save automatically (debounced 0.8 s).</p>
          </Section>

          <Section id="profile" title="Building profile fields" Icon={Building2}>
            <p>The profile is split in three columns mirroring the database.</p>

            <SubTitle>General information (left)</SubTitle>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>Building Information</strong> — name, typology, year built, floors, floor area, baseline EUI, EUI source (Audit / Extrapolated), operating hours.</li>
              <li><strong>Location</strong> — governorate, address, GPS mini-map. Region is derived from the governorate.</li>
              <li><strong>Photo Gallery</strong> — drag photos or click the camera tile to attach images.</li>
              <li><strong>Site Observations</strong> — free-text notes from the site visit.</li>
            </ul>

            <SubTitle>Refurbishment program (middle)</SubTitle>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>EE Investment Program</strong> — existing audit (Yes/No, author, date, file URL), existing funding source, political priority (High / Medium / blank).</li>
              <li><strong>Measures — Energy Efficiency</strong> — insulation, windows, HVAC, lighting. The % next to each measure is its <strong>share of the total energy savings</strong> (sum should = 100 %).</li>
              <li><strong>Total Energy Saving</strong> — baseline / project / difference in kWh, derived EUI per m², overall energy savings % (with Force value), and EE CAPEX (sum of measures, also forceable).</li>
              <li><strong>Measures — Renewable Energies</strong> — PV, Solar Thermal. The % is q = production / post-EE consumption (capped at 1.0).</li>
              <li><strong>Measures — Global Refurbishment</strong> — structure, accessibility, hygiene &amp; security. Add to CAPEX but not to energy gain. Eligible for AFD loan.</li>
              <li><strong>Progress</strong> — Design / Works pastilles (click to cycle).</li>
            </ul>

            <SubTitle>Investment (right)</SubTitle>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>Calculation Results</strong> — PEEB grant rate, EE / GR / Total CAPEX, expected PEEB grant, remaining capex, annual savings, payback, CO₂ avoided.</li>
              <li><strong>PEEB Priority Score</strong> — composite 0–100 score with breakdown.</li>
              <li><strong>PEEB Eligibility</strong> — donor warning, manual ineligible toggle, include-in-PEEB toggle.</li>
              <li><strong>Complementary Financing</strong> — distribute the remaining capex between AFD loan, national budget and others (sum = 100 %).</li>
            </ul>

            <p className="text-xs" style={{ color: 'var(--ai-noir70)' }}>
              Changes auto-save, but the profile keeps a snapshot. The <strong>Discard</strong>
              button reverts to that snapshot. Leaving the page with unsaved changes pops a
              confirmation modal (Stay / Discard &amp; leave / Save &amp; leave).
            </p>
          </Section>

          <Section id="capex" title="CAPEX — JOD vs JOD/m²" Icon={Coins}>
            <p>
              Each measure row exposes two fields side-by-side: <Code>JOD/m²</Code> (unit cost) and
              <Code>JOD</Code> (absolute total). They are <strong>two views of the same value</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Edit the JOD/m² → the total updates automatically (= unit cost × floor area).</li>
              <li>Edit the JOD total → the unit cost updates automatically (= total ÷ floor area).</li>
              <li><strong>When the floor area is not set</strong>, the unit cost cannot be derived — the JOD/m² field is greyed out and only the JOD total is editable.</li>
            </ul>
            <p>
              In the Excel template the JOD/m² columns are flagged <strong>DO NOT FILL</strong>; only
              the <Code>{'{measure}_capex_total'}</Code> column is the import value of truth.
            </p>
          </Section>

          <Section id="roles" title="Roles & permissions" Icon={Users}>
            <p>Three levels (planned, once authentication is wired):</p>
            <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: 'var(--ai-violet)', color: 'white' }}>
                  <th className="th text-left" style={{ color: 'white' }}>Feature</th>
                  <th className="th" style={{ color: 'white', width: 90 }}>Admin</th>
                  <th className="th" style={{ color: 'white', width: 90 }}>User</th>
                  <th className="th" style={{ color: 'white', width: 90 }}>Reader</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Browse database, dashboard, map',            true,  true,  true],
                  ['Filter and sort the database',               true,  true,  true],
                  ['Open audit file links',                      true,  true,  true],
                  ['Create / edit a building profile',           true,  true,  false],
                  ['Excel import & export',                      true,  true,  false],
                  ['Toggle Design / Works progress',             true,  true,  false],
                  ['Delete a building (trash button)',           true,  false, false],
                  ['Edit Parameters (currency, costs, score…)',  true,  false, false],
                  ['Manage user accounts (Admin page)',          true,  false, false],
                ].map(([feature, a, u, r], i) => (
                  <tr key={feature} style={{ background: i % 2 ? 'var(--ai-gris-clair)' : 'white', borderBottom: '1px solid var(--ai-gris-clair)' }}>
                    <td className="td">{feature}</td>
                    {[a, u, r].map((ok, j) => (
                      <td key={j} className="td text-center"
                        style={{ color: ok ? '#16a34a' : 'var(--ai-gris)', fontWeight: 700 }}>
                        {ok ? '✓' : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs italic" style={{ color: 'var(--ai-noir70)' }}>
              Until authentication is integrated, every visitor effectively has the Admin
              permissions. Restrictions will be enforced once Supabase Auth is wired in via the
              Admin page.
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}
