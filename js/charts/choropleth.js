import { DURATION, TOOLTIP_OFFSET, FIPS_TO_ABBR } from "../data/constants.js";

export default class ChoroplethChart {
  constructor(svg, tooltip, onStateSelect) {
    this.svg = svg;
    this.tooltip = tooltip;
    this.onStateSelect = onStateSelect;

    this.width = svg.node().getBoundingClientRect().width;
    this.height = svg.node().getBoundingClientRect().height;

    svg.attr("viewBox", `0 0 ${this.width} ${this.height}`);

    this.g = svg.append("g");

    this.legendG = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${this.width - 50},40)`);

    this.legendHeight = 160;
    this.legendWidth = 12;

    this.projection = d3.geoAlbersUsa();
    this.path = d3.geoPath(this.projection);

    this.colorScale = d3.scaleSequential(d3.interpolateBlues);

    this.statePaths = null;
  }

  async loadMap(url) {
    const us = await d3.json(url);

    this.states = topojson.feature(
      us,
      us.objects.states
    ).features;

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

  update(stateData, selectedState) {
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
      .classed("selected", d =>
        FIPS_TO_ABBR[d.id] === selectedState
      )
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
        this.onStateSelect(abbr, d.properties.name);
      })
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
          .style("left", `${event.pageX + TOOLTIP_OFFSET.x}px`)
          .style("top", `${event.pageY - TOOLTIP_OFFSET.y}px`);
      })
      .on("mouseout", () => this.tooltip.style("opacity", 0));
  }

  highlight(query) {
    const q = query?.toLowerCase().trim();

    this.statePaths?.classed("highlighted", d =>
      q && d.properties.name.toLowerCase().includes(q)
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

    d3.range(0, 1.01, 0.1).forEach(s => {
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

    this.legendG.append("g")
      .attr("transform", `translate(${this.legendWidth},0)`)
      .call(
        d3.axisRight(scale)
          .ticks(5)
          .tickFormat(d => `${d.toFixed(0)}%`)
      );
  }
}
