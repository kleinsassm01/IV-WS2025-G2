const DURATION = 750;
const TOOLTIP_OFFSET_X = 10;
const TOOLTIP_OFFSET_Y = 30;

function pointTooltipHTML(d) {
  return `
    <strong>Year:</strong> ${d.YearStart}<br/>
    <strong>Value:</strong> ${d.Data_Value.toFixed(1)}%
  `;
}

class DataService {
  constructor(csvParts) {
    this.csvPaths = csvParts;
    this.data = [];
  }

  async load() {
    const loaded = await Promise.all(this.csvPaths.map(p => d3.csv(p)));
    this.data = loaded.flat().map(d => ({
      ...d,
      YearStart: +d.YearStart,
      Data_Value: +d.Data_Value
    }));
  }

  baseFilter(question) {
    return this.data.filter(d =>
      d.Question === question &&
      d.Data_Value != null &&
      (
        d.Data_Value_Unit === "Percent" ||
        (d.Data_Value_Type && d.Data_Value_Type.includes("Percent"))
      )
    );
  }

  getYearlyAverages(question) {
    let filtered = this.baseFilter(question)
      .filter(d => d.Stratification1 === "Overall" || !d.Stratification1);

    if (selectedStratification) {
      filtered = filtered.filter(d => d.Stratification2 === selectedStratification);
    }

    return d3.groups(filtered, d => d.YearStart)
      .map(([year, arr]) => ({
        YearStart: year,
        Data_Value: d3.mean(arr, v => v.Data_Value)
      }))
      .sort((a, b) => a.YearStart - b.YearStart);
  }

  getRadarData(question, year = null) {
    let filtered = this.baseFilter(question).filter(d => d.Stratification2);

    if (year !== null) {
      filtered = filtered.filter(d => d.YearStart === year);
    }

    return d3.groups(filtered, d => d.Stratification2)
      .map(([label, arr]) => ({
        label,
        value: d3.mean(arr, v => v.Data_Value)
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  getHistogramData(question, year = null) {
    let filtered = this.baseFilter(question)
      .filter(d => d.Stratification1 === "Overall");

    if (year !== null) {
      filtered = filtered.filter(d => d.YearStart === year);
    }

    if (selectedStratification) {
      filtered = filtered.filter(d => d.Stratification2 === selectedStratification);
    }

    return filtered.map(d => d.Data_Value);
  }
}

class Axis {
  constructor(svg, width, height, margin) {
    this.xScale = d3.scaleLinear()
      .range([margin.left, width - margin.right]);

    this.yScale = d3.scaleLinear()
      .range([height - margin.bottom, margin.top]);

    this.xAxisGroup = svg.append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`);

    this.yAxisGroup = svg.append("g")
      .attr("transform", `translate(${margin.left}, 0)`);

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height - 5)
      .text("Year");

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 15)
      .text("Percentage");
  }

  update(data) {
    this.xScale.domain(d3.extent(data, d => d.YearStart)).nice();
    this.yScale.domain(d3.extent(data, d => d.Data_Value)).nice();

    this.xAxisGroup.call(
      d3.axisBottom(this.xScale)
        .tickValues(data.map(d => d.YearStart))
        .tickFormat(d3.format("d"))
    );

    this.yAxisGroup.call(d3.axisLeft(this.yScale));
  }
}

class LineChart {
  constructor(svg, axis, tooltip, histogramChart) {
    this.svg = svg;
    this.axis = axis;
    this.tooltip = tooltip;
    this.histogramChart = histogramChart;

    this.path = svg.append("path")
      .attr("fill", "none")
      .attr("stroke", "#000")
      .attr("stroke-width", 2);
  }

  draw(data) {
    const line = d3.line()
      .x(d => this.axis.xScale(d.YearStart))
      .y(d => this.axis.yScale(d.Data_Value));

    this.path
      .datum(data)
      .transition()
      .duration(DURATION)
      .attr("d", line);

    const points = this.svg.selectAll("circle.point")
      .data(data, d => d.YearStart);

    points.enter()
      .append("circle")
      .attr("class", "point")
      .attr("r", 5)
      .merge(points)
      .on("mouseover", (event, d) => {
        this.tooltip
          .style("opacity", 1)
          .html(pointTooltipHTML(d))
          .style("left", `${event.pageX + TOOLTIP_OFFSET_X}px`)
          .style("top", `${event.pageY - TOOLTIP_OFFSET_Y}px`);
      })
      .on("mouseout", () => this.tooltip.style("opacity", 0))
      .on("click", (_, d) => {
        selectedYear = d.YearStart;
        updateYearFilterButton();
        updateAll();
      })
      .transition()
      .duration(DURATION)
      .attr("cx", d => this.axis.xScale(d.YearStart))
      .attr("cy", d => this.axis.yScale(d.Data_Value));

    points.exit().remove();
  }
}
class RadarChart {
  constructor(svg, { levels = 5 } = {}) {
    this.svg = svg;
    this.levels = levels;

    this.width = svg.node().getBoundingClientRect().width;
    this.height = svg.node().getBoundingClientRect().height;
    this.radius = Math.min(this.width, this.height) / 2 * 0.8;

    this.g = svg
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .append("g")
      .attr(
        "transform",
        `translate(${this.width / 2}, ${this.height / 2})`
      );

    this.radarPath = this.g.append("path")
      .attr("fill", "steelblue")
      .attr("fill-opacity", 0.25)
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2);
  }

  drawGrid(maxValue) {
    this.g.selectAll(".grid").remove();

    const rScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([0, this.radius]);

    for (let i = 1; i <= this.levels; i++) {
      this.g.append("circle")
        .attr("class", "grid")
        .attr("r", rScale(maxValue * i / this.levels))
        .attr("fill", "none")
        .attr("stroke", "#ccc")
        .attr("stroke-dasharray", "2,2");
    }
  }

  update(data) {
    if (!data || !data.length) return;

    const maxValue = d3.max(data, d => d.value) * 1.1;

    this.g.selectAll(".axis,.label,.grid").remove();

    this.drawGrid(maxValue);

    const angleSlice = (Math.PI * 2) / data.length;

    const rScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([0, this.radius]);

    data.forEach((d, i) => {
      const angle = angleSlice * i - Math.PI / 2;

      this.g.append("line")
        .attr("class", "axis")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", rScale(maxValue) * Math.cos(angle))
        .attr("y2", rScale(maxValue) * Math.sin(angle))
        .attr("stroke", "#aaa");

      this.g.append("text")
        .attr("class", "label")
        .attr("x", (rScale(maxValue) + 18) * Math.cos(angle))
        .attr("y", (rScale(maxValue) + 18) * Math.sin(angle))
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("cursor", "pointer")
        .classed("selected", d.label === selectedStratification)
        .text(d.label)
        .on("click", () => {
          selectedStratification = d.label;
          updateStratFilterButton();
          updateAll();
        });
    });

    const radarLine = d3.lineRadial()
      .radius(d => rScale(d.value))
      .angle((_, i) => angleSlice * i)
      .curve(d3.curveLinearClosed);

    this.radarPath
      .datum(data)
      .transition()
      .duration(DURATION)
      .attr("d", radarLine);
  }
}

class HistogramChart {
  constructor(svg) {
    this.svg = svg;

    this.width = svg.node().getBoundingClientRect().width;
    this.height = svg.node().getBoundingClientRect().height;

    this.margin = { top: 30, right: 30, bottom: 60, left: 70 };
    this.innerWidth = this.width - this.margin.left - this.margin.right;
    this.innerHeight = this.height - this.margin.top - this.margin.bottom;

    this.g = svg.append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    this.xScale = d3.scaleLinear();
    this.yScale = d3.scaleLinear();

    this.xAxisG = this.g.append("g")
      .attr("transform", `translate(0,${this.innerHeight})`);

    this.yAxisG = this.g.append("g");

    this.xLabel = svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", this.width / 2)
      .attr("y", this.height - 10);

    this.yLabel = svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -this.height / 2)
      .attr("y", 20)
      .text("Number of Surveys");
  }

  update(values, topic) {
    if (!values.length) return;

    this.xLabel.text(topic);

    const bins = d3.bin().thresholds(10)(values);

    this.xScale.domain(d3.extent(values)).range([0, this.innerWidth]);
    this.yScale.domain([0, d3.max(bins, d => d.length)])
      .nice()
      .range([this.innerHeight, 0]);

    this.xAxisG.transition().duration(DURATION)
      .call(d3.axisBottom(this.xScale));
    this.yAxisG.transition().duration(DURATION)
      .call(d3.axisLeft(this.yScale));

    const bars = this.g.selectAll(".bar").data(bins);

    bars.enter()
      .append("rect")
      .attr("class", "bar")
      .attr("fill", "steelblue")
      .merge(bars)
      .transition()
      .duration(DURATION)
      .attr("x", d => this.xScale(d.x0))
      .attr("width", d => Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 1))
      .attr("y", d => this.yScale(d.length))
      .attr("height", d => this.innerHeight - this.yScale(d.length));

    bars.exit().remove();
  }
}

const csvParts = Array.from({ length: 15 }, (_, i) => `data/health_part${i + 1}.csv`);
const dataService = new DataService(csvParts);

let selectedYear = null;
let selectedStratification = null;
let radarChart;
let histogramChart;
let select;

function updateYearFilterButton() {
  const btn = document.getElementById("yearFilterBtn");
  btn.textContent = selectedYear ?? "–";
  btn.classList.toggle("active", selectedYear !== null);
}

function updateStratFilterButton() {
  const btn = document.getElementById("radarFilterBtn");
  btn.textContent = selectedStratification ?? "–";
  btn.classList.toggle("active", selectedStratification !== null);
}

function updateAll() {
  const question = select.value;

  const yearly = dataService.getYearlyAverages(question);
  axis.update(yearly);
  lineChart.draw(yearly);

  radarChart.update(
    dataService.getRadarData(question, selectedYear)
  );

  histogramChart.update(
    dataService.getHistogramData(question, selectedYear),
    question
  );
}

let axis, lineChart;

document.addEventListener("DOMContentLoaded", async () => {
  await dataService.load();

  select = document.getElementById("questionSelect");

  const lineSvg = d3.select("#lineChart");
  const radarSvg = d3.select("#radarChart");
  const histogramSvg = d3.select("#histogramPlot");

  histogramChart = new HistogramChart(histogramSvg);
  radarChart = new RadarChart(radarSvg);

  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  const w = lineSvg.node().getBoundingClientRect().width;
  const h = lineSvg.node().getBoundingClientRect().height;
  lineSvg.attr("viewBox", `0 0 ${w} ${h}`);

  axis = new Axis(lineSvg, w, h, { top: 20, right: 30, bottom: 40, left: 50 });
  lineChart = new LineChart(lineSvg, axis, tooltip, histogramChart);

  updateAll();
  select.addEventListener("change", updateAll);

  d3.select("#yearFilterBtn").on("click", () => {
    selectedYear = null;
    updateYearFilterButton();
    updateAll();
  });

  d3.select("#radarFilterBtn").on("click", () => {
    selectedStratification = null;
    updateStratFilterButton();
    updateAll();
  });
});
