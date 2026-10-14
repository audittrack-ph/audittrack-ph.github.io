// AuditTrack - the "database" of the demo
// ------------------------------------------------------------
// The real AuditTrack would save everything in a MySQL database.
// This demo saves it in the browser (localStorage) instead, so:
//   - changes stay when you go to another page or refresh
//   - each computer/browser has its own copy
//   - "Reset demo data" on the sign-in page puts everything back
// The lists below match the tables in our ERD.

const TODAY = "2026-10-13"; // the demo's "today". Change it to move all deadlines.
const STAGES = ["Planning", "Fieldwork", "Reporting", "Follow-up", "Closed"];
const STORAGE_KEY = "audittrack-data-v1";

// 1. Starting data (used the first time, and after a reset)
function seedData() {
  return {
    nextNumber: 45, // next engagement number, e.g. ENG-2026-045

    clients: [
      { id: "c1", name: "Bayanihan Foods Corp.", industry: "Food manufacturing", city: "Pasig City", contact: "Liza Cruz", email: "liza.cruz@bayanihanfoods.ph" },
      { id: "c2", name: "Luzon Metro Logistics Inc.", industry: "Logistics", city: "Taguig City", contact: "Ramon Dizon", email: "ramon.dizon@lmlogistics.ph" },
      { id: "c3", name: "Sampaguita Hotels Group", industry: "Hospitality", city: "Makati City", contact: "Carla Mendoza", email: "carla.mendoza@sampaguitahotels.ph" },
      { id: "c4", name: "PhilAgri Producers Cooperative", industry: "Agriculture", city: "Calamba, Laguna", contact: "Nestor Bautista", email: "nestor.bautista@philagri.coop" }
    ],

    users: [
      { id: "u1", name: "Ana Reyes", role: "Manager", title: "Audit Manager", email: "ana.reyes@audittrack.ph" },
      { id: "u2", name: "Marco Santos", role: "Auditor", title: "Lead Auditor", email: "marco.santos@audittrack.ph" },
      { id: "u3", name: "Joy Villanueva", role: "Auditor", title: "Staff Auditor", email: "joy.villanueva@audittrack.ph" },
      { id: "u4", name: "Paolo Garcia", role: "Auditor", title: "Staff Auditor", email: "paolo.garcia@audittrack.ph" },
      { id: "u5", name: "Liza Cruz", role: "Client", title: "QA Manager", clientId: "c1", email: "liza.cruz@bayanihanfoods.ph" },
      { id: "u6", name: "Ramon Dizon", role: "Client", title: "Compliance Head", clientId: "c2", email: "ramon.dizon@lmlogistics.ph" },
      { id: "u7", name: "Carla Mendoza", role: "Client", title: "Finance Director", clientId: "c3", email: "carla.mendoza@sampaguitahotels.ph" },
      { id: "u8", name: "Nestor Bautista", role: "Client", title: "General Manager", clientId: "c4", email: "nestor.bautista@philagri.coop" }
    ],

    engagements: [
      { id: "e1", ref: "ENG-2026-041", clientId: "c1", type: "ISO 22000 Food Safety", scope: "Food safety management system at the Pasig plant: cold storage, supplier control, sanitation, and product traceability.", start: "2026-09-28", due: "2026-10-30", stage: "Fieldwork", leadId: "u2", team: ["u3"] },
      { id: "e2", ref: "ENG-2026-038", clientId: "c2", type: "Data Privacy Compliance", scope: "Handling of customer and driver personal data under the Data Privacy Act of 2012.", start: "2026-09-07", due: "2026-10-16", stage: "Reporting", leadId: "u2", team: ["u4"] },
      { id: "e3", ref: "ENG-2026-044", clientId: "c3", type: "Financial Audit", scope: "FY2026 financial statements of three Makati properties.", start: "2026-10-05", due: "2026-11-20", stage: "Planning", leadId: "u3", team: ["u4"] },
      { id: "e4", ref: "ENG-2026-033", clientId: "c4", type: "Occupational Safety", scope: "Workplace safety at the Calamba packing facility under DOLE OSH standards.", start: "2026-08-11", due: "2026-09-30", stage: "Follow-up", leadId: "u4", team: ["u3"] },
      { id: "e5", ref: "ENG-2026-029", clientId: "c2", type: "Financial Audit", scope: "FY2025 financial statements.", start: "2026-06-01", due: "2026-07-31", stage: "Closed", leadId: "u2", team: ["u3"] }
    ],

    tasks: [
      { id: "t1", engId: "e1", title: "Review HACCP plan and hazard analysis", assignedTo: "u2", due: "2026-10-08", done: true },
      { id: "t2", engId: "e1", title: "Inspect cold storage temperature records", assignedTo: "u3", due: "2026-10-10", done: false },
      { id: "t3", engId: "e1", title: "Interview sanitation team leads", assignedTo: "u3", due: "2026-10-15", done: false },
      { id: "t4", engId: "e1", title: "Traceability test on 3 product lots", assignedTo: "u2", due: "2026-10-16", done: false },
      { id: "t5", engId: "e1", title: "Draft fieldwork summary", assignedTo: "u2", due: "2026-10-27", done: false },
      { id: "t6", engId: "e2", title: "Compile findings into draft report", assignedTo: "u2", due: "2026-10-09", done: true },
      { id: "t7", engId: "e2", title: "Check sample of signed consent forms", assignedTo: "u4", due: "2026-10-07", done: false },
      { id: "t8", engId: "e2", title: "Finalize report and send to client", assignedTo: "u2", due: "2026-10-16", done: false },
      { id: "t9", engId: "e3", title: "Send engagement letter", assignedTo: "u3", due: "2026-10-08", done: true },
      { id: "t10", engId: "e3", title: "Request trial balance and general ledger", assignedTo: "u3", due: "2026-10-14", done: false },
      { id: "t11", engId: "e3", title: "Set audit materiality", assignedTo: "u3", due: "2026-10-21", done: false },
      { id: "t12", engId: "e4", title: "Verify corrective actions on site", assignedTo: "u4", due: "2026-10-12", done: false },
      { id: "t13", engId: "e4", title: "Close engagement file", assignedTo: "u4", due: "2026-10-22", done: false }
    ],

    documents: [
      { id: "d1", engId: "e1", name: "HACCP Plan 2026", type: "Policy", version: 3, uploadedBy: "u5", date: "2026-09-30", status: "Submitted", file: "HACCP_Plan_2026_v3.pdf" },
      { id: "d2", engId: "e1", name: "Cold storage temperature logs (Jul to Sep)", type: "Records", version: 0, uploadedBy: null, date: null, due: "2026-10-15", status: "Requested", file: "" },
      { id: "d3", engId: "e1", name: "Supplier accreditation list", type: "Records", version: 1, uploadedBy: "u5", date: "2026-10-02", status: "Submitted", file: "Supplier_list_2026.xlsx" },
      { id: "d4", engId: "e1", name: "Pest control service reports", type: "Records", version: 0, uploadedBy: null, date: null, due: "2026-10-18", status: "Requested", file: "" },
      { id: "d5", engId: "e1", name: "Product recall procedure", type: "Policy", version: 0, uploadedBy: null, date: null, due: "2026-10-20", status: "Requested", file: "" },
      { id: "d6", engId: "e1", name: "Sanitation walkthrough photos", type: "Evidence", version: 1, uploadedBy: "u3", date: "2026-10-09", status: "Submitted", file: "sanitation_photos_oct9.zip" },
      { id: "d7", engId: "e2", name: "Privacy notice and consent forms", type: "Policy", version: 2, uploadedBy: "u6", date: "2026-09-15", status: "Submitted", file: "Privacy_notice_v2.pdf" },
      { id: "d8", engId: "e2", name: "Draft audit report", type: "Report", version: 2, uploadedBy: "u2", date: "2026-10-09", status: "Submitted", file: "ENG-2026-038_draft_v2.docx" },
      { id: "d9", engId: "e3", name: "Signed engagement letter", type: "Contract", version: 1, uploadedBy: "u3", date: "2026-10-08", status: "Submitted", file: "Engagement_letter_signed.pdf" },
      { id: "d10", engId: "e3", name: "Trial balance and general ledger", type: "Financial Statement", version: 0, uploadedBy: null, date: null, due: "2026-10-16", status: "Requested", file: "" },
      { id: "d11", engId: "e4", name: "Corrective action photos", type: "Evidence", version: 1, uploadedBy: "u4", date: "2026-10-03", status: "Submitted", file: "calamba_CA_photos.zip" }
    ],

    findings: [
      { id: "f1", engId: "e1", ref: "FND-041-01", title: "Cold storage temperature logs are incomplete", description: "Freezer 2 has no temperature log for 9 days in September. There is no record of what was done when readings went above -18°C.", clause: "ISO 22000 Clause 8.5.4", risk: "High", loggedBy: "u3", date: "2026-10-09" },
      { id: "f2", engId: "e1", ref: "FND-041-02", title: "Two supplier accreditations expired", description: "Accreditation for two packaging suppliers expired in August, but deliveries from them continued.", clause: "ISO 22000 Clause 7.1.6", risk: "Medium", loggedBy: "u2", date: "2026-10-06" },
      { id: "f3", engId: "e1", ref: "FND-041-03", title: "Handwashing signs missing", description: "Two of three handwashing stations at the production entrance have no signage.", clause: "PRP: Personal hygiene", risk: "Low", loggedBy: "u3", date: "2026-10-02" },
      { id: "f4", engId: "e2", ref: "FND-038-01", title: "Consent forms missing for some driver records", description: "14 of 60 sampled driver files have no signed consent form.", clause: "RA 10173 Sec. 12", risk: "High", loggedBy: "u4", date: "2026-09-25" },
      { id: "f5", engId: "e2", ref: "FND-038-02", title: "No data retention schedule", description: "There is no written rule for how long customer records are kept or when they are deleted.", clause: "RA 10173 Sec. 11(e)", risk: "Medium", loggedBy: "u2", date: "2026-09-29" },
      { id: "f6", engId: "e4", ref: "FND-033-01", title: "Fire exit blocked by pallets", description: "The east fire exit was blocked by stacked pallets during the site visit.", clause: "DOLE OSH Standards Rule 1943", risk: "High", loggedBy: "u4", date: "2026-08-20" }
    ],

    // corrective actions: one for each finding
    actions: [
      { id: "a1", findingId: "f1", description: "Restore daily logging with a digital data logger and record the response to every out-of-range reading.", ownerId: "u5", target: "2026-10-25", status: "Pending" },
      { id: "a2", findingId: "f2", description: "Renew both accreditations and add expiry reminders to the supplier list.", ownerId: "u5", target: "2026-10-20", status: "Submitted", response: "Both suppliers were re-accredited on Oct 10. We added an expiry date column and a reminder 30 days before.", proofFile: "Renewed_accreditation_certificates.pdf", submittedOn: "2026-10-11" },
      { id: "a3", findingId: "f3", description: "Post handwashing signs at all three stations.", ownerId: "u5", target: "2026-10-07", status: "Verified", response: "Signs installed Oct 4.", proofFile: "handwash_signs.jpg", submittedOn: "2026-10-04", verifiedBy: "u3", verifiedOn: "2026-10-08" },
      { id: "a4", findingId: "f4", description: "Collect signed consent forms for all active drivers.", ownerId: "u6", target: "2026-10-12", status: "Pending" },
      { id: "a5", findingId: "f5", description: "Write and approve a data retention schedule.", ownerId: "u6", target: "2026-10-30", status: "Pending" },
      { id: "a6", findingId: "f6", description: "Keep the east exit clear and paint no-stacking floor markings.", ownerId: "u8", target: "2026-09-15", status: "Submitted", response: "Pallet storage moved to Bay 4. Yellow floor markings painted on Sep 12.", proofFile: "east_exit_cleared.jpg", submittedOn: "2026-09-13" }
    ],

    notifications: [
      { id: "n1", userId: "u1", message: "ENG-2026-038 report is due in 3 days.", engId: "e2", read: false },
      { id: "n2", userId: "u1", message: "Paolo Garcia has an overdue task on ENG-2026-033.", engId: "e4", read: false },
      { id: "n3", userId: "u2", message: "Liza Cruz submitted proof of fix for FND-041-02.", engId: "e1", read: false },
      { id: "n4", userId: "u2", message: "Joy Villanueva logged finding FND-041-01 (High).", engId: "e1", read: true },
      { id: "n5", userId: "u3", message: "Your task \"Inspect cold storage temperature records\" is overdue.", engId: "e1", read: false },
      { id: "n6", userId: "u5", message: "New finding FND-041-01 needs your action by Oct 25.", engId: "e1", read: false },
      { id: "n7", userId: "u5", message: "Marco Santos requested 3 documents for your ISO 22000 audit.", engId: "e1", read: true },
      { id: "n8", userId: "u4", message: "Nestor Bautista submitted proof of fix for FND-033-01.", engId: "e4", read: false }
    ],

    // audit log: every change, who did it, and when
    log: [
      { id: "l1", engId: "e1", date: "2026-10-11", userId: "u5", text: "Submitted proof of fix for FND-041-02" },
      { id: "l2", engId: "e1", date: "2026-10-09", userId: "u3", text: "Logged finding FND-041-01 (High)" },
      { id: "l3", engId: "e1", date: "2026-10-09", userId: "u3", text: "Uploaded \"Sanitation walkthrough photos\"" },
      { id: "l4", engId: "e1", date: "2026-10-08", userId: "u3", text: "Verified fix for FND-041-03" },
      { id: "l5", engId: "e1", date: "2026-10-05", userId: "u2", text: "Moved engagement to Fieldwork" },
      { id: "l6", engId: "e1", date: "2026-09-28", userId: "u1", text: "Created engagement and assigned Marco Santos as lead" },
      { id: "l7", engId: "e2", date: "2026-10-09", userId: "u2", text: "Uploaded \"Draft audit report\" (v2)" },
      { id: "l8", engId: "e2", date: "2026-10-01", userId: "u2", text: "Moved engagement to Reporting" },
      { id: "l9", engId: "e3", date: "2026-10-08", userId: "u3", text: "Uploaded \"Signed engagement letter\"" },
      { id: "l10", engId: "e3", date: "2026-10-05", userId: "u1", text: "Created engagement and assigned Joy Villanueva as lead" },
      { id: "l11", engId: "e4", date: "2026-09-13", userId: "u8", text: "Submitted proof of fix for FND-033-01" }
    ]
  };
}

// 2. Load and save
let db = loadData();

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    // storage is blocked (e.g. private window): the demo still works, it just won't remember
  }
  return seedData();
}
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (error) { /* ignore */ }
}
function resetData() {
  db = seedData();
  saveData();
}

// 3. Who is signed in
function currentUser() {
  let id = null;
  try { id = localStorage.getItem("audittrack-user"); } catch (error) { /* ignore */ }
  return db.users.find((u) => u.id === id) || null;
}
function setCurrentUser(id) {
  try {
    if (id) localStorage.setItem("audittrack-user", id);
    else localStorage.removeItem("audittrack-user");
  } catch (error) { /* ignore */ }
}
const HOME_PAGE = { Manager: "dashboard.html", Auditor: "tasks.html", Client: "portal.html" };

// 4. Small helpers used by every page
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getUser(id) { return db.users.find((u) => u.id === id) || { name: "Unknown", title: "" }; }
function getClient(id) { return db.clients.find((c) => c.id === id) || { name: "Unknown client" }; }
function getEngagement(id) { return db.engagements.find((e) => e.id === id); }
function actionFor(findingId) { return db.actions.find((a) => a.findingId === findingId); }
function clientUserOf(clientId) { return db.users.find((u) => u.clientId === clientId); }
function newId(prefix) { return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1000); }

// Turns "2026-10-13" into "Oct 13, 2026" (long) or "Oct 13" (short)
function longDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return MONTHS[m - 1] + " " + d + ", " + y;
}
function shortDate(iso) {
  if (!iso) return "—";
  const [, m, d] = iso.split("-").map(Number);
  return MONTHS[m - 1] + " " + d;
}
// How many days from TODAY to a date (negative = in the past)
function daysUntil(iso) { return Math.round((Date.parse(iso) - Date.parse(TODAY)) / 86400000); }
function addDays(iso, n) { return new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10); }

// Makes text safe to put inside HTML (stops typed < > from breaking the page)
function safe(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function initials(name) { return name.split(" ").map((w) => w[0]).slice(0, 2).join(""); }

// Colored labels ("pills"). The color depends on the word.
const PILL_COLOR = {
  Planning: "info", Fieldwork: "brand", Reporting: "warn", "Follow-up": "warn", Closed: "good",
  High: "crit", Medium: "warn", Low: "info",
  Open: "crit", "Awaiting review": "info", Returned: "crit",
  Requested: "warn", Submitted: "good", Uploaded: "good"
};
function pill(word) { return "<span class='pill " + (PILL_COLOR[word] || "") + "'>" + safe(word) + "</span>"; }
function duePill(iso, done) {
  if (done) return "<span class='pill good'>Done</span>";
  const d = daysUntil(iso);
  if (d < 0) return "<span class='pill crit'>Overdue " + -d + "d</span>";
  if (d === 0) return "<span class='pill warn'>Due today</span>";
  if (d <= 3) return "<span class='pill warn'>Due in " + d + "d</span>";
  return "<span class='pill'>" + shortDate(iso) + "</span>";
}

// The status of a finding comes from its corrective action
function findingStatus(finding) {
  const action = actionFor(finding.id);
  if (!action) return "Open";
  return { Pending: "Open", Submitted: "Awaiting review", Rejected: "Returned", Verified: "Closed" }[action.status];
}

// Which engagements a user may see
function engagementsFor(user) {
  if (user.role === "Manager") return db.engagements;
  if (user.role === "Auditor") return db.engagements.filter((e) => e.leadId === user.id || e.team.includes(user.id));
  return db.engagements.filter((e) => e.clientId === user.clientId);
}
function isOnTeam(user, eng) { return user.role === "Manager" || eng.leadId === user.id || eng.team.includes(user.id); }

// Notifications and the audit log
function notify(userId, message, engId) {
  if (!userId) return;
  db.notifications.unshift({ id: newId("n"), userId, message, engId, read: false });
}
function addLog(engId, userId, text) {
  db.log.unshift({ id: newId("l"), engId, date: TODAY, userId, text });
}
