/*************************************************************************
 *  CHAI GOVINDAM — ONE LOGIN  (Config.gs)
 *  ---------------------------------------------------------------------
 *  One web app, one login, every person sees only their own workspace.
 *  Everything this app owns lives in the spreadsheet the script is bound
 *  to. Live data owned by the older apps (Loan & Advance, Outlet Orders,
 *  checklists, Prep Kitchen, DSR, Attendance) is read / written in place,
 *  using the IDs on the Settings tab — change them there, never here.
 *
 *  SETUP:  paste every file, then run  setupOneLogin()  once
 *          (or use the  CG One Login  menu in the spreadsheet).
 *************************************************************************/

var APP = {
  NAME: 'Chai Govindam',
  VERSION: '2.9.4',
  BUILD: '2026-10-29',
  TZ: 'Asia/Kolkata',
  LOGO: 'https://chaigovindam.com/img/formimg/chai-govindam(logo).png',
  COLORS: { brown: '#6B3F1C', amber: '#F8AF03', cream: '#F4C97E', green: '#32AC5C', red: '#D64545' }
};

/* ============================ TAB NAMES ============================ */
var SH = {
  README:      'Read Me',
  SETTINGS:    'Settings',
  MODULES:     'Modules',
  ROLES:       'Roles',
  LOGIN:       'Login',              // AUTHENTICATION — who can sign in
  ACCESS:      'Access',             // AUTHORIZATION  — what they can open
  SESSIONS:    'Sessions',
  OUTLETS:     'Outlets',
  DEPTS:       'Departments',
  DESIGS:      'Designations',
  APPS:        'Apps',
  APPCRED:     'App Credentials',
  VAULT:       'Vault',
  CHECKLISTS:  'Checklists',
  CHK_ASSIGN:  'Checklist Assignments',
  TASKS:       'Delegated Tasks',
  ORDER_LOG:   'GFP Order Log',
  VEG_ITEMS:   'Veg Items',
  VEG_ORDERS:  'Veg Orders',
  STOCK_CATS:  'Stock Categories',
  STOCK_ITEMS: 'Stock Items',
  STOCK_REG:   'Stock Register',
  GRN:         'Order GRN',
  GRN_LINES:   'Order GRN Lines',
  FOOD_ITEMS:  'Food Items',
  FOOD_CLOSE:  'Food Closing',
  EXP_CATS:    'Expense Categories',
  EXPENSES:    'Expenses',
  SHIFTS:      'Shifts',
  ROSTER:      'Roster',
  CERTS:       'Certificates',
  LOG:         'Activity Log',
  MISMATCH:    'Mismatches',
  RULES:       'Access Rules',          // item-wise access: Section / Checklist / App → who
  CHK_DOERS:   'Checklist Doers',       // every checklist doer, linked to a login
  SAL_MAP:     'Salary Name Map',       // salary-sheet name → Employee ID (for slips)
  PAY_RUNS:    'Salary Runs',           // salary preparation history
  SLIP_LOG:    'Salary Slip Log',
  POSTER_SET:  'Poster Settings',
  POSTER_OUT:  'Poster Outlets',
  POSTER_ROLES:'Poster Roles',
  POSTER_BEN:  'Poster Benefits',
  POSTER_SEC:  'Poster Sections',
  POSTER_LOG:  'Poster Log',
  FMS:         'FMS Sheets',          // FMS Summary: which FMS workbooks exist and who sees them
  TICKETS:     'Tickets',             // general tickets raised in One Login (with the person's location)
  TICKET_LOG:  'Ticket Log',          // every step of every ticket (general + the outlet Tickets Trackers)
  EMP_CHANGES: 'Employee Changes',    // employee-master edits by HR assistants, waiting for the HR Executive
  ITEM_REQ:    'Item Requests',
  XL:          'Excel Copies',
  HOLIDAYS:    'Holidays'
};

/** Employees are kept one sheet per location:  "Emp - Pandri", "Emp - Bhanpuri (HQ)" … */
var EMP_PREFIX = 'Emp - ';
var EMP_OTHER  = 'Emp - Other';

/** Loan & Advance, Reimbursement & Leave web app — current deployment (also on Settings). */
var LA_APP_URL = 'https://script.google.com/macros/s/AKfycbwb3YsGb7a7AHHOnDENNy0ejI-EK0kcVL2UG6i9E0zel6Z4GSdqbktchj1_9GPD5BHt/exec';
var LA_APP_NAME = 'Loan & Advance, Reimbursement & Leave';
/** Earlier deployments of that app — rows still pointing at them are moved to the current URL. */
var LA_OLD_DEPLOYMENTS = ['AKfycbzrgClOKx1tBM3jFcKiGXuuxcinGVf9a6NqMdu28gITdLbx5c8lnT35hxRIzJi221Bs'];

/* ============================ HEADERS ============================ */
var HEAD = {};
HEAD[SH.SETTINGS]    = ['Setting', 'Value', 'Notes'];
HEAD[SH.MODULES]     = ['Module Key', 'Module Name', 'Menu Group', 'Icon', 'Sort', 'Status', 'Description'];
HEAD[SH.ROLES]       = ['Role ID', 'Role Name', 'Workspace Title', 'Description', 'Status']; // + one Yes/No column per module
HEAD[SH.LOGIN]       = ['User ID', 'Employee ID', 'Full Name', 'Login ID', 'Password', 'Email', 'Mobile',
                        'Status', 'Last Login', 'Login Count', 'Remarks'];
HEAD[SH.ACCESS]      = ['User ID', 'Full Name', 'Role', 'Outlet Access', 'Home Outlet', 'Checklist Doer Name'];
                        // + one Yes/No column per module, then 'Updated By', 'Updated At'
HEAD[SH.SESSIONS]    = ['Session ID', 'User ID', 'Full Name', 'Created At', 'Expires At', 'Remember Me',
                        'Last Seen', 'Status', 'Device'];
HEAD[SH.OUTLETS]     = ['Outlet ID', 'Outlet Name', 'Outlet Code', 'Short Code', 'Type', 'Location Label',
                        'Order Outlet Name', 'DSR Tab', 'Aliases', 'Email', 'Phone', 'Address', 'Status', 'Model'];
/** Outlet models. The ones on Settings ▸ Operated Models (COCO, FOCO) are run by us: attendance,
    penalties, salary preparation and checklists exist only for them and for the Head Office. */
var OUTLET_MODELS = ['COCO', 'FOCO', 'FOFO', 'COFO'];
HEAD[SH.DEPTS]       = ['Department ID', 'Department Name', 'Aliases', 'Status'];
HEAD[SH.DESIGS]      = ['Designation ID', 'Designation', 'Department', 'Default Role', 'Code Prefix', 'Status'];
HEAD['EMP']          = ['Employee ID', 'Full Name', 'Designation', 'Designation ID', 'Department', 'Department ID',
                        'Outlet ID', 'Location', 'Phone', 'Email', 'Date Of Joining', 'Status', 'User ID', 'Last Synced'];
HEAD[SH.APPS]        = ['App ID', 'App Name', 'Company', 'Department', 'Section', 'Type', 'URL', 'Icon',
                        'Visible To All', 'Visible To Roles', 'Visible To Users', 'SSO Enabled', 'Sort', 'Status', 'Source',
                        'Visible To Departments', 'Visible To Designations', 'Visible To Locations', 'Description'];
HEAD[SH.APPCRED]     = ['Credential ID', 'App ID', 'App Name', 'User ID', 'Person Name', 'Login ID', 'Password',
                        'Notes', 'Source', 'Updated At'];
HEAD[SH.VAULT]       = ['Item ID', 'Type', 'Title', 'Category', 'Login ID', 'Password', 'URL', 'Notes',
                        'File URL', 'File ID', 'File Name', 'Shared With Users', 'Shared With Roles',
                        'Owner User ID', 'Created At', 'Updated At', 'Status'];
HEAD[SH.CHECKLISTS]  = ['Checklist ID', 'Checklist Name', 'Spreadsheet ID', 'Tab', 'Outlet ID', 'Department',
                        'Web App URL', 'Assigned Users', 'Status'];
HEAD[SH.CHK_ASSIGN]  = ['Assign ID', 'Checklist ID', 'Checklist Name', 'Task ID', 'Task', 'Planned', 'Source Row',
                        'Original Doer', 'Assigned To', 'Assigned To Name', 'Assigned By', 'Assigned By Name',
                        'Note', 'Assigned At', 'Status', 'Done At', 'Remarks'];
HEAD[SH.TASKS]       = ['Task ID', 'Title', 'Description', 'Assigned By', 'Assigned By Name', 'Assigned To',
                        'Assigned To Name', 'Outlet ID', 'Priority', 'Due Date', 'Status', 'Created At', 'Updated At',
                        'Assignee Remarks', 'Delegator Remarks', 'Attachment URL', 'Attachment ID',
                        'Completed At', 'Revisions', 'Email Status', 'Done Link', 'Approved By', 'Approved At', 'Doer Employee ID', 'Old Task ID'];
HEAD[SH.ORDER_LOG]   = ['Order No', 'Outlet ID', 'Outlet', 'Lines', 'Total Qty', 'Placed By', 'Placed By Name',
                        'Timestamp', 'Email Status', 'Note'];
HEAD[SH.VEG_ITEMS]   = ['Item ID', 'Section', 'Item', 'Hindi', 'Unit', 'Sort', 'Status'];
HEAD[SH.VEG_ORDERS]  = ['Order ID', 'Order Date', 'Outlet ID', 'Outlet', 'Item', 'Hindi', 'Required Qty', 'Unit',
                        'Remarks', 'Received Qty', 'Rate', 'Amount', 'Status', 'Type', 'Ordered By',
                        'Received By', 'Received At', 'Party Name', 'Bill Number', 'Bill URL', 'Bill File ID'];
HEAD[SH.STOCK_CATS]  = ['Category', 'Default Vendor', 'Sort', 'Status'];
HEAD[SH.STOCK_ITEMS] = ['Item ID', 'Category', 'Item', 'Vendor', 'Unit', 'Sort', 'Status'];
HEAD[SH.STOCK_REG]   = ['Entry ID', 'Date', 'Outlet ID', 'Outlet', 'Category', 'Item', 'Party Name', 'Qty', 'Unit',
                        'Rate', 'Amount', 'Bill Number', 'Bill URL', 'Bill File ID', 'Remarks', 'Entered By',
                        'Entered By Name', 'Timestamp', 'GRN No', 'Item Code', 'Source'];
HEAD[SH.GRN]         = ['GRN No', 'GRN Date', 'Order No', 'Outlet ID', 'Outlet', 'Received From', 'Lines',
                        'Total Ordered', 'Total Received', 'Short', 'Remarks', 'Entered By', 'Entered By Name', 'Timestamp'];
HEAD[SH.GRN_LINES]   = ['GRN No', 'Seq', 'Order No', 'Item Code', 'Item Name', 'Unit', 'Ordered Qty',
                        'Received Qty', 'Short Qty', 'Remarks'];
HEAD[SH.FOOD_ITEMS]  = ['Item ID', 'Item', 'Unit', 'Outlet ID', 'Sort', 'Status'];
HEAD[SH.FOOD_CLOSE]  = ['Closing ID', 'Date', 'Shift', 'Outlet ID', 'Outlet', 'Item ID', 'Item', 'Unit',
                        'Closing Qty', 'Handover Qty', 'Wastage', 'Remarks', 'Entered By', 'Entered By Name',
                        'Handed Over To', 'Timestamp'];
HEAD[SH.EXP_CATS]    = ['Category', 'Status'];
HEAD[SH.EXPENSES]    = ['Expense ID', 'Date', 'Outlet ID', 'Outlet', 'Category', 'Description', 'Paid To',
                        'Amount', 'Payment Mode', 'Bill Number', 'Bill URL', 'Bill File ID', 'Entered By',
                        'Entered By Name', 'Timestamp', 'Status'];
HEAD[SH.SHIFTS]      = ['Shift Code', 'Shift Name', 'Start', 'End', 'Color', 'Sort', 'Status'];
HEAD[SH.ROSTER]      = ['Roster ID', 'Week Start', 'Date', 'Day', 'Outlet ID', 'Outlet', 'Employee ID',
                        'Employee Name', 'Designation', 'Shift Code', 'Shift', 'Start', 'End', 'Remarks',
                        'Updated By', 'Updated At', 'Replacement ID', 'Replacement Name'];
HEAD[SH.CERTS]       = ['Certificate ID', 'Outlet ID', 'Outlet', 'Certificate Name', 'Certificate Number',
                        'Certificate Date', 'Expiry Date', 'File URL', 'File ID', 'File Name', 'Mime',
                        'Uploaded By', 'Uploaded By Name', 'Uploaded At', 'Updated At', 'Remarks', 'Status'];
HEAD[SH.LOG]         = ['Timestamp', 'User ID', 'Full Name', 'Action', 'Details'];
HEAD[SH.MISMATCH]    = ['Mismatch ID', 'Area', 'Issue', 'Detail', 'Suggested Fix', 'Found By', 'Found At', 'Status'];
HEAD[SH.RULES]       = ['Rule ID', 'Item Type', 'Item ID', 'Item Name', 'Who Type', 'Who', 'Who Name', 'Access',
                        'Status', 'Notes', 'Updated By', 'Updated At'];
HEAD[SH.CHK_DOERS]   = ['Checklist ID', 'Checklist Name', 'Doer Name', 'Doer Email', 'Doer Mobile', 'User ID',
                        'Full Name', 'Matched By', 'Last Synced'];
HEAD[SH.SAL_MAP]     = ['Salary Name', 'Employee ID', 'Employee Name', 'Mapped By', 'Mapped At'];
HEAD[SH.PAY_RUNS]    = ['Run ID', 'Month', 'Tab', 'Employees', 'Total Salary', 'Total Deduction', 'Net Pay',
                        'Prepared By', 'Prepared At', 'Status', 'Notes'];
HEAD[SH.SLIP_LOG]    = ['Timestamp', 'Month', 'Tab', 'Employees', 'Format', 'By', 'Notes'];
HEAD[SH.POSTER_SET]  = ['Key', 'Value', 'Notes'];
HEAD[SH.POSTER_OUT]  = ['Outlet Name', 'Address Line 1', 'Address Line 2', 'Contact Number', 'Active'];
HEAD[SH.POSTER_ROLES]= ['Job Title', 'Salary From', 'Salary To', 'Vacancies', 'Employment Type', 'Experience',
                        'Job Summary', 'Key Responsibilities (one point per line)',
                        'Qualification & Requirements (one point per line)', 'Active'];
HEAD[SH.POSTER_BEN]  = ['Benefit', 'Icon', 'Default', 'Active'];
HEAD[SH.POSTER_SEC]  = ['Order', 'Section Key', 'Heading', 'Type', 'Default Content', 'Print on Poster', 'Active'];
HEAD[SH.POSTER_LOG]  = ['Timestamp', 'User', 'Outlet', 'Job Title', 'Vacancies', 'Salary', 'Format', 'File Name', 'Link'];
HEAD[SH.FMS]         = ['FMS ID', 'FMS Name', 'Sheet ID / Link', 'Tabs', 'Department', 'Also For Designations', 'Status', 'Notes'];
HEAD[SH.TICKETS]     = ['Ticket ID', 'Date / Time', 'Name', 'Employee ID', 'User ID', 'Email', 'Designation', 'Department', 'Location', 'Outlet ID',
  'Issue Type', 'Subject', 'Remarks / Reason', 'Attachment (Photo Link)', 'Ticket Status', 'Assigned To', 'Issue Priority',
  'Planned Date for Resolve Issue', 'Actual Date for Resolve Issue', 'Resolution Note', 'Updated By', 'Updated At', 'Raised From'];
HEAD[SH.TICKET_LOG]  = ['Log ID', 'Timestamp', 'Ticket Key', 'Ticket ID', 'Source', 'Step', 'Details', 'By', 'User ID'];
HEAD[SH.EMP_CHANGES] = ['Change ID', 'Requested At', 'Requested By', 'User ID', 'Kind', 'Sheet', 'Row', 'Employee Id', 'Name', 'Summary', 'Payload',
  'Status', 'Decided By', 'Decided At', 'Remarks', 'Stage', 'HR Approved By', 'HR Approved At'];
HEAD[SH.ITEM_REQ]    = ['Request ID', 'Requested At', 'Item Code', 'Item Name', 'Change', 'From Status', 'To Status', 'Reason', 'Requested By', 'Requested By ID',
  'Status', 'Decided By', 'Decided At', 'Remarks'];
HEAD[SH.XL]          = ['Source ID', 'Source Tab', 'Copy Tab', 'Source Name', 'Tab Name', 'Source Updated', 'Copied At'];
HEAD[SH.HOLIDAYS]    = ['Holiday ID', 'Date', 'Day', 'Holiday', 'Every Year', 'Added By', 'Added At'];

/* ============================ SETTINGS ============================ */
/* [key, default value, note] — the Settings tab wins over these. */
function SETTING_DEFAULTS_() {
  return [
    ['── GENERAL ──', '', ''],
    ['App Name', 'Chai Govindam', 'Shown on the login screen and the top bar.'],
    ['Logo URL', APP.LOGO, 'Full logo (with the name) — salary slips and forms.'],
    ['Logo Mark', '1IKXbrom6fLxUN36Pyrnq3kMH3CZtBtbS', 'The logo without any text, shown on the login screen and the top bar: a Drive file ID or an image link.'],
    ['Salary Slip Logo URL', '', 'Logo on the salary slip (blank = the Logo URL).'],
    ['Session Hours', '12', 'How long a normal sign-in lasts.'],
    ['Remember Me Days', '30', 'How long a "Remember me" sign-in lasts on that device.'],
    ['Single Session Per User', 'No', 'Yes = signing in on a new device signs the old one out.'],
    ['Drive Folder Name', 'CG One Login Files', 'Every photo / bill / certificate / document is filed here.'],
    ['Max Upload MB', '10', 'Largest file a person may upload.'],
    ['Test Mode', 'No', 'Yes = every email goes to the Test Email instead of the real person.'],
    ['Test Email', 'mis@chaigovindam.com', ''],
    ['Send Task Emails', 'Yes', 'Email the person when a task is delegated / assigned / completed.'],
    ['Web App Link', '', 'The link to share with everyone. Blank = worked out by the app: script.google.com/a/macros/<your domain>/s/<id>/exec — the form that opens on phones signed in to several Google accounts.'],
    ['Operated Models', 'COCO, FOCO', 'Outlet models we run ourselves (Outlets tab ▸ Model). Attendance, penalties, salary preparation and checklists are kept only for these outlets and the Head Office. Other outlets (FOFO …) keep employee records, orders, DSR, leave and the rest.'],

    ['── LIVE DATA SOURCES ──', '', ''],
    ['Employee Master Sheet ID', '1QTG4jxgHLlmtvEI6yMnQ0F_ZsNQoKJG7QKJ2k1q4jCA', 'CG Employee Detail NEW.'],
    ['Employee Master Tab', 'CG EMPLOYEE MASTER', ''],
    ['Loan & Advance Sheet ID', '1z2rEgPoPAf2uvneDN4oziwDGBqnmET1jnDHpb5YbpJI', 'Month tabs "Advance <Month YYYY>", "Leave <Month YYYY>", "Reimbursement <Month YYYY>".'],
    ['Loan & Advance App URL', LA_APP_URL, 'Loan & Advance, Reimbursement & Leave web app. My Apps opens it (admin portal = this URL + ?page=admin). Change it here after a new deployment — My Apps updates itself.'],
    ['Advance Scan Months', '3', 'How many month tabs back the approval queues look.'],
    ['Outlet Orders Sheet ID', '1QqnMrL446pT3ChZmNQi7V5ikXnWTYbEfrQgrXiNpIZg', 'The Outlet Order app workbook (Orders, OrderMeta, ItemMaster, EmailList).'],
    ['Outlet Order App URL', 'https://script.google.com/macros/s/AKfycbxN7c7rclL7QGbnSLHWkFpOO7fcvTNailmh8PaMJQX41OWo8VeQcEmB_ozYVZhdXDuQ5A/exec', 'Approve / reject links in the order email point here.'],
    ['Order Approve Token', 'cg2024', 'Must match the token the Outlet Order app checks.'],
    ['Order Load Days', '60', 'How far back GFP orders are listed for GRN.'],
    ['GFP Order Emails', '', 'Blank = the EmailList tab of the Outlet Orders workbook.'],
    ['Prep Kitchen Sheet ID', '1xbjHt2hisTlQcieISrdV42ji19wMn8jllNuva2byI7A', 'Prep_Sheet_V1 — tab "Daily Entry" + "Prep_Master".'],
    ['Prep Kitchen Tab', 'Daily Entry', ''],
    ['Prep Kitchen Outlet', 'OUT-001', 'Outlet ID the prep kitchen belongs to (its sheet has no outlet column).'],
    ['Prep Entry Departments', 'F&B Production', 'Staff of these departments at the prep kitchen outlet get Production Entry (start / finish their own batches). Access Control can give it to anyone else.'],
    ['Prep Photo Required', 'Yes', 'Yes = a photo is needed when a batch is started and when it is finished (like the old prep sheet).'],
    ['Old App Links', 'No', 'No = an old app whose work now happens inside One Login (Loan & Advance form, prep sheet, checklists …) opens only here — its old link is shown to MIS and Directors only. Yes = everyone sees the old links again.'],
    ['Prep Scan Rows', '3000', 'Only the newest N rows are read — keeps the page fast.'],
    ['Attendance Sheet ID', '1qljLusu1ArT2rZoOEf6u75IDeaReBq3OsDEHXmpvb-c', 'The Attendance Report spreadsheet (Attendance Data, Location Rules, Penalty Rules …).'],
    ['Attendance Tab', 'Attendance Data', ''],
    ['HR Calling Sheet ID', '1X6cnsbrS56LX6pAGudWSYsIohou6aCvZ', 'HR Calling Record (Date of Calling · Name · Ph. No · Position · Remark · Status · … · Called By). A Google Sheet or an Excel file in Drive.'],
    ['HR Calling Tab', 'FMS', 'Tab of the calling record.'],
    ['Hiring FMS Sheet ID', '1duZUbAEymBwHiNXrrTFe9Cg0uX6--VW13qxL0-9OO7o', 'FMS Hiring workbook — HR Dashboard ▸ Hiring.'],
    ['Hiring Indent Tab', 'HR Indent Response V1', 'Indent form responses (who asked for which position).'],
    ['Hiring Indent FMS Tab', 'FMS-Indent to Offer Letter Sent', 'Indent → offer letter steps (Planned / Actual / Status).'],
    ['Hiring Onboarding FMS Tab', 'FMS-Onboarding to Probation', 'Onboarding → probation steps.'],
    ['FMS My Steps Days', '30', 'Dashboard ▸ FMS steps: a step planned more than this many days ago is left out (old rows nobody closed in the sheet).'],
    ['FMS Cache Minutes', '10', 'FMS and calling summaries are read again after this many minutes (Refresh reads them at once).'],
    ['Tickets Tracker (Pandri)', 'https://docs.google.com/spreadsheets/d/1_3mc-7JRuFdWDR3a1EtuHehgeOv07aZkYf5ElGuAIhE/edit', 'Checklist tickets of Pandri (Tickets tab). Add a row "Tickets Tracker (<outlet>)" for another outlet.'],
    ['Tickets Tracker (Chanderi)', 'https://docs.google.com/spreadsheets/d/1BQ1YyXN611LYxP4XpHeIC5mxkgzOtYyTV58T10UH8QY/edit', 'Checklist tickets of Chanderi (Tickets tab).'],
    ['Tickets Tracker Tab', 'Tickets', 'Tab name in the outlet Tickets Trackers.'],
    ['Ticket Issue Types', 'MAINTENANCE, MATERIAL, HOUSEKEEPING, IT / SOFTWARE, HR, ACCOUNTS, SAFETY, OTHER', 'What a ticket can be about (Raise a ticket).'],
    ['Ticket Tracker Designations', 'Process Coordinator (PC), Process Coordinator, Executive Assistant, EA', 'Admin designations for Issues: see, re-assign and mark done every issue (besides Director and MIS; EA and PC are always included).'],
    ['Ticket Closed Days Shown', '60', 'Closed tickets older than this many days drop off the lists (they stay in the sheets).'],
    ['HR Can Decide For Incharge', 'Yes', 'Yes = HR can approve / reject a leave or advance that is still with the Outlet Incharge — written as "<HR name> (HR, for the Outlet Incharge)".'],
    ['Ticket Default Resolve Days', '2', 'Planned date to resolve = assigned day + this many days when the tracker leaves it blank (High = same day, Low = double).'],
    ['Ticket Needs A Person', 'Yes', 'Yes = whoever raises a ticket picks the person it goes to (anyone at HQ or GFP, or an Outlet Incharge) — never a department.'],
    ['Employee Edit Needs Approval', 'Assistant HR, HR Assistant, HR Intern, HR Assistant Intern, HQ-00023, HQ-00024', 'Designations / Employee IDs / User IDs whose changes to the CG EMPLOYEE MASTER wait for the HR Executive.'],
    ['Employee Edit Approvers', 'HQ-00012, HR Executive', 'Who approves those changes (Designations / Employee IDs / User IDs). Director and MIS can always approve.'],
    ['DSR Sheet ID', '18jtV7T7svkMLv9pZWqIQHW5U_xUOtPnLfSuTCTK_Vng', 'Outlet Wise DSR workbook — one tab per outlet.'],
    ['DSR Allow Re-edit', 'Yes', 'Yes = the same date can be submitted again (overwrites). No = once per date.'],
    ['Legacy Delegation Sheet ID', '14n9lr-kivAbZq-VIPqH2oge-_fbgbs8A5iE9Hr4jKgY', 'Old Delegation sheet — not read any more (its open tasks were copied into the Delegated Tasks tab once, in 2.6.0).'],
    ['Delegation Sheet ID', '14n9lr-kivAbZq-VIPqH2oge-_fbgbs8A5iE9Hr4jKgY', 'Old Delegation Sheet NEW — not read any more. Delegated tasks live in the Delegated Tasks tab here; doers come from the employee master.'],
    ['Delegation Done Days', '90', 'Done delegated tasks older than this many days are not listed.'],
    ['Delegation Approvers', 'Executive Assistant (EA), Executive Assistant, EA', 'Designations / Employee IDs / User IDs who approve a delegated task the doer marked done. It is Done only after this approval.'],
    ['Item Not Dispatch Sheet ID', '1mag_PlwPpzatOHREsehKplOXst9nDKu3LOPHJ98hJVA', 'Item Not Dispatch sheet of the GFP store — shown in Orders Summary against each order.'],
    ['Item Master Sheet ID', '1AZ_Q8K3-wSWFG87TzZtBPRfqMYTb5Zyu76WthOI4GLk', 'Item_Master__v3 — the items the outlets order (the Orders workbook\'s ItemMaster tab imports its Active rows).'],
    ['Item Master Tab', 'Master Item List', 'Tab of the Item Master that holds the items.'],
    ['Store GRN Outlet', 'OUT-008', 'Outlet ID the Store Executive\'s GRNs are written under in the Stock Register (GFP).'],
    ['Food Closing Sheet ID', '1eAMlTz_yQmWc_46mY0AXZ0UJh_hESS8BFQM0I4KDoXc', 'Pandri Material Closing Sheet — its Stock Closing and Stock Closing Records tabs are the Directors\' Daily Food Closing.'],
    ['Food Closing Day Start Hour', '3', 'A closing made before this hour belongs to the day before (same as the closing app).'],
    ['Cash Management Sheet ID', '1qEj_UBsz1C6lZT4VqG135c8xMvMDC37TWmpYOIGlIUM', 'Cash_Management_Database — openings and closings of each counter and shift, shown to the Directors in Cash Management.'],
    ['Outlet Picker For', 'Admin', 'Departments, designations, roles or User IDs (besides the Directors and MIS) who get the location picker in the top bar. An Outlet Incharge of more than one outlet always gets it. Everyone else sees only the data of the places they belong to.'],
    ['Checklist Scan Rows', '2500', 'Team view: only the newest N rows of each checklist Master are read.'],
    ['Salary Master Sheet ID', '12xXyl5-XY4Yhw9_QitYjoRzGiTkvsYxlhAqNMEw8SEM', 'SGSPL SALARY MASTER — one tab per month (e.g. "AUG 2026").'],
    ['System Master Sheet ID', '1Ol74iL3R-8T1TliLFsF02ASLHrCMirlAVebnIWruYY8', 'CG System Master V2 — its links are imported into My Apps (Settings ▸ Tools).'],
    ['Poster Config Sheet ID', '1FbwCJAuUEovTh-M-V7nNWBQxeRUZ0wRFKEzXA_fx7mM', 'The old Poster Generation sheet — imported once into the Poster tabs here.'],
    ['HR Documents Folder ID', '1oNCFbK4X6X1NxJZLXQVNdJ-ZKv23yqzz', 'Shared Drive folder holding one folder per employee (Aadhar, PAN, documents).'],
    ['Loan & Advance Drive Folder ID', '1oux-NWHy7tvmzQ_KQxnBRHHp-iLPAL2T', 'Reimbursement bills are filed here (sub-folder "Reimbursement Bills").'],

    ['── OUTLET RULES ──', '', ''],
    ['Vegetable Order Emails', 'mis@chaigovindam.com', 'Who receives the vegetable order PDF (comma separated).'],
    ['Stock Bill Image Required', 'Yes', 'A bill photo is required on every Stock Register entry.'],
    ['Stock Bill Number Required', 'Yes', ''],
    ['Expense Bill Required Above', '500', 'A bill photo is required for expenses above this amount. 0 = always, blank = never.'],
    ['Certificate Warning Days', '30', 'Certificates expiring within this many days are flagged.'],
    ['Full Day Hours', '8', 'Attendance: worked hours for a full day (used only when the source row has no status).'],
    ['Half Day Hours', '4', ''],

    ['── LEAVE · ADVANCE · REIMBURSEMENT ──', '', ''],
    ['Advance Percentage', '60', 'Max advance = this % of salary earned so far (same rule as the advance form).'],
    ['Advance Eligible Days', '15', 'Days counted for the advance (1st – 15th cycle).'],
    ['Advance Admin Approval Above', '5000', 'Advances above this amount need Admin (the Directors — Namit Sir / Vivek Sir) after HR. At or below it, Admin approval is applied automatically and the advance goes to Accounts.'],
    ['Advance Admin Locations', 'Bhanpuri (HQ), Bhanpuri (GFP)', 'Every advance from these locations needs Admin (the Directors), whatever the amount.'],
    ['Advance No Incharge Locations', 'Bhanpuri (HQ), Bhanpuri (GFP)', 'Head Office: advances from these locations have no Outlet Incharge step ("-") and go straight to HR. Every outlet (Pandri, Chanderi …) starts with its Outlet Incharge.'],
    ['Leave Incharge Step', 'Yes', 'Yes = leave of any outlet that has an Outlet Incharge goes to that incharge first. No = only Pandri (old form rule).'],
    ['Sync Loan & Advance Admin Access', 'Yes', 'Yes = every Outlet Incharge here is written into the Loan & Advance "Admin Access" tab (same login ID + password), so the old form also routes to them.'],
    ['Reimbursement Categories', 'Travel, Office Supplies, Fuel, Hotel/Accommodation, Internet/Mobile, Food & Beverages, Software Resources, Hardware Resource, Purchase, Other', 'Shown in the reimbursement form.'],
    ['Reimbursement Payment Methods', 'UPI, Cash, Bank Transfer, Card Payment', ''],
    ['SMS Gateway Token', '', 'Traccar SMS Gateway token (same as the Loan & Advance app). Blank = no SMS on the final leave decision.'],
    ['SMS Gateway URL', 'https://www.traccar.org/sms/', ''],

    ['── HR ──', '', ''],
    ['Joining Form Enabled', 'Yes', 'Yes = the public New Employee Joining form (web app link + ?page=join) is open.'],
    ['Joining Form Notify', '', 'Emails told about every new joining form (comma separated). Blank = nobody.'],
    ['Employee Ex Tab', 'Ex-Employees', 'Tab of the employee workbook that holds people who left (their logins are switched off by the sync).'],
    ['Salary Tab Format', 'MMM yyyy', 'Name of a new month tab in the Salary Master (MMM yyyy → "SEP 2026", written in capitals).'],
    ['Salary Paid Leave Days', '4', 'Paid Leave pre-filled for a person who had none last month.'],
    ['Salary Section Order', 'Pandri, Chanderi, Bhanpuri (GFP), Bhanpuri (HQ)', 'Order of the location blocks in a prepared salary tab (only outlets we run and the Head Office are prepared).'],
    ['Salary Slip Heading', 'Chai Govindam', 'The only heading printed on a salary slip.'],
    ['Checklist Days Back', '45', 'My Checklist shows tasks from this many days back (plus anything still pending).'],
    ['Checklist Days Ahead', '7', 'My Checklist shows upcoming tasks this many days ahead.'],

    ['── SPEED ──', '', ''],
    ['Fast Reads', 'Yes', 'Yes = Apps Script reads the sheets a screen needs in parallel through the Sheets API. No = one by one.'],
    ['Fast Server Account', '', 'E-mail of the Google service account the fast server reads the sheets with.'],

    ['── SYSTEM (do not edit) ──', '', ''],
    ['Setup Version', '', 'Written by setup.'],
    ['Last Employee Sync', '', 'Written by the employee sync.'],
    ['Last Checklist Doer Sync', '', 'Written by the checklist doer sync.']
  ];
}

/* ============================ MODULES ============================ */
/* key | name | group | icon (Material Symbols) | sort | status | description
 * Status: Active = shows in the menu · Soon = shows as "coming soon" · Hidden = permission only */
function MODULE_DEFAULTS_() {
  return [
    ['dashboard',       'Dashboard',                   'Home',            'space_dashboard',   1,  'Active', 'Summary cards and today at a glance'],
    ['profile',         'My Profile',                  'My Space',        'badge',             3,  'Active', 'Your details from the employee master (no salary)'],
    ['my_requests',     'Leave · Advance · Reimbursement', 'My Space',    'edit_calendar',     4,  'Active', 'Apply and track your leave, advance and reimbursement'],
    ['checklist',       'Checklist',                   'Daily Work',      'checklist',         10, 'Active', 'Checklists assigned to you and your team'],
    ['checklist_assign','Assign Checklist Tasks',      'Daily Work',      'assignment_ind',    11, 'Hidden', 'Permission: give any checklist task to anyone'],
    ['tasks',           'My Delegated Tasks',          'Daily Work',      'task_alt',          12, 'Active', 'Tasks delegated to you'],
    ['tickets',         'Issues',                      'Daily Work',      'report_problem',    12.5, 'Active', 'Raise an issue and follow it until it is done'],
    ['ticket_track',    'Tickets — track & assign',    'Daily Work',      'support_agent',     12.6, 'Hidden', 'Permission: see, assign and close the tickets (Director, MIS, Process Coordinator, Outlet Incharge of his outlet)'],
    ['delegate',        'Delegate Tasks',              'Daily Work',      'forward_to_inbox',  13, 'Active', 'Give a task to anyone'],
    ['orders',          'Orders',                      'Stock & Orders',  'shopping_cart',     20, 'Active', 'GFP orders (as in the Outlet Order App: Max Level, Auto Fill, item rules), vegetable orders, bill entry'],
    ['order_dispatch',  'Orders — Dispatch',           'Stock & Orders',  'local_shipping',    20.5, 'Hidden', 'Permission: enter the dispatched quantity against every outlet\'s GFP orders (GFP store)'],
    ['item_master',     'Item Master',                 'Stock & Orders',  'category',          21.5, 'Active', 'GFP store: GRN for any item of the Item Master, item details, Active / Inactive requests'],
    ['grn',             'GRN & Stock Register',        'Stock & Orders',  'inventory_2',       21, 'Active', 'Receive GFP orders & vegetables, stock register'],
    ['prod_entry',      'Production Entry',            'Kitchen',         'skillet',           29, 'Active', 'Start and finish your own prep batches — you are the doer (no list of names)'],
    ['production',      'Production Records',          'Kitchen',         'soup_kitchen',      30, 'Active', 'Prep kitchen batches item-wise'],
    ['closing',         'Daily Closing – Food',        'Kitchen',         'fact_check',        31, 'Active', 'Closing / handover / wastage per shift'],
    ['wastage',         'Wastage Report',              'Kitchen',         'delete_sweep',      32, 'Soon',   'Coming soon'],
    ['dsr',             'DSR – Daily Sales',           'Money',           'point_of_sale',     40, 'Active', 'Daily sales report'],
    ['expenses',        'Expense Records',             'Money',           'receipt_long',      41, 'Active', 'Enter and view outlet expenses'],
    ['sales',           'Sale Report',                 'Money',           'monitoring',        42, 'Soon',   'Coming soon'],
    ['attendance',      'Attendance Report',           'People',          'how_to_reg',        50, 'Active', 'Previous days attendance, this month leave & advance'],
    ['leave',           'Leave Approval',              'People',          'event_busy',        51, 'Active', 'Approve / reject leave (outlet incharge step)'],
    ['advance',         'Advance Approval',            'People',          'payments',          52, 'Active', 'Approve / reject advance (outlet incharge step)'],
    ['roster',          'Roster',                      'People',          'calendar_month',    53, 'Active', 'Weekly shift roster'],
    ['penalty',         'Penalty',                     'People',          'money_off',         54, 'Active', 'Attendance penalties — automatic and manual, month summary (the outlet incharge sees his own outlet)'],
    ['approvals',       'Approvals',                   'Approvals',       'approval',          55, 'Active', 'Advance, leave and reimbursement waiting for you'],
    ['adv_hr',          'Advance — HR step',           'Approvals',       'verified_user',     56, 'Hidden', 'Permission: verify present days and approve advances (HR)'],
    ['adv_admin',       'Advance — Director step',     'Approvals',       'gavel',             57, 'Hidden', 'Permission: final approval of advances above the limit'],
    ['adv_pay',         'Advance — Payment',           'Approvals',       'account_balance_wallet', 58, 'Hidden', 'Permission: mark approved advances as paid (Accounts)'],
    ['leave_final',     'Leave — final decision',      'Approvals',       'event_available',   59, 'Hidden', 'Permission: final approval of leave (HR)'],
    ['reimb_approve',   'Reimbursement — approve',     'Approvals',       'request_quote',     60, 'Hidden', 'Permission: approve reimbursements'],
    ['item_approve',    'Item Active / Inactive — approve', 'Approvals',  'rule',              60.2, 'Hidden', 'Permission: approve requests to make an Item Master item active or inactive (MIS and the Directors always can)'],
    ['hr_dashboard',    'HR Dashboard',                'HR',              'monitoring',        60.5, 'Active', 'Headcount, attendance by location, penalties, unapproved leave, overtime, hiring FMS and calling'],
    ['hr_attendance',   'Attendance Manager',          'HR',              'fingerprint',       61, 'Active', 'Upload punches, day view, penalties, Excel reports'],
    ['employees',       'Employees',                   'HR',              'groups',            62, 'Active', 'Employee master, new joinings, shift timings, documents'],
    ['payroll',         'Salary Preparation',          'HR',              'calculate',         63, 'Active', 'Prepare a month in the Salary Master'],
    ['salary_slips',    'Salary Slips',                'HR',              'receipt',           64, 'Active', 'Salary slip PDFs — one, many or all'],
    ['poster',          'Hiring Poster',               'HR',              'campaign',          65, 'Active', 'Make a hiring poster (PNG / JPG / PDF)'],
    ['accommodation',   'Accommodation',               'HR',              'hotel',             65.5, 'Soon',  'Coming soon'],
    ['att_config',      'Attendance — rules & config', 'HR',              'tune',              66, 'Hidden', 'Permission: edit attendance rules (locations, shifts, penalties) and remove a whole day'],
    ['certificates',    'Certificates',                'Compliance',      'workspace_premium', 70, 'Active', 'Licences & certificates with expiry'],
    ['reports',         'Reports',                     'Reports',         'summarize',         77, 'Active', 'Attendance with penalties, penalty, overtime, leave and running advances — Excel or PDF'],
    ['fms',             'FMS Summary',                 'Reports',         'account_tree',      78, 'Active', 'Step-wise status of the FMS sheets of your department (all of them for admins and MIS)'],
    ['apps',            'My Apps',                     'Resources',       'apps',              80, 'Active', 'Every web app and sheet you are allowed'],
    ['vault',           'Documents & Passwords',       'Resources',       'folder_shared',     81, 'Active', 'Documents and logins shared with you'],
    ['dir_hr',          'HR Dashboard (Directors)',    'Directors',       'badge',             85, 'Hidden', 'Directors\' screens: payroll, advances and reimbursements'],
    ['dir_dsr',         'DSR Daily Sales (Directors)', 'Directors',       'point_of_sale',     85.1, 'Hidden', 'Directors\' screens: day-wise sales'],
    ['dir_grn',         'GRN Summary (Directors)',     'Directors',       'inventory_2',       85.2, 'Hidden', 'Directors\' screens: what arrived at Pandri, Chanderi and GFP'],
    ['dir_exp',         'Expense Records (Directors)', 'Directors',       'receipt_long',      85.3, 'Hidden', 'Directors\' screens: expenses of the outlets'],
    ['dir_cash',        'Cash Management (Directors)', 'Directors',       'payments',          85.4, 'Hidden', 'Directors\' screens: counter openings and closings'],
    ['dir_closing',     'Daily Food Closing (Directors)', 'Directors',    'fact_check',        85.5, 'Hidden', 'Directors\' screens: stock closed by the kitchens'],
    ['dir_orders',      'Orders Summary (Directors)',  'Directors',       'local_shipping',    85.6, 'Hidden', 'Directors\' screens: GFP orders and dispatch'],
    ['dir_fms',         'FMS Summary (Directors)',     'Directors',       'account_tree',      85.7, 'Hidden', 'Directors\' screens: hiring, onboarding and dispatch FMS'],
    ['vault_admin',     'Password Manager',            'Admin',           'key',               90, 'Active', 'Add documents / logins and share them'],
    ['users',           'User Management',             'Admin',           'manage_accounts',   91, 'Active', 'Logins, roles and access'],
    ['access',          'Access Control',              'Admin',           'admin_panel_settings', 92, 'Active', 'Who can open which section, checklist and app'],
    ['settings',        'Settings & Data',             'Admin',           'settings',          93, 'Active', 'Data sources, apps & links, sync, audit']
  ];
}

/* ============================ ROLES ============================ */
/* Role defaults. A blank cell on the Access tab = use the role's value;
   Access Rules (by department / designation / location / user) sit in between. */
var APPROVAL_STEPS = ['adv_hr', 'adv_admin', 'adv_pay', 'leave_final', 'reimb_approve'];
function ROLE_DEFAULTS_() {
  var ALL = MODULE_DEFAULTS_().map(function (m) { return m[0]; });
  function only(list) { var o = {}; ALL.forEach(function (k) { o[k] = list.indexOf(k) >= 0 ? 'Yes' : 'No'; }); return o; }
  var self = ['dashboard', 'profile', 'my_requests', 'checklist', 'tasks', 'tickets', 'apps', 'vault'];
  var everything = only(ALL);
  var mis = only(ALL.filter(function (k) { return APPROVAL_STEPS.indexOf(k) < 0 && k !== 'approvals'; }));
  var incharge = only(self.concat(['ticket_track', 'checklist_assign', 'orders', 'grn', 'production', 'closing', 'wastage', 'dsr', 'expenses',
    'sales', 'attendance', 'leave', 'advance', 'roster', 'penalty', 'certificates']));
  var hr = only(self.concat(['hr_dashboard', 'att_config', 'fms', 'reports', 'attendance', 'roster', 'penalty', 'approvals', 'adv_hr', 'leave_final', 'reimb_approve', 'hr_attendance',
    'employees', 'payroll', 'salary_slips', 'poster', 'accommodation']));
  var ea = only(ALL.filter(function (k) { return APPROVAL_STEPS.indexOf(k) < 0 && ['users', 'access', 'settings', 'vault_admin', 'att_config', 'order_dispatch', 'item_approve'].indexOf(k) < 0; }));
  var store = only(self.concat(['orders', 'order_dispatch', 'item_master']));
  var acc = only(self.concat(['expenses', 'dsr', 'sales', 'approvals', 'adv_pay', 'reimb_approve']));
  var staff = only(self);
  return [
    { id: 'ROL-01', name: 'Director',        title: 'Director',        desc: 'Everything, every outlet, final approvals', grants: everything },
    { id: 'ROL-02', name: 'MIS Admin',       title: 'MIS',             desc: 'Everything except money approvals, user management', grants: mis },
    { id: 'ROL-03', name: 'Outlet Incharge', title: 'Outlet Incharge', desc: 'Runs his own outlet only', grants: incharge },
    { id: 'ROL-04', name: 'HR',              title: 'HR',              desc: 'People, attendance, approvals, salary, hiring', grants: hr },
    { id: 'ROL-05', name: 'Accounts',        title: 'Accounts',        desc: 'Expenses, sales, payments, reimbursements', grants: acc },
    { id: 'ROL-06', name: 'Staff',           title: 'My Workspace',    desc: 'Own checklist, tasks, requests, apps', grants: staff },
    { id: 'ROL-07', name: 'Executive Assistant', title: 'Executive Assistant', desc: 'The Directors\' screens without their approvals; any section can be switched off person by person', grants: ea },
    { id: 'ROL-08', name: 'Store Executive', title: 'GFP Store', desc: 'Item Master (GRN, item details, Active / Inactive requests), dispatch of every outlet\'s GFP orders', grants: store }
  ];
}

/* ============================ SEED LISTS ============================ */
/* Type: Outlet = a café (orders, GRN, DSR, roster …). Head Office = Bhanpuri HQ and
   Bhanpuri GFP — part of the head office, never listed as an outlet. */
function OUTLET_SEED_() {
  // Outlet ID, Name, Code, Short, Type, Location label (employee master), Order Outlet Name, DSR tab, Aliases, Email, Phone, Address, Status, Model
  return [
    ['OUT-001', 'Pandri',         'CG001', 'PN',  'Outlet',      'Pandri (CG001)',        'CG Pandri',         'Pandri',        'Pandri, CG Pandri, PN, CG001','cgpandri@gmail.com', '', '', 'Active', 'COCO'],
    ['OUT-002', 'Pachpedi Naka',  'CG002', 'PP',  'Outlet',      'P. Naka (CG002)',       'CG Pachpedi Naka',  'Pachpedi Naka', 'Pachpedi Naka, P. Naka, P Naka, CG Pachpedi Naka, PP, CG002', '', '', '', 'Active', 'FOFO'],
    ['OUT-003', 'Gol Chowk',      'CG003', 'GC',  'Outlet',      'Gol Chowk (CG003)',     'CG Gol Chowk',      'Gol Chowk',     'Gol Chowk, CG Gol Chowk, GC, CG003', '', '', '', 'Active', 'FOFO'],
    ['OUT-004', 'Shankar Nagar',  'CG004', 'SN',  'Outlet',      'Shankar Nagar (CG004)', 'CG Shankar Nagar',  'Shankar Nagar', 'Shankar Nagar, CG Shankar Nagar, SN, CG004', '', '', '', 'Active', 'FOFO'],
    ['OUT-005', 'Fafadih',        'CG005', 'FF',  'Outlet',      'Fafadih (CG005)',       'CG Fafadih',        'Fafadih',       'Fafadih, CG Fafadih, FF, CG005', '', '', '', 'Active', 'FOFO'],
    ['OUT-006', 'Chanderi',       'CG006', 'CD',  'Outlet',      'Chanderi (CG006)',      'CG Chanderi',       'Chanderi',      'Chanderi, CG Chanderi, CD, CH, CG006, Chanderi Simga', '', '', '', 'Active', 'COCO'],
    ['OUT-007', 'HQ',             'HQ-001','HQ',  'Head Office', 'Bhanpuri (HQ)',         'HQ',                '',              'HQ, Bhanpuri, Bhanpuri HQ, Bhanpuri (HQ), HQ-001, Head Office, Head Quarter, MDO, 000 MDO', 'mis@chaigovindam.com', '', '', 'Active', ''],
    ['OUT-008', 'GFP',            'GFP',   'GFP', 'Head Office', 'Bhanpuri (GFP)',        'GFP',               '',              'GFP, Bhanpuri GFP, Bhanpuri (GFP), Gauri Food Products, Warehouse', 'store@chaigovindam.com', '', '', 'Active', '']
  ];
}

function DEPT_SEED_() {
  return [
    ['DEP-001', 'Front of House (FOH)', 'FOH, Front Office, Operation, Operations, Outlet / Operations', 'Active'],
    ['DEP-002', 'F&B Service', 'Service', 'Active'],
    ['DEP-003', 'F&B Production', 'F&B PRODUCTION, Prep Kitchen, Production, Kitchen', 'Active'],
    ['DEP-004', 'KST', 'Kitchen Stewarding', 'Active'],
    ['DEP-005', 'Housekeeping', 'HK', 'Active'],
    ['DEP-006', 'Security', '', 'Active'],
    ['DEP-007', 'Operations & Supply', 'Operations and Supply, Warehouse, GFP / Warehouse, Purchase, Store', 'Active'],
    ['DEP-008', 'Logistics', '', 'Active'],
    ['DEP-009', 'Accounts and Finance', 'Accounts, Finance', 'Active'],
    ['DEP-010', 'HR', 'Human Resources', 'Active'],
    ['DEP-011', 'Admin', 'Admin / MDO, Management, MIS', 'Active'],
    ['DEP-012', 'Maintenance', 'Store Maintenance', 'Active'],
    ['DEP-013', 'Management', 'Director, MD', 'Active']
  ];
}

function DESIG_SEED_() {
  // Designation, Department, Default Role, Code Prefix (new Employee IDs: HQ-00001 or CG-00001)
  return [
    ['Outlet Incharge', 'Front of House (FOH)', 'Outlet Incharge', 'CG'],
    ['Shift Incharge', 'Front of House (FOH)', 'Staff', 'CG'],
    ['Cashier', 'Front of House (FOH)', 'Staff', 'CG'],
    ['Steward', 'F&B Service', 'Staff', 'CG'],
    ['Food Commie', 'F&B Production', 'Staff', 'CG'],
    ['Beverage Commie', 'F&B Production', 'Staff', 'CG'],
    ['CDP', 'F&B Production', 'Staff', 'CG'],
    ['Sous Chef', 'F&B Production', 'Staff', 'CG'],
    ['Kitchen Helper', 'F&B Production', 'Staff', 'CG'],
    ['KST Helper', 'KST', 'Staff', 'CG'],
    ['HK Helper', 'Housekeeping', 'Staff', 'CG'],
    ['Security Associate', 'Security', 'Staff', 'CG'],
    ['Inventory Executive', 'Operations & Supply', 'Staff', 'CG'],
    ['Logistic Helper', 'Logistics', 'Staff', 'HQ'],
    ['Storekeeper (WH)', 'Operations & Supply', 'Staff', 'HQ'],
    ['Store Executive', 'Operations & Supply', 'Store Executive', 'HQ'],
    ['Store Head', 'Operations & Supply', 'Staff', 'HQ'],
    ['Store Assistant', 'Operations & Supply', 'Staff', 'HQ'],
    ['Purchase Executive', 'Operations & Supply', 'Staff', 'HQ'],
    ['Accounts Executive', 'Accounts and Finance', 'Accounts', 'HQ'],
    ['Assistant Accountant', 'Accounts and Finance', 'Accounts', 'HQ'],
    ['HR Executive', 'HR', 'HR', 'HQ'],
    ['Assistant HR', 'HR', 'HR', 'HQ'],
    ['HR Intern', 'HR', 'HR', 'HQ'],
    ['HR Assistant Intern', 'HR', 'HR', 'HQ'],
    ['MIS Executive', 'Admin', 'MIS Admin', 'HQ'],
    ['MIS', 'Admin', 'MIS Admin', 'HQ'],
    ['Data Entry Operator', 'Admin', 'Staff', 'HQ'],
    ['Process Coordinator (PC)', 'Admin', 'Staff', 'HQ'],
    ['Executive Assistant (EA)', 'Admin', 'Executive Assistant', 'HQ'],
    ['Social Media Marketing Intern', 'Admin', 'Staff', 'HQ'],
    ['Director', 'Management', 'Director', 'HQ']
  ];
}

/* The checklist spreadsheets (all use tab "Master":
   Name · Email · Department · Task ID · Freq · Task · Planned · Actual · Remark/Reason · Attachment) */
function CHECKLIST_SEED_() {
  return [
    ['CHK-001', 'Cashier Checklist',           '1E0R0t-ruCn_9JbdAqDWKtGm1qFxH0hTiGOGJyifhsi8', 'Master', 'OUT-001', 'Front of House (FOH)', 'https://script.google.com/macros/s/AKfycbxQLExQWpzGi6LDtOrwGd7REYEifyE1xEG0fsbkB_iIfeQJTmYBUaA2xui9h5lW7zhD/exec', '', 'Active'],
    ['CHK-002', 'Housekeeping Checklist',      '1al0kf9Bqf5f9A2bgUKDXvGcVKEgtXO_2wdBO-neGW1w', 'Master', 'OUT-001', 'Housekeeping',         'https://script.google.com/macros/s/AKfycbzAMTdBMQ_-HUicFYl1X8rQ9Gq1NOJwQ4MZnVIjUvXUsPDBLEqr6VP7zHIgYp4dPMHz/exec', '', 'Active'],
    ['CHK-003', 'Maintenance Checklist',       '1e2gLxoz3Jra362QPU_2_PWSNhB3y3gtFccSdt1couCE', 'Master', 'OUT-001', 'Maintenance',          'https://script.google.com/macros/s/AKfycbynkIgPNXVWAzwtNUuo_qCPkidK43oK_ruEov2lyd9lJcM3Nd3RH3Jv1dTx5Hv3ZstF7g/exec', '', 'Active'],
    ['CHK-004', 'PrepKitchen Checklist',       '1c69QA5zUT6iK4_070aAHl8MeHKx9bwTukv87rQyn784', 'Master', 'OUT-001', 'F&B Production',       'https://script.google.com/macros/s/AKfycbza_vFjxCS0orl_k6aaRLfy5EO7mAvoDHaoDkKu0pShjiomhqa8HgeXcFZLo3g_aA2-eA/exec', '', 'Active'],
    ['CHK-005', 'HR Checklist',                '1w5Yujwwpj16RQ31dZTjq0qZe85LYBal6yL2izmysh0Q', 'Master', 'OUT-007', 'HR',                   'https://script.google.com/macros/s/AKfycbydR5fR42IgpG-EFpdONVu_h0919UCH9NNFM1Q1SuOoyiqUBuI0Er15xF5qJ6zLI9xw/exec', '', 'Active'],
    ['CHK-006', 'Accounts Checklist',          '1IjJp4mGfUkjBjXx_2h5QoQ2zytiGoX5IYCHmm8HLnAI', 'Master', 'OUT-007', 'Accounts and Finance', '', '', 'Active'],
    ['CHK-007', 'EA Checklist',                '1b7wxUjUQ4ngGWOE4a0HCUGuZ2B_M4ssTeT1yluaTK9I', 'Master', 'OUT-007', 'Admin',                '', '', 'Active'],
    ['CHK-008', 'GFP Checklist',               '1mqVPXD3Zrll8U7cHi8zCmCuCsXZWqHOqqjUNVaHVACY', 'Master', 'OUT-008', 'Operations & Supply',  '', '', 'Active'],
    ['CHK-009', 'Store Maintenance Checklist', '13DqXQtEdo-RbJkNnCjoKPCQM0deB4JIQVw5hqKG3wg0', 'Master', 'OUT-008', 'Maintenance',          '', '', 'Active'],
    ['CHK-010', 'Cashier Checklist (Chanderi)',      '1sEpyfcTV4raoP_JicGwAzhrGd2z0_7cO9uK9cHDiv_k', 'Master', 'OUT-006', 'Front of House (FOH)', 'https://script.google.com/macros/s/AKfycbwKD0cFDh9RVv5iruno4uIe4KsJkvRcjGEXXKGeBhgR8eSLC2ML5nOWkJdhcejs0-Rl8w/exec', '', 'Active'],
    ['CHK-011', 'Housekeeping Checklist (Chanderi)', '1EQ_nqbWx6nHjxoFJoFUX4xrB3KWfDvBNGTsukMi4K1Y', 'Master', 'OUT-006', 'Housekeeping',         'https://script.google.com/macros/s/AKfycbybpiR4JsX8vIRQtqS3Orqms25l3r7Yd9q1YLEbDhYNRzKwkXSRjBgH-4x66ioARTE/exec', '', 'Active'],
    ['CHK-012', 'Maintenance Checklist (Chanderi)',  '188rKOpuna_NCB2QNx6uG77MKGBk0Q-QNqC0hcJpP4bU', 'Master', 'OUT-006', 'Maintenance',          'https://script.google.com/macros/s/AKfycbzA3OL2PbJkuk7nT7FSOYBlnvH6aqnghqdSe2LUp2NfJuXk_0pLQWxVeM-tnwS8IVuxrg/exec', '', 'Active'],
    ['CHK-013', 'Kitchen Checklist (Chanderi)',      '1ELyN6pj-SJm1dEvgUG4uqK1DHf0f9dBDuSASCQrt1F0', 'Master', 'OUT-006', 'F&B Production',       'https://script.google.com/macros/s/AKfycby594mvAQLo9KuUacYpci9f6TsYTvwzuSVphdj4s_e8wA_WTEovQ-sQFX0PgB7is-YqBg/exec', '', 'Active']
  ];
}

function VEG_SEED_() {
  var reg = [['Onion','प्याज'],['Potato','आलू'],['Lemon','नींबू'],['Capsicum','शिमला मिर्च'],
    ['Tomato Hybrid','टमाटर हाइब्रिड'],['Tomato Native','टमाटर देसी'],['Coriander','धनिया'],
    ['Garlic','लहसुन'],['Peeled Garlic','छिला लहसुन'],['Ginger','अदरक'],['Cucumber','खीरा'],
    ['Carrot','गाजर'],['Bell Pepper (Red & Yellow)','शिमला मिर्च (लाल/पीली)'],
    ['Green Chilly','हरी मिर्च'],['Cabbage','पत्ता गोभी'],['Curry Leaves','करी पत्ता']];
  var staff = [['Brinjal','बैंगन'],['Spinach','पालक'],['Red Amaranth','लाल भाजी'],
    ['Ladyfinger','भिंडी'],['Radish Bhaji','मूली भाजी'],['Cauliflower','गोभी'],['Bottle Gourd','लौकी']];
  var extra = [['Tomato','टमाटर'],['Long Beans','बरबट्टी'],['Beetroot','बीट'],['Mint Leaves','पोदीना'],
    ['Chilli Big','मोटी मिर्च'],['Beans','बीन्स'],['Parwal','परवल'],['Red Pumpkin','कुम्हड़ा'],
    ['Drumstick','मुनगा'],['Spring Onions','हरा प्याज'],['Methi Bhaji','मेथी भाजी'],
    ['Capsicum Jugni','जुगनी मिर्च'],['Broccoli','ब्रोकली'],['Bitter Gourd','करेला'],
    ['Kundru','कुंदरू'],['Semi','सेमी'],['Green Papaya','कच्चा पपीता'],['Green Banana','कच्चा केला'],
    ['Mushroom','मशरूम'],['Ridge Gourd','तोरई'],['Nawalgol','नवलगोल'],['Basil Leaves','तुलसी पत्ता']];
  var rows = [], n = 0;
  function add(sec, list) { list.forEach(function (r, i) { n++; rows.push(['VGI-' + pad_(n, 3), sec, r[0], r[1], 'kg', i + 1, 'Active']); }); }
  add('Vegetables', reg); add('Staff Food', staff); add('Extra', extra);
  return rows;
}

/* The items in your image — bill entry only, never ordered. */
function STOCK_CAT_SEED_() {
  return [
    ['BAKERY', 'INNOVATION FOOD', 1, 'Active'],
    ['DAIRY', '', 2, 'Active'],
    ['FUEL', '', 3, 'Active'],
    ['GROCERY', '', 4, 'Active'],
    ['ICE & ICE CREAM', 'SHIVAM ENTERPRISES', 5, 'Active'],
    ['GARLIC TOAST', 'BALKRISHNA SEV FACTORY & BAKERY', 6, 'Active']
  ];
}
function STOCK_ITEM_SEED_() {
  var list = [
    ['BAKERY', 'BROWNI', '', 'PCS'], ['BAKERY', 'BURGER BUN SMALL', '', 'PKT'], ['BAKERY', 'CREAM ROLL', '', 'PCS'],
    ['BAKERY', 'DRY CAKE', '', 'PKT'], ['BAKERY', 'FRUIT BUN', '', 'PCS'], ['BAKERY', 'JUMBO BREAD 1 KG', '', 'PKT'],
    ['BAKERY', 'LADI PAV', '', 'PKT'], ['BAKERY', 'PAV', '', 'PKT'],
    ['DAIRY', 'AMUL DICED CHEESE BLEND 1 KG', 'BABA HARDASRAM AGENCY', 'PKT'], ['DAIRY', 'DAHI', 'NEMRAS AND COMPANY', 'KG'],
    ['DAIRY', 'PANEER', 'SWEET INDIA', 'KG'], ['DAIRY', 'TORTILLA ROLL', 'DESI AROMA', 'PKT'],
    ['FUEL', 'GAS CYLINDER', 'Vidhya Construction, Vidhya Gas Agency', 'PCS'],
    ['ICE & ICE CREAM', 'ALPHONSO MANGO 5LTR', '', 'LTR'], ['ICE & ICE CREAM', 'ICE CREAM', '', 'LTR'],
    ['ICE & ICE CREAM', 'ICE CUBE', 'SATKAR AGENCY', 'KG'],
    ['GARLIC TOAST', 'GARLIC TOAST', 'BALKRISHNA SEV FACTORY & BAKERY', 'PKT']
  ];
  var sort = {};
  return list.map(function (r, i) {
    sort[r[0]] = (sort[r[0]] || 0) + 1;
    return ['STI-' + pad_(i + 1, 3), r[0], r[1], r[2], r[3], sort[r[0]], 'Active'];
  });
}

/* Daily Closing – Food items (from the Pandri Material Wastage sheet). */
function FOOD_SEED_() {
  var list = [['Adrak (अदरक)','GRM'],['Barik Onion (बारीक प्याज)','GRM'],['Boiled Aloo (उबला आलू)','GRM'],
    ['Bombay Aloo (बॉम्बे आलू)','GRM'],['Bun (बन)','PCS'],['Butter (मक्खन)','GRM'],['Chai (चाय)','GRM'],
    ['Chole (छोले)','GRM'],['Corn (मक्का)','GRM'],['Gajar Cutting (कटी हुई गाजर)','GRM'],['Gol Tomato (गोल टमाटर)','GRM'],
    ['Green Chutney (हरी चटनी)','GRM'],['Imli Chutney (इमली की चटनी)','GRM'],['Jumbo Bread (जंबो ब्रेड)','PCS'],
    ['Khakhra Cutting (खाखरा कटिंग)','GRM'],['Khichdi (खिचड़ी)','GRM'],['Khira Cutting (कटा हुआ खीरा)','GRM'],
    ['Lacha Onion (लच्छा प्याज)','GRM'],['Maggi Cutting (मैगी कटिंग)','GRM'],['Nibu (नींबू)','GRM'],
    ['Paneer Masala (पनीर मसाला)','GRM'],['Papadi Chat (पापड़ी चाट)','GRM'],['Pav (पाव)','PCS'],
    ['Peeled Onion (छिला हुआ प्याज)','GRM'],['Poha (पोहा)','GRM'],['Rice (चावल)','GRM'],['Upma (उपमा)','GRM'],
    ['Upma Chutney (उपमा चटनी)','GRM']];
  return list.map(function (r, i) { return ['FDI-' + pad_(i + 1, 3), r[0], r[1], '', i + 1, 'Active']; });
}

function EXP_CAT_SEED_() {
  return ['Vegetables (Local)', 'Grocery', 'Dairy', 'Gas / Fuel', 'Transport / Porter', 'Repair & Maintenance',
    'Cleaning Supplies', 'Staff Welfare / Tea', 'Printing & Stationery', 'Electricity / Water',
    'Packaging', 'Petty Cash', 'Miscellaneous'].map(function (c) { return [c, 'Active']; });
}

/** FMS Summary — Department = who sees it (admins / MIS see all); Also For Designations = extra people (comma separated). */
function FMS_SEED_() {
  return [
    ['FMS-001', 'Hiring — Indent to Offer Letter', '1duZUbAEymBwHiNXrrTFe9Cg0uX6--VW13qxL0-9OO7o', 'FMS-Indent to Offer Letter Sent', 'HR', '', 'Active', 'FMS Hiring New sheet'],
    ['FMS-002', 'Hiring — Onboarding to Probation', '1duZUbAEymBwHiNXrrTFe9Cg0uX6--VW13qxL0-9OO7o', 'FMS-Onboarding to Probation', 'HR', '', 'Active', 'FMS Hiring New sheet'],
    ['FMS-003', 'Outlet Order to Dispatch', '1xSOfCLKqKHnEoOHR5g_2KKxqhqP4A1jjW8_dATDAXXI', 'FMS', 'Operations & Supply', 'Store Head, Store Executive, Storekeeper (WH), Store Assistant, Store Incharge', 'Active', 'GFP store'],
    ['FMS-004', 'Purchase FMS', '', 'FMS', 'Operations & Supply', 'Store Head, Store Executive, Store Incharge, Purchase Executive', 'Active', 'Paste the Purchase FMS sheet link in Sheet ID / Link.']
  ];
}

function SHIFT_SEED_() {
  return [
    ['S1', 'Shift-1 (Morning)', '06:00', '15:00', '#FDE68A', 1, 'Active'],
    ['S2', 'Shift-2 (Evening)', '14:00', '23:00', '#BFDBFE', 2, 'Active'],
    ['G',  'General',           '10:00', '19:00', '#DDD6FE', 3, 'Active'],
    ['N',  'Night',             '22:00', '06:00', '#C7D2FE', 4, 'Active'],
    ['WO', 'Week Off',          '',      '',      '#E5E7EB', 5, 'Active'],
    ['L',  'Leave',             '',      '',      '#FECACA', 6, 'Active']
  ];
}

var PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Credit'];
var TASK_STATUSES = ['Pending', 'In Progress', 'Pending Approval', 'Done', 'Verified', 'Reopened', 'Cancelled'];
var TASK_PRIORITIES = ['High', 'Medium', 'Low'];

/* The DSR form — mirrors CONFIG.REPORT_COLUMNS of the Outlet Wise DSR app. */
var DSR_COLUMNS = [
  { key: 'date',          header: 'Date',                         type: 'date' },
  { key: 'cash',          header: 'Cash Sales',                   type: 'currency', section: 'sales',    input: true, required: true },
  { key: 'upi',           header: 'UPI Sales',                    type: 'currency', section: 'sales',    input: true, required: true },
  { key: 'online',        header: 'Online Sales',                 type: 'currency', section: 'sales',    input: true, required: true },
  { key: 'due',           header: 'Due Sales',                    type: 'currency', section: 'sales',    input: true, required: true },
  { key: 'virtualWallet', header: 'Virtual Wallet',               type: 'currency', section: 'sales',    input: true, required: true, outlets: ['Pandri'] },
  { key: 'totalSales',    header: 'Total Sales',                  type: 'currency', section: 'sales',    sumOf: ['cash', 'upi', 'online', 'due', 'virtualWallet'] },
  { key: 'totalOrders',   header: 'Total No. of Orders',          type: 'number',   section: 'sales',    input: true, required: true },
  { key: 'cashExp',       header: 'Cash Expenses',                type: 'currency', section: 'expenses', input: true, required: true },
  { key: 'upiExp',        header: 'UPI Expenses',                 type: 'currency', section: 'expenses', input: true, required: true },
  { key: 'expenses',      header: 'Total Expenses',               type: 'currency', section: 'expenses', sumOf: ['cashExp', 'upiExp'] },
  { key: 'declaration',   header: 'Self Declaration',             type: 'boolean' },
  { key: 'submittedBy',   header: 'Submitted By',                 type: 'text' },
  { key: 'lastUpdated',   header: 'Last Updated',                 type: 'datetime' },
  { key: 'avgSalePerOrder',         header: 'Avg Sale Per Order',           type: 'currency' },
  { key: 'avgSalePerOrderTillDate', header: 'Avg Sale Per Order Till Date', type: 'currency' }
];
var DSR_DECLARATION = 'I hereby certify that the sales and expense information provided above is true, accurate, and complete to the best of my knowledge. I acknowledge that any misrepresentation or provision of false information may result in disciplinary and legal action.';
