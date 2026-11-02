/**
 * Equipment library recovered from the Shabh fire alarm quotation builder.
 * `rateInclGst` is the GST-inclusive selling price exactly as shipped there;
 * the quotation engine converts it to a pre-tax base rate.
 *
 * The order is append-only: ids are derived from brand + model, so never
 * rename a model without migrating saved quote lines.
 */

export type CatalogCategory =
  | 'Fire Alarm System'
  | 'Sprinkler System'
  | 'Hydrant System'
  | 'Pump Room'
  | 'Others & Suppression'

export type CatalogUnit = 'Nos' | 'Mtr' | 'Set'

export interface CatalogSku {
  id: string
  category: CatalogCategory
  sub: string
  brand: string
  type: string
  model: string
  rateInclGst: number
  unit: CatalogUnit
  verified: boolean
  spec: string
}

type Row = [
  CatalogCategory,
  string,
  string,
  string,
  string,
  number,
  CatalogUnit,
  boolean,
  string
]

const RAW: Row[] = [
  // ---------------- FIRE ALARM SYSTEM ----------------
  ['Fire Alarm System', 'Addressable Fire Panels', 'Notifier', 'Control Panel', 'NFS2-3030 - 4 Loop (CPU2-3030D + LCM/LEM)', 434240, 'Nos', true, 'Intelligent addressable FACP, FlashScan protocol; up to 10 loops; 318 points/loop; 640-character display.'],
  ['Fire Alarm System', 'Addressable Fire Panels', 'Notifier', 'Control Panel', 'NFS2-3030 - 2 Loop Expandable FACP', 299000, 'Nos', true, 'Expandable 2-loop intelligent panel platform with LCM-320 and LEM-320.'],
  ['Fire Alarm System', 'Addressable Fire Panels', 'Notifier', 'Control Panel', 'NFS2-640 - 1/2 Loop', 276000, 'Nos', true, 'Addressable FACP supporting 636 total points with built-in 3A power supply.'],
  ['Fire Alarm System', 'Addressable Fire Panels', 'Notifier', 'Repeater Panel', 'LCD2-80 Remote Annunciator', 111952.5, 'Nos', false, '80-character remote backlit LCD annunciator.'],
  ['Fire Alarm System', 'Addressable Fire Panels', 'Notifier', 'Loop Card', 'LCM-320 Loop Control Module', 63250, 'Nos', true, 'Expands panel with one SLC loop (159 detectors + 159 modules).'],
  ['Fire Alarm System', 'Addressable Fire Panels', 'Notifier', 'Loop Card', 'LEM-320 Loop Expander Module', 43700, 'Nos', true, 'Expands LCM-320 with a secondary SLC loop.'],
  ['Fire Alarm System', 'Addressable Fire Panels', 'EST (Edwards)', 'Control Panel', 'EST3 Modular Master Panel', 435597, 'Nos', false, 'Modular multiplex intelligent addressable network panel platform.'],
  ['Fire Alarm System', 'Addressable Fire Panels', 'EST (Edwards)', 'Control Panel', 'iO1000 - 1 Loop 250 Points', 201250, 'Nos', true, 'Compact intelligent addressable control panel supporting 250 device addresses.'],
  ['Fire Alarm System', 'Addressable Fire Panels', 'EST (Edwards)', 'Control Panel', 'iO64 - 1 Loop 64 Points', 109250, 'Nos', true, 'Single-loop intelligent FACP supporting up to 64 addresses.'],
  ['Fire Alarm System', 'Addressable Fire Panels', 'Honeywell Morley', 'Control Panel', 'DXc4 - 4 Loop Addressable Panel', 149500, 'Nos', true, 'Morley-IAS DX Connexion analogue addressable panel with four loops.'],
  ['Fire Alarm System', 'Addressable Fire Panels', 'Honeywell Morley', 'Control Panel', 'DXc2 - 2 Loop Addressable Panel', 107203, 'Nos', true, 'Morley-IAS two-loop intelligent panel with network capabilities.'],
  ['Fire Alarm System', 'Addressable Fire Panels', 'Honeywell Morley', 'Control Panel', 'DXc1 - 1 Loop Addressable Panel', 88205, 'Nos', true, 'Single-loop analogue addressable FACP with 500 mA loop driver.'],

  ['Fire Alarm System', 'Conventional Fire Panels', 'Ravel', 'Control Panel', 'RE-104 - 4 Zone Conventional', 13298.6, 'Nos', false, 'Microprocessor-based 4-zone conventional fire alarm control panel.'],
  ['Fire Alarm System', 'Conventional Fire Panels', 'Ravel', 'Control Panel', 'RE-102 - 2 Zone Conventional', 19676.5, 'Nos', false, 'Microprocessor-based 2-zone conventional panel with charger.'],
  ['Fire Alarm System', 'Conventional Fire Panels', 'Agni', 'Control Panel', 'Agni 4 Zone Panel', 9227.6, 'Nos', false, 'Commercial 4-zone conventional fire alarm panel with audio/visual fault alert.'],
  ['Fire Alarm System', 'Conventional Fire Panels', 'Agni', 'Control Panel', 'Agni 2 Zone Panel', 3596.05, 'Nos', false, 'Cost-effective 2-zone conventional panel with built-in battery charger.'],
  ['Fire Alarm System', 'Conventional Fire Panels', 'ASES', 'Control Panel', 'ASES 4 Zone Panel', 9227.6, 'Nos', false, 'Standard 4-zone conventional fire panel conforming to IS 2189.'],
  ['Fire Alarm System', 'Conventional Fire Panels', 'ASES', 'Control Panel', 'ASES 2 Zone Panel', 5970.8, 'Nos', false, 'Standard 2-zone conventional fire panel.'],

  ['Fire Alarm System', 'Addressable Detectors', 'Notifier', 'Smoke Detector', 'FSP-851 Photoelectric', 4025, 'Nos', true, 'FlashScan intelligent low-profile optical smoke sensor; address 1-159.'],
  ['Fire Alarm System', 'Addressable Detectors', 'Notifier', 'Heat Detector', 'FST-851 Fixed 57 C', 2510.45, 'Nos', true, 'FlashScan intelligent thermal sensor with fixed 57 C trip point.'],
  ['Fire Alarm System', 'Addressable Detectors', 'Notifier', 'Heat Detector', 'FST-851R Rate-of-Rise', 3324.65, 'Nos', true, 'Thermal sensor with 15 F/min rate-of-rise and fixed 57 C threshold.'],
  ['Fire Alarm System', 'Addressable Detectors', 'Notifier', 'Multi-criteria Detector', 'FAPT-851 Acclimate Plus', 3256.8, 'Nos', true, 'Microprocessor-based multi-criteria optical and thermal sensing head.'],
  ['Fire Alarm System', 'Addressable Detectors', 'EST (Edwards)', 'Smoke Detector', 'SIGA2-PS Photoelectric', 2433.1, 'Nos', true, 'Signature series intelligent addressable optical smoke detector.'],
  ['Fire Alarm System', 'Addressable Detectors', 'EST (Edwards)', 'Heat Detector', 'SIGA2-HFS Fixed Temp', 2442.6, 'Nos', true, 'Signature series fixed temperature thermal sensor.'],
  ['Fire Alarm System', 'Addressable Detectors', 'Honeywell Morley', 'Smoke Detector', 'RHSE-AP Photoelectric', 2605.44, 'Nos', false, 'Morley-IAS addressable optical smoke sensor.'],

  ['Fire Alarm System', 'Conventional Detectors', 'Agni', 'Smoke Detector', 'Agni Conventional Smoke Detector', 1184.66, 'Nos', false, '2-wire optical chamber smoke detector with dual LEDs.'],
  ['Fire Alarm System', 'Conventional Detectors', 'Agni', 'Heat Detector', 'Agni Conventional Heat Detector', 1424.85, 'Nos', false, '2-wire dual rate-of-rise and fixed temperature thermal detector.'],
  ['Fire Alarm System', 'Conventional Detectors', 'Ravel', 'Smoke Detector', 'RE-316S Optical Smoke Detector', 2198.34, 'Nos', false, 'Optical smoke detector with 360-degree viewing LEDs.'],
  ['Fire Alarm System', 'Conventional Detectors', 'System Sensor', 'Smoke Detector', 'System Sensor Conventional Smoke', 1499.49, 'Nos', false, 'High-reliability conventional chamber smoke detector.'],

  ['Fire Alarm System', 'Modules & Isolators', 'Notifier', 'Loop Module', 'FMM-1 Monitor Module', 4410.25, 'Nos', true, 'Single-input addressable monitor module for dry contact inputs.'],
  ['Fire Alarm System', 'Modules & Isolators', 'Notifier', 'Loop Module', 'FCM-1 Control Module', 3419.64, 'Nos', true, 'Monitored output circuit module for NAC horn/strobes.'],
  ['Fire Alarm System', 'Modules & Isolators', 'Notifier', 'Loop Module', 'FRM-1 Relay Module', 4003.15, 'Nos', true, 'Addressable relay module providing two dry Form-C contacts.'],
  ['Fire Alarm System', 'Modules & Isolators', 'Notifier', 'Loop Module', 'ISO-X Fault Isolator Module', 3594.69, 'Nos', true, 'SLC short-circuit protection and automatic loop isolation.'],
  ['Fire Alarm System', 'Modules & Isolators', 'EST (Edwards)', 'Loop Module', 'SIGA-CT1 Single Input Module', 3053.25, 'Nos', true, 'Signature addressable input module for field contacts.'],

  ['Fire Alarm System', 'Initiating & Notification Devices', 'Notifier', 'Manual Call Point (MCP)', 'NBG-12LX Addressable Pull Station', 6106.5, 'Nos', true, 'Dual-action key-reset addressable manual station.'],
  ['Fire Alarm System', 'Initiating & Notification Devices', 'Notifier', 'Hooter / Sounder', 'P2R Electronic Hooter 24VDC', 6513.6, 'Nos', false, 'High-decibel wall-mount notification horn.'],
  ['Fire Alarm System', 'Initiating & Notification Devices', 'EST (Edwards)', 'Hooter / Sounder', 'Genesis Horn Strobe', 3256.8, 'Nos', false, 'Compact notification horn with integrated strobe flash.'],
  ['Fire Alarm System', 'Initiating & Notification Devices', 'Agni', 'Manual Call Point (MCP)', 'Agni Resettable MCP', 1013.68, 'Nos', false, 'Conventional break-glass / press-in manual station.'],
  ['Fire Alarm System', 'Initiating & Notification Devices', 'Agni', 'Hooter / Sounder', 'H504 Electronic Hooter', 1153.45, 'Nos', false, '24 V DC conventional electronic alarm hooter.'],
  ['Fire Alarm System', 'Initiating & Notification Devices', 'Agni', 'Response Indicator', 'Remote LED Indicator (RI)', 81.42, 'Nos', false, 'External response indicator for above-ceiling detectors.'],

  ['Fire Alarm System', 'Alarm Cables & Batteries', 'Finolex / Polycab', 'Cable', '2 Core 1.5 sq mm Armoured FRLS Copper', 116.7, 'Mtr', true, 'IS 1554 Part 1 compliant armoured red fire alarm cable.'],
  ['Fire Alarm System', 'Alarm Cables & Batteries', 'Finolex / Polycab', 'Cable', '2 Core 1.5 sq mm Unarmoured Shielded FRLS', 74.75, 'Mtr', true, 'Shielded twisted pair flexible fire alarm copper cable.'],
  ['Fire Alarm System', 'Alarm Cables & Batteries', 'Exide', 'Power Supply & Battery', 'Exide 12V 12Ah SMF Battery (Pair: 24V)', 14260, 'Nos', true, 'Sealed maintenance-free VRLA battery for FACP standby.'],

  // ---------------- SPRINKLER SYSTEM ----------------
  ['Sprinkler System', 'Sprinkler Heads', 'Tyco / HD Fire', 'Sprinkler Head', 'Pendent Sprinkler 1/2" 68 C Red Bulb', 488.52, 'Nos', true, 'UL Listed / FM Approved standard response 15 mm pendent sprinkler; K-factor 5.6.'],
  ['Sprinkler System', 'Sprinkler Heads', 'Tyco / HD Fire', 'Sprinkler Head', 'Upright Sprinkler 1/2" 68 C Red Bulb', 434.24, 'Nos', true, 'UL / FM standard spray upright brass sprinkler for unceilinged areas.'],
  ['Sprinkler System', 'Sprinkler Heads', 'Tyco / HD Fire', 'Sprinkler Head', 'Concealed Pendent Sprinkler 68 C with Cover', 1437.5, 'Nos', true, 'Architectural flush concealed pendent sprinkler with decorative plate.'],
  ['Sprinkler System', 'Sprinkler Heads', 'Star / Generic', 'Sprinkler Head', 'Pendent Sprinkler Gold Finish (68 C)', 264.5, 'Nos', true, 'Standard pendent sprinkler head in gold/brass aesthetic finish.'],
  ['Sprinkler System', 'Sprinkler Heads', 'NewAge / Sant', 'Sprinkler Head', 'Pendent Sprinkler 1/2" 79 C Yellow Bulb', 529, 'Nos', true, 'Intermediate temperature sprinkler for boiler / kitchen perimeters.'],
  ['Sprinkler System', 'Flexible Sprinkler Drops', 'Victaulic / Shah', 'Flexible Dropper', 'Flexible Sprinkler Hose 1000mm with Bracket', 1682.68, 'Nos', true, 'SS braided flexible dropper with ceiling grid mounting clamp set.'],
  ['Sprinkler System', 'Flexible Sprinkler Drops', 'Victaulic / Shah', 'Flexible Dropper', 'Flexible Sprinkler Hose 1500mm with Bracket', 4410.25, 'Nos', true, 'Extended length SS braided flexible hose for complex false ceilings.'],
  ['Sprinkler System', 'Alarm Check Valves', 'HD Fire', 'Alarm Valve Station', 'Sprinkler Alarm Valve Station with Gong Bell', 50209, 'Set', true, 'UL listed wet alarm check valve with water motor gong bell and trim kit.'],
  ['Sprinkler System', 'Alarm Check Valves', 'HD Fire', 'Alarm Valve Station', 'Alarm Valve Station 150mm (6") Complete', 89700, 'Nos', true, 'Complete 6-inch wet sprinkler system riser check valve with retarding chamber.'],
  ['Sprinkler System', 'Flow Monitoring', 'System Sensor', 'Flow Switch & Sensor', 'Water Flow Detector WFDN 100mm (4")', 6282.91, 'Nos', true, 'Vane-type waterflow switch with built-in retard timer for riser monitoring.'],
  ['Sprinkler System', 'Flow Monitoring', 'Honeywell', 'Flow Switch & Sensor', 'Honeywell Water Flow Switch 100mm', 2442.6, 'Nos', true, 'Heavy duty pipeline water flow indicator switch.'],
  ['Sprinkler System', 'Sprinkler Fittings & Pipework', 'Jindal / Tata', 'Sprinkler Fittings & Pipework', 'Mechanical Tee 50mm x 25mm Fire Sprinkler', 1017.75, 'Nos', true, 'Ductile iron grooved mechanical branch tee for direct sprinkler drop.'],
  ['Sprinkler System', 'Sprinkler Fittings & Pipework', 'Jindal / Tata', 'Sprinkler Fittings & Pipework', 'Rigid Grooved Coupling 100mm (4")', 667, 'Nos', true, 'Ductile iron grooved coupling with EPDM gasket.'],

  // ---------------- HYDRANT SYSTEM ----------------
  ['Hydrant System', 'Hydrant Landing Valves', 'NewAge', 'Hydrant Valve (Landing Valve)', 'Single Outlet Landing Valve 63mm Gunmetal', 8625, 'Nos', true, 'IS 5290 Type-A certified 63 mm oblique gunmetal landing valve with blank cap.'],
  ['Hydrant System', 'Hydrant Landing Valves', 'NewAge', 'Hydrant Valve (Landing Valve)', 'Double Outlet Landing Valve 63mm Gunmetal', 20010, 'Nos', true, 'Twin outlet landing valve with independent control shutoffs per IS 5290.'],
  ['Hydrant System', 'Hydrant Landing Valves', 'NewAge', 'Hydrant Valve (Landing Valve)', 'Double Outlet Landing Valve 63mm SS304', 23611.8, 'Nos', true, 'SS304 corrosion-resistant landing valve for industrial / marine sites.'],
  ['Hydrant System', 'Fire Hoses & Couplings', 'NewAge / Jay Shree', 'Delivery Hose', 'Type-A RRL Hose 63mm x 15Mtrs with GM Couplings', 5520, 'Nos', true, 'Reinforced rubber lined hose per IS 636 Type A with gunmetal instantaneous couplings.'],
  ['Hydrant System', 'Fire Hoses & Couplings', 'NewAge / Jay Shree', 'Delivery Hose', 'Type-A RRL Hose 63mm x 30Mtrs with GM Couplings', 10235, 'Nos', true, '30 metre continuous fire delivery hose per IS 636.'],
  ['Hydrant System', 'Branch Pipes & Nozzles', 'NewAge', 'Branch Pipe & Nozzle', 'Short Branch Pipe 63mm with 16mm GM Nozzle', 2849.7, 'Nos', true, 'IS 903 gunmetal branch pipe with standard 16 mm bore nozzle tip.'],
  ['Hydrant System', 'Branch Pipes & Nozzles', 'NewAge', 'Branch Pipe & Nozzle', 'Fog & Jet Triple Purpose Nozzle 63mm GM', 6670, 'Nos', true, 'Multipurpose spray / jet / shutoff nozzle for variable firefighting coverage.'],
  ['Hydrant System', 'Hose Reel Units', 'NewAge / Minimax', 'Hose Reel Drum', 'Swinging Fire Hose Reel 20mm x 30Mtr Complete', 2374.75, 'Set', true, 'Swinging wall bracket hose reel drum with 30 m semi-rigid PVC hose per IS 884.'],
  ['Hydrant System', 'Hose Storage Boxes', 'Shabh Fabrications', 'Fire Hose Box', 'Single Door Hose Box (MS 16 Gauge Red)', 4197.5, 'Nos', true, 'Epoxy powder-coated MS cabinet with glass break front; holds one hose and one nozzle.'],
  ['Hydrant System', 'Hose Storage Boxes', 'Shabh Fabrications', 'Fire Hose Box', 'Double Door Hose Box (MS 16 Gauge Red)', 10421.76, 'Nos', true, 'Twin-door cabinet for two delivery hoses, branch pipe and landing valve.'],
  ['Hydrant System', 'Hose Storage Boxes', 'Shabh Fabrications', 'Fire Hose Box', 'Stainless Steel SS304 Hose Box (Double Door)', 13339.31, 'Nos', true, 'Weatherproof SS304 fire hose box for open yards and chemical environments.'],
  ['Hydrant System', 'Fire Brigade Inlets', 'NewAge / Sant', 'Fire Brigade Connection', '2-Way Fire Brigade Inlet 100mm Riser (Gunmetal)', 9499, 'Nos', true, 'Cast iron / gunmetal body with two instantaneous inlets and built-in NRVs per IS 904.'],
  ['Hydrant System', 'Fire Brigade Inlets', 'NewAge / Sant', 'Fire Brigade Connection', '4-Way Fire Brigade Inlet 150mm Riser', 16330, 'Nos', true, '4-way siamese collection head for direct pumping from municipal fire tenders.'],

  // ---------------- PUMP ROOM ----------------
  ['Pump Room', 'Main Fire Pumps (Electrical)', 'Kirloskar / Lubi', 'Main Electric Pump', 'Main Fire Hydrant Pump 2280 LPM @ 70M Head (75 HP)', 557750, 'Set', true, 'End suction centrifugal electrical fire pump with 75 HP 2900 RPM motor on common skid.'],
  ['Pump Room', 'Main Fire Pumps (Electrical)', 'Kirloskar / Lubi', 'Main Electric Pump', 'Sprinkler Main Pump 2850 LPM @ 70M Head (90 HP)', 684250, 'Set', true, 'High-discharge centrifugal fire pump coupled to TEFC 3-phase induction motor.'],
  ['Pump Room', 'Diesel Engine Pumps', 'Kirloskar / Greaves', 'Diesel Standby Pump', 'Diesel Driven Fire Pump 2280 LPM @ 70M Head Complete', 782000, 'Set', true, 'Standby diesel engine driven pump with radiator, fuel tank, 24 V starter and battery pack per NBC.'],
  ['Pump Room', 'Diesel Engine Pumps', 'Kirloskar / Greaves', 'Diesel Standby Pump', 'Diesel Driven Fire Pump 2850 LPM @ 70M Head Complete', 943000, 'Set', true, 'High-capacity diesel fire engine unit for complete electrical blackout backup.'],
  ['Pump Room', 'Jockey Pumps', 'Kirloskar / Grundfos', 'Jockey Pump', 'Vertical Multistage Jockey Pump 180 LPM @ 70M Head (10 HP)', 132250, 'Set', true, 'Vertical multistage pump for automatic line pressure maintenance and leakage compensation.'],
  ['Pump Room', 'Pump Automation Panels', 'Advance Control / L&T', 'Pump Controller Panel', 'Integrated Fire Pump Control Panel (Main + Diesel + Jockey)', 327750, 'Set', true, 'Automatic control panel with star-delta starters, auto diesel cranking and annunciator.'],
  ['Pump Room', 'Isolation & Check Valves', 'Audco / Sant', 'Pump Room Valves', 'Wafer Butterfly Valve 100mm (4") CI Body', 4138.85, 'Nos', true, 'PN16 cast iron butterfly valve with lever / gear operator.'],
  ['Pump Room', 'Isolation & Check Valves', 'Audco / Sant', 'Pump Room Valves', 'Wafer Butterfly Valve 150mm (6") CI Body', 8858.5, 'Nos', true, 'PN16 heavy duty isolation butterfly valve for pump manifold suction / delivery.'],
  ['Pump Room', 'Isolation & Check Valves', 'Sant / Emerald', 'Pump Room Valves', 'Dual Plate Check Valve (NRV) 100mm (4")', 5765.89, 'Nos', true, 'Spring loaded wafer non-return valve to eliminate water hammer.'],
  ['Pump Room', 'Isolation & Check Valves', 'Sant / Emerald', 'Pump Room Valves', 'Dual Plate Check Valve (NRV) 150mm (6")', 5699.4, 'Nos', true, 'Heavy duty dual plate non-return valve.'],
  ['Pump Room', 'Isolation & Check Valves', 'Sant / Emerald', 'Pump Room Valves', 'Y-Type Strainer 150mm (6") CI Body', 12880, 'Nos', true, 'PN16 cast iron strainer with perforated SS screen for pump suction protection.'],
  ['Pump Room', 'Pressure Switches & Headers', 'Danfoss', 'Pressure Switch', 'Danfoss RT-5 Pressure Switch (0.5 to 10 Bar)', 5520, 'Nos', true, 'Industrial grade pressure switch with adjustable differential for automated pump start / stop.'],
  ['Pump Room', 'Pressure Switches & Headers', 'Shabh Fabrications', 'Air Vessel & Automation', 'Fabricated Air Cushion Vessel (250 Litre, 16 Bar)', 41400, 'Nos', true, 'MS air vessel tested to 24 Bar hydraulic pressure to suppress line surges.'],

  // ---------------- OTHERS & SUPPRESSION ----------------
  ['Others & Suppression', 'Gas Flooding & Suppression', 'Kanex / Rotarex', 'Clean Agent System', 'FK-5-1-12 2Kg Tube Direct Panel System', 23080.5, 'Set', true, 'Compact electrical panel automatic fire trace DLP suppression tube system.'],
  ['Others & Suppression', 'Gas Flooding & Suppression', 'Kanex / Rotarex', 'Clean Agent System', 'Pneumatic Linear Heat Detection Tube (10M)', 949.9, 'Nos', true, 'Linear thermal detection polymer tube for direct low-pressure cabinet suppression.'],
  ['Others & Suppression', 'Gas Flooding & Suppression', 'Rotarex / Ceasefire', 'Clean Agent System', '34L PESO Approved Cylinder Assembly', 89562, 'Nos', true, 'High pressure seamless cylinder assembly for gas suppression systems.'],
  ['Others & Suppression', 'Portable Fire Extinguishers', 'Kanex / Ceasefire', 'Fire Extinguisher', 'ABC Powder Extinguisher 4 Kg (MAP 50)', 1782.5, 'Nos', true, 'IS 15683 certified multi-purpose dry chemical powder extinguisher.'],
  ['Others & Suppression', 'Portable Fire Extinguishers', 'Kanex / Ceasefire', 'Fire Extinguisher', 'ABC Powder Extinguisher 6 Kg (IS 15683)', 2277.05, 'Nos', true, 'Standard 6 kg stored pressure multi-purpose fire extinguisher.'],
  ['Others & Suppression', 'Portable Fire Extinguishers', 'Kanex / Ceasefire', 'Fire Extinguisher', 'Carbon Dioxide (CO2) 4.5 Kg Extinguisher', 9783.97, 'Nos', true, 'Seamless PESO-approved CO2 cylinder with discharge horn for electrical equipment.'],
  ['Others & Suppression', 'Portable Fire Extinguishers', 'Kanex / Ceasefire', 'Fire Extinguisher', '50 Kg Trolley Mounted ABC Extinguisher', 58513.84, 'Nos', true, 'Industrial high-capacity trolley dry powder extinguisher.'],
  ['Others & Suppression', 'Safety Signages', 'Shabh Visuals', 'Safety Signage', 'Glow-in-the-Dark Photoluminescent Exit Sign', 517.5, 'Nos', true, '3 mm rigid PVC photoluminescent emergency exit route signboard.'],
  ['Others & Suppression', 'Piping, Hangers & Structural Supports', 'Jindal / Tata', 'Pipe & Support Clamps', '100mm (4") Heavy C-Class MS Pipe per Meter', 1978.51, 'Mtr', true, 'IS 1239 heavy class welded mild steel pipe for hydrant and sprinkler mains.'],
  ['Others & Suppression', 'Piping, Hangers & Structural Supports', 'Shabh Fabrications', 'Pipe & Support Clamps', '100mm Pipe Chilli / Clevis Hanger Clamp', 88.21, 'Nos', true, 'Galvanized adjustable ceiling hanger clamp with M10 threaded suspension rod.']
]

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export const CATALOG: CatalogSku[] = RAW.map((row) => {
  const [category, sub, brand, type, model, rateInclGst, unit, verified, spec] = row
  return {
    id: `${slug(brand)}--${slug(model)}`,
    category,
    sub,
    brand,
    type,
    model,
    rateInclGst,
    unit,
    verified,
    spec
  }
})

export const CATALOG_BY_ID = new Map(CATALOG.map((sku) => [sku.id, sku]))

export const CATEGORY_LIST = [...new Set(CATALOG.map((sku) => sku.category))] as CatalogCategory[]

export function subcategoriesOf(category: CatalogCategory): string[] {
  return [...new Set(CATALOG.filter((sku) => sku.category === category).map((sku) => sku.sub))]
}
