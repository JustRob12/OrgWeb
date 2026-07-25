const XLSX = require('xlsx');
const path = require('path');

const data = [
  {
    "First Name": "John",
    "Middle Initial": "D",
    "Last Name": "Doe",
    "Course": "BSIT",
    "Section": "A",
    "Year": "3",
    "Email": "john.doe@example.com",
    "Membership Status": "Fully Paid",
    "Payment": 100,
    "Receipt": "131234"
  },
  {
    "First Name": "Jane",
    "Middle Initial": "S",
    "Last Name": "Smith",
    "Course": "BSCS",
    "Section": "B",
    "Year": "2",
    "Email": "jane.smith@example.org",
    "Membership Status": "Partial",
    "Payment": 50,
    "Receipt": "3423"
  },
  {
    "First Name": "Alice",
    "Middle Initial": "M",
    "Last Name": "Johnson",
    "Course": "BSCpE",
    "Section": "C",
    "Year": "1",
    "Email": "alice.j@uni.edu",
    "Membership Status": "Not Paid",
    "Payment": 0,
    "Receipt": "2342"
  },
  {
    "First Name": "Bob",
    "Middle Initial": "L",
    "Last Name": "Brown",
    "Course": "BSIT",
    "Section": "A",
    "Year": "4",
    "Email": "bob.brown@company.com",
    "Membership Status": "Fully Paid",
    "Payment": 100,
    "Receipt": "1343200"
  },
  {
    "First Name": "Charlie",
    "Middle Initial": "K",
    "Last Name": "Davis",
    "Course": "BSCS",
    "Section": "B",
    "Year": "2",
    "Email": "charlie.d@example.com",
    "Membership Status": "Half Semester Paid",
    "Payment": 75,
    "Receipt": "95832"
  }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Members");

const outputPath = path.join(process.cwd(), 'members_sample.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`Sample excel file created at: ${outputPath}`);
