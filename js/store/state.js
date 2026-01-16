export default class AppState {
  constructor() {
    this.question = null;
    this.selectedYear = null;
    this.selectedStratification = null;
    this.selectedState = null;
    this.selectedStateName = null;
    this.groupedMode = "sex";
  }

  resetYear() {
    this.selectedYear = null;
  }

  resetStratification() {
    this.selectedStratification = null;
  }

  resetState() {
    this.selectedState = null;
    this.selectedStateName = null;
  }
}