import { DURATION } from "../data/constants.js";

export default class RadarChart {
  constructor(svg, { levels = 5 } = {}) {
    this.svg = svg;
    this.levels = levels;

    this.width = svg.node().getBoundingClientRect().width;
    this.height = svg.node().getBoundingClientRect().height;
    this.radius = Math.min(this.width, this.height) / 2 * 0.8;

    this.g = svg
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .append("g")
      .attr("transform", `translate(${this.width / 2},${this.height / 2})`);

    this.path = this.g.append("path")
      .attr("fill", "steelblue")
      .attr("fill-opacity", 0.25)
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2);
  }

  drawGrid(maxValue) {
    this.g.selectAll(".grid,.grid-label").remove();

    const r = d3.scaleLinear()
      .domain([0, maxValue])
      .range([0, this.radius]);

    for (let i = 1; i <= this.levels; i++) {
      const value = maxValue * i / this.levels;

      this.g.append("circle")
        .attr("class", "grid")
        .attr("r", r(value))
        .attr("fill", "none")
        .attr("stroke", "#ccc")
        .attr("stroke-dasharray", "2,2");

      this.g.append("text")
        .attr("class", "grid-label")
        .attr("y", -r(value))
        .attr("dy", "-0.3em")
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .text(`${value.toFixed(0)}%`);
    }
  }

  update(data, selectedStrat, onSelect) {
    if (!data?.length) return;

    const maxValue = d3.max(data, d => d.value) * 1.1;
    const angleSlice = (Math.PI * 2) / data.length;

    this.g.selectAll(".axis,.label").remove();
    this.drawGrid(maxValue);

    const r = d3.scaleLinear()
      .domain([0, maxValue])
      .range([0, this.radius]);

    data.forEach((d, i) => {
      const angle = angleSlice * i - Math.PI / 2;

      this.g.append("line")
        .attr("class", "axis")
        .attr("x2", r(maxValue) * Math.cos(angle))
        .attr("y2", r(maxValue) * Math.sin(angle))
        .attr("stroke", "#aaa");

      this.g.append("text")
        .attr("class", "label")
        .attr("x", (r(maxValue) + 18) * Math.cos(angle))
        .attr("y", (r(maxValue) + 18) * Math.sin(angle))
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .classed("selected", d.label === selectedStrat)
        .text(d.label)
        .on("click", () => onSelect(d.label));
    });

    const radarLine = d3.lineRadial()
      .radius(d => r(d.value))
      .angle((_, i) => angleSlice * i)
      .curve(d3.curveLinearClosed);

    this.path
      .datum(data)
      .transition()
      .duration(DURATION)
      .attr("d", radarLine);
  }
}
