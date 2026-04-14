console.log("--- XLSX.read with raw: true ---");
const workbookRaw = XLSX.read(csvData, { type: 'string', raw: true });
const worksheetRaw = workbookRaw.Sheets[workbookRaw.SheetNames[0]];
const dataRaw = XLSX.utils.sheet_to_json(worksheetRaw);
console.log(dataRaw);
