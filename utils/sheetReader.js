// ✅ utils/sheetReader.js — Đọc Google Sheet công khai qua gviz API
const fetch = require('node-fetch');

class SheetReader {
  constructor(sheetId, sheetName) {
    this.sheetId = sheetId;
    this.sheetName = sheetName;
  }

  async read() {
    const url = `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?tqx=out:json&sheet=${this.sheetName}`;
    const res = await fetch(url);
    const text = await res.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));

    const cols = json.table.cols.map(col => col.label);
    const rows = json.table.rows.map(row => {
      const item = {};
      row.c.forEach((cell, i) => {
        item[cols[i]] = cell?.v || '';
      });
      return item;
    });

    return rows;
  }
}

module.exports = SheetReader;
