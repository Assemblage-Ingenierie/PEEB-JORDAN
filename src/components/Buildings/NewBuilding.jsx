import { useEffect, useRef } from 'react';
import {
  Building2, Calendar, Layers, Ruler, Zap, Clock, Banknote, MapPin,
  Save, X, Ban, Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  MEASURE_KEYS_EE, MEASURE_KEYS_GR,
} from '../../engine/CalculationEngine';
import {
  Section, EditableInfoRow, MeasureRow, ImageGallery,
} from './BuildingProfile';

/**
 * New Building page — mirrors the editable sections of a building profile
 * (Building Information, Measures EE, Measures GR, PEEB Eligibility,
 * Administrative, Site Observations, Photo Gallery) so users can create a
 * building using the same UX as editing one.
 *
 * Implemented by adding a temporary draft record (isDraft=true) to the main
 * buildings array — this lets every existing editor component work without
 * any special-casing. On Save, the draft is promoted to a regular building;
 * on Cancel, it's discarded.
 */
export default function NewBuilding() {
  const {
    buildings, selectedBuilding, createDraft, finalizeDraft, discardDraft,
    updateBuilding, notify, navigate,
  } = useApp();

  // Ensure a draft exists while the user is on this page.
  useEffect(() => {
    if (!buildings.some(b => b.isDraft)) createDraft();
  }, [buildings, createDraft]);

  const draft = selectedBuilding?.isDraft ? selectedBuilding : buildings.find(b => b.isDraft);

  if (!draft) {
    return <div className="p-8 text-sm" style={{ color: 'var(--ai-noir70)' }}>Preparing new building…</div>;
  }

  const ineligible = draft.eligibility?.ineligible;

  const save = () => {
    if (!draft.name?.trim()) {
      notify('error', 'Please enter a building name before saving.');
      return;
    }
    const duplicate = buildings.some(b =>
      !b.isDraft && b.name.trim().toLowerCase() === draft.name.trim().toLowerCase()
    );
    if (duplicate) {
      notify('error', `A building named “${draft.name}” already exists.`);
      return;
    }
    finalizeDraft(draft.id);
  };

  const cancel = () => {
    discardDraft(draft.id);
    navigate('inventory');
  };

  return (
    <div className="space-y-4 fade-in">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold" style={{ color: 'var(--ai-violet)' }}>
            New Building
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>
            Fill in the sections below, then save to add this building to the database.
          </p>
        </div>
        <button onClick={cancel} className="btn-secondary">
          <X className="w-4 h-4" /> Cancel
        </button>
        <button onClick={save} className="btn-primary">
          <Save className="w-4 h-4" /> Save as new building
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Left column — Identity & meta ── */}
        <div className="xl:col-span-1 space-y-4">

          <Section title="Building Information">
            <div className="space-y-1">
              <EditableInfoRow label="Name"           icon={Building2} value={draft.name}
                               onCommit={v => updateBuilding(draft.id, { name: v })} />
              <EditableInfoRow label="Typology"       icon={Building2} value={draft.typology}
                               options={['School','Hospital','Office','Municipality','University']}
                               onCommit={v => updateBuilding(draft.id, { typology: v })} />
              <EditableInfoRow label="Governorate"    icon={MapPin}    value={draft.governorate}
                               onCommit={v => updateBuilding(draft.id, { governorate: v })} />
              <EditableInfoRow label="Address"        icon={MapPin}    value={draft.address}
                               onCommit={v => updateBuilding(draft.id, { address: v })} />
              <CoordinatesRow draft={draft} updateBuilding={updateBuilding} />
              <EditableInfoRow label="Year Built"     icon={Calendar}  value={draft.yearBuilt} type="number"
                               italic={!draft.yearBuilt}
                               onCommit={v => updateBuilding(draft.id, { yearBuilt: v })} />
              <EditableInfoRow label="Floors"         icon={Layers}    value={draft.floors} type="number"
                               italic={!draft.floors}
                               onCommit={v => updateBuilding(draft.id, { floors: v })} />
              <EditableInfoRow label="Floor Area"     icon={Ruler}     value={draft.area} type="number"
                               italic={!draft.area}      suffix="m²"
                               onCommit={v => updateBuilding(draft.id, { area: v })} />
              <EditableInfoRow label="Baseline EUI"   icon={Zap}       value={draft.baselineEUI} type="number"
                               italic={!draft.baselineEUI} suffix="kWh/m²/yr"
                               onCommit={v => updateBuilding(draft.id, { baselineEUI: v })} />
              <EditableInfoRow label="Operating Hrs"  icon={Clock}     value={draft.operatingHours}
                               italic={!draft.operatingHours}
                               onCommit={v => updateBuilding(draft.id, { operatingHours: v })} />
              <EditableInfoRow label="Funding Source" icon={Banknote}  value={draft.fundingSource}
                               italic={!draft.fundingSource}
                               onCommit={v => updateBuilding(draft.id, { fundingSource: v })} />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--ai-noir70)' }}>
              Click any value to edit. Press Enter to save, Esc to cancel.
            </p>
          </Section>

          <Section title="PEEB Eligibility">
            <div className="space-y-4">
              {draft.eligibility?.reason === 'donor' && (
                <div className="flex items-start gap-2 text-xs rounded-lg px-3 py-2"
                  style={{ background: 'var(--ai-rouge-clair)', border: '1px solid var(--ai-rouge)' }}>
                  <Ban className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--ai-rouge)' }} />
                  <span style={{ color: 'var(--ai-rouge)' }}>
                    Donor funding detected (<strong>{draft.eligibility.donor}</strong>) — building is auto-excluded from PEEB.
                  </span>
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer rounded-lg p-3 transition-colors"
                style={{
                  background: draft.manuallyIneligible ? 'var(--ai-rouge-clair)' : 'var(--ai-gris)',
                  border: `1px solid ${draft.manuallyIneligible ? 'var(--ai-rouge)' : 'var(--ai-gris-clair)'}`,
                }}>
                <input
                  type="checkbox"
                  checked={draft.manuallyIneligible || false}
                  onChange={e => updateBuilding(draft.id, { manuallyIneligible: e.target.checked })}
                  className="mt-0.5 flex-shrink-0"
                  style={{ accentColor: 'var(--ai-rouge)', width: 16, height: 16 }}
                />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--ai-rouge)' }}>
                    Manually mark as ineligible
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>
                    Overrides all automatic eligibility checks
                  </p>
                </div>
              </label>

              {!ineligible && (
                <label className="flex items-start gap-3 cursor-pointer rounded-lg p-3 transition-colors"
                  style={{
                    background: draft.peebSelected ? '#dcfce7' : 'var(--ai-gris)',
                    border: `1px solid ${draft.peebSelected ? '#22a05a' : 'var(--ai-gris-clair)'}`,
                  }}>
                  <input
                    type="checkbox"
                    checked={draft.peebSelected || false}
                    onChange={e => updateBuilding(draft.id, { peebSelected: e.target.checked })}
                    className="mt-0.5 flex-shrink-0"
                    style={{ accentColor: '#22a05a', width: 16, height: 16 }}
                  />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#16a34a' }}>
                      Include in PEEB program
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ai-noir70)' }}>
                      PEEB grant will be applied to remaining-to-finance calculation
                    </p>
                  </div>
                </label>
              )}
            </div>
          </Section>

          <Section title="Administrative">
            <div className="space-y-3">
              <div>
                <label className="label">Status</label>
                <select value={draft.status || 'Planning'}
                  onChange={e => updateBuilding(draft.id, { status: e.target.value })}
                  className="input">
                  {['Planning','Assessed','Pending Audit','Ongoing','Completed','Ineligible'].map(s =>
                    <option key={s}>{s}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select value={draft.priority || 'Medium'}
                  onChange={e => updateBuilding(draft.id, { priority: e.target.value })}
                  className="input">
                  {['High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </Section>
        </div>

        {/* ── Middle column — Measures ── */}
        <div className="xl:col-span-1 space-y-4">

          <Section title="Measures — Energy Efficiency">
            <div className="flex items-start gap-3 rounded-lg p-3 mb-3 text-xs"
              style={{ background: 'var(--ai-gris)', border: '1px solid var(--ai-gris-clair)' }}>
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--ai-noir70)' }} />
              <div>
                <p className="font-bold mb-0.5" style={{ color: 'var(--ai-violet)' }}>
                  Thermal Synergy
                </p>
                <p style={{ color: 'var(--ai-noir70)', lineHeight: 1.5 }}>
                  When insulation or window replacement is selected, HVAC capex is reduced by 20%
                  and efficiency improves by 15%.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {MEASURE_KEYS_EE.map(key => (
                <MeasureRow key={key} buildingId={draft.id} measureKey={key}
                  measure={draft.measures[key]}
                  synApplied={draft.calc?.synergyApplied} />
              ))}
            </div>
          </Section>

          <Section title="Measures — Global Refurbishment">
            <div className="space-y-2">
              {MEASURE_KEYS_GR.map(key => (
                <MeasureRow key={key} buildingId={draft.id} measureKey={key}
                  measure={draft.measures[key]} synApplied={false} />
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--ai-noir70)' }}>
              These measures add to total capex but do not improve energy gain.
            </p>
          </Section>
        </div>

        {/* ── Right column — Observations & Photos ── */}
        <div className="xl:col-span-1 space-y-4">
          <Section title="Site Observations">
            <textarea rows={8}
              value={draft.siteObservations || ''}
              onChange={e => updateBuilding(draft.id, { siteObservations: e.target.value })}
              className="input resize-none text-sm leading-relaxed"
              placeholder="Site conditions, observations, constraints…" />
          </Section>

          <Section title="Photo Gallery">
            <ImageGallery building={draft} />
          </Section>
        </div>
      </div>
    </div>
  );
}

/**
 * Two-input row for GPS coordinates (stored as [lat, lng] on the building).
 * Empty/invalid inputs clear the coordinates; both must be valid numbers to
 * persist a pair.
 */
function CoordinatesRow({ draft, updateBuilding }) {
  const [lat, lng] = Array.isArray(draft.coordinates) ? draft.coordinates : [null, null];
  const latRef = useRef(null);
  const lngRef = useRef(null);
  const commit = () => {
    const rawLat = latRef.current?.value ?? '';
    const rawLng = lngRef.current?.value ?? '';
    if (rawLat === '' && rawLng === '') {
      updateBuilding(draft.id, { coordinates: null });
      return;
    }
    const latNum = Number(rawLat);
    const lngNum = Number(rawLng);
    if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
      updateBuilding(draft.id, { coordinates: [latNum, lngNum] });
    }
  };
  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--ai-noir70)' }} />
      <span className="flex-shrink-0" style={{ color: 'var(--ai-noir70)', width: '95px' }}>
        GPS (lat, lng)
      </span>
      <input
        ref={latRef}
        type="number"
        step="0.000001"
        placeholder="31.95"
        defaultValue={lat ?? ''}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        className="input flex-1 min-w-0 text-xs"
        style={{ padding: '4px 6px' }}
      />
      <input
        ref={lngRef}
        type="number"
        step="0.000001"
        placeholder="35.93"
        defaultValue={lng ?? ''}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        className="input flex-1 min-w-0 text-xs"
        style={{ padding: '4px 6px' }}
      />
    </div>
  );
}
