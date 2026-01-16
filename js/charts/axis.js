export default class Axis {
  constructor(svg, width, height, margin, {
    xLabel = "Year",
    yLabel = "Percentage"
  } = {}) {
    this.svg = svg;
    this.width = width;
    this.height = height;
    this.margin = margin;

    this.xScale = d3.scaleLinear()
      .range([margin.left, width - margin.right]);

    this.yScale = d3.scaleLinear()
      .range([height - margin.bottom, margin.top]);

    this.xAxisG = svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`);

    this.yAxisG = svg.append("g")
      .attr("transform", `translate(${margin.left},0)`);

    this.drawLabels(xLabel, yLabel);
  }

  drawLabels(xLabel, yLabel) {
    this.svg.append("text")
      .attr("class", "axis-label x")
      .attr("text-anchor", "middle")
      .attr("x", this.width / 2)
      .attr("y", this.height - 5)
      .text(xLabel);

    this.svg.append("text")
      .attr("class", "axis-label y")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -this.height / 2)
      .attr("y", 15)
      .text(yLabel);
  }

  update(data) {
    if (!data.length) return;

    this.xScale
      .domain(d3.extent(data, d => d.YearStart))
      .nice();

    this.yScale
      .domain(d3.extent(data, d => d.Data_Value))
      .nice();

    this.xAxisG.call(
      d3.axisBottom(this.xScale)
        .tickValues(data.map(d => d.YearStart))
        .tickFormat(d3.format("d"))
    );

    this.yAxisG.call(d3.axisLeft(this.yScale));
  }
}