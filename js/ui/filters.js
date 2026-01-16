import { setState } from "../state/store.js";

export function initFilters() {
  document.getElementById("yearFilterBtn")
    .onclick = () => setState({ selectedYear: null });

  document.getElementById("radarFilterBtn")
    .onclick = () => setState({ selectedStratification: null });

  document.getElementById("mapFilterBtn")
    .onclick = () => setState({
      selectedState: null,
      selectedStateName: null
    });

  document.getElementById("dimension")
    ?.addEventListener("change", e =>
      setState({ groupedMode: e.target.value })
    );
}
