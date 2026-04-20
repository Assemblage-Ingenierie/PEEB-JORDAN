-- ============================================================
-- PEEB Med Jordan — Seed Data
-- 10 sample Jordanian public buildings (mirrors src/data/sampleData.js)
-- Run after the initial migration.
-- ============================================================

INSERT INTO public.buildings
  (id, name, typology, governorate, address, lat, lng, area, year_built, floors,
   baseline_eui, operating_hours, funding_source, status, priority,
   site_observations, afd_loan, national_budget, others, measures)
VALUES

('B001', 'Al-Hussain Primary School', 'School', 'Amman', 'Jabal Al-Hussein, Amman',
 31.9742, 35.9382, 2400, 1985, 3, 82, 'Mon–Sat  07:00–15:00', '', 'Assessed', 'High',
 'Significant thermal bridging at roof level. Single-glazed windows throughout. HVAC system oversized and outdated (1998). T8 fluorescent lighting in all classrooms.',
 0, 0, 0,
 '{"insulation":{"selected":false,"capex":25,"savingsRate":0.15,"notes":""},"windows":{"selected":false,"capex":80,"savingsRate":0.12,"notes":""},"hvac":{"selected":false,"capex":120,"savingsRate":0.25,"notes":""},"lighting":{"selected":false,"capex":20,"savingsRate":0.30,"notes":""},"pv":{"selected":false,"capex":150,"savingsRate":0.20,"notes":""},"solarThermal":{"selected":false,"capex":110,"savingsRate":0.05,"notes":""},"structure":{"selected":false,"capex":130,"savingsRate":0,"notes":""},"accessibility":{"selected":false,"capex":70,"savingsRate":0,"notes":""},"hygieneAndSecurity":{"selected":false,"capex":60,"savingsRate":0,"notes":""}}'
),

('B002', 'Prince Rashid Hospital — Annex', 'Hospital', 'Irbid', 'University Street, Irbid',
 32.5556, 35.8500, 6800, 1992, 5, 265, '24/7', 'GIZ', 'Ineligible', 'Low',
 'GIZ-funded HVAC overhaul completed 2021. Remaining gaps: envelope insulation, LED retrofit.',
 0, 0, 0,
 '{"insulation":{"selected":false,"capex":30,"savingsRate":0.15,"notes":""},"windows":{"selected":false,"capex":90,"savingsRate":0.12,"notes":""},"hvac":{"selected":false,"capex":200,"savingsRate":0.25,"notes":""},"lighting":{"selected":false,"capex":25,"savingsRate":0.30,"notes":""},"pv":{"selected":false,"capex":160,"savingsRate":0.20,"notes":""},"solarThermal":{"selected":false,"capex":140,"savingsRate":0.05,"notes":""},"structure":{"selected":false,"capex":180,"savingsRate":0,"notes":""},"accessibility":{"selected":false,"capex":100,"savingsRate":0,"notes":""},"hygieneAndSecurity":{"selected":false,"capex":120,"savingsRate":0,"notes":""}}'
),

('B003', 'Greater Amman Municipality HQ', 'Municipality', 'Amman', 'Al-Amir Shaker Ben Zaid St., Amman',
 31.9554, 35.9342, 4200, 1978, 7, NULL, 'Sun–Thu  08:00–15:00', '', 'Pending Audit', 'Medium',
 '',
 0, 50000, 0,
 '{"insulation":{"selected":false,"capex":26,"savingsRate":0.15,"notes":""},"windows":{"selected":false,"capex":82,"savingsRate":0.12,"notes":""},"hvac":{"selected":false,"capex":130,"savingsRate":0.25,"notes":""},"lighting":{"selected":false,"capex":21,"savingsRate":0.30,"notes":""},"pv":{"selected":false,"capex":145,"savingsRate":0.20,"notes":""},"solarThermal":{"selected":false,"capex":115,"savingsRate":0.05,"notes":""},"structure":{"selected":false,"capex":130,"savingsRate":0,"notes":""},"accessibility":{"selected":false,"capex":70,"savingsRate":0,"notes":""},"hygieneAndSecurity":{"selected":false,"capex":60,"savingsRate":0,"notes":""}}'
),

('B004', 'Ministry of Education HQ', 'Office', 'Amman', '5th Circle, Amman',
 31.9637, 35.9306, 5100, 1995, 6, 128, 'Sun–Thu  08:00–16:00', '', 'Assessed', 'High',
 'Centralised chilled-water HVAC with obsolete controls. Partial LED upgrade done 2019. Roof still uninsulated.',
 200000, 100000, 0,
 '{"insulation":{"selected":false,"capex":28,"savingsRate":0.15,"notes":""},"windows":{"selected":false,"capex":85,"savingsRate":0.12,"notes":""},"hvac":{"selected":false,"capex":140,"savingsRate":0.25,"notes":""},"lighting":{"selected":false,"capex":22,"savingsRate":0.30,"notes":""},"pv":{"selected":false,"capex":150,"savingsRate":0.20,"notes":""},"solarThermal":{"selected":false,"capex":120,"savingsRate":0.05,"notes":""},"structure":{"selected":false,"capex":140,"savingsRate":0,"notes":""},"accessibility":{"selected":false,"capex":75,"savingsRate":0,"notes":""},"hygieneAndSecurity":{"selected":false,"capex":65,"savingsRate":0,"notes":""}}'
),

('B005', 'Al-Zarqa Health Center', 'Hospital', 'Zarqa', 'Industrial City, Zarqa',
 32.0686, 36.0882, 1800, 2001, 2, 210, 'Sun–Thu  08:00–20:00', '', 'Pending Audit', 'Medium',
 '',
 0, 0, 0,
 '{"insulation":{"selected":false,"capex":29,"savingsRate":0.15,"notes":""},"windows":{"selected":false,"capex":88,"savingsRate":0.12,"notes":""},"hvac":{"selected":false,"capex":185,"savingsRate":0.25,"notes":""},"lighting":{"selected":false,"capex":24,"savingsRate":0.30,"notes":""},"pv":{"selected":false,"capex":155,"savingsRate":0.20,"notes":""},"solarThermal":{"selected":false,"capex":140,"savingsRate":0.05,"notes":""},"structure":{"selected":false,"capex":175,"savingsRate":0,"notes":""},"accessibility":{"selected":false,"capex":95,"savingsRate":0,"notes":""},"hygieneAndSecurity":{"selected":false,"capex":115,"savingsRate":0,"notes":""}}'
),

('B006', 'Aqaba Municipality Building', 'Municipality', 'Aqaba', 'King Hussein Street, Aqaba',
 29.5321, 35.0063, NULL, NULL, 4, 110, 'Sun–Thu  08:00–15:00', '', 'Assessed', 'Medium',
 'High cooling loads due to coastal climate. Window shading absent. Diesel backup generator ~4h/day.',
 0, 0, 0,
 '{"insulation":{"selected":false,"capex":26,"savingsRate":0.15,"notes":""},"windows":{"selected":false,"capex":82,"savingsRate":0.12,"notes":""},"hvac":{"selected":false,"capex":130,"savingsRate":0.25,"notes":""},"lighting":{"selected":false,"capex":21,"savingsRate":0.30,"notes":""},"pv":{"selected":false,"capex":145,"savingsRate":0.20,"notes":""},"solarThermal":{"selected":false,"capex":115,"savingsRate":0.05,"notes":""},"structure":{"selected":false,"capex":130,"savingsRate":0,"notes":""},"accessibility":{"selected":false,"capex":70,"savingsRate":0,"notes":""},"hygieneAndSecurity":{"selected":false,"capex":60,"savingsRate":0,"notes":""}}'
),

('B007', 'Madaba Governorate HQ', 'Office', 'Madaba', 'Madaba Town Centre',
 31.7169, 35.7933, 2900, 1988, 4, 135, 'Sun–Thu  08:00–15:30', 'KfW', 'Ineligible', 'Low',
 'KfW envelope project ongoing. Not eligible for concurrent PEEB grant.',
 0, 0, 0,
 '{"insulation":{"selected":false,"capex":28,"savingsRate":0.15,"notes":""},"windows":{"selected":false,"capex":85,"savingsRate":0.12,"notes":""},"hvac":{"selected":false,"capex":140,"savingsRate":0.25,"notes":""},"lighting":{"selected":false,"capex":22,"savingsRate":0.30,"notes":""},"pv":{"selected":false,"capex":150,"savingsRate":0.20,"notes":""},"solarThermal":{"selected":false,"capex":120,"savingsRate":0.05,"notes":""},"structure":{"selected":false,"capex":140,"savingsRate":0,"notes":""},"accessibility":{"selected":false,"capex":75,"savingsRate":0,"notes":""},"hygieneAndSecurity":{"selected":false,"capex":65,"savingsRate":0,"notes":""}}'
),

('B008', 'Al-Balqa Applied University — Block A', 'University', 'Salt', 'Al-Balqa University Campus, Salt',
 32.0340, 35.7279, 7500, 1997, 5, 148, 'Sun–Thu  07:30–20:00', '', 'Assessed', 'High',
 'Large lecture halls with minimal insulation. Mechanical ventilation absent. PV potential high (south-facing flat roof ~3000 m²).',
 300000, 150000, 0,
 '{"insulation":{"selected":false,"capex":28,"savingsRate":0.15,"notes":""},"windows":{"selected":false,"capex":88,"savingsRate":0.12,"notes":""},"hvac":{"selected":false,"capex":155,"savingsRate":0.25,"notes":""},"lighting":{"selected":false,"capex":23,"savingsRate":0.30,"notes":""},"pv":{"selected":false,"capex":155,"savingsRate":0.20,"notes":""},"solarThermal":{"selected":false,"capex":125,"savingsRate":0.05,"notes":""},"structure":{"selected":false,"capex":155,"savingsRate":0,"notes":""},"accessibility":{"selected":false,"capex":85,"savingsRate":0,"notes":""},"hygieneAndSecurity":{"selected":false,"capex":70,"savingsRate":0,"notes":""}}'
),

('B009', 'Mafraq Primary Health Centre', 'Hospital', 'Mafraq', 'Al-Mafraq City Centre',
 32.3421, 36.2048, 950, 2005, 1, 195, 'Sun–Thu  08:00–18:00', '', 'Pending Audit', 'Low',
 '',
 0, 0, 0,
 '{"insulation":{"selected":false,"capex":29,"savingsRate":0.15,"notes":""},"windows":{"selected":false,"capex":89,"savingsRate":0.12,"notes":""},"hvac":{"selected":false,"capex":180,"savingsRate":0.25,"notes":""},"lighting":{"selected":false,"capex":24,"savingsRate":0.30,"notes":""},"pv":{"selected":false,"capex":150,"savingsRate":0.20,"notes":""},"solarThermal":{"selected":false,"capex":140,"savingsRate":0.05,"notes":""},"structure":{"selected":false,"capex":170,"savingsRate":0,"notes":""},"accessibility":{"selected":false,"capex":90,"savingsRate":0,"notes":""},"hygieneAndSecurity":{"selected":false,"capex":110,"savingsRate":0,"notes":""}}'
),

('B010', 'King Hussein Youth City — Sports Hall', 'Municipality', 'Amman', 'Sports City, Amman',
 31.9826, 35.8795, 3800, 2003, 2, 98, 'Daily  06:00–22:00', '', 'Assessed', 'Medium',
 'High infiltration through loading bay doors. Roof insulation partially degraded. LED upgrade complete. PV on roof partially installed (50 kWp, 2022).',
 0, 75000, 0,
 '{"insulation":{"selected":false,"capex":26,"savingsRate":0.15,"notes":""},"windows":{"selected":false,"capex":82,"savingsRate":0.12,"notes":""},"hvac":{"selected":false,"capex":130,"savingsRate":0.25,"notes":""},"lighting":{"selected":false,"capex":21,"savingsRate":0.30,"notes":""},"pv":{"selected":false,"capex":145,"savingsRate":0.20,"notes":""},"solarThermal":{"selected":false,"capex":115,"savingsRate":0.05,"notes":""},"structure":{"selected":false,"capex":130,"savingsRate":0,"notes":""},"accessibility":{"selected":false,"capex":70,"savingsRate":0,"notes":""},"hygieneAndSecurity":{"selected":false,"capex":60,"savingsRate":0,"notes":""}}'
)

ON CONFLICT (id) DO NOTHING;
