# Chai Govindam — One Login · setup guide (v2.9.4)

One web app, one sign-in page. Each person sees only the sections their login is given: the outlet
incharge gets what looks like an app made for outlet incharges (his own outlet only), HR gets the HR desk,
a steward gets their profile, requests, checklist and apps, and the Director / MIS get everything plus
user management and access control.

Everything this app creates lives in **the spreadsheet the script is bound to**. Data owned by the older
apps is read and written **in place** (IDs on the `Settings` tab):

| Section | Reads / writes |
|---|---|
| Leave · Advance · Reimbursement, Leave / Advance Approval, Approvals | Loan & Advance sheet — `Leave <Month YYYY>`, `Advance <Month YYYY>`, `Reimbursement <Month YYYY>` (same columns as the old form) |
| Attendance Manager, Attendance Report, Penalty | Attendance Report workbook — `Attendance Data`, `Location Rules`, `Penalty Rules`, `Manual Penalty`, `Employee Shift` … |
| Employees, joining form, My Profile | CG Employee Detail NEW — `CG EMPLOYEE MASTER`, `Ex-Employees`; documents in the HR Documents folder |
| Salary Preparation, Salary Slips | SGSPL Salary Master — one tab per month (`AUG 2026` …) |
| Orders ▸ New Order, Max Level, Closing Stock, Order History, Dispatch · GRN | Outlet Orders workbook — `Orders`, `OrderMeta`, `ItemMaster`, `ItemRules`, `MaxLevel`, `ClosingStock`, `StandardQty`, `AppConfig`, `EmailList` (same `POPN26/SEP/014` numbers) |
| Checklist | each checklist's `Master` tab — `Actual`, `Remark`, `Attachment`, exactly like its own app |
| Delegated tasks | the `Delegated Tasks` tab here (since 2.6.0 — the old Delegation Sheet NEW is not read any more) |
| Production Records | Prep_Sheet_V1 — `Daily Entry` + `Prep_Master` (read only) |
| DSR | Outlet Wise DSR — the outlet's tab |
| Hiring Poster | the `Poster …` tabs here (filled once from the old Poster Generation sheet) |
| My Apps | the `Apps` tab here (imported from CG System Master V2) |

## 0 · What is new in 2.9.4 (everything on Vercel — the fast server moved off Netlify)

**Why the app was slow on 29 Oct 2026:** the Vercel site sent every data request (`/api`) on to the Netlify fast server, but
Netlify had stopped deploying (the team's free monthly credits were used up — every GitHub upload is a production deploy
of 15 of the 300 credits). Netlify still served the old 2.9.0 copy without the fast server, so `/api` answered *404* and every
screen went to Apps Script (3 – 4.5 s per request even when it has nothing to do).

**From 2.9.4 Netlify is not used at all.** The Vercel deployment holds the screens **and** the fast server:

| | Up to 2.9.3 | 2.9.4 |
|---|---|---|
| Screens | Vercel | Vercel (same) |
| Fast server (`/api`) | Netlify, reached through Vercel | **Vercel Function** in Mumbai (`bom1`), same deployment |
| Files in `_deploy` | Web.zip, netlify.zip, netlify.toml, unpack.mjs, vercel.json | **Web.zip, server.zip, unpack.mjs, vercel.json** |
| Fast server settings | Netlify ▸ Environment variables | **Vercel ▸ Settings ▸ Environment Variables** |

**Steps (once)**
1. `clasp push` ▸ Deploy ▸ Manage deployments ▸ ✎ Edit ▸ **New version** ▸ Deploy. Open the app once as MIS.
2. **The four fast server settings.** Vercel ▸ the project ▸ **Settings ▸ Environment Variables** ▸ add each one
   (Environments: Production and Preview; tick *Sensitive*):

   | Key | Where the value comes from |
   |---|---|
   | `CG_FAST_CONFIG` | One Login sheet ▸ menu **CG One Login ▸ Fast server: show its settings** ▸ copy |
   | `GOOGLE_CLIENT_ID` | console.cloud.google.com (as mis@) ▸ Google Auth Platform ▸ **Clients** ▸ *One Login fast server* |
   | `GOOGLE_CLIENT_SECRET` | the same client. Google shows a secret only when it is made: if you no longer have it, **Add secret** there and copy the new one |
   | `GOOGLE_REFRESH_TOKEN` | the `1//…` token you put on Netlify. If you do not have it, make a new one: section 0.0 ▸ B1 steps 4 – 6 (OAuth Playground with the client above) |

   These are the same values Netlify had. Netlify does not show secret values again, so take them from the places above.
3. GitHub ▸ the repository ▸ **Add file ▸ Upload files** ▸ drag the **four files** from `C:\AppScr\CG One Login\_deploy`
   (`Web.zip`, `server.zip`, `unpack.mjs`, `vercel.json`) ▸ **Commit changes**. Vercel deploys by itself. The old
   `netlify.zip` and `netlify.toml` in the repository can stay or be deleted — they are not used.
4. Vercel ▸ **Deployments** ▸ the new one ▸ **Building**: the log shows `server.zip → server/ (9 files)`,
   `fast server → /api (region bom1)` and `One Login web version 2.9.4`. (Settings added *after* a deployment need one more
   deployment: ⋯ ▸ **Redeploy**.)
5. Open `https://<your Vercel link>/api` — `"ready": true`, `"host": "vercel bom1"`, `"version": "2.9.4"`. A line that is not
   `ok` says what is missing (config = CG_FAST_CONFIG, google = the three GOOGLE_ values, sheet = mis@ cannot open the sheet).
6. Settings tab of the One Login sheet ▸ **Web App Link** = the Vercel link (e-mails and *Copy link* use it).
7. Netlify: nothing more to do. The Netlify site can be deleted (Site configuration ▸ Delete project) so nobody opens the old copy.

**Every later version:** `clasp push` + New version, then upload the four `_deploy` files to GitHub in **one** commit.

**Costs:** Vercel's free *Hobby* plan includes 4 hours of function CPU a month and is meant for personal, non-commercial use;
*Pro* is $20 a month per member. Look at Vercel ▸ **Usage** (Functions ▸ Active CPU) after two or three days of normal use.
When the fast server is off or over a limit, the app keeps working through Apps Script — slower, never wrong.

## 0.A · What was new in 2.9.3 (roster by location with replacements · one Employees card · one file for all locations · penalties in every record)

| | 2.9.2 | 2.9.3 |
|---|---|---|
| Roster page | Today, Tomorrow, This week (shift counts), Yesterday | three cards: **Prepare for Tomorrow**, **Prepare Weekly Roster** (no numbers), **Yesterday's roster**; *Prepare another day* and *Duty sheet* stay below |
| Prepare a day | a list of names with one dropdown | **Location** dropdown (Pandri / Chanderi), then a table **Employee · Shift timing · Replacement** |
| Shift timing choices | every row of the Shifts tab | the Shifts rows with a start and end (**4 AM – 1 PM**, **2 PM – 11 PM**), **Leave**, **Manual timing**. A Week Off saved earlier still shows |
| Approved leave | a note | comes in as **Leave** by itself (a leave only applied is shown as a note) |
| Replacement | only on the Duty sheet for a leave in the Loan & Advance sheet | the Replacement column opens when the timing is Leave — people of the same department first, then the other departments. It is kept on the Roster tab (new columns *Replacement ID*, *Replacement Name*) and written on the leave row of the Loan & Advance sheet |
| Employees page | four location cards, joining approvals, five tools | **Employees** (total of HQ, GFP, Pandri, Chanderi — inside: Location filter with counts such as *Bhanpuri · HQ (14)*, search and edit), **Changes & tracking**, **PF / Salary breakup**, **Assets**, **New Employee Joining Form**, **New Employee Joining Approval** |
| Upload attendance | two boxes | a third box **All locations in one file**: one Petpooja file with every location is split by person and replaces both files' rows of the dates in it |
| Re-uploading a day | punches edited by hand were lost | punches edited by hand are kept |
| Attendance records | penalties inside each record | every record shows its penalties under the punches in **All** — tap a penalty to change the amount, waive it or put the automatic amount back; **+ Penalty** gives a penalty by hand; **Edit punches** next to it |

**One file for 1 – 28 Oct (all four locations):** Payroll ▸ **Upload attendance** ▸ **All locations in one file** ▸ drop the file.
Rows of today (28 Oct) are left out — Petpooja does not have the full day yet; upload that day tomorrow. Punches you edited by
hand stay, and so do penalties you changed or gave by hand.
This one upload also fills the days that have only one of the two files (step 4 of 2.9.2, section 0.B).

**Week Off:** it is not among the timings any more, as asked. A weekly off marked **Leave** on the roster counts as unapproved
leave unless the leave is in the Loan & Advance sheet. Add Week Off back as a choice if weekly offs should not be charged.

**Steps** — the same as for 2.9.2 (section 0.B) (`clasp push`, New version, open once as MIS, the five `_deploy` files to GitHub). The
upgrade adds the two Replacement columns to the Roster tab. If 2.9.2 was never deployed, this one deploy covers both.

## 0.B · What was new in 2.9.2 (two attendance files · names checked · roster timing · Employees · Calendar)

**Why Tikeshwari Sahu and two Sayyed Mahfooz records showed up** (checked on the live data, 28 Oct 2026)
- Petpooja numbers some people differently from the employee master. Up to 2.9.1 the Employee ID in the file decided
  on its own, so the punches went to whoever has that number in the master:

  | In the Petpooja file | That number in the master | The real person in the master |
  |---|---|---|
  | CG-000383 Bhumika Saytode | CG-00383 Tikeshwari Sahu | not in the master |
  | CG00385 TIKESHARI SAHU | CG-00385 Pushplata | CG-00383 Tikeshwari Sahu |
  | CG00386 DOMAN DHURVE | CG-00386 Prabha | CG-00384 Doman Dhurve |
  | CG00389 PUSHPLATA · CG00390 PRABHA | — | CG-00385 Pushplata · CG-00386 Prabha |
  | CG-000377 BARKHA AZAD | — | CG-00375 Barkha Azad |
  | CG-00375 DEEPAK CHANDRAKAR · CG00375 LOVE KUMAR | CG-00375 Barkha Azad | not in the master |
  | HQ-00026 POOJA PATEL (HR Intern) | HQ-00026 Sayyed Mahfooz Alam | not in the master |
  | HQ-00027 Sayyed Mahfooz Alam | — | HQ-00026 Sayyed Mahfooz Alam |

- The two Petpooja files (HQ · GFP · Pandri, and Chanderi) were stored as one: uploading the second file of a day
  replaced every row of that day, so the first file's people disappeared and the others were marked absent.

**What 2.9.2 does**

| | Up to 2.9.1 | 2.9.2 |
|---|---|---|
| Two Petpooja files | one upload box; the second file replaced the first file's day | **two upload boxes** — *HQ · GFP · Pandri* and *Chanderi*. Each replaces only its own rows of the dates in the file; the other file's rows stay. Location Rules ▸ new column **Upload File** says which file a location comes in |
| A file dropped in the wrong box | stored | refused: "This looks like the Chanderi file — 8 of the 8 people found are from CGChanderi. Use the Chanderi upload." |
| Employee ID in the file | decided alone | counts for that master employee only when the name in the file is close to the master name (Kalyani Gaykward = Kalyani Bai, Tikeshari = Tikeshwari). Otherwise the name decides (exact name first, then a close name among that file's locations). ID Mapping still comes first |
| The same person twice on one day | two records | counted once (the row with the better match and more punches); the other row is listed under *Not matched* with the reason |
| Not in the master | — | listed under *Not matched*, e.g. "ID HQ-00026 is Sayyed Mahfooz Alam in the employee master — not the same name"; Map links it to the right person |
| Absent rows | for every location found in the day's file | only for the locations whose file was uploaded that day, and never before the person's **Date Of Joining** |
| Roster | week offs only | the **roster timing** of a person on a date decides late punch in / early out and their penalties (see below) |
| HR roster | only the outlets of the login | HR, MIS and Directors pick **Pandri or Chanderi** on every roster screen |
| Employees | a card inside Payroll; joinings in Approvals | its own section **Employees** in the sidebar: cards *Bhanpuri · HQ*, *Bhanpuri · GFP*, *Pandri*, *Chanderi* (active counts, tap for the list) and **New joining approvals**; tools below (Search & edit, Changes & tracking, Shift timings, Assets, PF / Salary breakup) |
| Approvals | had New joinings | no New joinings (they are in Employees) |
| Birthdays | a card in Payroll | the **Calendar** on the dashboard — birthdays and holidays, month by month |
| Payroll page | many cards | two buttons on top — **Upload attendance** and **Last upload** (date of each file) — then *Attendance records*, **Penalties**, *Overtime*, *Rules* and the salary cards |
| Penalties | *Penalty applied*, *Penalty in last upload*, *Unapproved leave*, *Exceptions* cards | one **Penalties** card (month total) with tabs *By type*, *Unapproved leave*, *Exceptions*, *Give a penalty* |
| Attendance records | punches only | each record shows the shift and where it came from (Roster / Employee shift / Nearest shift), the file, and its **penalties**: change the amount, waive, back to the automatic amount, remove one given by hand, **add a penalty**; *Edit punches* as before. A day shows which file is uploaded; *Remove a day* can remove one file only |

**Roster timing — the order used for late in / early out**
1. A roster cell with a timing for that person on that date (Shift-1, Shift-2 or Manual timing) — prepared the day before,
   or for the whole week. Grace minutes are those of the nearest Shift Config shift.
2. A roster cell without timing (Week Off, Leave): no late / early check; Week Off is never an unapproved leave.
3. No roster cell: Employees ▸ Shift timings (Employee Shift tab), then the nearest Shift Config shift — as before.

Config ▸ `SHIFT_FROM_ROSTER` = No switches step 1 off. Note: the roster's Shifts tab has S1 04:00 – 13:00 and
S2 14:00 – 23:00, Shift Config has 4:00 – 14:00 and 13:00 – 23:00 — make them the same (Mismatches).

**Calendar** — the dashboard of everyone shows the month with holidays and birthdays (staff of HQ, GFP, Pandri,
Chanderi; an outlet login sees its own outlet's birthdays). The new **Holidays** tab in this sheet holds the 2026 list:
Republic Day 26/01, Holika Dahan 03/03, Holi 04/03, Independence Day 15/08, Raksha Bandhan 28/08, Gandhi Jayanti 02/10,
Diwali 08/11, Govardhan Puja 09/11, Bhai Duj 11/11. *Every Year* = Yes repeats a holiday on the same date each year,
until a holiday with the same name is added for that year. MIS / Directors add, change or remove holidays with
**+ Holiday** on the Calendar (changing a repeated one adds that year's date).

**New Config keys** (added by the upgrade): `MATCH_NAME_CHECK` Yes · `NAME_MATCH_MIN` 80 (%) · `SHIFT_FROM_ROSTER` Yes.

**Steps**
1. `clasp push` ▸ Deploy ▸ Manage deployments ▸ ✎ Edit ▸ **New version** ▸ Deploy.
2. Open the app once as MIS. The upgrade adds *Upload File* to Location Rules (Chanderi = *Chanderi*, the others =
   *HQ · GFP · Pandri*), the *Upload* column to Attendance Data, the Holidays tab and the Config keys.
3. GitHub ▸ the repository ▸ **Add file ▸ Upload files** ▸ the five files from `C:\AppScr\CG One Login\_deploy` ▸
   **Commit changes** (section D2a).
4. Upload the missing file of these days with its own box (Payroll ▸ **Upload attendance**):
   - **HQ · GFP · Pandri** file for 1, 11, 12, 14, 15 and 27 Oct 2026 (only the Chanderi file is there now);
   - **Chanderi** file for 17 – 26 Oct 2026 (only the HQ · GFP · Pandri file is there now).
   Uploading one file never removes the other file's rows any more.
5. Add **Pooja Patel** (HQ, HR Intern), **Bhumika Saytode**, **Love Kumar**, **Deepak Chandrakar** and **Nitesh Mandal**
   to the employee master if they work for us, and correct the Petpooja codes in the table above.
   Until then their punches are listed under *Not matched*.

**Backup of 2.9.1:** keep the previous zip `CG-One-Login-2.9.1-full.zip` (and `CG-One-Login-2.9.2-full.zip`).

## 0.C · What was new in 2.9.1 (fast server answers from its copy · Excel copy for HR Calling)

**What was slow in 2.9.0** (measured on the live site on 26 Oct 2026):
- The MIS dashboard reads about 20 spreadsheets (13 checklists, employee master, delegation, hiring, tickets …). Each one
  costs Google 3 reads, and Google allows **60 reads a minute** for one account (mis@). The fast server ran out of reads,
  waited up to 10 s and then passed the request to Apps Script, which took 9 – 78 s.
- The dashboard's Hiring part reads **HR CALLING RECORD (1).xlsx**, an Excel file in Drive. Apps Script converted it to a
  temporary Google Sheet on every refresh; the fast server cannot read Excel at all, so the whole dashboard went to Apps Script
  and stayed there for 15 minutes.
- Apps Script itself needs 3 – 4 s for even an empty request (Google's platform); only reads can avoid it.

**What 2.9.1 does**

| | 2.9.0 | 2.9.1 |
|---|---|---|
| A screen whose copy on the server is older than 2 minutes (up to 10) | waited for Google | answered at once from the copy; the copy is read again from Google straight after, in the background |
| Tab list of each spreadsheet | read again every minute | every 15 minutes (at once after the app adds a tab) |
| Google's per-minute limit reached | waited, then Apps Script | copies up to 30 minutes old are used; every server copy learns about the pause; with no copy at all → Apps Script **at once** |
| HR Calling Record (Excel) | converted on every refresh; the fast server could not read it | kept as a hidden tab **`XL <file id> FMS`** in the One Login sheet, listed on the new **Excel Copies** tab; copied again only when the Excel file changes (checked every 30 minutes by the trigger *refreshExcelCopies*) |
| A browser that had switched a screen to Apps Script | kept it for up to 15 minutes | forgets it after an update |

**Freshness now**
- A change made in the app shows at once, for everyone (unchanged).
- A row typed straight into a sheet shows within about **2 minutes** (`FAST_TTL` 120). If nobody opened that screen for a
  while, the first opening can show a copy up to 10 minutes old and reads Google straight after; the next opening is fresh.
  Refresh (↻) always reads Google.

**Steps**
1. `clasp push` ▸ Deploy ▸ Manage deployments ▸ ✎ Edit ▸ **New version** ▸ Deploy.
2. GitHub ▸ the repository ▸ **Add file ▸ Upload files** ▸ drag the five files from `C:\AppScr\CG One Login\_deploy`
   (`Web.zip`, `netlify.zip`, `netlify.toml`, `unpack.mjs`, `vercel.json`) ▸ **Commit changes** (section D2a). Netlify deploys
   by itself.
3. Open the dashboard once as MIS or HR. The first Hiring read makes the Excel copy (about 10 s, once); after that the
   dashboard is answered by the fast server.
4. Recommended: raise Google's limit (section B, last paragraph) to 300 reads a minute.
5. Check `https://<your Netlify link>/api`: `"ready": true`; `thisServer` shows the Google reads, the copies used and how
   often the limit was reached. Netlify ▸ Logs ▸ **Functions ▸ api** shows one line per request, e.g.
   `dash.load 420ms fast` or `chk.my 380ms apps-script:busy`.

**Backup of 2.9.0:** the previous zip `CG-One-Login-2.9.0-full.zip` (keep it); 2.8.0 is in `_backup`.

## 0.0 · Fast server (since 2.9.0; on Netlify until 2.9.3, on Vercel since 2.9.4 — see section 0) · Sheets API inside Apps Script

**The idea in one line:** screens that only *read* are now answered by a small server on Netlify that reads the
sheets straight through the Google Sheets API (read only) — Apps Script is not started for them. Everything that *saves* still
goes to Apps Script exactly as before (it holds the lock that keeps IDs from repeating).

| Request | Goes to | Speed |
|---|---|---|
| Opening a screen, lists, dashboards, reports on screen, Refresh | Netlify fast server | usually 0.2 – 0.8 s (was 2 – 6 s) |
| Save, approve, reject, upload, sign in / out, Excel / PDF download, file view | Apps Script (as before) | same as before, a little faster where *Fast Reads* helps |
| Anything the fast server cannot do, or if it is down / over its Google limit | Apps Script, automatically | same as before |

Answers are the same: the fast server runs the very same `.gs` code (copied into `netlify/fast/app.mjs` by the
build), only the sheet access is different. In the tests every read answer of the fast server was compared with
Apps Script (1,000+ requests over all test scripts): no difference.

**Freshness**
- A change made in the app shows at once — for the person who made it and for everyone else (Apps Script tells the
  fast server which tabs it changed).
- A row typed straight into a sheet shows within **2 minutes** (Netlify ▸ `FAST_TTL`, 120 since 2.9.1), or at once with Refresh (↻).

**Backup of 2.8.0:** `C:\AppScr\CG One Login\_backup\CG-One-Login-2.8.0-full.zip` (not pushed by clasp).

### A. Apps Script (every time)
1. `clasp push` from `C:\AppScr\CG One Login` (new file `Fast.gs`; `appsscript.json` now turns on the *Google Sheets
   API* service — Apps Script editor ▸ Services shows *Sheets*).
2. Deploy ▸ **Manage deployments** ▸ the same web app ▸ ✎ Edit ▸ Version: **New version** ▸ Deploy.
3. Open the app once (adds the settings *Fast Reads* = Yes and *Fast Server Account*, refreshes Read Me).
   *Fast Reads* = Yes: Apps Script itself reads the tabs a request needs **in parallel** through the Sheets API
   (learned per request type). No = one by one, as in 2.8.0.

### B. How the fast server signs in to Google (once) — pick one
The fast server needs its own read-only sign-in to Google Sheets. Two ways; both give the same speed.

**B1 · As mis@chaigovindam.com, read only (use this — it works even when key creation is blocked)**
1. console.cloud.google.com, signed in as mis@chaigovindam.com, project **CG One Login Fast** (or any project of yours).
   APIs & Services ▸ Enable APIs and services ▸ *Google Sheets API* ▸ **Enable** (skip if already on).
2. **Google Auth Platform** (APIs & Services ▸ OAuth consent screen) ▸ Get started:
   App name *CG One Login Fast*, support e-mail mis@chaigovindam.com ▸ Audience **Internal** ▸ contact e-mail ▸ agree ▸ Create.
   (Internal = only chaigovindam.com accounts; no Google review is needed.)
3. Google Auth Platform ▸ **Clients ▸ Create client** ▸ Application type **Web application** ▸ name *One Login fast server* ▸
   Authorised redirect URIs ▸ Add URI: `https://developers.google.com/oauthplayground` ▸ Create.
   Copy the **Client ID** and the **Client secret**.
4. Open **developers.google.com/oauthplayground** ▸ ⚙ (top right) ▸ tick **Use your own OAuth credentials** ▸ paste the
   Client ID and Client secret ▸ Close.
5. Left side, box *Input your own scopes*: `https://www.googleapis.com/auth/spreadsheets.readonly` ▸ **Authorize APIs** ▸
   sign in as **mis@chaigovindam.com** ▸ Allow.
6. Step 2 ▸ **Exchange authorization code for tokens** ▸ copy the **Refresh token** (starts with `1//`).
   Do not press *Revoke*.
7. Nothing to share: the fast server reads exactly what mis@ can open, and only reads.
   The sign-in stays valid until mis@ removes it (myaccount.google.com ▸ Security ▸ Third-party connections) or it is
   not used for 6 months. If it ever stops, the app keeps working through Apps Script; repeat steps 4–6.

**B2 · A service account key (only if your organisation allows keys)**
1. IAM & Admin ▸ Service accounts ▸ Create service account ▸ *one-login-fast* ▸ no role ▸ Done ▸ Keys ▸ Add key ▸ JSON.
   "Service account key creation is disabled" = blocked by the organisation policy `iam.disableServiceAccountKeyCreation`
   → use B1.
2. One Login sheet ▸ CG One Login ▸ **Fast server (Netlify): share the sheets with a service account** ▸ paste the
   service account e-mail (`client_email`, ends in `.iam.gserviceaccount.com`). It shares every sheet of the app as Viewer
   and lists what it shared.

Recommended for both: console.cloud.google.com (the same project) ▸ **IAM & Admin ▸ Quotas & System Limits** ▸ filter
*Google Sheets API* ▸ tick **Read requests per minute per user** ▸ **Edit** ▸ new value **300** ▸ Submit. (Default 60 —
one dashboard can use most of it. When it is used up, the fast server answers from its copies for 30 seconds; with no copy
it sends the request to Apps Script — slower, never wrong.)

### C. The One Login settings for Netlify (once)
One Login sheet ▸ **CG One Login ▸ Fast server (Netlify): show its settings** ▸ copy **CG_FAST_CONFIG**
(the B2 menu shows it too).

### D. Netlify (once)
1. Netlify ▸ the site ▸ Site configuration ▸ **Environment variables** ▸ Add (scope: all, or at least Functions):

   | Key | B1 (as mis@) | B2 (service account) |
   |---|---|---|
   | `CG_FAST_CONFIG` | from step C | from step C |
   | `GOOGLE_CLIENT_ID` | Client ID (B1 step 3) | — |
   | `GOOGLE_CLIENT_SECRET` | Client secret (B1 step 3) | — |
   | `GOOGLE_REFRESH_TOKEN` | Refresh token (B1 step 6) | — |
   | `GOOGLE_SA_EMAIL` | — | the service account e-mail |
   | `GOOGLE_SA_KEY` | — | `private_key` of the `.json` (from `-----BEGIN PRIVATE KEY-----` to `-----END PRIVATE KEY-----\n`) |

2. The fast server is a Netlify **Function**. Dragging the `web` folder onto Netlify leaves it out, so deploy in one of
   these two ways. `netlify.toml` tells Netlify: publish `web`, function `netlify/functions/api.mjs` at **/api**.

   **D2a · From the browser (GitHub), no command line**

   Every version comes with a folder **`C:\AppScr\CG One Login\_deploy`** holding the five files the repository needs:

   | File | What it is |
   |---|---|
   | `Web.zip` | the screens (the `web` folder, zipped) |
   | `netlify.zip` | the fast server (the `netlify` folder, zipped) |
   | `netlify.toml` | tells Netlify: unpack the two zips, publish `web`, server `netlify/functions` at **/api** |
   | `unpack.mjs` | the small step that unpacks the zips during the deploy |
   | `vercel.json` | the same for Vercel (and passes `/api` on to the Netlify fast server) |

   Once:
   1. github.com ▸ a personal account (not an organisation) ▸ **New repository** ▸ `cg-one-login-web` ▸ **Private** ▸ Create.
   2. **Add file ▸ Upload files** ▸ drag the **five files** from `_deploy` onto the page ▸ **Commit changes**.
   3. Netlify ▸ the One Login site ▸ **Project configuration ▸ Developer settings ▸ Continuous deployment ▸ Repository ▸
      Link repository** ▸ GitHub ▸ `cg-one-login-web`. The build settings come from `netlify.toml` (leave the boxes as they are).
   4. Netlify ▸ **Deploys** ▸ wait for **Published**. The deploy log shows `Web.zip → web/ (22 files)`,
      `netlify.zip → netlify/ (8 files)`, `One Login web version …` and `api` under Functions.

   Every later version (after `clasp push` + New version): GitHub ▸ the repository ▸ **Add file ▸ Upload files** ▸ drag the
   files from `_deploy` (at least `Web.zip` and `netlify.zip`) ▸ **Commit changes**. Netlify deploys by itself. GitHub replaces
   files that have the same name, so the old zips do not need deleting first.
   - GitHub never unpacks a zip; the deploy does (`unpack.mjs`). The zips win over `web` / `netlify` folders in the repository.
   - A commit that says **0 files changed** uploaded the same files again — nothing new was deployed.
   - If the deploy fails, its log says why in one line starting with **One Login build stopped:**.
   - Netlify ▸ Deploys shows **Auto publishing is locked** (after a deploy was published by hand) ▸ **Start auto publishing**.
   - Do not drag the `web` folder onto Netlify's Deploys page any more: that publishes the screens without the fast server.

   **Vercel (optional second link):** Vercel ▸ Add New ▸ Project ▸ import `cg-one-login-web` ▸ Framework *Other*, Root Directory
   empty ▸ Deploy. `vercel.json` unpacks the zips the same way and sends `/api` to the Netlify fast server. Vercel's free
   *Hobby* plan is for personal, non-commercial use, so keep Netlify as the main link.

   **D2b · From the command line**
   ```
   cd "C:\AppScr\CG One Login"
   npx netlify-cli login          (first time: the browser asks to authorise)
   npx netlify-cli link           (first time: pick the existing One Login site)
   npx netlify-cli deploy --prod
   ```
   Every later version: only `npx netlify-cli deploy --prod`.
   If npm ends with `spawnSync ... esbuild.exe UNKNOWN`, Windows (Smart App Control, the antivirus or the company's
   security policy) does not let `esbuild.exe` run. Installing again does not help; use D2a.
3. Check: open `https://<your Netlify link>/api` in the browser. `"ready": true` = everything is set. Otherwise the line
   that is not `ok` says what is missing (config = CG_FAST_CONFIG, google = the sign-in values, sheet = the account
   cannot open the One Login sheet). Then open the Netlify link, sign in, open a few screens.
   Netlify ▸ Logs ▸ **Functions ▸ api** shows the calls.
   The browser uses `/api` by itself on the Netlify link; `config.js` stays as it is (only the /exec link).

### E. Switches
| To | Do |
|---|---|
| Send everything to Apps Script (fast server off) | Netlify env `FAST_OFF` = `1`, then deploy again |
| Turn it off in the browser only | `web/config.js`: add `window.CG_FAST = 'off';` |
| Apps Script reads one by one again | Settings ▸ Fast Reads = No |
| Typed-in rows faster / slower | Netlify env `FAST_TTL` = seconds (default 120, at least 5) |
| How old a copy may be when it answers at once (then read again) | Netlify env `FAST_STALE` = seconds (default 600; `0` = always wait for Google) |
| Tab list read again | Netlify env `FAST_META_TTL` = seconds (default 900) |

### F. Costs and limits — read before going live
- **Netlify credits:** functions use the monthly credits (time the function runs + requests + data sent). The **Free plan
  has 300 credits a month and pauses every project of the account when they run out** — the whole One Login link would
  stop. For ~100 daily users expect roughly 500 – 700 credits a month, so use **Personal (1,000)** or Pro, and look at
  Netlify ▸ Billing ▸ Usage after two or three days.
- **Google Sheets API:** free. Limit: reads per minute (see B 5). Each screen needs one read per spreadsheet only when
  its copy is older than 60 s or was changed; the copy is shared by all of Netlify's servers.
- Saves, Excel / PDF downloads, file uploads and sign-in still run on Apps Script and keep their speed.

**Also in 2.9.0**
- Payroll ▸ Unapproved leave: the cards *2× daily wage* and *Fixed amount* show only the number of people (the total
  of everybody's unapproved days is not shown any more). What they mean: *2× daily wage* = the month if every
  unapproved day of everyone were charged 2 days' wage (monthly salary ÷ 30 × 2); *Fixed amount* = the same at ₹200 a
  day; *Charged* = what is really charged with each person's own choice (2× wage, fixed or waived) — only this one goes
  into salary.
- Director dashboard: delegated task counts follow a task change at once (they could lag up to 2 minutes).
- FMS to-do lists no longer convert Excel FMS files they skip anyway (faster dashboard on Apps Script).

## 0.1 · What was new in 2.8.0 (penalty waiver and exceptions · employee codes fixed · Item Master for the GFP store · dispatch with Item Not Dispatch)

**To update**
1. `clasp push` from `C:\AppScr\CG One Login` (new file `Store.gs`).
2. Deploy ▸ **Manage deployments** ▸ the same web app ▸ ✎ Edit ▸ Version: **New version** ▸ Deploy.
3. Open the app once (or CG One Login ▸ Setup). That first call adds the **Penalty Exceptions** tab to the Attendance
   workbook, the **Item Requests** tab and three columns on **Stock Register** (GRN No, Item Code, Source) here, the
   sections *Item Master* and *Item Active / Inactive — approve*, the role **Store Executive**, and moves
   K. Prateek Iyengar (Store Executive, on Staff) to that role.
4. Upload the new `web` folder to Netlify / Vercel.
5. The account that runs One Login must be able to **edit** Item_Master__v3 and the Item Not Dispatch sheet.

**Penalties — waive several, exceptions, edit the amount**
- **Payroll ▸ Penalty applied** (or *Penalty in last upload*, or any From – To): every penalty has a tick box (and *Select
  all*). Tick → type an amount and **Set amount**, or **Waive**, with a remark; **Automatic amount** puts them back.
  Waived lines stay in the list at ₹0 marked *waived*; the card *Waived* counts them. One penalty is still changed by
  opening it (Amount, Remark, Waive, Save).
- **Payroll ▸ Penalty exceptions** (new card): Employee, Penalty (*Every automatic penalty* or one type — late punch in,
  unapproved leave, left early, missing punch, short hours, half day, extra break), From / To (optional) and Reason.
  No automatic penalty of that type is charged on those dates; the lines show at ₹0 marked *exception*. Penalties given
  by hand are not affected. Remove = charged again. Kept in Attendance workbook ▸ Penalty Exceptions.
- **Payroll ▸ Unapproved leave**: *Charged at* now has **Waived** next to 2× daily wage and Fixed amount (whole month for
  that person; tick several and Waive).

**Penalties under the old rules**
- Penalties are never stored: every screen, report and Salary preparation works them out again from the punches with the
  rules in force. The rule changes therefore already apply to every past day — nothing had to be removed by hand.
  Checked on the live data (1 Sep – 22 Oct 2026, the old rules against the rules in force):
  - **Chanderi**: no penalty at all while Apply Penalty = No.
  - **Approved leave**: a day with approved leave is never charged (Rudraksh Sahu, 21 Oct).
  - **Own timings** from the Pandri roster: false lates are gone (Sameer Singh Chouhan, Pravina, Pooja Pal, Suag Harpal); people
    on a 9 AM / 11 AM / 5 PM timing are now charged when they come after their own time + 10 minutes (Arun Gendre,
    Ashwani Verma, Bhuneshwari Vishwakarma, Dageshwari, Gauri Sunani, Kajal Bairagi).
  - October: ₹80,904 less in total; 25 people pay less, 6 pay more (the late arrivals against their own timing).
- Anything still to be forgiven: Payroll ▸ Penalty (pick the upload date or a range) ▸ tick ▸ Waive, or a Penalty
  exception for the person.
- The **SEP penalty sheet 2026** in the Salary Master was made by hand with the old rules; Payroll ▸ Penalty with 1 – 30 Sep
  shows September under the rules in force if a correction is wanted.

**Duplicate Employee Ids — cause and fix**
- From 28 Sep 2026 the Chanderi joining forms were filled with the e-mail **ABCD@Gmail.com**. The form treated a matching
  e-mail as "this person already has a code" and gave each new joiner **CG-00373**, the code of the first person with that
  e-mail. Eight joiners got it; six were renumbered by hand, Tikeshwari Sahu and Doman Dhurve still had it.
- Fixed: a code is reused only for the **same person** (same Aadhar number, or same mobile and name), checked in the
  master and in Under Review. Approving a joining whose code already belongs to someone else gives the next free code,
  renames the documents folder and says so — the old approval wrote over the other person's row.
- Live master, 24 Oct 2026: **Tikeshwari Sahu → CG-00383**, **Doman Dhurve → CG-00384**; Hemlata Baghel keeps CG-00373.
  Their HR document folders (and those of the six renumbered by hand) carry the current codes; Move Log has a
  CODE_CHANGED row. Enrol the two in Petpooja with the new codes.

**Item Master (GFP store) — sidebar ▸ Stock & Orders ▸ Item Master**
- For the **Store Executive** (role *Store Executive*: Item Master + Orders ▸ Dispatch), MIS and the Directors.
- **GRN**: GRN date, Supplier (list from the Item Master), Bill number and photo, Remarks, then *Add an item* — any item of
  the Item Master by name or code, Active or not — with *Qty received* and *Rate* (Cost Price filled in). **Save GRN** writes
  one Stock Register row per item under GFP with GRN No **SGRN<yyMM><nnnn>**; the GRN shows below (last 30 days) and in
  the Directors' **GRN Summary ▸ GFP**. No purchase order is needed.
- **Items**: Status / Category / Search; open an item to change any column except Item Code, Status and the Profit %
  formula — saved in the Item Master at once and written to its Activity Log (*Name (One Login)*).
- **Active / Inactive**: on the item, pick *Change to* and the reason ▸ **Send for approval**. It waits in **Approvals ▸
  Item Active / Inactive** (MIS and the Directors; also on their dashboard Approvals count) and in **Item Master ▸ Active /
  Inactive requests** (Pending · Approved · Rejected, with who decided and the remarks). Approve changes the Status cell;
  Reject needs a reason. MIS and the Directors change a status straight away.
- The outlets' ordering reads the Orders workbook's ItemMaster tab, which imports only the **Active** rows of the Item
  Master — an approved item is orderable as soon as the import refreshes (Refresh on New Order).

**Dispatch with Item Not Dispatch — Orders ▸ Dispatch**
- Every line has *Dispatch Qty*; a quantity below the ordered one opens **Reason** (the sheet's Reason Master: Out of
  Stock, Short Supply (Partial), Vendor Delay …) and **Remark**. **Save Dispatch** writes the dispatched quantity to Orders
  and the line to the **Item Not Dispatch** sheet (Ordered, Not Dispatched, Dispatched Qty, Reason, Remark, Recorded By) —
  no second entry. Opening the order again shows the reason; dispatching it in full later removes the line; ND Audit Log
  keeps ADD / UPDATE / DELETE.

## 0.2 · What was new in 2.7.0 (unapproved leave at 2× daily wage · own shift timings · change tracking · birthdays · Executive Assistant)

**To update**
1. `clasp push` from `C:\AppScr\CG One Login` (the folder already holds 2.7.0).
2. Deploy ▸ **Manage deployments** ▸ the same web app ▸ ✎ Edit ▸ Version: **New version** ▸ Deploy.
3. Open the app once (or CG One Login ▸ Setup). That first call adds the **Unapproved Leave Basis** tab and the
   `UNAPPROVED_LEAVE_WAGE_TIMES` row (2) to the Attendance workbook, adds the **Executive Assistant** role and moves
   Mamta Chaudhary to it (Outlet Access = ALL).
4. Upload the new `web` folder to Netlify / Vercel. Your `config.js` in the laptop folder was left as it was.

**Unapproved leave — 2× daily wage, with ₹200 kept beside it**
- Every day of unapproved leave is worked out two ways: **2× the daily wage** (Current Salary in the employee master
  ÷ 30 × 2 — a daily wage of ₹400 gives ₹800) and the **fixed ₹200** of the Penalty Rules.
- The screens show the 2× daily wage. **Payroll ▸ Unapproved leave** (card on Payroll, also under Attendance ▸ More):
  Month, Search; cards *2× daily wage* (total), *Fixed amount* (total at ₹200 a day) and *Charged*; one row per
  person with the days and dates, both amounts, *Charged at* and the amount charged.
- **HR, MIS and the Directors** choose per person *2× daily wage* or *Fixed amount*, or tick several and choose once.
  The choice is kept in the Attendance workbook ▸ `Unapproved Leave Basis` (Month, Employee ID, Employee Name, Basis,
  Updated By, Updated At); no row = 2× daily wage. Penalties, reports and Salary preparation use the chosen amount.
- No Current Salary in the master → the fixed amount is used and the row says *No salary found* (today Vashu Verma
  and Doman Dhurve).
- The multiple can be changed in Attendance ▸ Rules ▸ General ▸ `UNAPPROVED_LEAVE_WAGE_TIMES`.
- October 2026 with the punches up to 22 Oct: 245 days for 56 people — ₹2,37,871 at 2× daily wage, ₹49,000 at ₹200.

**People on leave who were counted as unapproved — what the Loan & Advance sheet shows**
- October's approved leaves are matched correctly.
- **26 September leaves have Final Status = REJECTED** with no remark: 24 by Namit Goyal (15 Oct 2026) and 2 by
  Super Admin. 17 of them had been approved at the first step (14 by HR, 3 by Manisha Aditya) — e.g. Sangeeta
  Mahilang 9–11 Sep. These days are unapproved because the sheet says rejected.
  If they were meant to be approved: **Approvals ▸ Tracking ▸ Month = September 2026 ▸ Leave Tracking ▸ the leave ▸
  Change to approved** (reason required). HR and anyone with *Leave — final decision* can do it; the sheet keeps
  "Changed from REJECTED to APPROVED by <name> on <date>: <reason>" in Remarks and attendance follows at once.
- Kabir Vaishya's leave was filed under his old ID **CG-00344** (he is HQ-00025 now) — fixed: a leave whose ID is not
  in the master is matched by name.
- A day with approved (half-day) leave was still charged *late punch in* (Rudraksh Sahu, 21 Oct) — fixed: a day with
  approved leave is never charged.
- The others on the list (Shushant Dhruw, Rahul Kumar, Vikram Singh, Manhar Sahu, Humanshu Sahu …) have no leave
  application for those days.
- Tracking now has a **Month** picker (this month and the five before it).

**Own shift timings (Payroll ▸ Rules ▸ Employee shift)**
- *Set a timing*: pick the employee from the list of every active employee (grouped by location), then **Punch in** and
  **Punch out** as hour : minute AM / PM, Notes, **Save timing**. *Own timings* lists everyone with a timing —
  Change or Remove. HR, MIS and the Directors can edit; Employees ▸ Shift timings uses the same AM / PM pickers.
- Punching in after the timing + the grace (10 min) is a late punch in and is charged like any other late punch.
- From the **Pandri roster of 23 Oct 2026**, everyone outside Shift 1 (04:00 AM – 02:00 PM) and Shift 2
  (01:00 PM – 11:00 PM) was added:

| Employee | Punch in – out |
|---|---|
| Arun Gendre CG-00002 · Ashwani Verma CG-00004 · Kajal Bairagi CG-00005 · Dageshwari CG-00330 | 09:00 AM – 08:00 PM |
| Sameer Singh Chouhan CG-00016 · Pravina CG-00315 · Pooja Pal CG-00345 | 05:00 AM – 03:00 PM |
| Suag Harpal CG-00348 | 06:00 AM – 04:00 PM |
| Bhuneshwari Vishwakarma CG-00017 | 11:00 AM – 09:00 PM |
| Gauri Sunani CG-00313 | 05:00 PM – 11:00 PM |

  Four roster IDs differ from the master and were saved under the master ID: CG-0300 (Gauri), CG-0317 (Praveena,
  SP Chai), CG-0329 (Dageshwari), CG-0000 (Pooja Pal).

**Employee changes and new joinings — details and tracking**
- Employees ▸ **Changes & tracking** (HR Executive, MIS, Directors) and **My changes & tracking** (HR Assistant /
  Intern, e.g. Manisha): every change with its steps — **Sent → HR Executive → MIS / Director → Saved** — each
  showing done, pending ("Pending with HR Executive") or waiting, with who and when.
- Each changed field is shown **before and after**; a new photo or document opens with **View**.
- Filter By: Waiting for me · Pending · Decided (45 days) · Sent by me · All; Search. Approve / Reject from the same row.

**Payroll — Birthdays**: today's birthdays and the rest of this week (to Sunday) from Date of Birth in the employee
master, with the age they turn and the phone number.

**Issues**: Filter By is now **Pending** · **Overdue** · Done · All issues · Assigned to me · Raised by me (no combined
"Pending and overdue"). The note about older overdue issues is gone; instead *Raised from* opens on the day the oldest
open issue was raised, so every open issue is in the list.

**Executive Assistant = the Directors' screens**
- New role **Executive Assistant**: the Directors' dashboard and sidebar — HR Dashboard (with tracking), DSR Daily
  Sales, GRN Summary, Expense Records, Cash Management, Daily Food Closing, Orders Summary, FMS Summary — plus
  Checklist (when she has one) and My Delegated Tasks. The Directors' approval steps are not given to her.
- To hide a sidebar item from her: **User Management ▸ Mamta Chaudhary ▸ Sections** ▸ that section = **No** ▸ Save
  (Director screens are listed as HR Dashboard, DSR Daily Sales, GRN Summary, Expense Records, Cash Management, Daily
  Food Closing, Orders Summary, FMS Summary).

**Accommodation** shows as *Soon* in the sidebar of HR and the Directors.

**Notes removed from the screens**: the subtitles under page titles and the explanatory notes (Issues, Payroll, Employees,
Approvals …). The explanations are on the Read Me tab.

## 0.3 · What was new in 2.6.1 (delegated task Done fixed · new HR Checklist)

Deploy on the same deployment (Manage deployments ▸ Edit ▸ New version) and upload the new `web` folder.

**Fixed: "The data you entered in cell K… violates the data validation rules" when a doer tapped Done.**
The Status column of **Delegated Tasks** only allowed Pending, In Progress, Done, Verified, Reopened and Cancelled, so the
new status *Pending Approval* (shown as *Pending with EA*) was refused. The list now includes *Pending Approval* — it was
changed in the live sheet on 21 Oct 2026, the first call after this deployment applies it again, and a Done that still
meets the old list fixes the list and saves once more.

**HR Checklist — the old list is gone (live sheet, 21 Oct 2026).**
- Task List = only the new 30 tasks: 17 daily, 7 weekly, 6 monthly.

| Doer | Daily | Weekly (Monday) | Monthly (1st) |
|---|---|---|---|
| Aryan Tripathi | Check attendance; identify reasons for absences and take corrective measures · Perform regular office tasks · Check second-shift attendance · CV filtering and candidate calling · Prepare calling and interview reports · Upload the penalty sheet · Prepare leave reports · Update the daily roster | Prepare calling and interview reports · Prepare employee training reports · Prepare indiscipline reports · Update and maintain the roster | Prepare calling and interview reports · Update the uniform sheet |
| Manisha Aditya | CV filtering and candidate calling · Prepare calling and interview reports · Prepare onboarding and requirements reports · Update the penalty sheet · Report the number of selections and offers given · Prepare loan, advance, and leave reports · Perform regular office tasks | Prepare offer, joining, and filing reports · Prepare calling and interview reports · Prepare briefing and induction reports | Prepare calling and interview reports · Prepare onboarding and requirements reports · Prepare the salary sheet · Handle PF/ESIC-related tasks |
| Ajay Gupta | CV filtering · Prepare requirements reports | — | — |

- Times are placeholders until HR gives the real ones (Task List column E, the `time(h, m, 0)` part): daily 10:30 to
  18:00 as before, weekly Monday 6 PM, monthly the 1st at 6 PM.
- Master: this week's open rows of the old list (HRC-1010 … 1017 and 1019 … 1030) were removed; the one done on
  20 Oct (HRC-1018) and every earlier row stay, so past scores do not change. Added: today's 17 daily rows, this
  week's 7 weekly rows and October's 6 monthly rows (HRC-1031 … 1060). From tomorrow the sheet's own trigger writes
  the rows from the new Task List.
- One Login shows the new tasks within a few minutes, or at once with Refresh (↻). Checklist Doers already links
  Ajay Gupta → USR-0055, Aryan Tripathi → USR-0063 and Manisha Aditya → USR-0062.

## 0.4 · What was new in 2.6.0 (pending work on the dashboard · EA approves delegated tasks · HR checklist · bulk close issues · fast web copy)

**To update**
1. `clasp push`. `.claspignore` now also leaves out the `web` folder — it must never be pushed to Apps Script.
2. Deploy ▸ **Manage deployments** ▸ the web app you already have ▸ ✎ Edit ▸ Version: **New version** ▸ Deploy.
   Keep the same deployment, so the `/exec` link does not change (the fast web copy uses it).
3. Open the app once. That first call adds the new columns to **Delegated Tasks** (Done Link, Approved By, Approved At,
   Doer Employee ID, Old Task ID), copies the old Delegation Sheet NEW tasks once and refreshes **Checklist Doers**
   (Aryan Tripathi and Manisha Aditya on the HR Checklist). Or run CG One Login ▸ Setup.
4. Upload the `web` folder to Netlify or Vercel (see *Fast web copy* below).

**Dashboard — the pending work is shown straight away**
- Cards: *My pending tasks* (checklist · delegated · FMS), *Approvals* (approvers) or *My requests*, *Issues*.
- Below the cards, each list has its own **Done** button — nobody has to open *My Pending Tasks* first:
  - **Checklist** — today's, this week's and this month's tasks. Done opens the same box as Checklist (remark, photo).
  - **Delegated tasks** — Done opens *Link (optional)*, *Remark (optional)* and *File (optional)*. The task then shows
    **Pending with EA**; it is Done only when the EA approves it.
  - **FMS steps** — the current step of an FMS row whose **WHO** is the person's designation, department or name, planned
    in the last 30 days (Settings ▸ **FMS My Steps Days**). Done writes *Status = DONE* in that FMS sheet, the same as
    FMS Summary.
  - **Delegated tasks to approve** (the EA) — Approve, or Send back with what is missing.
- HR logins (Recruitment) also get **Hiring · <month>**: *No. of calling* (HR Calling Record rows this month) ·
  *Interview scheduled* (calling rows this month with an interview status) · *Offer letters given* (Hiring FMS, this
  month) · *Onboarding* (this month) · *Joining* (employee master ▸ Date Of Joining in this month). Each card opens its
  list in Recruitment; the back arrow returns to the dashboard.

**Delegated tasks are kept in One Login**
- The old **Delegation Sheet NEW is not read any more**. Copied once: every *Pending* task and every task completed in the
  last 90 days (Settings ▸ Delegation Done Days); *Week Shifted* rows are skipped. Each copy keeps its old number in
  *Old Task ID*. Settings ▸ Delegation Sheet ID can stay; nothing reads it.
- Doers come from the **employee master** — every active employee with a login — not the Doer List.
- Steps: **Pending** → the doer taps Done → **Pending with EA** → the EA approves → **Done**.
  *Send back* → **Reopened** (Revisions + 1, the EA's note on the task, the doer sees *Sent back*).
- Who approves: Settings ▸ **Delegation Approvers** (designations, default *Executive Assistant (EA)* — Mamta Chaudhary).
  Directors and MIS may approve too. Nobody approves his own task.
- The EA approves from the dashboard or **My Delegated Tasks ▸ To approve** (tick several ▸ Approve). Tabs there:
  To approve · Open · Pending with EA · Done · All.

**Issues**
- **Raised from – To**: opens on this week (Monday to today) with *Filter By = Pending and overdue*.
- Overdue issues raised before the From date are counted above the list — *Show from <date>* widens the range.
- A **checkbox** in front of every issue you may close, and *Select all*. **Mark done** closes all ticked issues with one
  note (Tracker rows get *Ticket Status = Close* and the Actual Date).

**Back buttons**
- Every screen (Approvals, Issues, Checklist, Recruitment, Payroll, Reports …) has a **←** next to its title. Inside a
  section it first closes the open card or list, then goes to the screen you came from. Only one back arrow shows at a time.

**HR Checklist (changed in the live sheet on 21 Oct 2026)**
- Doer List: **Aryan Tripathi** (aryn12345664@gmail.com) and **Manisha Aditya** (miliaditya123@gmail.com) added; Ajay Gupta
  stays (hr@chaigovindam.com).
- Task List: 30 rows, the regular format (Task, Doer Name, Department, Frequency D / W / M, Day/Date formula, Status *Sent*).
  The times below are mine — change column E if a task is due at another time.

| Doer | Daily | Weekly (Monday 6 PM) | Monthly (1st, 6 PM) |
|---|---|---|---|
| Aryan Tripathi | Check Attendance, If Absent Find The Reasons 10:30 · Penalty Sheet Upload 12:00 · Do Regular Office Tasks 13:00 · Check Attendance (2nd Shift) 14:00 · Leave Reports 16:00 · CV Filter, Candidate Calling 17:00 · Calling & Interview Report 17:00 · Update Daily Roster 18:00 | Calling & Interview Report · Employee Training Reports · Indiscipline Reports · Roster | Calling & Interview Report · Uniform Sheet Update |
| Manisha Aditya | CV Filter, Candidate Calling 11:00 · Penalty Sheet Update 12:30 · Do Regular Office Tasks 13:00 · Loan/Advance/Leave Reports 15:00 · Onboarding/Requirement Report 16:00 · Calling & Interview Report 17:00 · No. of Selection/Offer Given 17:30 | Offer/Joining/Filing Report · Calling & Interview Report · Briefing/Induction Reports | Calling & Interview Report · Onboarding/Requirement Report · Salary Sheet · PF/ESIC |
| Ajay Gupta | CV Filter 11:00 · Requirements Reports 18:00 | — | — |

- Today's daily rows (HRC-1025 … 1030) and this week's weekly rows (HRC-1010 … 1012) were moved from Ajay Gupta to Aryan
  Tripathi. The new rows (Manisha's, Ajay's two, Aryan's new ones) are written by the HR Checklist's own daily trigger
  from its next run. Each person then sees only his own tasks in One Login, like every other checklist doer.

### Fast web copy (Netlify or Vercel)

The `web` folder is the whole app front end: `index.html` (sign-in, shell, dashboard and checklist), `b/` (every other
screen), `config.js` (the Apps Script link), `sw.js` (keeps the app on the phone), `manifest.webmanifest` and icons
(*Add to Home screen* opens it like an app), `_headers` (Netlify) and `vercel.json` (Vercel).

1. **config.js** holds the `/exec` link in the plain form `https://script.google.com/macros/s/<id>/exec`. It is filled
   with the link from the *Credentials For Master Web App* e-mail of 13 Oct 2026. Check it: CG One Login ▸ **Show the web
   app link** now also prints the exact link for config.js. If it differs, change that one line.
2. **Netlify**: app.netlify.com ▸ Add new site ▸ **Deploy manually** ▸ drag the `web` folder in. Later versions: the site ▸
   Deploys ▸ drag the new `web` folder onto the page. **From 2.9.0** deploy through GitHub or with
   `npx netlify-cli deploy --prod` (section 0.0 ▸ D) — dragging the folder leaves out the fast server.
   **Vercel**: in a terminal, `cd web` then `npx vercel --prod` (first time: log in and accept the defaults).
3. Optional: Settings ▸ **Web App Link** = the Netlify / Vercel link. E-mails, *Copy link* and the joining-form link then
   use the fast copy (`?page=join` is passed on to Apps Script).
4. After every new version, upload the new `web` folder too (or rebuild it: `node _extras/build-web.js`). If the web copy
   is older than the server, MIS and the admins get a notice after sign-in.

What gets faster: opening the app — there is no Google page around it and no page built by the server, so the sign-in
screen and the last copy of the dashboard show in well under a second; screens come from the CDN and stay on the phone.
What stays the same: every save and every refresh still runs in Apps Script on Google Sheets (about 1–3 seconds). The
copy kept on each device hides most of that wait, but it cannot be removed while the data lives in Sheets.
**From 2.9.0** the reads and refreshes run on the Netlify fast server (section 0) — only saves stay at 1–3 seconds.

## 0.5 · What was new in 2.5.5 (Directors approve at every step · all reimbursements for the Operations Manager)

Deploy only. No sheet change is needed.

**Directors (Namit Sir, Vivek Sir) can approve at every step.**
- Advance: *Pending with Outlet Incharge*, *Pending with HR*, *Pending with Director*, *Pending with Operations Manager*
  (mark Paid) and *Rejected by Director* (send again / close). Leave: the Outlet Incharge step and the final decision.
  Reimbursement, Employee detail changes and New joinings: every one that is pending.
- A Director's decision is written at that step only, under his name — at the Outlet Incharge step the request then goes
  to HR, at the HR step to the Director or to payment, and so on — so every step stays visible in Tracking.
- **Waiting for me** shows only what reached the Director's own step through the earlier approvals: *Pending with
  Director* (advance) and *Pending with MIS / Director* (employee changes, new joinings). The number on each card and the
  badge on Approvals is that number. Leave and Reimbursement have no Director step, so they have no *Waiting for me*
  for a Director — use *All pending*.

**Operations Manager (Sandeep Rajput).**
- Reimbursement: he now sees and approves the reimbursements of **every location** — HQ, GFP, Pandri, Chanderi — in
  place of the Accountant (Location filter in the list). His own reimbursement is shown, marked *Your own request —
  someone else approves it*. Reimbursement Tracking shows every location for him too.
- Leave and advance stay with his outlets (Pandri and Chanderi). Fixed: a login with more than one outlet saw only the
  **home outlet's** leave and advance requests in Approvals (Sandeep saw Pandri but not Chanderi) — now both.
- Advance payment (Paid) stays with Pandri and Chanderi.

## 0.6 · What was new in 2.5.4 (HQ and GFP penalties · Operations Manager approvals)

Deploy only. The first time anyone opens the app after the deployment, the Attendance workbook is updated by itself
(or run CG One Login ▸ Setup).

**Why HQ and GFP had no penalty.** In the Attendance workbook, HQ and GFP had *Apply Penalty = Yes* in Location Rules,
but **Penalty Rules had no row for HQ or GFP** and **Shift Config had no shift for them**. With no rule there is nothing
to charge, and with no shift time nobody can be "late". So every HQ and GFP day was worked out with ₹0.

**What 2.5.4 adds (once, only where nothing is set yet):**
- **Penalty Rules** — Pandri's rules copied for HQ (P201–P213, M201–M204) and GFP (P301–P313, M301–M304): late punch in
  ₹100 (after 10 minutes of grace), unapproved leave ₹200, the by-hand ones (Not In Uniform, Not Groomed, Misbehaviour
  ₹100, Unapproved Leave ₹200), and the others at ₹0 like Pandri.
- New column **Start Date** in Penalty Rules: the first day a rule is charged. HQ and GFP rules start **1 Oct 2026**, so
  October is charged up to today and September stays as it was. Blank = always (Pandri and Chanderi).
- **Shift Config** — HQ and GFP: one shift, **9:00 AM – 6:00 PM**, grace 10 minutes.
- New column **Week Off** in Location Rules: HQ and GFP = **Sunday**. A Sunday with no punch there is a week off, not an
  unapproved leave. Pandri and Chanderi keep using the roster (WO).
- Penalties are worked out every time a screen or report is opened, so nothing has to be re-uploaded: October's HQ and
  GFP penalties appear in Payroll ▸ Penalty, the Attendance report and Salary Preparation as soon as the rules are in.
- Someone at HQ / GFP with a different timing (for example 7:30 AM or 9:30 AM): Employees ▸ Shift timings ▸ own start /
  end. A day to forgive: Payroll ▸ Penalty ▸ change or waive the amount.
- Penalty ▸ Rules shows a **Charged from** column; the by-hand list shows each type once.
- Chanderi's shift times were stored as dates with a rounding error (2:00 PM was read as 1:59 PM); they are now plain
  times 4:00–14:00 and 13:00–23:00 (fixed directly in the live sheet).

**Operations Manager (Sandeep Rajput — Outlet Incharge of Pandri + Chanderi).**
- Leave and advance of Pandri and Chanderi: he approves at the **Outlet Incharge** step for both outlets (HR still gives
  the final leave decision; the Director still approves advances above the limit).
- Advance payment and reimbursement of Pandri and Chanderi: he does them **in place of the Accountant** — marks
  advances *Paid* and approves / rejects reimbursements (Access ▸ *Advance — Payment* and *Reimbursement — approve* = Yes;
  *Reimbursement — approve* set back to Yes in the live sheet).
- He sees only Pandri and Chanderi there — never HQ, GFP or another outlet — and never his own request (it goes to the
  Accountant / HR). He can open the bills of his outlets only. Reimbursement Tracking now shows his outlets too.
- The Accountant and HR still see every location, as before.

## 0.7 · What was new in 2.5.3 (plain words in Approvals)

Deploy only.

- Every request in Approvals now says **where it is pending right now**: *Pending with Outlet Incharge*, *Pending with HR*,
  *Pending with Director*, *Pending with Operations Manager*, *Pending approval* (reimbursement). The old words
  "HR (for the Outlet Incharge)", "Admin" and "at every step" are gone. HR can still approve a request that is pending
  with the Outlet Incharge; it simply shows where it really is.
- Approval cards show one number: **how many are pending**. The dashboard Approvals card shows the total pending with a
  short split, for example *Advance 4 · Leave 10 · Reimbursement 2*.
- **Filter By** in each card: All pending · Pending with Outlet Incharge · Pending with HR · Waiting for me · Pending with
  Director · Pending with Operations Manager · Rejected by Director.
- The Directors' step is called **Director** everywhere (it was "Admin"); the payment step is **Operations Manager**
  (it was "Accounts"). New decisions by HR at the incharge step are written as "Name (HR)".
- Cards renamed: *Employee master* → **Employee detail changes**, *Under review employees* → **New joinings**.

## 0.8 · What was new in 2.5.2 (checklist Overdue for this day / week / month · Filter By · Cash Management · Daily Food Closing sheet · FMS this week)

Deploy, then **once**: open the One Login sheet ▸ **CG One Login ▸ Allow downloads (one time)** and click *Allow*. This
fixes "You do not have permission to call UrlFetchApp.fetch" on the Excel / PDF reports (the web app runs as the owner, and
the owner had not given the "connect to an external service" permission yet). No new deployment is needed after it.
Until then PDF reports still download (plain layout); Excel says what to do.

**Checklist — what counts as Overdue.** Everywhere (the Directors' Pending Checklists, Checklist ▸ My tasks, the Team
view) a task counts only in its own period: a **daily** task on its day, a **weekly** task in this week (Monday–Sunday),
a **monthly** task in this month. *Overdue* = not done after its planned time in that period, *Pending* = not due yet,
*Done* = done; *All* = the three together. A daily task from yesterday that was never done is no longer listed.

**Directors' Pending Checklists.**
- Dashboard cards now have the same coloured icons as everyone's dashboard.
- Filters are drop-downs: *Location*, then inside a checklist *Filter By* — Pending (n), Overdue (n), Done (n), All (n) —
  *Doer* and *Search*. Each checklist card shows Pending, Overdue and Done.
- **Store Maintenance Checklist** belongs to **GFP** (Checklists tab ▸ Outlet ID = OUT-008; Setup fills it if blank).
- **Scores**: one card per checklist only — the combined score card per location is gone.
- Delegated tasks, Orders Summary, GRN Summary and FMS Summary use the same *Filter By* drop-downs with counts.

**Daily Food Closing** now reads the **Pandri Material Closing Sheet** (Settings ▸ `Food Closing Sheet ID`, tabs
*Stock Closing* + *Stock Closing Records*): three cards — *Closings* in the period (per kitchen), *Closed today*,
*Quantity closed* (kg / pcs, items, lines without photo) — then each closing (kitchen, shift, by, time) with its items and
photos, or *Item-wise* totals. Filters: From – To (last 7 days), Kitchen, Shift. A closing made before 3 AM belongs to the
day before, as in the closing app (`Food Closing Day Start Hour`).

**FMS Summary.**
- *Indent to Offer Letter*: Filter By **Pending this week** (current step due between now and Sunday), **Overdue**,
  **Offer letter sent this month**.
- *Outlet Order to Dispatch*: **this week** — orders, steps done, overdue and pending, step by step — and **today's**
  pending and overdue steps (Filter By).

**Cash Management (new, Directors' sidebar).** Reads the Cash Management app's sheet `Cash_Management_Database`
(Settings ▸ `Cash Management Sheet ID`) — view only, the counters keep using the Cash Management app.
- *One day* (the business day starts at 4 AM, like the app): cards Opening issued, Closing received (net cash), Short /
  Excess, Waiting to be accepted; then every counter and shift with its opening and closing, who prepared and who
  accepted, the status, and net cash (closing − opening). Tap an entry for the denomination count (prepared vs accepted).
- *Date range*: day-wise opening, closing, net cash, short, excess and waiting, then every entry.

## 0.9 · What was new in 2.5.1 (Directors' dashboard and reports · Delegated Tasks · Operations Manager pays · location picker)

Deploy only. The new settings below fill in by themselves (Settings tab defaults); change one only if a sheet moves.

| Setting | Default | Used for |
|---|---|---|
| `Delegation Sheet ID` | Delegation Sheet NEW (`14n9lr…`) | Delegated Tasks card — reads `Master` + `Doer List`, adds new tasks to `Master` |
| `Delegation Done Days` | 90 | done tasks older than this are not listed (still counted in the sheet) |
| `Item Not Dispatch Sheet ID` | Item Not Dispatch (`1mag_…`) | Orders Summary — what was not sent against each order, with the reason |
| `Dispatch FMS Days` | 30 | Outlet Order to Dispatch FMS — orders older than this are left out |
| `Outlet Picker For` | Admin | who besides the Directors / MIS gets the location picker in the top bar |

**Directors' dashboard** — four cards:
- **Pending Checklists** — pending today + overdue across every checklist. Inside: **Team View** and **Scores**, with a
  location filter (All · HQ · GFP · Chanderi · Pandri). Team View shows one card per checklist with only its pending
  and done count; tap one for *Pending* (today), *Overdue*, *Done* (today) and *All*, with a doer filter and search.
  A Director cannot mark a task done: tick tasks and **Give** them to someone of that checklist's department (and the
  same outlet for an outlet checklist) — the person gets them in his Checklist like any given task. **Scores**: last
  week per checklist for the location picked, then the last 8 weeks doer-wise (% work not done, % not done on time).
- **Approvals** — opens Approvals, everything shown by default. Step filter: *Outlet Incharge*, *HR*, *Waiting for me*
  (only what reached the Director through Outlet Incharge → HR → Admin) and *Operations Manager*. The Show filter is
  gone. At the Outlet Incharge and HR steps a Director sees the requests but does not decide them.
- **Issues Raised** — the same Issues screen; for the Directors the *Raise Issue* card is replaced by **Overdue** (Pandri
  and Chanderi together, with the count per location).
- **Delegated Tasks** — two cards. *Pending delegated tasks*: the Delegation Sheet NEW ▸ Master list, pending first, with
  All / Pending / Done and a doer filter. *Delegate Task*: write the task, pick the due date and one or more doers
  (from its Doer List, grouped by department) — one row per doer is added to Master with a new 7-letter Task ID,
  First Date = Latest Revision = the due date, Total Revisions 0, Status Pending, so the sheet's own dashboard, revisions
  and reminders keep working. Doers get an e-mail when Settings ▸ `Send Task Emails` = Yes.

**Directors' sidebar**: Dashboard · Approvals · **HR Dashboard** (cards Payroll — the full Payroll section; Advance and
Reimbursement — this month's tracking with every step) · **DSR Daily Sales** (location filter, Pandri first; month,
totals, day-wise table and days not filled) · **GRN Summary** (cards for Pandri, Chanderi, GFP: order GRNs, bills,
vegetables, date range) · **Expense Records** (expenses filled in the Outlet Wise DSR for Pandri and Chanderi, day by
day) · Production Records · **Daily Food Closing** · Wastage Report (soon) · **Orders Summary** (every outlet's GFP
orders of today or yesterday as cards: ordered, dispatched, part dispatched, items not dispatched with the reason from
the Item Not Dispatch sheet) · Certificates (every outlet) · Sale Report (soon) · **FMS Summary** · Employee View.

**FMS Summary** is three cards, each opening the detail:
- *Indent to Offer Letter* — open indents whose current step is due this week (plus all open, overdue, offers this
  month), step by step, and the **Calling** record with its period filter.
- *Onboarding to Probation* — everyone under probation, joined this month, late steps.
- *Outlet Order to Dispatch* — orders pending for dispatch today (late ones marked), step by step.

**Operations Manager (Sandeep Rajput).** He no longer approves anything at the payment step: Approvals ▸ Advance
shows **Paid** (as the accountant did). His *Reimbursement — approve* on the Access tab is now **No**; he keeps his
Outlet Incharge steps for Pandri and Chanderi.

**Location picker.** The outlet picker next to the profile shows only for the Directors, MIS, an Outlet Incharge of more
than one outlet (the Operations Manager — Pandri and Chanderi) and the departments / designations / roles / User IDs in
Settings ▸ `Outlet Picker For` (Admin). Everyone else sees only the places they belong to. The Directors open on
*All outlets*.

**Profile.** *Change password* is removed from the profile menu and My Profile — MIS sets passwords in User
Management.

## 0.10 · What was new in 2.5.0 (Outlet Order App inside Orders · Director reports · Employee View · checklist Overdue and Scores)

Deploy only. On the first request after the deploy the app adds the new section *Orders — Dispatch* (Modules, Roles and
Access columns) and marks the old "Max Level only in the Outlet Order App" mismatch as fixed.

**Orders = the Outlet Order App.** The GFP order screens are now the Outlet Order App's own screens, in the One Login
colours, working on the same Outlet Orders workbook (Orders, OrderMeta, MaxLevel, ClosingStock, StandardQty, ItemMaster,
ItemRules, AppConfig, EmailList). Nothing changes for the GFP team: same PO numbers, same e-mails with the PDF, same
approve / reject links (they open the Outlet Order App — Settings ▸ `Outlet Order App URL`).
- **New Order**: item cards by category with search, the Closing Stock box on every card, **Auto Fill Order Qty**
  (Max Level − Closing Stock), **Item Suggestion** (ask for an item that is not on the list), **Print Items** (PDF / Excel
  / print), the item rules (linked items ordered as one, multiples and minimums) and *Order by Closing Stock* when
  AppConfig `SHOW_ORDER_BY_CLOSING_STOCK` is TRUE. Review & Save asks for *Order By* (filled with the name signed in).
- **Max Level** per outlet, **Closing Stock** / Standard Quantity (when AppConfig `SHOW_CLOSING_STOCK_TAB` is TRUE),
  **Order History** (today and yesterday; the outlet's Confirmed orders can be changed and get a new revision) and
  **Dispatch**. Vegetables, Bill entry and Past orders (GFP orders of the last weeks with GRN, vegetables, bills) are the
  same as before.
- **Which outlet**: the outlet picked in the top bar. An Outlet Incharge orders for his outlet; the Operations Manager
  (Pandri and Chanderi) switches in the top bar — a cart that is not saved is kept until the outlet is changed. MIS and
  the Directors with *All outlets* get the HQ view: every outlet's orders (view only) and Max Level for any outlet.
- **Dispatch**: MIS and anyone given *Orders — Dispatch* = Yes on the Access tab (the GFP store) — every outlet's orders
  of today and yesterday, with the dispatched quantity. A login with only this permission sees only Dispatch.

**Directors (Namit Sir, Vivek Sir).** Sidebar: Dashboard · Approvals · Checklist · Delegate Tasks · Employee View. The
dashboard is reports only, as cards that open the detail: *Needs you* (approvals waiting for them, issues assigned to
them), *Work across the company* (departments with what is pending and overdue, checklists today and last week's score,
issues by location and department, delegated tasks by person, requests this month and who has them), *People*
(headcount, attendance, on leave; hiring — joined and offer letters this month, on probation, onboarded; calling — this
week with a period filter: last week, this month, last 30 days, from–to) and *Money* (sales yesterday, advances,
reimbursements).

**Employee View (MIS and the Directors).** Sidebar ▸ Employee View: search anyone and open their screens as they see
them, without their password. A bar on top says whose screens these are; *Exit* goes back. View only — saving anything
asks for that person's own login.

**Checklist.** *Overdue* next to Pending — in My tasks and in the Team view — lists every task not done after its
planned day. Checklist ▸ **Scores** (for whoever manages a checklist): one card per checklist with last week's score;
tap it for the last 8 weeks, filtered by week and by doer (% work not done, % work not done on time).

**Sandeep Rajput (Operations Manager).** Login `Outletom`, Outlet Incharge for Pandri and Chanderi: leave and advance
as incharge for both, every approval request and issue, reimbursement approval and *Advance paid* (instead of the
accountant).

## 0.11 · What was new in 2.4.3 (Issues · checklist filters by frequency · approval tracking)

Deploy only.

**Issues (was Tickets).** The same sheets — the `Tickets` tab here and the Pandri / Chanderi Tickets Trackers — but the
app says *Issue* everywhere (Issue ID = Ticket ID). No sidebar item any more: a red **Issues** card on the dashboard
for HQ and GFP staff, the Admins and the Pandri / Chanderi Outlet Incharge.
- Inside: **All Issues** (count) and **Raise Issue** cards; the list opens on pending issues. Filters: Show (Pending ·
  All · Overdue · Assigned to me · My issues, each with its count), Priority, Location (Admins only).
- **Admins** (Director, MIS, EA, PC — Settings ▸ `Ticket Tracker Designations`) see every issue, re-assign to anyone at
  HQ, GFP or an Outlet Incharge (grouped by department) and can mark any issue done.
- **Outlet Incharge**: his outlet's issues (no location filter), his own and those given to him; re-assigns and marks
  done his outlet's issues.
- **Everyone else at HQ / GFP**: their department's issues (raised by their department at their location, or given to
  someone of their department) plus their own; only the person an issue is given to marks it done.
- **Raising**: a checklist issue only from the checklist task, by its doer (*Can't do it — raise an issue*); a
  delegated-task issue from the task (*Raise issue*, also noted on the task); anything else from **Raise Issue**.

**My Checklist filters by frequency.** Today = every task planned today (daily, weekly, monthly); This week = the
weekly tasks of this week; This month = the monthly tasks of this month. Doers see only pending tasks; Admins and the
Outlet Incharge also see the done ones (marked Done / Done late). Last week's score stays on top.

**Approvals ▸ Tracking** (this month): Advance Tracking and Leave Tracking for MIS, the Directors, HR and the Outlet
Incharge (his outlet only); Reimbursement Tracking for MIS and the Directors only. One line per request with where it
is waiting (Outlet Incharge, HR, Namit / Vivek Sir, Accountant) or the result (approved, paid, rejected) — tap it for
every step.

## 0.12 · What was new in 2.4.2 (attendance inside Payroll · My Checklist pending only with last week's score)

Deploy only.

**HR sidebar: Payroll · Recruitment · Roster.** Attendance is no longer its own section — everything it had is in
Payroll: Upload attendance, Last upload, Penalty applied (this month, every penalty by type, editable), Penalty in
last upload, Overtime, Attendance records (edit a punch), Give a penalty and Rules, next to Employees, Salary
preparation, Salary slips and Reports. Refresh (re-read the punches) is on the Payroll page. Someone with
Attendance access but no Payroll still gets Attendance as its own section.

**My Checklist shows only pending tasks**, one line each (tap for the task card), with three filters: Today · This
week · This month (each with its count; overdue tasks stay on top, marked Overdue). Above them, **last week's
score** for each checklist the person is a doer in — the same figures as the checklist's `Scores` tab for the week
Monday–Sunday:
- % work not done = tasks done ÷ tasks planned × 100 − 100
- % work not done on time = tasks done no later than their Planned time ÷ tasks planned × 100 − 100

## 0.13 · What was new in 2.4.1 (logo mark · Chanderi checklists · approvals this month)

Deploy only — the first request after the deployment adds the Chanderi checklists and the new setting by itself.

**Logo without text.** The top bar and the login screen show only the logo mark — Settings ▸ `Logo Mark`
(default: the Drive file *Only Logo.png*). `Logo URL` stays the full logo for slips and forms.

**Chanderi checklists.** Cashier, Housekeeping, Maintenance and Kitchen Checklist (Chanderi) are added to the
`Checklists` tab (Outlet ID `OUT-006`) and their doers are linked. The Chanderi incharge manages them; doers see
their own tasks.

**Approvals — this month only.** Advance, Leave and Reimbursement read only this month's tabs
(`Advance / Leave / Reimbursement October 2026` …), dated by when the request was made (a leave applied today for
next week is no longer hidden). From – To stays inside the month; Refresh re-reads the sheet at once. Employee
master changes and Under review joinings still show everything waiting.

**Payroll** has only Employees, Attendance, Penalty, Overtime, Salary preparation, Salary slips and Reports — Hiring
and Calling stay in Recruitment.

## 0.14 · What was new in 2.4.0 (sections · one Approvals · two-step employee approval · editable slips)

Deploy only — the first request after the deployment adds the new columns (`Employee Changes` ▸ Stage, HR Approved
By / At), the `Penalty Override` tab in the Attendance workbook and the new settings by itself. No Setup run needed.

**Sidebar for HR, MIS and Directors:** Dashboard · Approvals · Attendance · Roster · Recruitment · Payroll. Penalty,
Hiring Poster, FMS Summary, Employees, Salary Slips and Reports are not listed any more — they open from those
sections (access to them is unchanged on the Access / Roles tabs).

**Dashboard.** Two cards only: *My pending tasks* (tap: today's checklist tasks + open delegated tasks) and
*Approvals* (for approvers) or *My requests* (everyone else). Quick actions below: Raise a ticket (raise a new one or
see my tickets), Request leave, Request advance, Claim reimbursement — each opens its form directly. One line each
on a phone, a row of four on a laptop.

**Approvals.** One section, a card per step the login holds: Advance, Leave, Reimbursement (this month only),
Employee master changes, Under review employees. Tap a card for the list — filters From –
To, location, step, waiting-for-me / all, search. Each record is one line; tap it for the details and Approve /
Reject. Tick rows to approve or reject several at once (the bulk bar shows only while something is ticked).

**Employee master approval chain** (`CG Employee Detail NEW`):
- MIS and Director: saved at once.
- HR Assistant / HR Assistant Intern (Settings ▸ `Employee Edit Needs Approval`): HR Executive (Settings ▸
  `Employee Edit Approvers`) approves first, then MIS / Director give the final approval — only then it is written.
- Other HR logins (HR Executive): straight to MIS / Director.
- Under review joinings: HR approves first, MIS / Director give the final approval that adds the person.

**Regularised attendance.** A Petpooja day with no punch in and no punch out but working hours (e.g. 9h 30m,
regularised by HR) counts as present by those hours: Full Day Hours or more = Full Day, above Absent Max Hours (3)
= Half Day. No missing-punch penalty on it. Config ▸ `REGULARISED_BY_HOURS` (Yes) — replaces
`PETPOOJA_STATUS_WITHOUT_PUNCH`.

**Attendance.** Cards: Upload attendance · Penalty applied (this month) · Last upload · Penalty in last upload; then
Attendance records (edit a punch), Give a penalty, Overtime, Rules. Penalties list by type — All, Late punch in,
Unapproved leave, Not in uniform, Not fully groomed, Misbehaviour — and HR can change, waive or restore any amount.
Automatic ones keep the change in `Penalty Override` (Attendance workbook); by-hand ones in `Manual Penalty`.

**Roster.** Cards: Today, Tomorrow, This week, Yesterday's roster; prepare any other day too. Cells show the shift
timing (not S1 / S2). *Manual timing…* gives one person his own start / end for that day (Shift Code `MANUAL`).
The duty sheet keeps its Excel / PDF for printing.

**Recruitment** (was HR Dashboard). Cards: Indents pending (by location, by position, overdue, offer letters this
month), Joined this month, Calls this week, Interviews scheduled, Under probation, Calling records; FMS overview with
*Pending FMS*; Hiring Poster and FMS Summary open from here.

**Payroll.** Cards: Employees (Pandri, Chanderi, HQ, GFP — one line each, open to see / edit; edits follow the
approval chain), Attendance, Penalty, Overtime; then Salary preparation, Salary slips, Reports.
Reports (Excel / PDF) are downloaded only here now.
- **Salary preparation:** every cell editable, PF / ESIC from `SALARY BREAKUP`; nothing is written to the SGSPL
  Salary Master until *Submit* and the confirmation.
- **Salary slip** in three parts: company (logo — Settings ▸ `Salary Slip Logo URL`, blank = Logo URL — and name),
  employee details (name, code, UAN, PF no., ESIC no., bank, account no., days paid for = present + weekly holiday
  + paid leave) and salary breakup (earnings − PF / ESIC − penalty, running advance … = net pay). *View & edit
  slip* changes any line and adds lines to any part; *Fields on every slip* adds a line to all slips.

## 0.15 · What was new in 2.3.5 (bulk attendance · daily report · tickets to a person · this month first)

Deploy only — the first request after the deployment adds the new settings by itself.

**Attendance upload — one day or a whole month.** Attendance Manager ▸ Upload takes the Petpooja file of one day
or the bulk *Attendance-Master* file of a whole month (e.g. `attendance_master_9.xlsx`: 1,752 rows, 01–30 Sep 2026,
63 people) — every row is kept. Then:
- **Back dates only:** rows of today (and later) are left out and named on screen — Petpooja does not have the full
  day yet (Config ▸ `ALLOW_TODAY_UPLOAD` = No).
- People marked **(Inactive) / (Terminated)** in Petpooja are kept in the data but not reported (listed, folded).
- A day Petpooja marks **FD / HD with hours but no punch** (marked by hand there, e.g. 9h 30m FD) is a Full / Half
  Day (Config ▸ `PETPOOJA_STATUS_WITHOUT_PUNCH` = Yes; No = no punch is always Absent).
- Right under the result: **Excel / PDF** of those day(s) — Attendance with penalties or Penalty report.

**Daily report.** HR Dashboard has **Excel / PDF** of the attendance report with penalties for the day picked; Reports ▸
Attendance with penalties and Penalty report open on the latest uploaded day.

**Tickets go to a person.** Whoever raises a ticket — for a checklist task ("Can't do it — raise a ticket") or any
other problem — picks **Give it to**: anyone at HQ, anyone at GFP, or any Outlet Incharge (a person, never a
department). The ticket is Assigned from the start (priority · resolve-by date), the person sees it under *Assigned
to me*. A checklist ticket starts with the outlet's incharge picked. Trackers re-assign from the same list.
Settings ▸ `Ticket Needs A Person` (Yes).

**My Checklist** opens on **today's pending tasks** (Today + Pending only on); **Clear** shows everything as before.
Only two cards: **All tasks** and **Pending** (tap to switch). Done on time / Done late are gone.

**This month first.** My requests (month chips · All), Approvals (this month · earlier months with their count ·
all), Leave / Advance Approval, and Attendance Report ▸ Month (any month; attendance per person with every day
behind it, leave, advance) open on the current month. Long lists fold — one line per request or person, tap it.

## 0.16 · What was new in 2.3.4 (shift timings · reports section · roster day sheet · running advances)

Deploy only — the first request after the deployment updates the sheets by itself (Employee Shift gets
`Start Time` / `End Time` columns, the Reports section is added for HR, the Read Me tab is rewritten).

**No instructions in the web app.** Every explanation that used to sit in boxes on the screens (unapproved
leave, overtime, rules, access control, outlets, salary preparation formula, joinings, tickets, FMS …) is now
on the **Read Me** tab of the One Login sheet, under *HOW EACH SCREEN WORKS*. The screens show data only.

**HR Dashboard — cards per section.** The strip of figures on top is gone; each tab shows its own cards:
Attendance (Employees · Present · On leave / week off · Absent), Penalties (this day · this month · people),
Unapproved leave (this day · this month · people), Overtime (this day · this month · people), Hiring and Calling
(their own figures). Rules has no cards.

**Approvals fold up.** Advance · HR, Leave, Admin, Reimbursement (Approvals) and the Outlet Incharge's Leave /
Advance Approval show one line per request (name, location, dates or amount, status). Tap a line to open it and
approve / reject.

**Employees ▸ Shift timings** (HR, Director, MIS can change; others see it). Every employee of HQ, GFP, Pandri and
Chanderi with a timing per person:
- *Auto (nearest shift)* — matched to the nearest shift of the location (as before);
- *Location shift* — pinned to Shift 1 / Shift 2 … of the location;
- *Own timing* — their own start and end (05:00 AM – 03:00 PM, 09:00 AM – 08:00 PM, 11:00 AM – 09:00 PM …) for
  anyone who is not on Shift 1 / Shift 2;
- *No shift checks* — never charged for late / early.
Save writes the Attendance workbook ▸ `Employee Shift` tab. Late punch in, left early, full / half day and the
penalties use the person's timing from then on (grace: Config ▸ `OWN_SHIFT_LATE_GRACE_MIN` /
`OWN_SHIFT_EARLY_GRACE_MIN`, 10 min each).

**Ex-employee section removed** from the app for now (the "Move log" tab and the "Move to Ex-Employees" button).
People who left stay on the `Ex-Employees` tab of the employee workbook; the sync still switches their login off.

**Reports section** (menu ▸ Reports, just above Resources): Excel or PDF of
- Attendance with penalties (location-wise, automatic + by hand with remark),
- Penalty report (per person + every penalty day),
- Penalties given by hand,
- Overtime (per employee + every day),
- Leave (every leave of a month with status and replacement),
- Running advances (per employee per month — also shown on screen; tap a person for every advance).

**Roster ▸ Day sheet** — the Daily Staff Duty Roster of an outlet for one day: grouped by shift, Section (the
employee's department), S. No., Employee ID, Name, Shift timing (their own timing when one is set), Leave status
(approved / applied from the Loan & Advance sheet, week off or leave on the roster) and Replacement. Picking a
replacement writes it on the leave row of the Loan & Advance sheet (Replacement Emp ID / Name / Designation /
Type — the same columns HR fills when approving), so the week plan, the leave report and HR see it. Excel / PDF.

**Running advances → salary.** Every advance of a month that Admin approved (or Accounts paid) is that month's
running advance. Salary Preparation ▸ Loan & adv. uses exactly that amount; hover the cell to see each advance
(date · purpose · amount · paid or approved).

## 0.17 · What was new in 2.3.3 (reports · overtime rounding · HQ)

Deploy only — the first request after the deployment updates the sheets by itself (no need to run Setup).

**Reports in Excel and PDF.** Attendance Manager ▸ Reports: pick the dates, a location (or all), then
*Attendance report with penalties* or *Penalty report*, and **Excel** or **PDF**.
- Attendance report with penalties: one sheet per location (HQ, GFP, Pandri, Chanderi) coloured by status, with
  overtime hours / amount and the penalties in two columns — **automatic** (Late punch in 39 min, Unapproved leave
  (No leave request) …) and **given by hand** with the remark and who gave it (Not In Uniform — came without cap
  [by Sandeep Rajput], Misbehaviour, Not Groomed …) — followed by that location's penalty sheet.
- Penalty report: a summary per person (days, automatic, by hand, total and what it was for), then every penalty
  day of each location. By-hand penalties given for a day whose punches are not uploaded yet are included.
- Penalty ▸ Month summary and Penalty ▸ Given by hand have **Excel** and **PDF** buttons too (the Outlet Incharge
  gets his own outlet). PDFs are A4 landscape, fitted to the page width, with the header repeated on every page.

**Overtime rounding:** the worked time is rounded to whole hours — 30 minutes or more counts as the next hour
(13h 22m → 13 h, 13h 32m → 14 h) — once the person has really worked Standard Hours + OT After Extra Hours
(Pandri / Chanderi 10 + 2 = 12 h). Overtime = rounded hours − Standard Hours. Attendance ▸ Rules ▸ General ▸
`OT_ROUND_UP_MINUTES` (30).

**HQ and GFP:** Bhanpuri (HQ) is shown as **HQ** everywhere (not MDO) and Bhanpuri (GFP) as **GFP**, each on its
own — attendance, penalties, reports, HR Dashboard, tickets, employees.

## 0.18 · What was new in 2.3.2 (Tickets · HQ / GFP · HR approvals)

**Install:** `clasp push` (new files `Tickets.gs`, `ViewsTickets.html`), deploy a new version, run **CG One Login ▸ Setup** once.
Setup adds the `Tickets`, `Ticket Log` and `Employee Changes` tabs and the new settings, renames the outlets
**Bhanpuri (HQ) → HQ** and **Bhanpuri (GFP) → GFP**, sets Chanderi to COCO, and splits the attendance group
into **HQ** and **GFP** (Location Rules, shifts and penalty rules).

**Tickets** (Daily Work ▸ Tickets, plus "Raise a ticket" on the dashboard, in the ☺ menu and on any checklist task):
- Everyone can raise a ticket. A general ticket goes to the new `Tickets` tab of this spreadsheet with the
  person's location (CGT-0001 …). "Can't do it — raise a ticket" on a checklist task goes to that outlet's
  **Tickets Tracker** sheet, in the same columns the checklist apps use (TKT-…), assigned to the person the
  tracker's latest tickets went to.
- Steps, exactly like the tracker sheets: **Raised** (OPEN) → **Assigned** (Assigned To · Issue Priority ·
  Planned Date for Resolve Issue) → **Closed** (Ticket Status Close · Actual Date for Resolve Issue). Every
  step and note is kept in `Ticket Log`.
- Who tracks: Director, MIS and the **Process Coordinator** (Settings ▸ Ticket Tracker Designations) see every
  ticket; the **Outlet Incharge** sees his outlet's. The person a ticket is assigned to sees it under
  "Assigned to me" and closes it with what was done.
- Settings: `Tickets Tracker (Pandri)`, `Tickets Tracker (Chanderi)` (add `Tickets Tracker (<outlet>)` for more),
  `Ticket Issue Types`, `Ticket Default Resolve Days`, `Ticket Closed Days Shown`.

**FMS tasks in the app:** FMS Summary ▸ each FMS ▸ *Tasks waiting* lists the rows whose current step is due or
overdue, with a **Done** button. It writes Status = DONE in the sheet (the sheet's Actual formula stamps the time);
an Actual column without a formula gets the time. Steps must be done in order; Excel files are read-only.

**HQ and GFP:** everyone at Bhanpuri who is not GFP is HQ. Attendance, the HR Dashboard, reports and tickets
show HQ, GFP, Pandri and Chanderi. Attendance, penalties, salary preparation and roster run only for these
(Outlets ▸ Model COCO). **HR logins now list only Pandri and Chanderi** in the outlet picker; Employees still
shows every outlet's employee records.

**HR assistants' changes need the HR Executive:** when anyone in Settings ▸ `Employee Edit Needs Approval`
(Assistant HR, HR Assistant, HR Intern, HR Assistant Intern, HQ-00023 Manisha, HQ-00024 Aryan) edits an
employee, uploads a document, moves someone to Ex-Employees or decides a new joining, nothing is written to
CG Employee Detail NEW — it waits in Employees ▸ **Changes to approve** for `Employee Edit Approvers`
(HQ-00012 Ajay, HR Executive). Approve & save writes it; Reject drops it (a rejected document file is trashed).
Director and MIS never wait.

**HR decides for the Outlet Incharge:** Approvals ▸ Advance · HR now also lists advances still with the Outlet
Incharge, and leave waiting for the incharge can be decided too. The sheet records the incharge step as
"<HR name> (HR, for the Outlet Incharge)". Switch off with Settings ▸ `HR Can Decide For Incharge` = No.

**Phone header:** the app name no longer overlaps the outlet picker on phones (the logo carries the name).

**Ex-employees are not shown any more:** Employees (search, overview, documents, assets, PF / salary breakup) shows
active employees only, and User Management no longer lists the logins switched off for people who left. Nothing is
deleted — Ex-Employees and inactive rows stay in CG Employee Detail NEW. "Move to Ex-Employees" still works; a
person who comes back joins again through the joining form (or is moved back in the workbook).

## 0.19 · What was new in 2.3.1 (HR Dashboard · FMS Summary)

**Install:** `clasp push` (new files `HRDash.gs`, `Fms.gs`, `ViewsFms.html`), deploy a new version, then run
**CG One Login ▸ Setup** once. Setup adds the `FMS Sheets` tab, the HR settings, the overtime columns, the
Chanderi location / shifts / penalty rules, the ₹200 `UNAPPROVED_LEAVE` rules, the HR Intern / HR Assistant
Intern designations, and gives every active HR-department login the HR role with Outlet Access = ALL.

**HR Dashboard** (menu HR ▸ HR Dashboard — HR, Director, MIS): one strip of figures (employees, present,
penalty, unapproved leave, overtime) and tabs —
- *Attendance*: each location (Bhanpuri HQ, Bhanpuri GFP, Pandri, Chanderi) — staff from the employee master,
  present (full / half / punch missed), approved leave, week off, unapproved, other absent, late, overtime.
  A location with no rows in the Petpooja file that day is shown as "not in the punch file" — nobody there is
  marked absent or charged (General ▸ `ABSENT_ONLY_FOR_UPLOADED_LOCATIONS`, `UPLOADED_LOCATION_MIN_SHARE`).
- *Penalties*: the day and the month split by basis (late punch, unapproved leave, manual …), day by day, and
  employee-wise (tap a person for every line).
- *Unapproved leave*: absent in the upload with no approved leave in the Loan & Advance sheet = unapproved →
  ₹200 at Pandri and Chanderi (Penalty rules, type `UNAPPROVED_LEAVE`). Charged from
  `UNAPPROVED_LEAVE_CHARGE_FROM` (set to the 1st of the month Setup runs) — earlier days are listed, not charged.
  Leave waiting for approval counts as unapproved (`PENDING_LEAVE_IS_UNAPPROVED`). A week off counts only when
  it is on the roster as **WO** (`WEEK_OFF_FROM_ROSTER`) — enter weekly offs on the roster or as approved leave.
- *Overtime*: only where Location Rules ▸ Overtime = Yes (Pandri, Chanderi). Hourly rate = monthly salary ÷ 30 ÷
  Standard Hours × OT Rate. Paid when worked ≥ Standard Hours + OT After Extra Hours (10 + 2 = from 12 h; 12 h →
  2 h, 13 h → 3 h), in `OT_ROUND_TO_HOURS` steps. Flows into the O/T column of Salary Preparation.
- *Hiring*: FMS Hiring workbook — `HR Indent Response V1`, `FMS-Indent to Offer Letter Sent`,
  `FMS-Onboarding to Probation` (Settings ▸ Hiring FMS Sheet ID / tab names).
- *Calling*: HR calling records (Settings ▸ HR Calling Sheet ID / Tab). The current file is an Excel file —
  it is read by converting a copy each time; **File ▸ Save as Google Sheets** and paste the new ID for speed.
- *Rules*: what is in force, with a button to Attendance Manager ▸ Rules.

**FMS Summary** (Reports ▸ FMS Summary): step-wise done / due / overdue / waiting for each sheet on the
`FMS Sheets` tab. Director, MIS and anyone with Settings / Users see every FMS (and add / edit them with ✏️);
everyone else sees only the FMS whose **Department** is theirs (Departments tab name or alias) or whose
**Also For Designations** names their designation — the menu item appears by itself for them. Seeded:
Hiring ×2 (HR), Outlet Order to Dispatch and Purchase FMS (Operations & Supply; Store Head / Executive /
Incharge, Storekeeper, Store Assistant). Purchase FMS has no sheet yet — paste its link with ✏️.


## 1 · Update an existing install (v1, v2.0, v2.1 or v2.2 → v2.3.0)

1. Put the new files in the Apps Script project — `clasp push` from `C:\AppScr\CG One Login`
   (`.clasp.json` already holds your Script ID; `_extras/` and the `.md` files are skipped),
   or paste every file by hand. **New files:** `Access.gs  Attendance.gs  Employees.gs  LoanAdvance.gs
   Payroll.gs  Penalty.gs  Poster.gs  Join.html  ViewsSelf.html  ViewsApprove.html  ViewsHR.html
   ViewsPay.html  ViewsPoster.html`.
2. In the sheet: **CG One Login ▸ ① Set up / repair every tab** (or run `setupOneLogin` in the editor) and
   **allow the new permissions** (Drive, external requests for the SMS gateway / Excel export).
   It only adds what is missing: new tabs, the new sections as columns on Roles / Access, the built-in
   roles' values for them, blank sheet IDs, the poster tabs, checklist doers, System Master links.
3. **Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New version ▸ Deploy.** The link stays the same.
   (2.2 is the speed update; 2.3 brings the Loan & Advance rules, Production Entry and "only for yourself" — run
   ① Set up once so the new Settings rows and the Production Entry section are added; section 10 says what changed.)
4. Open the app once as MIS: **Settings & Data ▸ Tools** shows what setup did and the **link to share**
   (Copy link); **Settings & Data ▸ Outlets** shows which outlets we run; **Access Control ▸ By person**
   shows exactly what any one person will see.

### The link to share

Share **`https://script.google.com/a/macros/chaigovindam.com/s/<deployment id>/exec`** — Settings & Data ▸
Tools ▸ *Copy link* gives it, and the joining-form link, emails and the menu use it too. The plain
`script.google.com/macros/s/…/exec` link fails on phones signed in to several Google accounts: Google adds
`/u/6/` to it and shows *"Sorry, unable to open the file at present"*. The domain form avoids that. If a
browser still shows it, open the link in an Incognito tab. (Settings ▸ *Web App Link* can pin any other
link, e.g. a short link.)

New installs: create a Google Sheet, *Extensions ▸ Apps Script*, add every file (`.gs` = Script,
`.html` = HTML, names exactly as given), paste `appsscript.json`, run `setupOneLogin`, deploy as a
Web app · Execute as **Me** · Access **Anyone**, sign in with **`mis` / `CG@mis2026`** and change it.

## 2 · Giving access

| Tab | What it is |
|---|---|
| **Login** | who can sign in — User ID, Employee ID, name, **Login ID**, **Password** (plain text, typed by you), Status |
| **Access** | **Role**, Outlet Access, Home Outlet, Checklist Doer Name, then one **Yes / No** column per section (blank = the role's value) |
| **Roles** | the Yes / No defaults of each role |
| **Access Rules** | one section, checklist or app given / blocked for a **person, designation, department, role or location** |
| **Checklist Doers** | every doer of every checklist, linked to a login |
| **Sessions** | every sign-in — set Status `Ended` to sign someone out |

The employee sync creates a Login row for every employee (Login ID = Employee ID, password blank).
Type the password — that is all most people need; the role comes from the designation. People sign in with
their Login ID, Employee ID, mobile or email.

**Who wins:** a Yes / No typed on the person's own Access row › Access Rules (most specific first:
User › Designation › Department › Role › Location › Everyone; at the same level **No** beats Yes) › the Role.
Do it in the sheet or in the app: **User Management** and **Access Control** (MIS and Directors only).

| Role | Gets |
|---|---|
| **Director** | everything, every outlet, every approval step |
| **MIS Admin** | everything except the money approvals — incl. User Management, Access Control, Settings |
| **Outlet Incharge** | his own outlet(s) only — never "all outlets": checklist team view, orders, GRN, production, closing, DSR, expenses, attendance report, leave / advance approval (first step), roster, **penalty**, certificates |
| **HR** | Approvals (HR step, final leave decision, reimbursements), Attendance Manager, Employees, Salary Preparation, Salary Slips, Hiring Poster, **Penalty** (Head Office + every outlet we run) |
| **Accounts** | Approvals (advance payment, reimbursements); expenses and DSR for the outlets on their Access row |
| **Staff** | Dashboard, My Profile (no salary), Leave · Advance · Reimbursement, their checklist (only if they have one), delegated tasks, My Apps, Documents |

Everyone with an Employee ID gets My Profile and Leave · Advance · Reimbursement. A person with no checklist
simply has no Checklist section; a person with one checklist sees just that one.
Bhanpuri HQ and Bhanpuri GFP are **Head Office** (Outlets ▸ Type), never outlets.

### Outlets we run (COCO / FOCO)

Every outlet has a **Model** — Settings & Data ▸ **Outlets** (or the Outlets tab ▸ Model):
**COCO** company owned · company run, **FOCO** franchise owned · company run, **FOFO** franchise owned ·
franchise run, **COFO** company owned · franchise run. The models we run are ticked there (Settings ▸
*Operated Models*, default COCO, FOCO) — today **Pandri (COCO)** and **Chanderi (FOCO)**; Pachpedi Naka,
Gol Chowk, Shankar Nagar and Fafadih are FOFO.

| | Head Office + outlets we run | Franchise-run outlets |
|---|---|---|
| Employee records, joining form, My Profile, leave · advance · reimbursement | ✔ | ✔ |
| Orders, GRN, DSR, expenses, roster, certificates | ✔ | ✔ |
| Attendance Manager, Attendance Report, Penalty | ✔ | — (their staff are left out; their incharge has no Attendance Report / Penalty) |
| Salary Preparation | ✔ | — (the grid notes who was left out) |
| Checklists | ✔ | — (only a rule MIS sets for one named person can still give one) |

Attendance for an outlet we run also needs its row in the attendance workbook's **Location Rules**
(Attendance Manager ▸ Rules ▸ Locations). Chanderi has none yet, so the Attendance Manager overview says
so; add it (with its shifts and penalty rules) once Chanderi's punches are in the upload.

## 3 · Penalty (new in 2.1)

Sidebar ▸ People ▸ **Penalty** — for HR, Outlet Incharge, MIS and Directors (Access Control can give or
take it from anyone else).

- **Day board** — pick a date: every person with in / out, worked hours, the **automatic** penalty from the
  punches (late, left early, extra break … from Location Rules / Penalty Rules) and **Give…** to add a
  penalty by hand (Not in uniform, Not groomed, Misbehaviour, Unapproved leave …). Tap to give, tap again to
  take back, then **Save**. Works on phones too.
- **Given by hand** — list of manual penalties with Remove, plus *Give a penalty* for any date.
- **Month summary** — per person: days, automatic, manual, total; this month / last month; CSV download.
- **Rules** — the automatic rules and the manual penalty types, read only. They are changed in Attendance
  Manager ▸ Rules by whoever has *Attendance — rules & config* (Director and MIS by default).

**Outlet incharge:** sees only the staff of his own outlet, gives penalties at the **fixed amount** of the rule,
and can take back only the ones he gave. **HR / MIS / Director:** the Head Office and every outlet we run,
can change the amount and remove any. Franchise-run outlets have no penalties. Manual penalties are saved in the attendance workbook's `Manual Penalty` tab; the
Attendance Manager reports and Salary Preparation ("Also write a Penalty tab") count them once that day's
attendance is uploaded (the month summary lists the ones still waiting for their day).

## 4 · What each desk gets

**Outlet incharge** — Dashboard (pending checklist, tasks, advance and leave waiting for him, staff on leave
today, orders / GRN, DSR, expenses, production, closing, certificates) · Checklist · Orders · GRN & Stock
Register · Production Records · Daily Closing · DSR · Expense Records · Attendance Report (day report with
shift, late and penalty; this month's leave & advance) · **Leave Approval / Advance Approval** — his step
comes first, HR gives the final decision; no separate L&A admin login · Roster · Penalty · Certificates ·
My Apps · Documents & Passwords.

**HR** — **Approvals** (Advance ▸ HR step with actual present days and the max allowed, Leave ▸ final decision
with replacement, Reimbursement with the bill, Tracker) · **Attendance Manager** (upload the machine file or
paste, fix unmatched names, edit a day, penalties, Excel reports, rules — Head Office and outlets we run) ·
**Employees** (every outlet: overview, search & edit every field, documents, new joinings to approve, assets /
salary records, moves between locations, joining-form link) · **Salary Preparation** (Head Office and outlets
we run: pre-filled month grid from attendance, leave, advances and penalties → a new month tab in the Salary
Master, with last month's block names such as `PANDARI(CG001)`) · **Salary Slips** (one, some or all; merged PDF or a zip of
PDFs; link names the salary sheet spells differently) · **Hiring Poster** (PNG / JPG / PDF).

**Director / MIS** — everything above for every outlet, plus Delegate Tasks, Password Manager, User
Management, **Access Control** (by item, by person, all rules, checklist doers, checklists, apps & links) and
**Settings & Data** (settings, tools and the link to share, outlets and their models, mismatch list).

**Joining form** for new employees: the web app link + `?page=join` (Hindi / English, documents upload).
The person gets their employee code at once; HR approves it in Employees ▸ New joinings (and picks the
location), which moves them into the employee master.

## 5 · Apps inside One Login, and the rest

These old apps now open **inside** One Login — My Apps shows *Inside One Login ▸ Open here* (the *Old link*
still works): Loan & Advance, Reimbursement & Leave and its Admin Portal, the attendance app ("Roster" in
the System Master), Employee Master, New Employee Joining, the Cashier / Housekeeping / Maintenance /
PrepKitchen / HR checklists, Production, Order to Delivery (placing outlet orders). The Accounts, EA, GFP and
Store Maintenance checklists, salary slips, the hiring poster and penalties are built in as sections too.

Still separate links in My Apps, grouped by department and section as in the System Master: Asset Master,
Daily Cash Flow, Pandri Training, GRN Entry and the Google Sheets / Forms / FMS entries. Each person's saved
login for such an app is one tap away (*App Credentials*, visible only to them and to MIS / Directors).

To make another Apps Script app open **already signed in**, paste `_extras/CG_SSO.gs` into it, set its
Script Property `CG_SSO_SECRET` (Settings & Data ▸ Tools ▸ SSO secret) and tick *Single sign-on* on that
app in Apps & links.

## 6 · IDs

User `USR-0001` · Outlet `OUT-001` · Department `DEP-001` · Designation `DES-001` · Access rule `RUL-0001` ·
App `APP-001` · App credential `CRD-0001` · Document `DOC-0001` · Vault item `VLT-0001` · Certificate `CRT-0001` ·
Checklist `CHK-001` · Checklist assignment `CA-000001` · Delegated task `DT-00001` · Salary run `PAY-0001` ·
Expense `EXP-2609-0001` · Order GRN `GRNPN09260001`. Employees keep their master ID (`CG-00001`, `HQ-00001`),
one sheet per location: `Emp - Pandri`, `Emp - Chanderi`, `Emp - Bhanpuri (GFP)`, `Emp - Bhanpuri (HQ)` …

## 7 · Menu and tools

**CG One Login ▸** ① Set up / repair · ② Sync employees · ③ Import app credentials · ④ Mismatch audit ·
Sync checklist doers · Import My Apps from CG System Master V2 · Write outlet incharges into Loan & Advance
"Admin Access" · Show the web app link · Clear the cache.
The same jobs, plus *Fill the poster tabs* and *Check the attendance workbook*, are in the app under
**Settings & Data ▸ Tools**. A daily 5 AM job syncs employees and checklist doers.

## 8 · Keep in mind

- Share the **domain form of the link** (section 1). The plain one breaks on phones with several Google accounts.
- Chanderi needs its **Location Rules** row before its attendance and penalties show (section 2).
- Keep the **Loan & Advance** spreadsheet's locale on **India** (File ▸ Settings). With a US locale the sheet
  swaps day and month and a 2-day leave can look like a month-long one. One Login reads each row the way that
  fits its Total Days, but the sheet itself should hold the right dates.
- The **Outlet Order App** got *Max Level* / *Auto Fill* and *Item Request* on 29 Sep. Since 2.5.0 One Login ▸
  Orders has them too (the same screens on the same workbook).
- *Wastage Report* and *Sale Report* show as **Soon**.
- Rows typed straight into the other sheets reach the app within a few minutes — or at once with **Refresh (↻)** (section 9).

## 9 · Speed (new in 2.2)

The app now opens like a normal website:

- **Screens open at once.** Every list a person has seen (dashboard, checklist and team view, My requests,
  Leave / Advance Approval, Approvals, Attendance Report, delegated tasks, order / GRN / expense / certificate
  lists, production, profile, apps) is kept on their phone / PC and shown
  immediately; a thin amber line at the top means it is checking with the server, and the screen updates
  itself a moment later only if something changed. Right after sign-in the main screens are fetched quietly
  one after another, so even the first tap is instant. Signing out wipes these copies.
- **Nothing you type is lost.** If newer data arrives while someone is typing remarks or has a dialog open,
  it waits behind a **New data — show** button instead of redrawing the screen.
- **Actions are instant.** Approve / reject (Leave Approval, Advance Approval, Approvals) and *Mark done* on a
  checklist take effect on the screen at once; a small *Saving…* note shows until the server confirms (about a
  second) — people can go straight on to the next card. If the server refuses (e.g. someone else already
  decided it), the card comes back with the reason. Closing the page while something is still saving asks
  first. A new leave / advance / reimbursement waits for the server (so a mistake is shown on the form) and
  comes back with the updated *My requests* list in the same call.
- **Sign-in brings the dashboard** in the same call whenever its numbers are already in the server's shared
  copy (the rest follows a moment later).
- **The server keeps a shared copy** of what it reads from the other spreadsheets. A change made in the
  app refreshes only the tab it touched (one month of Loan & Advance, one attendance tab, one checklist),
  so everyone else keeps their fast copy.

| Changed where | Shows in the app |
|---|---|
| In the app (apply, approve, mark done, penalty, attendance edit …) | at once, for everyone |
| Loan & Advance sheet or its old form · Prep sheet (production) · employee counts | within 3 minutes |
| A checklist's Master tab · Outlet Orders · DSR | within 5 minutes |
| The attendance workbook · the old delegation sheet | within 10 minutes |
| Any of these, right now | **Refresh (↻)** in the top bar on that screen (it also updates the shared copy), or menu **Clear the cache** |

Tip: people on their own phones can tick **Remember me** at sign-in — the app then opens straight into
their dashboard next time (for 30 days — Settings ▸ *Remember Me Days*). On a shared outlet phone / tablet
leave it off: the sign-in then ends when the browser tab is closed (or after 12 hours).

## 10 · Leave & advance rules, only-for-yourself, Production Entry (new in 2.3)

**Advance — the same rules as the Loan & Advance app v3.1** (both apps can run side by side on the same sheet):

| From | Steps |
|---|---|
| Pandri, Chanderi … (every outlet) | Outlet Incharge → HR → **Admin (Namit Sir / Vivek Sir) only above ₹5,000** — ₹5,000 or less is approved for Admin automatically → Accounts pays |
| Bhanpuri HQ / Bhanpuri GFP | no incharge step (shows *Not needed*) → HR → **Admin at any amount** → Accounts |
| An outlet with no incharge login (today Chanderi) | waits at the incharge step, but HR sees it marked *no incharge login* and can decide it directly |
| The outlet's only incharge applying for himself | straight to HR (noted as his own request) |

- **Admin rejects** → it lands in HR's *Rejected by Admin* list: **Re-send to Admin** (same or a changed amount) or
  **Reject** (reason required) — rejected by HR, it is closed for good.
- **Tracking:** Approvals ▸ **Advance tracker** (HR, Admin, Accounts) shows every advance from the incharge step to
  *Paid* — who did what and when — this month's plus older ones until they are paid, newest first, with filters
  by step and location. The Outlet Incharge has the same tracker for his outlet (Advance Approval), and every
  employee follows his own request step by step in **My requests**.
- Requests the old form sent straight to HR from an outlet go back to the incharge first (both apps).
- Settings rows: *Advance Admin Approval Above* (5000), *Advance Admin Locations* and *Advance No Incharge Locations*
  (both Bhanpuri HQ, Bhanpuri GFP).

**Only for yourself.** Leave, advance, reimbursement and production entries are always made by the person signed
in — there is no list of other employees anywhere in them, and the server ignores any other ID. My Apps no longer
hands out the old link of an app whose work now happens here (the old Loan & Advance form, the prep sheet, the
checklists, the old HR apps) — *Open here* opens it signed in as yourself; MIS and Directors keep the old link
(Settings ▸ *Old App Links* = Yes gives it back to everyone). **Settings & Data ▸ Tools ▸ Close the old Loan &
Advance form** switches the old public form (which lists every employee with salary) to an "Apply in CG One Login"
page; *Open the old form again* undoes it. The approvers' old portal keeps working.

**Production Entry** (Kitchen ▸ Production Entry) replaces the prep sheet app: **Start a batch** (dish from
Prep_Master, raw quantity, photo) → it shows under *Cooking now* with the standard yield and time → **Finish batch**
(produced quantity, photo). Same *Daily Entry* rows and columns, Status OPEN → DONE, Time In / Time Out written the
way the old app writes them, under the signed-in person's name. Who gets it: the prep kitchen's own staff
(Settings ▸ *Prep Entry Departments* = F&B Production, at the *Prep Kitchen Outlet*); Access Control can give it to
anyone else. Production Records (incharge) shows the batches at once.

