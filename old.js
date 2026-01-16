const DURATION = 750;
const TOOLTIP_OFFSET_X = 10;
const TOOLTIP_OFFSET_Y = 30;

const FIPS_TO_ABBR = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  "10": "DE",
  "11": "DC",
  "12": "FL",
  "13": "GA",
  "15": "HI",
  "16": "ID",
  "17": "IL",
  "18": "IN",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "22": "LA",
  "23": "ME",
  "24": "MD",
  "25": "MA",
  "26": "MI",
  "27": "MN",
  "28": "MS",
  "29": "MO",
  "30": "MT",
  "31": "NE",
  "32": "NV",
  "33": "NH",
  "34": "NJ",
  "35": "NM",
  "36": "NY",
  "37": "NC",
  "38": "ND",
  "39": "OH",
  "40": "OK",
  "41": "OR",
  "42": "PA",
  "44": "RI",
  "45": "SC",
  "46": "SD",
  "47": "TN",
  "48": "TX",
  "49": "UT",
  "50": "VT",
  "51": "VA",
  "53": "WA",
  "54": "WV",
  "55": "WI",
  "56": "WY"
};


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

    const totalSurveys = this.data.length;

    d3.select("#totalCount")
      .text(d3.format("")(totalSurveys));
  }

  baseFilter(question) {
    let filtered = this.data.filter(d =>
      d.Question === question &&
      d.Data_Value != null &&
      (
        d.Data_Value_Unit === "Percent" ||
        (d.Data_Value_Type && d.Data_Value_Type.includes("Percent"))
      )
    );

    if (selectedState) {
      filtered = filtered.filter(
        d => d.LocationAbbr === selectedState
      );
    }

    return filtered;
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
    let filtered = this.baseFilter(question)
      .filter(d => d.Stratification2);

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

  getChoroplethData(question, year = null) {
    let filtered = this.data.filter(d =>
      d.Question === question &&
      d.Data_Value != null &&
      (d.Data_Value_Unit === "%" || d.Data_Value_Unit === "Percent") &&
      d.Stratification1 === "65 years or older" &&
      d.LocationAbbr &&
      d.LocationAbbr.length === 2
    );

    if (year !== null) {
      filtered = filtered.filter(d => d.YearStart === year);
    }

    if (selectedStratification) {
      filtered = filtered.filter(
        d => d.Stratification2 === selectedStratification
      );
    }

    return d3.groups(filtered, d => d.LocationAbbr)
      .map(([abbr, arr]) => ({
        LocationAbbr: abbr,
        Data_Value: d3.mean(arr, d => d.Data_Value)
      }));
  }

  getGroupedBarData(question, mode = "sex", year = null) {
    let filtered = this.baseFilter(question);

    if (year !== null) {
      filtered = filtered.filter(d => d.YearStart === year);
    }

    filtered = filtered.filter(d =>
      d.StratificationCategory1 === "Age Group" &&
      d.Stratification1 &&
      d.Stratification1 !== "Overall"
    );

    if (mode === "sex") {
      filtered = filtered.filter(d => d.StratificationCategory2 === "Sex");
    } else {
      filtered = filtered.filter(d =>
        d.StratificationCategory2 &&
        (d.StratificationCategory2.includes("Race") || d.StratificationCategory2.includes("Ethnic"))
      );
    }

    if (!filtered.length) {
      return { ageGroups: [], categories: [], values: [] };
    }

    const nested = d3.rollup(
      filtered,
      v => d3.mean(v, d => d.Data_Value),
      d => d.Stratification1,
      d => d.Stratification2
    );

    const ageGroups = Array.from(nested.keys()).sort();
    const categories = Array.from(new Set(filtered.map(d => d.Stratification2))).sort();

    const values = [];
    for (const [age, catMap] of nested.entries()) {
      for (const [cat, val] of catMap.entries()) {
        values.push({ AgeGroup: age, Category: cat, Value: val });
      }
    }

    return { ageGroups, categories, values };
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
      .classed("selected", d => d.YearStart === selectedYear)
      .on("mouseover", (event, d) => {
        this.tooltip
          .style("opacity", 1)
          .html(pointTooltipHTML(d))
          .style("left", `${event.pageX + TOOLTIP_OFFSET_X}px`)
          .style("top", `${event.pageY - TOOLTIP_OFFSET_Y}px`);
      })
      .on("mouseout", () => this.tooltip.style("opacity", 0))
      .on("click", (_, d) => {
        selectedYear = (selectedYear === d.YearStart) ? null : d.YearStart;
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
    this.g.selectAll(".grid,.grid-label").remove();

    const rScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([0, this.radius]);

    for (let i = 1; i <= this.levels; i++) {
      const value = maxValue * i / this.levels;
      const r = rScale(value);

      this.g.append("circle")
        .attr("class", "grid")
        .attr("r", r)
        .attr("fill", "none")
        .attr("stroke", "#ccc")
        .attr("stroke-dasharray", "2,2");

      this.g.append("text")
        .attr("class", "grid-label")
        .attr("x", 0)
        .attr("y", -r)
        .attr("dy", "-0.3em")
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#666")
        .text(`${value.toFixed(0)}%`);
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
          selectedStratification = (selectedStratification === d.label) ? null : d.label;
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
  constructor(svg, tooltip) {
    this.svg = svg;
    this.tooltip = tooltip;

    this.width = svg.node().getBoundingClientRect().width;
    this.height = svg.node().getBoundingClientRect().height;

    this.svg
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .attr("preserveAspectRatio", "none");

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
      .attr("y", this.height - 10)
      .text("Question");

    this.yLabel = svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -this.height / 2)
      .attr("y", 20)
      .text("Number of Surveys");
  }

  update(values) {
    if (!values.length) return;

    const bins = d3.bin().thresholds(10)(values);

    this.xScale.domain(d3.extent(values)).range([0, this.innerWidth]);
    this.yScale.domain([0, d3.max(bins, d => d.length)])
      .nice()
      .range([this.innerHeight, 0]);

    this.xAxisG.transition().duration(DURATION)
      .call(d3.axisBottom(this.xScale));
    this.yAxisG.transition().duration(DURATION)
      .call(d3.axisLeft(this.yScale));

    const bars = this.g.selectAll(".bar")
      .data(bins);

    bars.enter()
      .append("rect")
      .attr("class", "bar")
      .attr("fill", "steelblue")
      .merge(bars)
      .on("mouseover", (event, d) => {
        this.tooltip
          .style("opacity", 1)
          .html(`
        <strong>Range:</strong> ${d.x0.toFixed(1)}% – ${d.x1.toFixed(1)}%<br/>
        <strong>Count:</strong> ${d.length}
      `)
          .style("left", `${event.pageX + TOOLTIP_OFFSET_X}px`)
          .style("top", `${event.pageY - TOOLTIP_OFFSET_Y}px`);
      })
      .on("mouseout", () => {
        this.tooltip.style("opacity", 0);
      })
      .transition()
      .duration(DURATION)
      .attr("x", d => this.xScale(d.x0))
      .attr("width", d =>
        Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 1)
      )
      .attr("y", d => this.yScale(d.length))
      .attr("height", d => this.innerHeight - this.yScale(d.length));

    bars.exit().remove();

  }
}


class ChoroplethChart {
  constructor(svg, tooltip) {
    this.svg = svg;
    this.tooltip = tooltip;

    this.width = svg.node().getBoundingClientRect().width;
    this.height = svg.node().getBoundingClientRect().height;

    svg.attr("viewBox", `0 0 ${this.width} ${this.height}`);

    this.g = svg.append("g");

    this.legendG = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${this.width - 50}, 40)`);

    this.legendHeight = 160;
    this.legendWidth = 12;

    this.projection = d3.geoAlbersUsa();

    this.path = d3.geoPath(this.projection);

    this.colorScale = d3.scaleSequential(d3.interpolateBlues);

    this.statePaths = null;
  }

  async loadMap() {
    const us = await d3.json("data/us-states-10m.json");

    this.states = topojson.feature(us, us.objects.states).features;
    console.log(this.states)

    const padding = 10;
    this.projection.fitExtent(
      [[padding, padding], [this.width - padding, this.height - padding]],
      { type: "FeatureCollection", features: this.states }
    );
    const [tx, ty] = this.projection.translate();
    this.projection.translate([tx - 30, ty]);

    this.path = d3.geoPath(this.projection);

    this.statePaths = this.g.selectAll("path.state")
      .data(this.states)
      .enter()
      .append("path")
      .attr("class", "state")
      .attr("d", this.path)
      .attr("fill", "#eee")
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.8);
  }

  update(stateData) {
    if (!this.statePaths || !stateData.length) return;

    const valueByState = new Map(
      stateData.map(d => [d.LocationAbbr, d.Data_Value])
    );

    const values = stateData.map(d => d.Data_Value);
    const min = d3.min(values);
    const max = d3.max(values);

    this.colorScale.domain([min, max]);

    this.drawLegend(min, max);

    this.statePaths
      .classed("selected", d => {
        const abbr = FIPS_TO_ABBR[d.id];
        return abbr === selectedState;
      });


    this.statePaths
      .transition()
      .duration(DURATION)
      .attr("fill", d => {
        const abbr = FIPS_TO_ABBR[d.id];
        return valueByState.has(abbr)
          ? this.colorScale(valueByState.get(abbr))
          : "#eee";
      });

    this.statePaths
      .on("click", (_, d) => {
        const abbr = FIPS_TO_ABBR[d.id];
        selectedState = (selectedState === abbr) ? null : abbr;
        selectedStateName = d.properties.name;
        updateMapFilterButton();
        updateAll();
      });


    this.statePaths
      .on("mouseover", (event, d) => {
        const abbr = FIPS_TO_ABBR[d.id];
        const value = valueByState.get(abbr);
        if (value == null) return;

        this.tooltip
          .style("opacity", 1)
          .html(`
          <strong>${d.properties.name}</strong><br/>
          ${value.toFixed(1)}%
        `)
          .style("left", `${event.pageX + TOOLTIP_OFFSET_X}px`)
          .style("top", `${event.pageY - TOOLTIP_OFFSET_Y}px`);
      })
      .on("mouseout", () => {
        this.tooltip.style("opacity", 0);
      });
  }


  highlightState(query) {
    const q = query?.toLowerCase().trim();

    if (!q) {
      this.statePaths.classed("highlighted", false);
      return;
    }

    this.statePaths.classed("highlighted", d =>
      d.properties.name.toLowerCase().includes(q)
    );
  }


  drawLegend(min, max) {
    this.legendG.selectAll("*").remove();

    const defs = this.svg.append("defs");

    const gradient = defs.append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("y1", "100%")
      .attr("x2", "0%")
      .attr("y2", "0%");

    const stops = d3.range(0, 1.01, 0.1);

    stops.forEach(s => {
      gradient.append("stop")
        .attr("offset", `${s * 100}%`)
        .attr("stop-color", this.colorScale(min + s * (max - min)));
    });

    this.legendG.append("rect")
      .attr("width", this.legendWidth)
      .attr("height", this.legendHeight)
      .style("fill", "url(#legend-gradient)")
      .style("stroke", "#ccc");

    const scale = d3.scaleLinear()
      .domain([min, max])
      .range([this.legendHeight, 0]);

    const axis = d3.axisRight(scale)
      .ticks(5)
      .tickFormat(d => `${d.toFixed(0)}%`);

    this.legendG.append("g")
      .attr("transform", `translate(${this.legendWidth},0)`)
      .call(axis);
  }

}


class GroupedBarChart {
  constructor(svg, tooltip) {
    this.svg = svg;
    this.tooltip = tooltip;

    this.width = svg.node().getBoundingClientRect().width;
    this.height = svg.node().getBoundingClientRect().height;

    this.margin = { top: 35, right: 170, bottom: 70, left: 60 };
    this.innerW = this.width - this.margin.left - this.margin.right;
    this.innerH = this.height - this.margin.top - this.margin.bottom;

    svg.attr("viewBox", `0 0 ${this.width} ${this.height}`);

    this.g = svg.append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    this.xAxisG = this.g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${this.innerH})`);

    this.yAxisG = this.g.append("g")
      .attr("class", "axis");

    this.yLabel = svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -this.height / 2)
      .attr("y", 20)
      .text("Average Percentage");

    this.xLabel = svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", this.margin.left + (this.innerW / 2))
      .attr("y", this.margin.top + this.innerH + 55)
      .text("Age Group");

    this.legendG = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${this.margin.left + this.innerW + 18}, ${this.margin.top})`);
  }

  makeColorScale(categories) {
    const blues = [
      "#1f77b4",
      "#4e79a7",
      "#2a5783",
      "#6baed6",
      "#3182bd",
      "#9ecae1",
      "#08519c",
      "#2171b5",
      "#4292c6",
      "#bdd7e7"
    ];

    return d3.scaleOrdinal()
      .domain(categories)
      .range(blues);
  }

  resize() {
    const node = this.svg.node();
    if (!node) return;

    const { width, height } = node.getBoundingClientRect();

    if (!width || !height) return;

    this.width = width;
    this.height = height;

    this.innerW = this.width - this.margin.left - this.margin.right;
    this.innerH = this.height - this.margin.top - this.margin.bottom;

    this.svg.attr("viewBox", `0 0 ${this.width} ${this.height}`);

    this.g.attr("transform", `translate(${this.margin.left},${this.margin.top})`);
    this.xAxisG.attr("transform", `translate(0,${this.innerH})`);

    this.yLabel
      .attr("x", -this.height / 2);

    this.xLabel
      .attr("x", this.margin.left + (this.innerW / 2))
      .attr("y", this.margin.top + this.innerH + 55);

    this.legendG
      .attr("transform", `translate(${this.margin.left + this.innerW + 18}, ${this.margin.top})`);
  }

  update(payload, dimLabel) {
    this.resize();
    const { ageGroups, categories, values } = payload;

    if (!values || values.length === 0) {
      this.g.selectAll(".ageGroup").remove();
      this.legendG.selectAll("*").remove();
      this.title.text(`No data available for ${dimLabel} (with current filters).`);
      this.xAxisG.call(d3.axisBottom(d3.scaleBand().range([0, this.innerW])));
      this.yAxisG.call(d3.axisLeft(d3.scaleLinear().range([this.innerH, 0])));
      return;
    }

    this.xLabel.text(`Age Group (grouped by ${dimLabel})`);

    const x0 = d3.scaleBand()
      .domain(ageGroups)
      .range([0, this.innerW])
      .paddingInner(0.12);

    const x1 = d3.scaleBand()
      .domain(categories)
      .range([0, x0.bandwidth()])
      .padding(0.06);

    const y = d3.scaleLinear()
      .domain([0, d3.max(values, d => d.Value)]).nice()
      .range([this.innerH, 0]);

    const color = this.makeColorScale(categories);

    this.xAxisG.transition().duration(DURATION)
      .call(d3.axisBottom(x0))
      .selection()
      .selectAll("text")
      .style("text-anchor", "middle");

    this.yAxisG.transition().duration(DURATION)
      .call(d3.axisLeft(y));

    const byAge = d3.group(values, d => d.AgeGroup);

    const groups = this.g.selectAll("g.ageGroup")
      .data(ageGroups, d => d);

    const groupsEnter = groups.enter()
      .append("g")
      .attr("class", "ageGroup")
      .attr("transform", d => `translate(${x0(d)},0)`);

    groups.merge(groupsEnter)
      .transition().duration(DURATION)
      .attr("transform", d => `translate(${x0(d)},0)`);

    groups.exit().remove();

    const bars = this.g.selectAll("g.ageGroup")
      .selectAll("rect")
      .data(age => {
        const arr = byAge.get(age) || [];
        const map = new Map(arr.map(d => [d.Category, d.Value]));
        return categories.map(cat => ({
          AgeGroup: age,
          Category: cat,
          Value: map.get(cat) ?? 0
        }));
      }, d => `${d.AgeGroup}|${d.Category}`);

    const barsEnter = bars.enter()
      .append("rect")
      .attr("x", d => x1(d.Category))
      .attr("width", x1.bandwidth())
      .attr("y", y(0))
      .attr("height", 0)
      .attr("fill", d => color(d.Category))
      .on("mouseover", (event, d) => {
        this.tooltip
          .style("opacity", 1)
          .html(`
            <strong>Age group:</strong> ${d.AgeGroup}<br/>
            <strong>${dimLabel}:</strong> ${d.Category}<br/>
            <strong>Average:</strong> ${d.Value.toFixed(2)}%
          `)
          .style("left", `${event.pageX + TOOLTIP_OFFSET_X}px`)
          .style("top", `${event.pageY - TOOLTIP_OFFSET_Y}px`);
      })
      .on("mouseout", () => this.tooltip.style("opacity", 0));

    bars.merge(barsEnter)
      .transition()
      .duration(DURATION)
      .attr("x", d => x1(d.Category))
      .attr("width", x1.bandwidth())
      .attr("y", d => y(d.Value))
      .attr("height", d => y(0) - y(d.Value))
      .attr("fill", d => color(d.Category));

    bars.exit()
      .transition()
      .duration(DURATION / 2)
      .attr("y", y(0))
      .attr("height", 0)
      .remove();

    this.legendG.selectAll("*").remove();

    const legendItems = this.legendG.selectAll("g.item")
      .data(categories);

    const li = legendItems.enter()
      .append("g")
      .attr("class", "item")
      .attr("transform", (_, i) => `translate(0, ${i * 18})`);

    li.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("y", -10)
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("fill", d => color(d));

    li.append("text")
      .attr("x", 16)
      .attr("dy", "0.2em")
      .attr("font-size", 11)
      .text(d => d);
  }
}

const csvParts = Array.from({ length: 15 }, (_, i) => `data/health_part${i + 1}.csv`);
const dataService = new DataService(csvParts);

let selectedYear = null;
let selectedStratification = null;
let selectedState = null;
let selectedStateName = null;
let radarChart;
let histogramChart;
let select;
let choropleth;
let groupedBarChart;
let groupedMode = "sex";

function updateYearFilterButton() {
  const btn = document.getElementById("yearFilterBtn");
  btn.textContent = selectedYear === null ? "–" : String(selectedYear);
  btn.classList.toggle("active", selectedYear !== null);
}

function updateStratFilterButton() {
  const btn = document.getElementById("radarFilterBtn");
  btn.textContent = selectedStratification === null ? "–" : String(selectedStratification);
  btn.classList.toggle("active", selectedStratification !== null);
}

function updateMapFilterButton() {
  const btn = document.getElementById("mapFilterBtn");
  const isActive = selectedState !== null;
  btn.textContent = isActive ? String(selectedStateName ?? selectedState) : "–";
  btn.classList.toggle("active", isActive);
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
    dataService.getHistogramData(question, selectedYear)
  );

  choropleth.update(
    dataService.getChoroplethData(question, selectedYear)
  );

  const dimLabel = groupedMode === "sex" ? "Sex" : "Ethnicity";
  groupedBarChart.update(
    dataService.getGroupedBarData(question, groupedMode, selectedYear),
    dimLabel
  );
}

let axis, lineChart;

document.addEventListener("DOMContentLoaded", async () => {
  await dataService.load();

  window.addEventListener("resize", () => updateAll());

  select = document.getElementById("questionSelect");

  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  const ABOUT_TEXT =
    "This dashboard explores CDC Behavioral Risk Factor Surveillance System (BRFSS) indicators related to Alzheimer’s Disease and Healthy Aging.<br>" +
    "Select a question to compare trends over time and differences across demographics, and click the map or charts to filter the views.<br>" +
    "Source: CDC Alzheimer’s Disease and Healthy Aging Data (BRFSS).";

  d3.select(".info-icon")
    .on("mouseover", (event) => {
      tooltip
        .style("opacity", 1)
        .html(ABOUT_TEXT)
        .style("left", `${event.pageX + TOOLTIP_OFFSET_X}px`)
        .style("top", `${event.pageY - TOOLTIP_OFFSET_Y}px`);
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", `${event.pageX + TOOLTIP_OFFSET_X}px`)
        .style("top", `${event.pageY - TOOLTIP_OFFSET_Y}px`);
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });


  const lineSvg = d3.select("#lineChart");
  const radarSvg = d3.select("#radarChart");
  const histogramSvg = d3.select("#histogramPlot");

  const mapSvg = d3.select("#map");

  const groupedSvg = d3.select("#groupedBarChart");
  groupedBarChart = new GroupedBarChart(groupedSvg, tooltip);
  const dimensionSelect = document.getElementById("dimension");
  if (dimensionSelect) {
    groupedMode = dimensionSelect.value || "sex";

    dimensionSelect.addEventListener("change", (e) => {
      groupedMode = e.target.value;
      updateAll();
    });
  }

  choropleth = new ChoroplethChart(mapSvg, tooltip);
  await choropleth.loadMap();



  histogramChart = new HistogramChart(histogramSvg, tooltip);
  radarChart = new RadarChart(radarSvg);



  const w = lineSvg.node().getBoundingClientRect().width;
  const h = lineSvg.node().getBoundingClientRect().height;
  lineSvg.attr("viewBox", `0 0 ${w} ${h}`);

  axis = new Axis(lineSvg, w, h, { top: 20, right: 30, bottom: 40, left: 50 });
  lineChart = new LineChart(lineSvg, axis, tooltip, histogramChart);

  updateAll();
  document.querySelector(".search-input")
    .addEventListener("input", e => {
      choropleth.highlightState(e.target.value);
    });
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

  d3.select("#mapFilterBtn").on("click", () => {
    selectedState = null;
    selectedStateName = null;
    updateMapFilterButton();
    updateAll();
  });

  updateMapFilterButton();
  showDeferredUI();
  startGuidedTour();

  const helpBtn = document.getElementById("helpTourBtn");
  if (helpBtn) {
    helpBtn.addEventListener("click", () => {
      localStorage.removeItem("dashboardTourSeen");
      startGuidedTour(true);
    });
  }
});

function showDeferredUI() {
  document.querySelectorAll(".deferred-ui")
    .forEach(el => el.style.visibility = "visible");
}


function startGuidedTour(force = false) {
  if (!force && localStorage.getItem("dashboardTourSeen")) return;

  const steps = [
    {
      el: "#questionSelect",
      title: "Filter by Question",
      text: "Select a sepcific question to update all charts for a certain question."
    },
    {
      el: "#yearFilterBtn",
      title: "Filter by Year",
      text: "Click points on the line chart to focus all views on a specific year."
    },
    {
      el: "#radarFilterBtn",
      title: "Demographic Filter",
      text: "Click a category in the radar chart to filter all charts by that group."
    },
    {
      el: "#mapFilterBtn",
      title: "State Selection",
      text: "Click a state on the map to explore state-level differences."
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
        <button class="tour-next">${i === steps.length - 1 ? "Finish" : "Next"}</button>
      </div>
    `;

    tooltip.style.left = `${rect.right + 12}px`;
    tooltip.style.top = `${rect.top}px`;

    tooltip.querySelector(".tour-next").onclick = () => {
      stepIndex++;
      if (stepIndex < steps.length) {
        showStep(stepIndex);
      } else {
        endTour();
      }
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
