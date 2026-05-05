export default class Flowdex {
  constructor() {
    this.entries = { restored: 0 };
  }

  recordRestore() {
    this.entries.restored++;
  }
}
