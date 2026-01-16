import { DURATION, TOOLTIP_OFFSET, pointTooltipHTML } from "../data/constants.js";

export default class LineChart {
  constructor(svg, axis, tooltip, onYearSelect) {
    this.svg = svg;
    this.axis = axis;
    this.tooltip = tooltip;
    this.onYearSelect = onYearSelect;

    this.path = svg.append("path")
      .attr("fill", "none")
      .attr("stroke", "#000")
      .attr("stroke-width", 2);
  }

  draw(data, selectedYear) {
    if (!data.length) return;

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
          .style("left", `${event.pageX + TOOLTIP_OFFSET.x}px`)
          .style("top", `${event.pageY - TOOLTIP_OFFSET.y}px`);
      })
      .on("mouseout", () => this.tooltip.style("opacity", 0))
      .on("click", (_, d) => this.onYearSelect(d.YearStart))
      .transition()
      .duration(DURATION)
      .attr("cx", d => this.axis.xScale(d.YearStart))
      .attr("cy", d => this.axis.yScale(d.Data_Value));

    points.exit().remove();
  }
}
