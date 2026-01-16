export function startGuidedTour() {
  if (localStorage.getItem("dashboardTourSeen")) return;
  alert("Welcome! Use the filters and charts to explore the data.");
  localStorage.setItem("dashboardTourSeen", "true");
}
