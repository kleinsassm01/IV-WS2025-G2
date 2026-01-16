export default class DashboardController {
  constructor({
    state,
    dataService,
    axis,
    lineChart,
    radarChart,
    histogramChart,
    choroplethChart,
    groupedBarChart
  }) {
    this.state = state;
    this.dataService = dataService;
    this.axis = axis;
    this.lineChart = lineChart;
    this.radarChart = radarChart;
    this.histogramChart = histogramChart;
    this.choroplethChart = choroplethChart;
    this.groupedBarChart = groupedBarChart;
  }

  update() {
    const s = this.state;
    const q = s.question;

    if (!q) return;

    const filters = {
      selectedState: s.selectedState,
      selectedStratification: s.selectedStratification
    };

    const yearly = this.dataService.getYearlyAverages(q, filters);
    this.axis.update(yearly);
    this.lineChart.draw(yearly, s.selectedYear);

    this.radarChart.update(
      this.dataService.getRadarData(q, {
        year: s.selectedYear,
        selectedState: s.selectedState
      }),
      s.selectedStratification,
      label => {
        s.selectedStratification =
          s.selectedStratification === label ? null : label;
        this.update();
      }
    );

    this.histogramChart.update(
      this.dataService.getHistogramData(q, {
        year: s.selectedYear,
        selectedStratification: s.selectedStratification,
        selectedState: s.selectedState
      })
    );

    this.choroplethChart.update(
      this.dataService.getChoroplethData(q, {
        year: s.selectedYear,
        selectedStratification: s.selectedStratification
      }),
      s.selectedState
    );

    const dimLabel = s.groupedMode === "sex" ? "Sex" : "Ethnicity";
    this.groupedBarChart.update(
      this.dataService.getGroupedBarData(
        q,
        s.groupedMode,
        {
          year: s.selectedYear,
          selectedState: s.selectedState
        }
      ),
      dimLabel
    );
  }
}
