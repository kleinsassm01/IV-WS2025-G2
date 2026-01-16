import { DURATION, TOOLTIP_OFFSET } from "../data/constants.js";

export default class HistogramChart {
  constructor(svg, tooltip) {
    this.svg = svg;
    this.tooltip = tooltip;

    this.width = svg.node().getBoundingClientRect().width;
    this.height = svg.node().getBoundingClientRect().height;

    this.margin = { top: 30, right: 30, bottom: 60, left: 70 };
    this.innerW = this.width - this.margin.left - this.margin.right;
    this.innerH = this.height - this.margin.top - this.margin.bottom;

    svg.attr("viewBox", `0 0 ${this.width} ${this.height}`);

    this.g = svg.append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    this.x = d3.scaleLinear().range([0, this.innerW]);
    this.y = d3.scaleLinear().range([this.innerH, 0]);

    this.xAxisG = this.g.append("g")
      .attr("transform", `translate(0,${this.innerH})`);

    this.yAxisG = this.g.append("g");

    this.svg.append("text")
      .attr("class", "axis-label x")
      .attr("text-anchor", "middle")
      .attr("x", this.width / 2)
      .attr("y", this.height - 10)
      .text("Question");

    this.svg.append("text")
      .attr("class", "axis-label y")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -this.height / 2)
      .attr("y", 20)
      .text("Number of Surveys");
  }

  update(values) {
    if (!values.length) return;

    const bins = d3.bin().thresholds(10)(values);

    this.x.domain(d3.extent(values));
    this.y.domain([0, d3.max(bins, d => d.length)]).nice();

    this.xAxisG.transition().duration(DURATION)
      .call(d3.axisBottom(this.x));

    this.yAxisG.transition().duration(DURATION)
      .call(d3.axisLeft(this.y));

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
            <strong>Range:</strong> ${d.x0.toFixed(1)}–${d.x1.toFixed(1)}%<br/>
            <strong>Count:</strong> ${d.length}
          `)
          .style("left", `${event.pageX + TOOLTIP_OFFSET.x}px`)
          .style("top", `${event.pageY - TOOLTIP_OFFSET.y}px`);
      })
      .on("mouseout", () => this.tooltip.style("opacity", 0))
      .transition()
      .duration(DURATION)
      .attr("x", d => this.x(d.x0))
      .attr("width", d => Math.max(0, this.x(d.x1) - this.x(d.x0) - 1))
      .attr("y", d => this.y(d.length))
      .attr("height", d => this.innerH - this.y(d.length));

    bars.exit().remove();
  }
}
