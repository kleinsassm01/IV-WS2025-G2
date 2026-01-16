export function startGuidedTour(force = false) {
  if (!force && localStorage.getItem("dashboardTourSeen")) return;

  const steps = [
    {
      el: "#questionSelect",
      title: "Filter by Question",
      text: "Select a specific question to update all charts."
    },
    {
      el: "#yearFilterBtn",
      title: "Filter by Year",
      text: "Click points on the line chart to focus on a specific year."
    },
    {
      el: "#radarFilterBtn",
      title: "Demographic Filter",
      text: "Click a category in the radar chart to filter by group."
    },
    {
      el: "#mapFilterBtn",
      title: "State Selection",
      text: "Click a state to explore state-level differences."
    }
  ];

  let stepIndex = 0;

  const overlay = document.createElement("div");
  overlay.className = "tour-overlay";

  const tooltip = document.createElement("div");
  tooltip.className = "tour-tooltip";

  document.body.appendChild(overlay);
  document.body.appendChild(tooltip);

  function showStep(i) {
    const step = steps[i];
    const target = document.querySelector(step.el);
    if (!target) return;

    const rect = target.getBoundingClientRect();

    tooltip.innerHTML = `
      <h4>${step.title}</h4>
      <div>${step.text}</div>
      <div class="tour-actions">
        <button class="tour-skip">Skip</button>
        <button class="tour-next">
          ${i === steps.length - 1 ? "Finish" : "Next"}
        </button>
      </div>
    `;

    tooltip.style.left = `${rect.right + 12}px`;
    tooltip.style.top = `${rect.top}px`;

    tooltip.querySelector(".tour-next").onclick = () => {
      stepIndex++;
      stepIndex < steps.length ? showStep(stepIndex) : endTour();
    };

    tooltip.querySelector(".tour-skip").onclick = endTour;
  }

  function endTour() {
    overlay.remove();
    tooltip.remove();
    localStorage.setItem("dashboardTourSeen", "true");
  }

  showStep(stepIndex);
}
