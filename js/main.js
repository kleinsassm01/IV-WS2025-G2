import AppState from "./data/state.js";
import DashboardController from "./controller/dashboardcontroller.js";
import DataService from "./data/dataservice.js";
import { ABOUT_TEXT } from "./data/constants.js";
import { startGuidedTour } from "./data/tourservice.js";

import Axis from "./charts/axis.js";
import LineChart from "./charts/line.js";
import RadarChart from "./charts/radar.js";
import HistogramChart from "./charts/histogram.js";
import ChoroplethChart from "./charts/choropleth.js";
import GroupedBarChart from "./charts/bar.js";

function showDeferredUI() {
  document.querySelectorAll(".deferred-ui")
    .forEach(el => el.style.visibility = "visible");
}

document.addEventListener("DOMContentLoaded", async () => {

  const state = new AppState();

  const csvParts = Array.from(
    { length: 15 },
    (_, i) => `data/health_part${i + 1}.csv`
  );

  const dataService = new DataService(csvParts);
  await dataService.load(total =>
    d3.select("#totalCount").text(total)
  );

  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  const lineSvg = d3.select("#lineChart");
  const radarSvg = d3.select("#radarChart");
  const histogramSvg = d3.select("#histogramPlot");
  const mapSvg = d3.select("#map");
  const groupedSvg = d3.select("#groupedBarChart");

  const { width, height } = lineSvg.node().getBoundingClientRect();
  lineSvg.attr("viewBox", `0 0 ${width} ${height}`);

  const axis = new Axis(
    lineSvg,
    width,
    height,
    { top: 20, right: 30, bottom: 40, left: 50 },
    {
      xLabel: "Year",
      yLabel: "Average Percentage"
    }
  );

  const lineChart = new LineChart(
    lineSvg,
    axis,
    tooltip,
    year => {
      state.selectedYear =
        state.selectedYear === year ? null : year;
      updateYearButton();
      controller.update();
    }
  );

  const radarChart = new RadarChart(radarSvg);
  const histogramChart = new HistogramChart(histogramSvg, tooltip);

  const choroplethChart = new ChoroplethChart(
    mapSvg,
    tooltip,
    (abbr, name) => {

      const isSameState = state.selectedState === abbr;

      if (isSameState) {
        state.resetState();
        state.resetYear();
        state.resetStratification();
      } else {
        state.selectedState = abbr;
        state.selectedStateName = name;
      }

      updateMapButton();
      updateYearButton();
      updateStratButton();
      controller.update();
    }
  );
  await choroplethChart.loadMap("data/us-states-10m.json");

  const groupedBarChart = new GroupedBarChart(groupedSvg, tooltip);

  const controller = new DashboardController({
    state,
    dataService,
    axis,
    lineChart,
    radarChart,
    histogramChart,
    choroplethChart,
    groupedBarChart
  });

  d3.select(".info-icon")
    .on("mouseover", (event) => {
      tooltip
        .style("opacity", 1)
        .html(ABOUT_TEXT)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 30}px`);
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 30}px`);
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  const questionSelect = document.getElementById("questionSelect");
  state.question = questionSelect.value;

  questionSelect.addEventListener("change", e => {
    state.question = e.target.value;
    controller.update();
  });

  document.getElementById("dimension")
    ?.addEventListener("change", e => {
      state.groupedMode = e.target.value;
      controller.update();
    });

  document.querySelector(".search-input")
    ?.addEventListener("input", e =>
      choroplethChart.highlight(e.target.value)
    );

  document.getElementById("yearFilterBtn")
    ?.addEventListener("click", () => {
      state.resetYear();
      updateYearButton();
      controller.update();
    });

  document.getElementById("radarFilterBtn")
    ?.addEventListener("click", () => {
      state.resetStratification();
      updateStratButton();
      controller.update();
    });

  document.getElementById("mapFilterBtn")
    ?.addEventListener("click", () => {
      state.resetState();
      updateMapButton();
      controller.update();
    });

  window.addEventListener("resize", () => controller.update());

  function updateYearButton() {
    const btn = document.getElementById("yearFilterBtn");
    btn.textContent = state.selectedYear ?? "–";
    btn.classList.toggle("active", state.selectedYear !== null);
  }

  function updateStratButton() {
    const btn = document.getElementById("radarFilterBtn");
    btn.textContent = state.selectedStratification ?? "–";
    btn.classList.toggle("active", state.selectedStratification !== null);
  }

  function updateMapButton() {
    const btn = document.getElementById("mapFilterBtn");
    btn.textContent =
      state.selectedStateName ?? state.selectedState ?? "–";
    btn.classList.toggle("active", state.selectedState !== null);
  }

  updateYearButton();
  updateStratButton();
  updateMapButton();
  showDeferredUI();
  startGuidedTour();
  controller.update();

  const helpBtn = document.getElementById("helpTourBtn");
  if (helpBtn) {
    helpBtn.addEventListener("click", () => {
      localStorage.removeItem("dashboardTourSeen");
      startGuidedTour(true);
    });
  }
});
