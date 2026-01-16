export function createTooltip() {
  return d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
}

export function hideTooltip(tt) {
  tt.style("opacity", 0);
}
