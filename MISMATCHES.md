# Mismatches found while connecting everything (v2.1.1 – v2.9.4)

The same list is on the **Mismatches** tab (added by `setupOneLogin`) and in the app under
**Settings & Data ▸ Mismatches**. Menu **④ Mismatch audit** re-checks the live data any time and adds new
rows: blank passwords, duplicate Login IDs, users without an Access row, unknown roles, checklists or DSR tabs
that can't be opened, Outlet Orders users with unknown outlets, apps without a URL.

## Fix these first

| # | Where | What is wrong | What to do |
|---|---|---|---|
| 1 | Loan & Advance | Some leave dates are saved with **day and month swapped** (the sheet reads dates month-first, US style). Bhuneshwari Vishwakarma's leave of 9–10 Aug 2026 is stored as 8 Sep – 8 Oct, so she showed "on leave" all September. | **File ▸ Settings ▸ Locale = India** on the Loan & Advance sheet, then correct those rows. One Login already reads each row the way that fits its Total Days and application date, and lists a person on leave only once. |
| 2 | Loan & Advance | The old form's leave first step is **Pandri-only** (`_isPandri()`, hard-coded CG001). | One Login sends leave to the incharge of every outlet that has one (Settings ▸ Leave Incharge Step). Change the old form the same way, or stop using its own pages. |
| 3 | Attendance | **Chanderi** now has Location Rules, shifts and penalty rules (copied from Pandri by 2.3.1 Setup), but the uploaded Petpooja file has **no Chanderi rows** yet (only one stray row on 25 Sep). Until its punches are in the file, Chanderi shows "not in the punch file" and nobody there is marked absent or charged. | Add Chanderi to the Petpooja attendance export. Check its shift timings under Attendance Manager ▸ Rules ▸ Shifts. |
| 4 | Outlet Orders | **Max Level / Auto Fill and Item Request** were added to the Outlet Order App on 29 Sep 2026, after its ordering was brought into One Login. | **Fixed in 2.5.0** — One Login ▸ Orders now has the Outlet Order App's New Order (Auto Fill, Item Suggestion, Print, item rules), Max Level, Closing Stock, Order History and Dispatch on the same workbook. |
| 5 | Outlet Orders | Every Users row has PIN **123456**; approve / reject links use the fixed token **cg2024**. | Give the Order app real PINs or retire its own login; change the token on Settings *and* in the Order app. |
| 6 | Outlet codes | Chanderi is **CD** in the Outlet Order app but the Stock Register & Vegetable app seeds **CH**. | Use CD everywhere (change the Veg app's Outlets tab). |
| 7 | Apps | The Outlet Wise DSR and Stock Register & Vegetable web app links are not in the System Master. | Paste the URLs on the **Apps** tab (rows say *Needs URL*). |
| 8 | Security | Plain-text passwords in many apps (System Master admin@123 and 10 department passwords, Pandri Training passcode, Loan & Advance Admin Access, checklist Doer Lists). | All collected in **App Credentials** (only MIS / Directors). Retire them app by app — checklists, attendance, employees, leave / advance, salary, posters and penalties already need no other login. |

## Clean up when convenient

| # | Where | What is wrong | What to do |
|---|---|---|---|
| 9 | Loan & Advance | September advances of Pandri staff went straight to HR (incharge status "-") because Admin Access had no incharge. | Fixed: every Outlet Incharge is written into Admin Access (menu), and requests HR has not touched yet also reach the incharge here. |
| 10 | Loan & Advance | June 2026 advance rows use 4-digit IDs (CG-0084). | Correct them only if those rows are ever re-approved. |
| 11 | Attendance | The biometric file has 4-digit IDs (CG-0001) and some with a letter O (CG-O317). | Handled — IDs are normalised and ID Mapping covers the rest. |
| 12 | Salary Master | Month tabs differ (JULY has no UNIFORM SECURITY DEPOSIT column; JUNE uses 30-day formulas); some totals are typed. | Slips read every tab by its headers; new months are prepared in the AUG layout. |
| 13 | Salary Master | Names differ from the employee master ("ARIJEET JANGDE" vs "Arjeet Jangde") and there is no Employee ID column. | **Salary Name Map** links each name to an Employee ID (filled automatically; fix the rest in Salary Slips ▸ Link). |
| 14 | Employee master | Ex-Employees keeps the code in its "Outlet ID" column; older rows hold bare location codes. | Handled. Rename the column to "Employee Id" when convenient. |
| 15 | Employee master | "F&B PRODUCTION" vs "F&B Production". | Correct the cell; the Departments tab keeps an alias meanwhile. |
| 16 | Outlet names | The same outlet spelt many ways ("P. Naka (CG002)", "pachpedi Naka", "CG Pachpedi Naka", "Gol chowk "). | The **Outlets** tab carries every alias, so matching works. |
| 17 | Outlet Orders | "Outlet Name" mixes CG001 / Shankar Nagar with "CG Pandri"; April orders are POCG…; Srikant → CG0000, Prateek → HQ-001. | Matched here through aliases; fix CG0000 and add HQ / GFP to the Order workbook's Outlets tab. |
| 18 | Prep Kitchen | Time In / Out stored as text; "Copy of Daily Entry" has 01-01-1970 dates; no Outlet column. | Parsed here; **Settings ▸ Prep Kitchen Outlet** says whose rows they are. |
| 19 | Vegetable sheet | The old sheet is single-outlet. | Orders placed from One Login go to **Veg Orders** with the outlet. |
| 20 | Checklists | Doers are first names only; the Cashier Checklist has CC-3199 twice. | **Checklist Doers** links every doer to a login (Access Control ▸ Checklist doers for the rest). Duplicate IDs are harmless here. |
| 21 | Wastage sheet | Tikeshwar and Pradeep are both "CG-00000". | Use their real Employee IDs. |
| 22 | Delegation | The old sheet stores the doer as "Name - Number". | Old tasks show read-only; new tasks use User IDs in **Delegated Tasks**. |
| 23 | Portals | CG Master Management Portal, System Master (QuickAccess) and One Login all do login + app links. | Keep One Login as the single door; point the others' users here. |

## Code versions used ("updated date codes")

Where a folder had more than one copy, the newest one was used:

| App | Version used | Skipped |
|---|---|---|
| Outlet Order App | `Code.js` / `index.html` of 16 Oct 2026 (with Max Level, Item Request, Dispatch) — brought into Orders in 2.5.0 | the 25 Sep copy (older) |
| Purchase (GRN, stock, vegetables) | *Purchase Merged App*, 24 Sep 2026, plus *Stock Register and Vegetable Ordering* | *Claude outputs*, 23 Sep (older) |
| Master App | `MasterApp/*.js`, 1–2 Sep 2026; `TicketTracker_onEdit.gs`, 3 Sep | `MasterApp/_to_delete/*.gs`, 10–12 Aug |
| Loan & Advance, Reimbursement & Leave | `Code.js` v3.0 with the v3 Leave / Advance / Reimbursement columns and the Outlet Incharge step | older Advance / Advance Application Form, Jul |
| Attendance Report | `GAS Source`, 25 Aug 2026 | — |
| Delegation Web App | 8 Aug 2026 | — |
| Outlet Wise DSR, Pandri Training, QuickAccess, System Master | only copy found | — |

## Found in 2.3.1

| # | Where | What is wrong | What to do |
|---|---|---|---|
| 20 | Employee master | **CG-00373** is used twice (Hemlata Baghel and Kiran Masih). | Give one of them a new Employee Id. The HR Dashboard keeps them apart by name meanwhile. |
| 21 | Attendance | Petpooja marks only Full Day / Half Day / Absent — **weekly offs are not in the file**. | Enter weekly offs on the roster as **WO** (or as approved leave), otherwise an off day is counted as unapproved leave (₹200 at Pandri / Chanderi). |
| 22 | HR Calling Record | It is an **Excel (.xlsx) file** in Drive and one row has the year **2206**. Last call logged 22 Aug 2026. | Save it as a Google Sheet (faster), fix the date, and keep logging calls there. |
| 23 | Outlet Order to Dispatch FMS | Steps 7–11 (GRN, quality check, stock entry, invoice) are **never filled** in any row. | Shown as "never filled" in FMS Summary; ask the outlets to fill them, or remove the steps from the sheet. |

## Found in 2.3.2

| # | Where | What is wrong | What to do |
|---|---|---|---|
| 24 | Employee master | **Aryan Tripathi (HQ-00024)** is "HR Executive" in the master, but he is the HR Intern (HR Assistant Intern). | Correct his designation. One Login already treats him as an assistant (his ID is in Employee Edit Needs Approval). |
| 25 | Outlets | Chanderi was marked **FOCO**; it is run like Pandri. | Setup sets it to **COCO**. |
| 26 | Tickets Tracker (Chanderi) | All 51 tickets are still **OPEN**; nothing has a priority or a resolve date. Pandri's "Actual Date for Resolve Issue" formula shows 0 on closed rows (iterative calculation is off). | Assign / close them in One Login ▸ Tickets — it writes the real close time. |
| 27 | Checklists tab | Chanderi has no checklist and no Outlet Incharge login in One Login, so its tickets are tracked by MIS / Director / Process Coordinator only. | Add Chanderi's checklists and its incharge login (Role = Outlet Incharge, Outlet Access = Chanderi). |

## Found in 2.5.1

| # | Where | What is wrong | What to do |
|---|---|---|---|
| 28 | GRN Summary | **GFP** has no GRN, bill or vegetable rows in One Login — GFP's receiving is done in the separate *GRN Entry* app, which is not connected. | The GFP card stays at 0 until GFP enters GRNs in One Login (GRN & Stock Register) or the GRN Entry sheet is shared and linked. |
| 29 | Delegation Sheet NEW | Doers are stored as "Name - Number" (Doer List's last column); some numbers are two numbers ("8818899003 / 6262655055"). | One Login writes the same "Name - Number" text, so the sheet's formulas keep working. Keep the Doer List's last column untouched. |
| 30 | Delegation Sheet NEW | Rows marked **Week Shifted** and the *old tasks* tab are history. | Left out of the Directors' list. |
| 31 | Item Not Dispatch | Matched to orders by **Order No + Item Code** (Item Name when the code is blank). | Keep the Order No exactly as the Outlet Orders PO number. |
| 32 | Access tab | **Sandeep Rajput** had *Reimbursement — approve* = Yes. | Set to **No** in 2.5.1 — the Operations Manager only marks advances Paid. |

## Found in 2.5.2

| # | Where | What is wrong | What to do |
|---|---|---|---|
| 33 | Checklists tab | **Store Maintenance Checklist** had no Outlet ID, so it showed under "Other". | Set to **OUT-008 (GFP)** in the live sheet; Setup fills it when blank. |
| 34 | Report downloads | "You do not have permission to call UrlFetchApp.fetch" — the owner never gave the *external request* permission that Excel / PDF export needs. | CG One Login ▸ **Allow downloads (one time)** ▸ Allow, by the sheet owner. |
| 35 | Cash Management | The app keeps its own PIN logins (its Users tab) and is only for Pandri. | One Login shows it to the Directors read-only; give each branch its own sheet before another outlet starts. |
| 36 | Pandri Material Closing Sheet | Mixed units in one closing (GRM, PCS, ML); the old *Wastage Header / Records* handover tabs stopped on 20 Sep 2026. | Totals are kept per unit (kg / pcs / ltr). The old handover tabs are not shown. |

## Found in 2.5.4

| # | Where | What is wrong | What to do |
|---|---|---|---|
| 37 | Attendance workbook ▸ Penalty Rules / Shift Config | HQ and GFP had *Apply Penalty = Yes* but **no penalty rule and no shift time**, so nothing was ever charged there. | 2.5.4 adds Pandri's rules for HQ and GFP from **1 Oct 2026**, a 9:00 AM – 6:00 PM shift and Sunday week off. |
| 38 | Attendance workbook ▸ Shift Config | Chanderi's shift times were stored as dates with a rounding error (2:00 PM read as 1:59 PM). | Rewritten as plain times in the live sheet. |
| 39 | Attendance (HQ) | **Ajay Kumar Gupta (HQ-00012)** has no punch on any uploaded October day, so every working day counts as unapproved leave. **Pinaki Roy (HQ-00021)** punches on few days. | If they do not punch by design, HR waives the days in Payroll ▸ Penalty, or they start punching / apply leave. |
| 40 | Attendance (GFP / HQ) | **Sonam Prajapati** comes at 7:30 AM and **K. Prateek Iyengar** at about 9:30 AM every day; **Karan Kumar Raithatha** and **Pinaki Roy** at about 10:00–10:45 AM. | On the 9:00 AM shift Prateek, Karan and Pinaki are late most days. If their real timing is different, set it in Employees ▸ Shift timings. |
| 41 | Access tab | **Sandeep Rajput** — *Reimbursement — approve* (row 32 above). | Back to **Yes**: he approves Pandri and Chanderi reimbursements in place of the Accountant. |
| 42 | Approvals (One Login) | An Outlet Incharge of two outlets saw only his **home outlet's** leave and advance requests (Sandeep Rajput: Pandri, not Chanderi). | Fixed in 2.5.5 — every outlet of the login. |

## Found in 2.6.0

| # | Where | What is wrong | What to do |
|---|---|---|---|
| 43 | HR Checklist ▸ Task List | All 12 tasks were given to **Ajay Gupta** (hr@chaigovindam.com), so Aryan Tripathi and Manisha Aditya had none and Ajay saw theirs. | Fixed in the live sheet on 21 Oct 2026: the old list removed; the Task List holds only the new 30 tasks for Aryan, Manisha and Ajay, and this week's open rows of the old list were taken out of Master. |
| 44 | HR Checklist ▸ Master | No monthly (M) row was generated for October 2026 — Salary Sheet, PF/ESIC and the other monthly tasks never reached anyone. | October's six monthly rows were added by hand on 21 Oct. Check on 1 Nov that the sheet's own trigger writes November's. |
| 45 | Delegation Sheet NEW | Doers were kept as "Name - Number" text and the Doer List was separate from the employee master. | Fixed in 2.6.0: delegated tasks live in One Login's Delegated Tasks tab with User ID and Employee ID; open and recent tasks were copied once and the old sheet is no longer read. |
| 46 | Delegated Tasks ▸ Status | The Status list allowed only Pending, In Progress, Done, Verified, Reopened, Cancelled, so Done from the doer (*Pending Approval*) was refused with "violates the data validation rules". | Fixed on 21 Oct 2026 in the live sheet and in 2.6.1. |
| 47 | EA Checklist ▸ Doer List | About 60 rows hold dates (Tue Jun 30 2026 …) and one test row "fsj" in the Name column — they show as *Not linked* in Checklist Doers. | Delete those rows; only Mamta Chaudhary is a real doer. |

## Found in 2.7.0

| # | Where | What is wrong | What to do |
|---|---|---|---|
| 48 | Loan & Advance ▸ Leave September 2026 | **26 leaves have Final Status = REJECTED** with no remark — 24 by Namit Goyal on 15 Oct 2026, 2 by Super Admin; 17 of them were approved at the first step (e.g. Sangeeta Mahilang 9–11 Sep). Those days count as unapproved leave. | If they were meant to be approved: Approvals ▸ Tracking ▸ September 2026 ▸ Leave Tracking ▸ the leave ▸ **Change to approved** with the reason. |
| 49 | Loan & Advance | Kabir Vaishya's leave is filed under his old ID **CG-00344**; he is HQ-00025 now. | Handled — a leave whose ID is not in the master is matched by name. Use the current ID on new applications. |
| 50 | Pandri Daily Staff Duty Roster | Roster IDs differ from the master: Gauri Sunani CG-0300 (master CG-00313), Praveena (SP Chai) CG-0317 (master Pravina CG-00315), Dageshwari CG-0329 (master CG-00330), Pooja Pal CG-0000 (master CG-00345). | Own timings were saved under the master IDs. Correct the IDs on the roster. |
| 51 | Employee master | **CG-00373** was used by Hemlata Baghel, Tikeshwari Sahu and Doman Dhurve. | **Fixed 24 Oct 2026** (2.8.0): Tikeshwari Sahu → CG-00383, Doman Dhurve → CG-00384 — see row 55. |
| 52 | Employee master | **No Current Salary** for Vashu Verma (CG-00382) and Doman Dhurve (CG-00384), so their unapproved leave is charged at the fixed ₹200. | Fill Current Salary; the 2× daily wage then applies. |
| 53 | Access tab | Mamta Chaudhary (Executive Assistant) had Role = Staff and Outlet Access = OUT-001, OUT-007. | Set to **Executive Assistant** with Outlet Access = ALL by the 2.7.0 Setup. Hide any section from her in User Management ▸ Sections. |
| 54 | Attendance workbook ▸ Location Rules | **Chanderi penalties are switched off** from 23 Oct 2026 (Apply Penalty = No, as asked by MIS) — no late, unapproved-leave or by-hand penalty for Chanderi in the attendance report, Payroll, Penalty screens or Salary preparation. Penalties already given by hand stay in Manual Penalty but are not counted. | Set Apply Penalty back to **Yes** on the Chanderi (CG006) row (or Payroll ▸ Rules ▸ Locations) when MIS says so; everything is worked out again from the punches. |

## Found in 2.8.0

| # | Where | What is wrong | What to do |
|---|---|---|---|
| 55 | Joining form | From 28 Sep 2026 the Chanderi forms were filled with the e-mail **ABCD@Gmail.com**; the form reused the code of the first person with that e-mail, so **CG-00373** went to 8 joiners. | **Fixed in 2.8.0**: codes are reused only for the same person (Aadhar, or mobile + name) and an approval never writes over someone else's row. Tikeshwari Sahu → CG-00383, Doman Dhurve → CG-00384 in the live master; folders renamed. Enrol them in Petpooja with the new codes. |
| 56 | Employee master | 10 active Chanderi employees have **ABCD@Gmail.com** as their e-mail. | Put their own e-mail, or leave it blank. |
| 57 | Login tab | Old **CGC-** logins (CGC-00336, 00352, 00353, 00355, 00356, 00358, 00359) are still Active next to the CG- logins of the same people. | Set the CGC- rows to Inactive in User Management. |
| 58 | Employee master ▸ Ex-Employees | Girja Verma, Jyoti Kumari, Muskan, Jyoti, Anjali Thakur, Aanchal Sahu and Bhumika Gond are there **twice**; Shweta Masih (CG-00368) is there twice although she is active in the master, and the second joining of Kumeshwari Vishwakarma (Kumeshvari, CG-00367) is there too. | Delete the second rows, and the Ex-Employees rows of Shweta Masih and Kumeshvari. |
| 59 | Salary Master ▸ SEP penalty sheet 2026 | Made by hand with the old rules (nearest shift, approved leave still charged). | For reference only — Payroll ▸ Penalty with 1 – 30 Sep shows September under the rules in force. |

## Found in 2.9.2

| # | Where | What is wrong | What to do |
|---|---|---|---|
| 60 | Petpooja (Chanderi) | Codes differ from the master: **CG00385 TIKESHARI SAHU** is Tikeshwari Sahu (CG-00383), **CG00386 DOMAN DHURVE** is Doman Dhurve (CG-00384), **CG00389 PUSHPLATA** is CG-00385, **CG00390 PRABHA** is CG-00386, **CG-000377 BARKHA AZAD** is CG-00375. The master codes CG-00383 / 00385 / 00386 / 00375 belong to other people in Petpooja. | Handled from 2.9.2 — an ID counts only when the name is close. Correct the codes in Petpooja so they match the master. |
| 61 | Petpooja | Not in the employee master: **CG-000383 Bhumika Saytode**, **CG00375 Love Kumar**, **CG-00375 Deepak Chandrakar**, **HQ-00026 Pooja Patel** (HR Intern), **Nitesh Mandal** (346, CG-00383, CG-387). Before 2.9.2 their punches were counted for Tikeshwari Sahu, Barkha Azad, Sayyed Mahfooz Alam and Menka. | Add them to the employee master, or mark them Inactive in Petpooja. Until then they are under *Not matched*. |
| 62 | Petpooja (HQ) | **Sayyed Mahfooz Alam** is HQ-00027 in Petpooja and HQ-00026 in the master (HQ-00026 is Pooja Patel in Petpooja) — he showed twice on 27 Oct. | Handled from 2.9.2 (matched by name, counted once). Correct the code in Petpooja. |
| 63 | Attendance Data | Before 2.9.2 the second file of a day replaced the first: **1, 11, 12, 14, 15, 27 Oct 2026** have only the Chanderi file; **17 – 26 Oct** (and September) only the HQ · GFP · Pandri file. | Upload the missing file of those days with its own box (Payroll ▸ Upload attendance). |
| 64 | Roster ▸ Shifts vs Attendance ▸ Shift Config | Roster S1 04:00 – 13:00, S2 14:00 – 23:00; Shift Config (Pandri, Chanderi) Shift 1 4:00 – 14:00, Shift 2 13:00 – 23:00. From 2.9.2 the roster timing decides late / early when a roster is made. | Make the two the same (Settings & Data ▸ Shifts, or Payroll ▸ Rules ▸ Shifts), or use Manual timing on the roster. |
| 65 | Employee master | New joiners were marked absent (and charged unapproved leave) for the days before they joined — e.g. Sayyed Mahfooz Alam (joined 26 Oct) on 22 – 25 Oct. | Fixed in 2.9.2 — no absent row before the Date Of Joining. Keep Date Of Joining filled for every employee. |
