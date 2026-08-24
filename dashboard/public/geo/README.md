# br-states-topo.json

Brazilian state boundaries, converted to TopoJSON and simplified for web use.

- **Source**: [giuliano-macedo/geodata-br-states](https://github.com/giuliano-macedo/geodata-br-states) (MIT licensed), derived from LAGEAMB-UFPR (Universidade Federal do Paraná) geodata, itself sourced from IBGE.
- **Original file**: `geojson/br_states.json` (5.6MB, high-precision GeoJSON, 27 states).
- **Conversion**: `mapshaper -i br_states_raw.json -filter-fields fields=SIGLA,Estado -simplify 0.4% keep-shapes -o format=topojson br-states-topo.json` — strips unused demographic columns (population, literacy rate, etc.) down to just `SIGLA` (2-letter state code) and `Estado` (full name), simplifies geometry aggressively with `keep-shapes` to prevent small states from disappearing, and converts to TopoJSON (shared borders as arcs) for a much smaller file. Result: 256KB, ~17.4K total arc points (down from ~unknown hundreds of thousands in the raw file) -- the aggressive simplification was needed after an earlier, lighter pass (8%, 345KB) still rendered janky/slow at map-thumbnail display size.
- **Join key**: `SIGLA` matches the `state` field used throughout `dashboard/public/data/*.json` (e.g. `"SP"`, `"RJ"`).
