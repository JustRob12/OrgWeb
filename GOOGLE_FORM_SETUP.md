# 📋 Google Form & Online Excel (Google Sheets) Setup Guide

This guide allows you to generate a Google Form that matches your Excel/CSV template (`Student ID`, `First Name`, `Middle Initial`, `Last Name`, `Course`, `Section`, `Year`, `Email`) and automatically link it to an **Online Google Sheet (Online Excel)**.

---

## ⚡ Option 1: Automatic 1-Click Generator (Recommended - Takes 1 minute)

We created a script in your project: [`google-form-generator.gs`](file:///Volumes/Rob%20Buids/Website%20Projects/OrgWeb/google-form-generator.gs).

### Steps:
1. Open [Google Apps Script (script.google.com)](https://script.google.com/) in your browser.
2. Click **`+ New project`**.
3. Clear the editor and paste the code from [`google-form-generator.gs`](file:///Volumes/Rob%20Buids/Website%20Projects/OrgWeb/google-form-generator.gs).
4. Click the **💾 Save** icon, then click **▶️ Run**.
5. When prompted:
   - Click **Review permissions** -> Select your Google Account.
   - Click **Advanced** -> Click **Go to Untitled project (unsafe)** -> Click **Allow**.
6. View the **Execution log** at the bottom of the screen:
   - 🔗 **Student Form Link**: The link you give to students.
   - 📊 **Online Sheet Link**: The live online spreadsheet (Online Excel) where all student submissions will automatically appear.

---

## 🛠️ Option 2: Create Manually on Google Forms

If you prefer to build the form manually directly in [Google Forms (forms.google.com)](https://forms.google.com/):

### 1. Form Settings
- **Title**: `Student Membership Registration`
- **Description**: `Please enter your student credentials.`

### 2. Form Fields / Questions to Add:

| # | Question Title | Question Type | Required | Help Text / Options |
|---|----------------|---------------|:--------:|---------------------|
| 1 | **Student ID** | Short Answer | ✅ Yes | e.g. `2022-2703` |
| 2 | **First Name** | Short Answer | ✅ Yes | e.g. `Roberto Jr` |
| 3 | **Middle Initial** | Short Answer | ❌ No | e.g. `M` |
| 4 | **Last Name** | Short Answer | ✅ Yes | e.g. `Prisoris` |
| 5 | **Course** | Dropdown | ✅ Yes | `BSIT`, `BSCE`, `BITM`, `BSM`, `BSMRS`, `Other` |
| 6 | **Section** | Short Answer | ✅ Yes | e.g. `A`, `B`, `C`, `D` |
| 7 | **Year** | Dropdown | ✅ Yes | `1`, `2`, `3`, `4` |
| 8 | **Email** | Short Answer (Email) | ✅ Yes | e.g. `roberto.prisoris12@gmail.com` |
| 9 | **Payment / Receipt No.** | Short Answer | ❌ No | Optional reference number |

---

## 📊 How to Open & View Responses in Online Excel (Google Sheets)

1. Open your Google Form in Google Forms.
2. Click on the **Responses** tab at the top.
3. Click the green **"Link to Sheets"** (or **"Create Spreadsheet"**) icon.
4. Select **"Create a new spreadsheet"** and click **Create**.
5. Your Google Sheet will open immediately online! Every time a student submits the form, a new row appears in real-time.

---

## 💾 Exporting from Online Sheet to Excel (`.xlsx` or `.csv`)

When you want to import the data into your **OrgWeb** application or open it in Microsoft Excel on your computer:
1. In the Google Sheet, go to **File** -> **Download**.
2. Choose **Microsoft Excel (`.xlsx`)** or **Comma Separated Values (`.csv`)**.
3. Upload or place the downloaded file into your OrgWeb admin dashboard.
