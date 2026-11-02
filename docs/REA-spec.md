# Recovered engine specification

Source: <https://shabhcreations.com>. The tool pages gate their UI behind an email +
arithmetic check, but all calculation code is inline in the page body and is readable
without authentication through the WordPress REST API:

```
/wp-json/wp/v2/pages?slug=<slug>&_fields=id,slug,content
```

| Tool | Slug | Page id |
| --- | --- | --- |
| Gas suppression BOQ | `gas-suppression-boq-generator` | 804 |
| Fire alarm quotation builder | `fire-alarm-quotation-builder` | 865 |
| Fire alarm BOQ generator | `free-fire-alarm-boq-generator` | 883 |
| Fire safety AMC quotation | `fire-safety-amc-quotation-builder` | 897 |

All four run entirely in the browser. There is no server-side pricing API.

## Gas suppression

Design temperature is fixed at 70 °F (21 °C).

```
s = s_base + s_multiplier * 70
lbs = (volume_ft3 / s) * (C / (100 - C))
volume_ft3 = volume_m3 * 35.3147
actual_kg = lbs / 2.20462
stored_kg = ceil(actual_kg * (1.02 + pipe_run_m * 0.005))
```

| Agent | s_base | s_multiplier | Class A | Class B | Class C |
| --- | --- | --- | --- | --- | --- |
| FK-5-1-12 (Novec 1230) | 0.9856 | 0.0024422 | 4.50 | 5.90 | 4.50 |
| HFC-227ea (FM-200) | 1.8850 | 0.0046000 | 8.04 | 11.66 | 8.64 |

Nozzles per layer:

```
maxSpacing = sqrt(coverage)            // 95 m2 radial, 190 m2 sidewall
grid = ceil(L/maxSpacing) * ceil(W/maxSpacing) * ceil(H/4.87)
nozzles = max(grid, ceil(area/coverage))
```

Cylinder selection: first ascending size where `stored_kg <= size * maxFill`, then raise
`stored_kg` to `ceil(size * 0.48)` if it is below the minimum fill. If no single cylinder
fits, `count = ceil(stored_kg / (largest * maxFill))` with the same minimum-fill bump.
`maxFill` is 1.12 kg/L at 25 bar and 1.40 kg/L at 42 bar.

Cylinder sizes (litres):

- Ansul `34, 80, 120, 140, 180`
- Kidde `16, 27, 44, 61, 80, 106, 147, 189`
- Ceasefire `16, 22, 34, 50, 55, 80, 100, 120, 140, 150, 180`
- Cryptzo `34, 80, 120, 140, 180`
- Generic `15, 22, 34, 40, 49, 80, 104, 120, 140, 148, 150`

Detectors per protected layer: `max(2, ceil(area_m2 / 25))`. Brackets: two per cylinder.

BOQ lines: agent (kg), cylinder assemblies, brackets, nozzles, electrical actuator per
zone, local manual actuator per zone, pneumatic slave actuator for `cylinders - zones`,
photoelectric detectors, supervisory pressure switch per zone, warning plates at two
per zone. GST 18%.

Prices are present only for Ansul and Cryptzo. Kidde, Ceasefire and Generic resolve to
zero and print as `-` on the live tool. This app marks those lines **Rate required**
instead of silently charging nothing.

## Fire alarm BOQ

Per room, after unit conversion to metres:

| Hazard | Rule |
| --- | --- |
| Kitchen / Spa | heat = ceil(area / 36) |
| Battery | smoke = ceil(area / 81); H2 detectors = max(1, ceil(area / 50)) |
| Server | multi-criteria = ceil(area / 81) |
| Hall, height > 8 m | beam = max(1, ceil(W/15) * ceil(L/100)) |
| Everything else | smoke = ceil(area / 81) |

Voids: the room's detector set is added again once per void layer present.
MCP total starts at the stairwell/exits count, plus one per room flagged for an MCP.
Hooters = exits + ceil(total area / 400). Control modules = ceil(hooters / 10) in
addressable mode only. Isolators = max(1, ceil(buffered devices / 20)).
Wire metres = sum(distance * 2 + perimeter + devices * 3), then multiplied by 1.15.

Expansion buffer multiplies device, MCP, hooter and module counts only.
Panel sizing thresholds: Notifier 318 nodes, EST 250, Morley 198, Simplex 250.

## Quotation builder

Catalog prices are GST-inclusive. The base rate is `round(price / 1.18, 2)`; GST is 18%.
Validity is 15 days and prices are ex-works, excluding installation and cabling.
HSN codes: panels/devices `8531 10 90`, modules/cards `8537 10 00`, cable `8544 49 90`,
batteries `8507 20 90`, sprinkler `8424 90 00`, valves `8481 80 90`, pumps `8413 70 10`,
hose `5909 00 10`, extinguishers `8424 10 00`, boxes `7326 90 99`, switches `9032 20 00`,
fittings `7307 99 90`, signage `3926 90 99`, vessels `7311 00 90`.

## AMC / CMC

The live builder emits a scope table only — no rates, no totals — then posts an enquiry
to `admin-ajax.php`. Visit counts are monthly 12, quarterly 4, half-yearly 2.
This repository keeps the scope identical and adds an editable rate card, because a
maintenance quote is not possible without one.

## Known gaps in the source tools

- No saved projects, no history, no offline use.
- Gallery uploads were never restricted in the source tools; only this app enforces live capture.
- Three of five gas brands carry no prices.
- AMC has no pricing model at all.
- Print is blocked on the gas and AMC pages.
