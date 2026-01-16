import { DURATION, TOOLTIP_OFFSET } from "../data/constants.js";

export default class GroupedBarChart {
    constructor(svg, tooltip) {
        this.svg = svg;
        this.tooltip = tooltip;

        this.margin = { top: 35, right: 170, bottom: 70, left: 60 };
        this.init();
    }

    init() {
        const node = this.svg.node();
        this.width = node.getBoundingClientRect().width;
        this.height = node.getBoundingClientRect().height;

        this.innerW = this.width - this.margin.left - this.margin.right;
        this.innerH = this.height - this.margin.top - this.margin.bottom;

        this.svg.attr("viewBox", `0 0 ${this.width} ${this.height}`);

        this.g = this.svg.append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        this.xAxisG = this.g.append("g")
            .attr("transform", `translate(0,${this.innerH})`);

        this.yAxisG = this.g.append("g");

        this.legendG = this.svg.append("g")
            .attr("class", "legend")
            .attr("transform",
                `translate(${this.margin.left + this.innerW + 18},${this.margin.top})`
            );

        this.xLabel = this.svg.append("text")
            .attr("class", "axis-label x")
            .attr("text-anchor", "middle")
            .attr(
                "x",
                this.margin.left + this.innerW / 2
            )
            .attr(
                "y",
                this.margin.top + this.innerH + 50
            )
            .text("Age Group");

        this.yLabel = this.svg.append("text")
            .attr("class", "axis-label y")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr(
                "x",
                -(this.margin.top + this.innerH / 2)
            )
            .attr("y", 20)
            .text("Average Percentage");
    }

    colorScale(categories) {
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
            .range(blues.slice(0, categories.length));
    }

    resize() {
        this.svg.selectAll("*").remove();
        this.init();
    }

    update({ ageGroups, categories, values }, dimLabel) {
        this.resize();

        if (!values.length) return;

        const x0 = d3.scaleBand()
            .domain(ageGroups)
            .range([0, this.innerW])
            .paddingInner(0.12);

        const x1 = d3.scaleBand()
            .domain(categories)
            .range([0, x0.bandwidth()])
            .padding(0.06);

        const y = d3.scaleLinear()
            .domain([0, d3.max(values, d => d.Value)])
            .nice()
            .range([this.innerH, 0]);

        const color = this.colorScale(categories);

        this.xAxisG.call(d3.axisBottom(x0));
        this.yAxisG.call(d3.axisLeft(y));

        const byAge = d3.group(values, d => d.AgeGroup);

        const groups = this.g.selectAll(".ageGroup")
            .data(ageGroups)
            .enter()
            .append("g")
            .attr("class", "ageGroup")
            .attr("transform", d => `translate(${x0(d)},0)`);

        groups.selectAll("rect")
            .data(age =>
                categories.map(cat => ({
                    AgeGroup: age,
                    Category: cat,
                    Value: byAge.get(age)?.find(d => d.Category === cat)?.Value ?? 0
                }))
            )
            .enter()
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
                    .style("left", `${event.pageX + TOOLTIP_OFFSET.x}px`)
                    .style("top", `${event.pageY - TOOLTIP_OFFSET.y}px`);
            })
            .on("mouseout", () => this.tooltip.style("opacity", 0))
            .transition()
            .duration(DURATION)
            .attr("y", d => y(d.Value))
            .attr("height", d => y(0) - y(d.Value));

        this.drawLegend(categories, color);
    }

    drawLegend(categories, color) {
        const items = this.legendG.selectAll(".item")
            .data(categories)
            .enter()
            .append("g")
            .attr("class", "item")
            .attr("transform", (_, i) => `translate(0,${i * 18})`);

        items.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("y", -10)
            .attr("rx", 2)
            .attr("fill", d => color(d));

        items.append("text")
            .attr("x", 16)
            .attr("dy", "0.2em")
            .attr("font-size", 11)
            .text(d => d);
    }
}
