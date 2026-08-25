/**
 * GOOGLE APPS SCRIPT: Automated Google Form & Online Sheet Generator
 * Organization: ACES - Association of Computing and Engineering Students
 * 
 * HOW TO USE:
 * 1. (Optional for Logo): Upload "ACESLOGO.png" to your Google Drive (drive.google.com).
 * 2. In Google Apps Script, paste this entire code.
 * 3. Click "Save" (Cmd + S), then click "Run" (▶️).
 * 4. Grant permissions when prompted.
 * 5. Check the Execution Log below for your links!
 */

function createMembershipRegistrationForm() {
  const formTitle = "ACES Student Membership Registration";
  const formDescription = "Official registration form for the Association of Computing and Engineering Students (ACES).\nPlease enter your student credentials accurately.";
  
  // 1. Create Google Form
  const form = FormApp.create(formTitle);
  form.setDescription(formDescription);
  form.setAllowResponseEdits(true);
  
  // Try to find and insert ACES Logo from Google Drive if available
  try {
    const logoFiles = DriveApp.getFilesByName("ACESLOGO.png");
    if (logoFiles.hasNext()) {
      const logoFile = logoFiles.next();
      const imgItem = form.addImageItem();
      imgItem.setImage(logoFile.getBlob());
      imgItem.setTitle("Association of Computing and Engineering Students");
      imgItem.setAlignment(FormApp.Alignment.CENTER);
      imgItem.setWidth(300);
      Logger.log("✅ ACES Logo found and added to the form header!");
    } else {
      Logger.log("ℹ️ Note: To auto-include the logo next time, upload 'ACESLOGO.png' to your Google Drive.");
    }
  } catch (e) {
    Logger.log("Image load skipped: " + e.message);
  }

  // Question 1: Student ID
  const studentIdItem = form.addTextItem();
  studentIdItem.setTitle("Student ID");
  studentIdItem.setHelpText("Format: 0000-0000 (e.g., 2022-2703)");
  studentIdItem.setRequired(true);
  const studentIdValidation = FormApp.createTextValidation()
    .requireTextMatchesPattern("^\\d{4}-\\d{4}$")
    .setHelpText("Student ID must be complete and in 0000-0000 format (e.g., 2022-2703).")
    .build();
  studentIdItem.setValidation(studentIdValidation);

  // Question 2: First Name
  const firstNameItem = form.addTextItem();
  firstNameItem.setTitle("First Name");
  firstNameItem.setHelpText("e.g., Roberto Jr");
  firstNameItem.setRequired(true);

  // Question 3: Middle Initial
  const middleInitialItem = form.addTextItem();
  middleInitialItem.setTitle("Middle Initial");
  middleInitialItem.setHelpText("e.g., M (Leave blank or put N/A if none)");
  middleInitialItem.setRequired(false);

  // Question 4: Last Name
  const lastNameItem = form.addTextItem();
  lastNameItem.setTitle("Last Name");
  lastNameItem.setHelpText("e.g., Prisoris");
  lastNameItem.setRequired(true);

  // Question 5: Course
  const courseItem = form.addListItem();
  courseItem.setTitle("Course");
  courseItem.setChoiceValues([
    "BSIT",
    "BSCE",
    "BITM",
    "BSM",
    "BSMRS",
    "Other"
  ]);
  courseItem.setRequired(true);

  // Question 6: Section
  const sectionItem = form.addTextItem();
  sectionItem.setTitle("Section");
  sectionItem.setHelpText("e.g., A, B, C, or D");
  sectionItem.setRequired(true);

  // Question 7: Year Level
  const yearItem = form.addListItem();
  yearItem.setTitle("Year");
  yearItem.setChoiceValues(["1", "2", "3", "4"]);
  yearItem.setRequired(true);

  // Question 8: Email Address
  const emailItem = form.addTextItem();
  emailItem.setTitle("Email");
  emailItem.setHelpText("e.g., roberto.prisoris12@gmail.com");
  emailItem.setRequired(true);

  // Question 9 (Optional): Payment Reference / Receipt Number
  const receiptItem = form.addTextItem();
  receiptItem.setTitle("Payment / Receipt / Reference No. (Optional)");
  receiptItem.setHelpText("Enter reference code or receipt number if paid");
  receiptItem.setRequired(false);

  // 2. Create Online Excel (Google Sheet) for responses
  const sheetTitle = "Membership_Reg_(Course)_(Year)_(Section) - Responses";
  const spreadsheet = SpreadsheetApp.create(sheetTitle);
  
  // Link Form to Google Sheet
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());

  // Log URL output
  const formUrl = form.getPublishedUrl();
  const editUrl = form.getEditUrl();
  const sheetUrl = spreadsheet.getUrl();

  Logger.log("==================================================");
  Logger.log("🎉 SUCCESS! ACES FORM & ONLINE EXCEL SHEET CREATED");
  Logger.log("==================================================");
  Logger.log("1. Student Form Link (Send to students): \n" + formUrl);
  Logger.log("\n2. Form Edit Link: \n" + editUrl);
  Logger.log("\n3. Online Sheet Link (Online Excel responses): \n" + sheetUrl);
  Logger.log("==================================================");
}
