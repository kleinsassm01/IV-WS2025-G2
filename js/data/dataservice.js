export default class DataService {
  constructor(csvPaths) {
    this.csvPaths = csvPaths;
    this.data = [];
  }

  async load(onLoaded = null) {
    const loaded = await Promise.all(
      this.csvPaths.map(path => d3.csv(path))
    );

    this.data = loaded.flat().map(d => ({
      ...d,
      YearStart: +d.YearStart,
      Data_Value: +d.Data_Value
    }));

    if (onLoaded) {
      onLoaded(this.data.length);
    }
  }

  baseFilter(question, { selectedState = null } = {}) {
    let filtered = this.data.filter(d =>
      d.Question === question &&
      d.Data_Value != null &&
      (
        d.Data_Value_Unit === "Percent" ||
        (d.Data_Value_Type && d.Data_Value_Type.includes("Percent"))
      )
    );

    if (selectedState) {
      filtered = filtered.filter(d =>
        d.LocationAbbr === selectedState
      );
    }

    return filtered;
  }


  getYearlyAverages(question, filters = {}) {
    let filtered = this.baseFilter(question, filters)
      .filter(d =>
        d.Stratification1 === "Overall" || !d.Stratification1
      );

    if (filters.selectedStratification) {
      filtered = filtered.filter(d =>
        d.Stratification2 === filters.selectedStratification
      );
    }

    return d3.groups(filtered, d => d.YearStart)
      .map(([year, arr]) => ({
        YearStart: year,
        Data_Value: d3.mean(arr, d => d.Data_Value)
      }))
      .sort((a, b) => a.YearStart - b.YearStart);
  }

  getRadarData(question, { year = null, selectedState = null } = {}) {
    let filtered = this.baseFilter(question, { selectedState })
      .filter(d => d.Stratification2);

    if (year !== null) {
      filtered = filtered.filter(d => d.YearStart === year);
    }

    return d3.groups(filtered, d => d.Stratification2)
      .map(([label, arr]) => ({
        label,
        value: d3.mean(arr, d => d.Data_Value)
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }


  getHistogramData(question, {
    year = null,
    selectedStratification = null,
    selectedState = null
  } = {}) {
    let filtered = this.baseFilter(question, { selectedState })
      .filter(d => d.Stratification1 === "Overall");

    if (year !== null) {
      filtered = filtered.filter(d => d.YearStart === year);
    }

    if (selectedStratification) {
      filtered = filtered.filter(d =>
        d.Stratification2 === selectedStratification
      );
    }

    return filtered.map(d => d.Data_Value);
  }

  getChoroplethData(question, {
    year = null,
    selectedStratification = null
  } = {}) {
    let filtered = this.data.filter(d =>
      d.Question === question &&
      d.Data_Value != null &&
      (d.Data_Value_Unit === "%" || d.Data_Value_Unit === "Percent") &&
      d.Stratification1 === "65 years or older" &&
      d.LocationAbbr?.length === 2
    );

    if (year !== null) {
      filtered = filtered.filter(d => d.YearStart === year);
    }

    if (selectedStratification) {
      filtered = filtered.filter(d =>
        d.Stratification2 === selectedStratification
      );
    }

    return d3.groups(filtered, d => d.LocationAbbr)
      .map(([abbr, arr]) => ({
        LocationAbbr: abbr,
        Data_Value: d3.mean(arr, d => d.Data_Value)
      }));
  }

  getGroupedBarData(
    question,
    mode = "sex",
    {
      year = null,
      selectedState = null
    } = {}
  ) {
    let filtered = this.baseFilter(question, { selectedState });

    if (year !== null) {
      filtered = filtered.filter(d => d.YearStart === year);
    }

    filtered = filtered.filter(d =>
      d.StratificationCategory1 === "Age Group" &&
      d.Stratification1 &&
      d.Stratification1 !== "Overall"
    );

    if (mode === "sex") {
      filtered = filtered.filter(d =>
        d.StratificationCategory2 === "Sex"
      );
    } else {
      filtered = filtered.filter(d =>
        d.StratificationCategory2 &&
        (
          d.StratificationCategory2.includes("Race") ||
          d.StratificationCategory2.includes("Ethnic")
        )
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
    const categories = [...new Set(filtered.map(d => d.Stratification2))].sort();

    const values = [];
    for (const [age, catMap] of nested.entries()) {
      for (const [cat, val] of catMap.entries()) {
        values.push({
          AgeGroup: age,
          Category: cat,
          Value: val
        });
      }
    }

    return { ageGroups, categories, values };
  }
}
