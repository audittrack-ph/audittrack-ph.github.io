// AuditTrack - what happens on each page
// ------------------------------------------------------------
// data.js loads first and gives us "db" (all the data) and small helpers.
// This file has:
//   Part 1-5:  things every page shares (pop-up, sign-in check, header, finding cards)
//   Part 6-13: one part for each page
// Each page part follows the same idea:
//   render() draws the page from the data,
//   a click or a form changes the data, then we call saveData() and render() again.

const page = document.body.dataset.page;
const me = currentUser();

// ============ 1. Pop-up message (toast) ============
function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}
// Use this when we move to another page right after an action,
// so the message shows on the next page
function showToastOnNextPage(message) {
  try { sessionStorage.setItem("audittrack-toast", message); } catch (error) { /* ignore */ }
}
function showSavedToast() {
  try {
    const message = sessionStorage.getItem("audittrack-toast");
    if (message) { sessionStorage.removeItem("audittrack-toast"); showToast(message); }
  } catch (error) { /* ignore */ }
}

// ============ 2. Sign-in check ============
// Inner pages need someone signed in, with the right role.
// Returns false if we are sending the person somewhere else.
function checkAccess() {
  if (page === "login") return true;
  if (!me) { window.location.href = "index.html"; return false; }
  const allowed = document.body.dataset.roles.split(" ");
  if (!allowed.includes(me.role)) { window.location.href = HOME_PAGE[me.role]; return false; }
  return true;
}

// ============ 3. Header: menu, notifications, sign out ============
const MENU = {
  Manager: [["dashboard.html", "Dashboard"], ["engagements.html", "Engagements"], ["clients.html", "Clients"], ["reports.html", "Reports"]],
  Auditor: [["tasks.html", "My tasks"], ["engagements.html", "My engagements"]],
  Client: [["portal.html", "My audit"]]
};

function renderHeader() {
  const header = document.querySelector("#site-header");
  if (!header || !me) return;
  // the audit page belongs under "Engagements" in the menu
  const current = page === "audit" ? "engagements.html" : page + ".html";
  const myNotes = db.notifications.filter((n) => n.userId === me.id);
  const unread = myNotes.filter((n) => !n.read).length;

  const links = MENU[me.role].map(([href, label]) =>
    `<li><a href="${href}" ${href === current ? 'aria-current="page"' : ""}>${label}</a></li>`).join("");

  const notes = myNotes.length
    ? myNotes.slice(0, 8).map((n) =>
        `<button class="note ${n.read ? "" : "unread"}" data-note="${n.id}">${safe(n.message)}</button>`).join("")
    : `<p class="muted note-empty">No notifications yet.</p>`;

  header.innerHTML = `
    <div class="wrap nav">
      <a class="brand" href="${HOME_PAGE[me.role]}"><span class="brand-mark" aria-hidden="true">&#10003;</span>AuditTrack</a>
      <nav aria-label="Main">
        <button class="menu-toggle" aria-expanded="false" aria-controls="main-menu">Menu</button>
        <ul class="menu" id="main-menu">${links}</ul>
      </nav>
      <div class="header-right">
        <div class="bell-wrap">
          <button class="bell" id="bell" aria-label="Notifications, ${unread} unread" aria-expanded="false">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>
            ${unread ? `<span class="badge">${unread}</span>` : ""}
          </button>
          <div class="dropdown" id="bell-menu" hidden>
            <div class="dropdown-head"><strong>Notifications</strong>${unread ? `<button class="link-btn" id="read-all">Mark all read</button>` : ""}</div>
            ${notes}
          </div>
        </div>
        <span class="user"><span class="avatar small">${initials(me.name)}</span>${safe(me.name)}</span>
        <button class="btn small on-dark" id="sign-out">Sign out</button>
      </div>
    </div>`;
}

// One click listener for everything in the header
document.addEventListener("click", (event) => {
  const menuButton = event.target.closest(".menu-toggle");
  if (menuButton) {
    const isOpen = document.querySelector(".menu").classList.toggle("open");
    menuButton.setAttribute("aria-expanded", isOpen);
    return;
  }
  const bell = event.target.closest("#bell");
  const menu = document.querySelector("#bell-menu");
  if (bell) {
    menu.hidden = !menu.hidden;
    bell.setAttribute("aria-expanded", !menu.hidden);
    return;
  }
  if (event.target.closest("#read-all")) {
    db.notifications.forEach((n) => { if (n.userId === me.id) n.read = true; });
    saveData();
    renderHeader();
    document.querySelector("#bell-menu").hidden = false;
    return;
  }
  const note = event.target.closest("[data-note]");
  if (note) {
    const n = db.notifications.find((x) => x.id === note.dataset.note);
    n.read = true;
    saveData();
    // clients go to their portal, staff go to the engagement
    window.location.href = me.role === "Client" || !n.engId ? HOME_PAGE[me.role] : "audit.html?id=" + n.engId;
    return;
  }
  if (event.target.closest("#sign-out")) {
    setCurrentUser(null);
    window.location.href = "index.html";
    return;
  }
  // clicking anywhere else closes the notifications box
  if (menu && !menu.hidden && !event.target.closest(".bell-wrap")) {
    menu.hidden = true;
  }
});

// ============ 4. Small drawing helpers ============
// Bar chart rows: [label, number, color]. The longest bar is 100% wide.
function bars(rows) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return rows.map(([label, value, color]) =>
    `<div class="bar"><span>${safe(label)}</span><div class="track"><div class="fill ${color || ""}" style="width:${(value / max) * 100}%"></div></div><b>${value}</b></div>`).join("");
}
function progressBar(label, done, total) {
  const percent = total ? (done / total) * 100 : 0;
  return `<div class="progress"><span>${label}</span><div class="track"><div class="fill" style="width:${percent}%"></div></div><b>${done}/${total}</b></div>`;
}
function stageSteps(eng) {
  const current = STAGES.indexOf(eng.stage);
  return STAGES.map((s, i) =>
    `<li class="${i < current ? "done" : i === current ? "now" : ""}">${s}</li>`).join("");
}
function emptyState(text) { return `<p class="empty">${text}</p>`; }
function showError(id, text) { document.querySelector(id).textContent = text; }
function taskRow(task, showEngagement) {
  const eng = getEngagement(task.engId);
  const canTick = me.role === "Manager" || task.assignedTo === me.id || eng.leadId === me.id;
  const under = showEngagement
    ? `<a href="audit.html?id=${eng.id}#tasks">${eng.ref}</a> &middot; ${safe(getClient(eng.clientId).name)}`
    : safe(getUser(task.assignedTo).name);
  return `<li class="task ${task.done ? "done" : ""}">
      <input type="checkbox" id="chk-${task.id}" data-task="${task.id}" ${task.done ? "checked" : ""} ${canTick ? "" : "disabled"}>
      <div class="text"><label for="chk-${task.id}"><strong>${safe(task.title)}</strong></label><div class="small">${under}</div></div>
      ${duePill(task.due, task.done)}
    </li>`;
}

// Tick or untick a task (used on the audit page and My tasks page)
function toggleTask(taskId, isDone) {
  const task = db.tasks.find((t) => t.id === taskId);
  task.done = isDone;
  addLog(task.engId, me.id, (isDone ? "Completed task \"" : "Reopened task \"") + task.title + "\"");
  saveData();
  showToast(isDone ? "Task marked done" : "Task reopened");
}

// ============ 5. Finding cards (used on 3 pages) ============
let rejectingActionId = null; // which "Reject" form is open

// mode is "staff" (auditor/manager) or "client"
function findingCard(finding, mode, showEngagement) {
  const action = actionFor(finding.id);
  const eng = getEngagement(finding.engId);
  const status = findingStatus(finding);
  const owner = action.ownerId ? getUser(action.ownerId).name : getClient(eng.clientId).contact;
  const stillToDo = action.status === "Pending" || action.status === "Rejected";

  let footer = "";
  if (mode === "staff" && action.status === "Submitted" && isOnTeam(me, eng)) {
    footer = rejectingActionId === action.id
      ? `<form class="reject-form" data-action-id="${action.id}" novalidate>
           <label for="reason-${action.id}">What is still missing?</label>
           <textarea id="reason-${action.id}" name="reason" placeholder="Tell the client what to add or fix."></textarea>
           <p class="form-error"></p>
           <div class="btn-row"><button class="btn danger" type="submit">Return to client</button><button class="btn ghost" type="button" data-cancel-reject>Cancel</button></div>
         </form>`
      : `<div class="btn-row"><button class="btn good small" data-verify="${action.id}">Verify fix</button><button class="btn danger small" data-reject="${action.id}">Reject</button></div>`;
  }
  if (mode === "client" && stillToDo) {
    footer = `<form class="proof-form inset" data-action-id="${action.id}" novalidate>
        <div><label for="proof-${action.id}">How did you fix it?</label><textarea id="proof-${action.id}" name="response" placeholder="Describe what you changed."></textarea></div>
        <div class="btn-row"><label class="btn ghost small">Attach proof<input type="file" name="proof" class="proof-file"></label><span class="ref file-picked">No file chosen</span></div>
        <p class="form-error"></p>
        <div><button class="btn" type="submit">Submit proof of fix</button></div>
      </form>`;
  }
  if (mode === "client" && action.status === "Submitted") {
    footer = `<p class="muted" style="margin:0">Sent. Waiting for the auditor to check your fix.</p>`;
  }

  return `<article class="finding ${finding.risk.toLowerCase()}">
      <div class="top">
        <span class="ref">${finding.ref} &middot; ${finding.risk} risk${showEngagement ? ` &middot; <a href="audit.html?id=${eng.id}#findings">${safe(getClient(eng.clientId).name)}</a>` : ""}</span>
        ${pill(status)}
      </div>
      <h3>${safe(finding.title)}</h3>
      <p>${safe(finding.description)}</p>
      <p class="small muted">${safe(finding.clause || "No clause given")} &middot; Logged by ${safe(getUser(finding.loggedBy).name)} on ${shortDate(finding.date)}</p>
      <div class="action">
        <b>${mode === "client" ? "What you need to do" : "Corrective action"}</b>
        ${safe(action.description)}
        <div class="small muted">Owner: ${safe(owner)} &middot; Fix by ${shortDate(action.target)} ${stillToDo ? duePill(action.target) : ""}</div>
        ${action.response ? `<div class="reply"><b>Client response &middot; ${shortDate(action.submittedOn)}</b>${safe(action.response)}${action.proofFile ? `<br><span class="ref">${safe(action.proofFile)}</span>` : ""}</div>` : ""}
        ${action.status === "Rejected" ? `<div class="reply returned"><b>Returned by auditor</b>${safe(action.reason)}</div>` : ""}
        ${action.status === "Verified" ? `<p class="verified">Verified by ${safe(getUser(action.verifiedBy).name)} on ${longDate(action.verifiedOn)}</p>` : ""}
      </div>
      ${footer}
    </article>`;
}

// Verify / Reject buttons. "after" redraws the page.
function handleReviewClicks(event, after) {
  const verify = event.target.closest("[data-verify]");
  if (verify) {
    const action = db.actions.find((a) => a.id === verify.dataset.verify);
    const finding = db.findings.find((f) => f.id === action.findingId);
    action.status = "Verified";
    action.verifiedBy = me.id;
    action.verifiedOn = TODAY;
    addLog(finding.engId, me.id, "Verified fix for " + finding.ref);
    notify(action.ownerId, "Your fix for " + finding.ref + " was verified. This finding is now closed.", finding.engId);
    saveData();
    after();
    showToast(finding.ref + " verified and closed");
    return true;
  }
  const reject = event.target.closest("[data-reject]");
  if (reject) { rejectingActionId = reject.dataset.reject; after(); return true; }
  if (event.target.closest("[data-cancel-reject]")) { rejectingActionId = null; after(); return true; }
  return false;
}
function handleRejectSubmit(form, after) {
  const reason = form.elements.reason.value.trim();
  if (!reason) { form.querySelector(".form-error").textContent = "Please say what is still missing."; return; }
  const action = db.actions.find((a) => a.id === form.dataset.actionId);
  const finding = db.findings.find((f) => f.id === action.findingId);
  action.status = "Rejected";
  action.reason = reason;
  rejectingActionId = null;
  addLog(finding.engId, me.id, "Returned fix for " + finding.ref + " to the client");
  notify(action.ownerId, "Your fix for " + finding.ref + " was returned: " + reason, finding.engId);
  saveData();
  after();
  showToast(finding.ref + " returned to the client");
}

// ============ 6. Sign-in page ============
function loginPage() {
  const demo = ["u1", "u2", "u3", "u5", "u6"].map(getUser);
  document.querySelector("#demo-accounts").innerHTML = demo.map((u) => `
    <button class="account" type="button" data-user="${u.id}">
      <span class="avatar">${initials(u.name)}</span>
      <span><strong>${safe(u.name)}</strong> &middot; ${u.role === "Client" ? safe(getClient(u.clientId).name) : safe(u.title)}<br>
      <span class="muted small">${u.role === "Manager" ? "Dashboard, new audits, clients, reports" : u.role === "Auditor" ? "Tasks, documents, findings, reviews" : "Uploads documents and fixes findings"}</span></span>
    </button>`).join("");

  function signIn(user) {
    setCurrentUser(user.id);
    showToastOnNextPage("Signed in as " + user.name);
    window.location.href = HOME_PAGE[user.role];
  }

  document.querySelector("#login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const email = event.target.elements.email.value.trim().toLowerCase();
    const password = event.target.elements.password.value;
    if (!email || !password) { showError("#login-error", "Enter your email and password."); return; }
    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user) { showError("#login-error", "No account uses that email. Try one of the demo accounts below."); return; }
    signIn(user);
  });

  document.querySelector("#demo-accounts").addEventListener("click", (event) => {
    const button = event.target.closest("[data-user]");
    if (button) signIn(getUser(button.dataset.user));
  });

  document.querySelector("#reset-data").addEventListener("click", () => {
    resetData();
    setCurrentUser(null);
    showToast("Demo data reset. Everything is back to the start.");
  });
}

// ============ 7. Dashboard (Manager) ============
function dashboardPage() {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  document.querySelector("#greeting").textContent = hello + ", " + me.name.split(" ")[0];
  document.querySelector("#today-line").textContent = "Here is how every audit is doing on " + longDate(TODAY) + ".";

  const active = db.engagements.filter((e) => e.stage !== "Closed");
  const overdue = db.tasks.filter((t) => !t.done && daysUntil(t.due) < 0);
  const openFindings = db.findings.filter((f) => findingStatus(f) !== "Closed");
  const toReview = db.findings.filter((f) => findingStatus(f) === "Awaiting review");
  const dueSoon = active.filter((e) => daysUntil(e.due) <= 7);
  const auditors = db.users.filter((u) => u.role === "Auditor");

  document.querySelector("#stats").innerHTML = `
    <a class="card stat" href="engagements.html"><div class="number">${active.length}</div><div class="label">Active audits</div></a>
    <div class="card stat ${overdue.length ? "alert" : ""}"><div class="number">${overdue.length}</div><div class="label">Overdue tasks</div></div>
    <div class="card stat"><div class="number">${openFindings.length}</div><div class="label">Open findings &middot; ${toReview.length} awaiting review</div></div>
    <div class="card stat ${dueSoon.length ? "alert" : ""}"><div class="number">${dueSoon.length}</div><div class="label">Reports due within 7 days</div></div>`;

  document.querySelector("#chart-stage").innerHTML = bars([
    ["Planning", active.filter((e) => e.stage === "Planning").length, "info"],
    ["Fieldwork", active.filter((e) => e.stage === "Fieldwork").length, ""],
    ["Reporting", active.filter((e) => e.stage === "Reporting").length, "warn"],
    ["Follow-up", active.filter((e) => e.stage === "Follow-up").length, "warn"]
  ]);
  document.querySelector("#chart-risk").innerHTML = bars([
    ["High", openFindings.filter((f) => f.risk === "High").length, "crit"],
    ["Medium", openFindings.filter((f) => f.risk === "Medium").length, "warn"],
    ["Low", openFindings.filter((f) => f.risk === "Low").length, "info"]
  ]);
  document.querySelector("#chart-team").innerHTML = bars(auditors.map((u) =>
    [u.name, active.filter((e) => e.leadId === u.id || e.team.includes(u.id)).length, "good"]));

  const sorted = [...active].sort((a, b) => a.due.localeCompare(b.due));
  document.querySelector("#deadline-rows").innerHTML = sorted.map((e) => `
    <tr class="row-link" data-href="audit.html?id=${e.id}">
      <td class="ref"><a href="audit.html?id=${e.id}">${e.ref}</a></td>
      <td>${safe(getClient(e.clientId).name)}</td><td>${pill(e.stage)}</td><td>${duePill(e.due)}</td>
    </tr>`).join("") || `<tr><td colspan="4">${emptyState("No active audits.")}</td></tr>`;

  document.querySelector("#overdue-list").innerHTML = overdue.map((t) => {
    const e = getEngagement(t.engId);
    return `<li><div class="text"><strong>${safe(t.title)}</strong><div class="small"><a href="audit.html?id=${e.id}#tasks">${e.ref}</a> &middot; ${safe(getUser(t.assignedTo).name)}</div></div>${duePill(t.due)}</li>`;
  }).join("") || `<li>${emptyState("No overdue tasks. Nice work.")}</li>`;

  document.querySelector("#activity-list").innerHTML = db.log.slice(0, 8).map((l) => {
    const e = getEngagement(l.engId);
    return `<li><div class="text"><strong>${safe(getUser(l.userId).name)}</strong> <span class="muted">${safe(l.text)}</span><div class="small"><a href="audit.html?id=${e.id}#activity">${e.ref}</a> &middot; ${safe(getClient(e.clientId).name)}</div></div><span class="small muted">${shortDate(l.date)}</span></li>`;
  }).join("");
}

// Clicking anywhere on a table row with data-href opens that page
document.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-href]");
  if (row && !event.target.closest("a, button, input")) window.location.href = row.dataset.href;
});

// ============ 8. Engagements list ============
function engagementsPage() {
  let stageFilter = "All";
  const params = new URLSearchParams(window.location.search);
  const search = document.querySelector("#eng-search");
  search.value = params.get("q") || "";

  // Auditors only see their own audits and cannot create new ones
  if (me.role !== "Manager") {
    document.querySelector("#new-engagement").hidden = true;
    document.querySelector("#eng-intro").textContent = "The audits you are working on. Click a row to open it.";
  }

  // Fill the dropdowns in the "New engagement" form
  const auditors = db.users.filter((u) => u.role === "Auditor");
  document.querySelector("#ne-client").innerHTML = db.clients.map((c) => `<option value="${c.id}">${safe(c.name)}</option>`).join("");
  document.querySelector("#ne-lead").innerHTML = auditors.map((u) => `<option value="${u.id}">${safe(u.name)} &middot; ${u.title}</option>`).join("");
  document.querySelector("#ne-team").innerHTML = auditors.map((u) =>
    `<label class="choice"><input type="checkbox" name="team" value="${u.id}"> ${safe(u.name)}</label>`).join("");
  document.querySelector("#ne-start").value = TODAY;
  document.querySelector("#ne-due").value = addDays(TODAY, 30);
  if (params.get("client")) {
    document.querySelector("#ne-client").value = params.get("client");
    document.querySelector("#new-engagement").open = true;
  }

  function render() {
    const mine = engagementsFor(me);
    document.querySelector("#stage-chips").innerHTML = ["All", ...STAGES].map((s) => {
      const count = s === "All" ? mine.length : mine.filter((e) => e.stage === s).length;
      return `<button class="chip" data-stage="${s}" aria-pressed="${stageFilter === s}">${s} (${count})</button>`;
    }).join("");

    const words = search.value.trim().toLowerCase();
    const list = mine.filter((e) => {
      const text = (e.ref + " " + getClient(e.clientId).name + " " + e.type).toLowerCase();
      return (stageFilter === "All" || e.stage === stageFilter) && text.includes(words);
    });

    document.querySelector("#engagement-rows").innerHTML = list.map((e) => {
      const open = db.findings.filter((f) => f.engId === e.id && findingStatus(f) !== "Closed").length;
      return `<tr class="row-link" data-href="audit.html?id=${e.id}">
          <td class="ref"><a href="audit.html?id=${e.id}">${e.ref}</a></td>
          <td><strong>${safe(getClient(e.clientId).name)}</strong></td>
          <td>${safe(e.type)}</td>
          <td>${safe(getUser(e.leadId).name)}</td>
          <td>${e.stage === "Closed" ? shortDate(e.due) : duePill(e.due)}</td>
          <td>${pill(e.stage)}</td>
          <td class="num">${open}</td>
        </tr>`;
    }).join("") || `<tr><td colspan="7">${emptyState("No engagements match. Try another stage or search word.")}</td></tr>`;
  }

  document.querySelector("#stage-chips").addEventListener("click", (event) => {
    const chip = event.target.closest("[data-stage]");
    if (chip) { stageFilter = chip.dataset.stage; render(); }
  });
  search.addEventListener("input", render);

  document.querySelector("#new-engagement-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    const scope = form.elements.scope.value.trim();
    const start = form.elements.start.value;
    const due = form.elements.due.value;
    const leadId = form.elements.lead.value;
    if (!scope) { showError("#ne-error", "Please describe the scope of the audit."); return; }
    if (!start || !due) { showError("#ne-error", "Please pick a start date and a report due date."); return; }
    if (due <= start) { showError("#ne-error", "The report due date must be after the start date."); return; }

    const team = [...form.querySelectorAll("input[name=team]:checked")].map((box) => box.value).filter((id) => id !== leadId);
    const eng = {
      id: newId("e"),
      ref: "ENG-2026-0" + db.nextNumber,
      clientId: form.elements.client.value,
      type: form.elements.type.value,
      scope, start, due, stage: "Planning", leadId, team
    };
    db.nextNumber = db.nextNumber + 1;
    db.engagements.unshift(eng);

    // 3 starter tasks for the lead auditor
    [["Send engagement letter", 2], ["Request documents from the client", 4], ["Hold opening meeting", 6]].forEach(([title, days]) => {
      db.tasks.push({ id: newId("t"), engId: eng.id, title, assignedTo: leadId, due: addDays(start, days), done: false });
    });
    addLog(eng.id, me.id, "Created engagement and assigned " + getUser(leadId).name + " as lead");
    [leadId, ...team].forEach((id) => notify(id, "You were assigned to " + eng.ref + " (" + getClient(eng.clientId).name + ").", eng.id));
    const clientUser = clientUserOf(eng.clientId);
    if (clientUser) notify(clientUser.id, "Your " + eng.type + " audit (" + eng.ref + ") has been scheduled. Report due " + longDate(due) + ".", eng.id);
    saveData();
    showToastOnNextPage(eng.ref + " created. The team was notified.");
    window.location.href = "audit.html?id=" + eng.id;
  });

  render();
}

// ============ 9. One engagement (audit.html?id=...) ============
function auditPage() {
  const id = new URLSearchParams(window.location.search).get("id");
  const eng = getEngagement(id);
  if (!eng || !isOnTeam(me, eng)) {
    document.querySelector("main").innerHTML = `<div class="wrap page-head"><h1>Engagement not found</h1><p>It may have been removed, or you are not on its team. <a href="engagements.html">Go back to engagements</a>.</p></div>`;
    return;
  }
  document.title = eng.ref + " | AuditTrack";
  const client = getClient(eng.clientId);
  const isLead = me.role === "Manager" || eng.leadId === me.id;

  // ----- tabs -----
  let currentTab = (window.location.hash || "#overview").slice(1);
  function showTab(name) {
    currentTab = document.querySelector("#panel-" + name) ? name : "overview";
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === currentTab));
    document.querySelectorAll(".panel").forEach((p) => { p.hidden = p.id !== "panel-" + currentTab; });
    history.replaceState(null, "", "#" + currentTab);
  }
  document.querySelector(".tabs").addEventListener("click", (event) => {
    const tab = event.target.closest(".tab");
    if (tab) showTab(tab.dataset.tab);
  });
  // a link like audit.html?id=e1#findings on this same page switches the tab
  window.addEventListener("hashchange", () => showTab(window.location.hash.slice(1)));

  // fill the "Assign to" dropdown and default dates
  document.querySelector("#t-who").innerHTML = [eng.leadId, ...eng.team].map((uid) => `<option value="${uid}">${safe(getUser(uid).name)}</option>`).join("");
  document.querySelector("#t-due").value = addDays(TODAY, 5);
  document.querySelector("#rq-due").value = addDays(TODAY, 7);
  document.querySelector("#f-target").value = addDays(TODAY, 14);
  document.querySelector("#add-task").hidden = !isLead;

  function render() {
    const tasks = db.tasks.filter((t) => t.engId === eng.id);
    const docs = db.documents.filter((d) => d.engId === eng.id);
    const findings = db.findings.filter((f) => f.engId === eng.id);
    const clientDocs = docs.filter((d) => d.status === "Requested" || getUser(d.uploadedBy).role === "Client");
    const openCount = findings.filter((f) => findingStatus(f) !== "Closed").length;
    const isClosed = eng.stage === "Closed";

    // title area
    document.querySelector("#eng-ref").textContent = eng.ref + " · " + eng.type;
    document.querySelector("#eng-client").textContent = client.name;
    document.querySelector("#eng-meta").textContent = client.industry + " · " + client.city + " · Lead: " + getUser(eng.leadId).name + " · " + shortDate(eng.start) + " to " + longDate(eng.due);
    document.querySelector("#eng-stages").innerHTML = stageSteps(eng);
    const next = STAGES[STAGES.indexOf(eng.stage) + 1];
    document.querySelector("#eng-buttons").innerHTML =
      (isClosed ? pill("Closed") : duePill(eng.due)) +
      (isLead && !isClosed ? ` <button class="btn" id="next-stage">Move to ${next}</button>` : "") +
      (me.role === "Manager" ? ` <a class="btn ghost" href="reports.html?id=${eng.id}">Report</a>` : "");

    // tab labels with counts
    const counts = { tasks: tasks.filter((t) => !t.done).length, documents: docs.length, findings: openCount };
    document.querySelectorAll(".tab").forEach((t) => {
      const label = t.dataset.tab.charAt(0).toUpperCase() + t.dataset.tab.slice(1);
      t.innerHTML = label + (counts[t.dataset.tab] ? ` <span class="count">${counts[t.dataset.tab]}</span>` : "");
    });

    // overview
    document.querySelector("#eng-scope").textContent = eng.scope;
    document.querySelector("#eng-progress").innerHTML =
      progressBar("Tasks done", tasks.filter((t) => t.done).length, tasks.length) +
      progressBar("Client documents", clientDocs.filter((d) => d.status === "Submitted").length, clientDocs.length) +
      progressBar("Findings closed", findings.length - openCount, findings.length);
    const contact = clientUserOf(eng.clientId);
    document.querySelector("#eng-people").innerHTML =
      [eng.leadId, ...eng.team].map((uid, i) => {
        const u = getUser(uid);
        return `<li><span class="avatar">${initials(u.name)}</span><div class="text"><strong>${safe(u.name)}</strong><div class="small">${u.title}</div></div>${i === 0 ? "<span class='pill brand'>Lead</span>" : "<span class='pill'>Team</span>"}</li>`;
      }).join("") +
      `<li><span class="avatar">${initials(client.contact)}</span><div class="text"><strong>${safe(client.contact)}</strong><div class="small">${safe(contact ? contact.title : "Client contact")} &middot; ${safe(client.name)}</div></div><span class="pill info">Client</span></li>`;

    // tasks
    document.querySelector("#task-count").textContent = tasks.filter((t) => t.done).length + " of " + tasks.length + " done";
    const sortedTasks = [...tasks].sort((a, b) => (a.done - b.done) || a.due.localeCompare(b.due));
    document.querySelector("#task-list").innerHTML = sortedTasks.map((t) => taskRow(t, false)).join("") || `<li>${emptyState("No tasks yet.")}</li>`;

    // documents
    document.querySelector("#doc-buttons").hidden = isClosed;
    document.querySelector("#request-doc").hidden = isClosed;
    document.querySelector("#doc-rows").innerHTML = docs.map((d) => `
      <tr>
        <td><strong>${safe(d.name)}</strong>${d.file ? `<div class="ref">${safe(d.file)}</div>` : ""}</td>
        <td>${safe(d.type)}</td>
        <td class="num">${d.version ? "v" + d.version : "—"}</td>
        <td>${d.uploadedBy ? safe(getUser(d.uploadedBy).name) : "<span class='muted'>Waiting for client</span>"}</td>
        <td>${d.status === "Requested" ? "Needed " + shortDate(d.due) : shortDate(d.date)}</td>
        <td>${d.status === "Requested" ? duePill(d.due) : pill(d.status)}</td>
      </tr>`).join("") || `<tr><td colspan="6">${emptyState("No documents yet.")}</td></tr>`;

    // findings
    document.querySelector("#log-finding").hidden = isClosed;
    document.querySelector("#finding-list").innerHTML = findings.map((f) => findingCard(f, "staff", false)).join("") || emptyState("No findings logged yet.");

    // activity
    document.querySelector("#log-list").innerHTML = db.log.filter((l) => l.engId === eng.id).map((l) => {
      const u = getUser(l.userId);
      return `<li><span class="avatar">${initials(u.name)}</span><div class="text"><strong>${safe(u.name)}</strong> <span class="muted">${safe(l.text)}</span></div><span class="small muted">${shortDate(l.date)}</span></li>`;
    }).join("") || `<li>${emptyState("No activity yet.")}</li>`;

    renderHeader();
  }

  // ----- clicks -----
  document.querySelector("main").addEventListener("click", (event) => {
    if (handleReviewClicks(event, render)) return;
    if (event.target.closest("#next-stage")) {
      const next = STAGES[STAGES.indexOf(eng.stage) + 1];
      const open = db.findings.filter((f) => f.engId === eng.id && findingStatus(f) !== "Closed").length;
      if (next === "Closed" && open) { showToast("Close all findings first. " + open + " still open."); return; }
      eng.stage = next;
      addLog(eng.id, me.id, "Moved engagement to " + next);
      [eng.leadId, ...eng.team].filter((uid) => uid !== me.id).forEach((uid) => notify(uid, eng.ref + " moved to " + next + ".", eng.id));
      const contact = clientUserOf(eng.clientId);
      if (contact) notify(contact.id, "Your audit " + eng.ref + " is now in " + next + ".", eng.id);
      saveData();
      render();
      showToast(eng.ref + " moved to " + next);
    }
  });

  // ----- checkboxes and file uploads -----
  document.querySelector("main").addEventListener("change", (event) => {
    const box = event.target.closest("[data-task]");
    if (box) { toggleTask(box.dataset.task, box.checked); render(); return; }

    if (event.target.id === "evidence-upload" && event.target.files.length) {
      const fileName = event.target.files[0].name;
      const existing = db.documents.find((d) => d.engId === eng.id && d.file === fileName);
      if (existing) {
        existing.version = existing.version + 1;
        existing.date = TODAY;
        existing.uploadedBy = me.id;
        addLog(eng.id, me.id, "Uploaded a new version of \"" + existing.name + "\" (v" + existing.version + ")");
      } else {
        const niceName = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
        db.documents.push({ id: newId("d"), engId: eng.id, name: niceName, type: "Evidence", version: 1, uploadedBy: me.id, date: TODAY, status: "Submitted", file: fileName });
        addLog(eng.id, me.id, "Uploaded \"" + fileName + "\"");
      }
      event.target.value = "";
      saveData();
      render();
      showToast("Uploaded " + fileName);
    }
  });

  // ----- forms -----
  document.querySelector("main").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;

    if (form.classList.contains("reject-form")) { handleRejectSubmit(form, render); return; }

    if (form.id === "task-form") {
      const title = form.elements.title.value.trim();
      const due = form.elements.due.value;
      if (!title || !due) { showError("#task-error", "Please type the task and pick a due date."); return; }
      const who = form.elements.who.value;
      db.tasks.push({ id: newId("t"), engId: eng.id, title, assignedTo: who, due, done: false });
      addLog(eng.id, me.id, "Added task \"" + title + "\" for " + getUser(who).name);
      if (who !== me.id) notify(who, "New task on " + eng.ref + ": " + title, eng.id);
      saveData();
      form.reset();
      document.querySelector("#t-due").value = addDays(TODAY, 5);
      showError("#task-error", "");
      document.querySelector("#add-task").open = false;
      render();
      showToast("Task added");
    }

    if (form.id === "request-form") {
      const name = form.elements.name.value.trim();
      const due = form.elements.due.value;
      if (!name || !due) { showError("#request-error", "Please name the document and pick a date."); return; }
      db.documents.push({ id: newId("d"), engId: eng.id, name, type: "Records", version: 0, uploadedBy: null, date: null, due, status: "Requested", file: "" });
      addLog(eng.id, me.id, "Requested \"" + name + "\" from the client");
      const contact = clientUserOf(eng.clientId);
      if (contact) notify(contact.id, "Your auditor requested \"" + name + "\" by " + shortDate(due) + ".", eng.id);
      saveData();
      form.reset();
      document.querySelector("#rq-due").value = addDays(TODAY, 7);
      showError("#request-error", "");
      document.querySelector("#request-doc").open = false;
      render();
      showToast("Request sent to " + client.contact);
    }

    if (form.id === "finding-form") {
      const title = form.elements.title.value.trim();
      const desc = form.elements.desc.value.trim();
      const actionText = form.elements.action.value.trim();
      const target = form.elements.target.value;
      if (!title || !desc || !actionText || !target) { showError("#finding-error", "Please fill in the finding, what you saw, the corrective action, and the fix-by date."); return; }
      const number = db.findings.filter((f) => f.engId === eng.id).length + 1;
      const ref = "FND-" + eng.ref.slice(-3) + "-" + String(number).padStart(2, "0");
      const risk = form.elements.risk.value;
      const contact = clientUserOf(eng.clientId);
      const findingId = newId("f");
      db.findings.push({ id: findingId, engId: eng.id, ref, title, description: desc, clause: form.elements.clause.value.trim(), risk, loggedBy: me.id, date: TODAY });
      db.actions.push({ id: newId("a"), findingId, description: actionText, ownerId: contact ? contact.id : null, target, status: "Pending" });
      addLog(eng.id, me.id, "Logged finding " + ref + " (" + risk + ")");
      if (contact) notify(contact.id, "New finding " + ref + " needs your action by " + shortDate(target) + ".", eng.id);
      if (eng.leadId !== me.id) notify(eng.leadId, me.name + " logged finding " + ref + " (" + risk + ").", eng.id);
      saveData();
      form.reset();
      document.querySelector("#f-target").value = addDays(TODAY, 14);
      showError("#finding-error", "");
      document.querySelector("#log-finding").open = false;
      render();
      showToast(ref + " logged. " + client.contact + " was notified.");
    }
  });

  render();
  showTab(currentTab);
}

// ============ 10. My tasks (Auditor) ============
function tasksPage() {
  document.querySelector("#greeting").textContent = "Hi, " + me.name.split(" ")[0];

  function render() {
    const mine = db.tasks.filter((t) => t.assignedTo === me.id);
    const groups = [
      ["Overdue", mine.filter((t) => !t.done && daysUntil(t.due) < 0)],
      ["Due this week", mine.filter((t) => !t.done && daysUntil(t.due) >= 0 && daysUntil(t.due) <= 7)],
      ["Later", mine.filter((t) => !t.done && daysUntil(t.due) > 7)],
      ["Done", mine.filter((t) => t.done)]
    ];
    document.querySelector("#stats").innerHTML = groups.map(([label, list], i) =>
      `<div class="card stat ${i === 0 && list.length ? "alert" : ""}"><div class="number">${list.length}</div><div class="label">${label}</div></div>`).join("");

    const toReview = db.findings.filter((f) => findingStatus(f) === "Awaiting review" && isOnTeam(me, getEngagement(f.engId)));
    document.querySelector("#review-list").innerHTML = toReview.map((f) => findingCard(f, "staff", true)).join("") || emptyState("No fixes waiting. You are all caught up.");

    document.querySelector("#task-groups").innerHTML = groups.filter(([, list]) => list.length).map(([label, list]) => `
      <section class="card"><h2>${label}</h2>
        <ul class="list">${list.sort((a, b) => a.due.localeCompare(b.due)).map((t) => taskRow(t, true)).join("")}</ul>
      </section>`).join("") || `<section class="card">${emptyState("You have no tasks.")}</section>`;
    renderHeader();
  }

  const main = document.querySelector("main");
  main.addEventListener("click", (event) => handleReviewClicks(event, render));
  main.addEventListener("change", (event) => {
    const box = event.target.closest("[data-task]");
    if (box) { toggleTask(box.dataset.task, box.checked); render(); }
  });
  main.addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.target.classList.contains("reject-form")) handleRejectSubmit(event.target, render);
  });
  render();
}

// ============ 11. Clients (Manager) ============
function clientsPage() {
  const search = document.querySelector("#client-search");

  function render() {
    const words = search.value.trim().toLowerCase();
    const list = db.clients.filter((c) => (c.name + " " + c.industry + " " + c.city + " " + c.contact).toLowerCase().includes(words));
    document.querySelector("#client-rows").innerHTML = list.map((c) => {
      const engs = db.engagements.filter((e) => e.clientId === c.id);
      const active = engs.filter((e) => e.stage !== "Closed").length;
      const open = db.findings.filter((f) => engs.some((e) => e.id === f.engId) && findingStatus(f) !== "Closed").length;
      return `<tr class="row-link" data-href="engagements.html?q=${encodeURIComponent(c.name)}">
          <td><strong>${safe(c.name)}</strong><div class="small muted">${safe(c.email)}</div></td>
          <td>${safe(c.industry)}</td><td>${safe(c.city)}</td><td>${safe(c.contact)}</td>
          <td class="num">${active}</td>
          <td class="num">${open ? `<span class="pill crit">${open}</span>` : "0"}</td>
        </tr>`;
    }).join("") || `<tr><td colspan="6">${emptyState("No clients match your search.")}</td></tr>`;
  }
  search.addEventListener("input", render);

  document.querySelector("#client-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const f = event.target.elements;
    const client = {
      id: newId("c"), name: f.name.value.trim(), industry: f.industry.value.trim(),
      city: f.city.value.trim(), contact: f.contact.value.trim(), email: f.email.value.trim().toLowerCase()
    };
    if (!client.name || !client.contact || !client.email) { showError("#client-error", "Please fill in the company name, contact person, and email."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) { showError("#client-error", "That email does not look right. Example: name@company.ph"); return; }
    if (db.users.some((u) => u.email.toLowerCase() === client.email)) { showError("#client-error", "Someone already uses that email."); return; }
    db.clients.push(client);
    db.users.push({ id: newId("u"), name: client.contact, role: "Client", title: "Client contact", clientId: client.id, email: client.email });
    saveData();
    event.target.reset();
    showError("#client-error", "");
    event.target.closest("details").open = false;
    render();
    showToast(client.name + " added. " + client.contact + " can now sign in with " + client.email + ".");
  });
  render();
}

// ============ 12. Reports (Manager) ============
function reportsPage() {
  const typeSelect = document.querySelector("#r-type");
  const engSelect = document.querySelector("#r-eng");
  engSelect.innerHTML = db.engagements.map((e) => `<option value="${e.id}">${e.ref} · ${safe(getClient(e.clientId).name)}</option>`).join("");
  const fromUrl = new URLSearchParams(window.location.search).get("id");
  if (fromUrl) engSelect.value = fromUrl;
  typeSelect.addEventListener("change", () => {
    document.querySelector("#r-eng-wrap").hidden = typeSelect.value === "Monthly operations";
  });

  let csvRows = [];  // the table we can download
  let fileName = "";

  function table(headers, rows) {
    return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${
      rows.map((r) => `<tr>${r.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")
    }</tbody></table></div>`;
  }
  function numbers(items) {
    return `<div class="report-nums">${items.map(([label, value]) => `<div><span class="muted">${label}</span><b>${value}</b></div>`).join("")}</div>`;
  }

  function generate() {
    const type = typeSelect.value;
    const report = document.querySelector("#report");
    let title, meta, body;

    if (type === "Monthly operations") {
      const active = db.engagements.filter((e) => e.stage !== "Closed");
      title = "Monthly operations report, " + MONTHS[Number(TODAY.slice(5, 7)) - 1] + " " + TODAY.slice(0, 4);
      meta = "All engagements";
      fileName = "AuditTrack_monthly_operations.csv";
      csvRows = [["Ref", "Client", "Audit type", "Lead", "Stage", "Report due", "Tasks done", "Open findings"]];
      const rows = active.map((e) => {
        const t = db.tasks.filter((x) => x.engId === e.id);
        const open = db.findings.filter((f) => f.engId === e.id && findingStatus(f) !== "Closed").length;
        csvRows.push([e.ref, getClient(e.clientId).name, e.type, getUser(e.leadId).name, e.stage, e.due, t.filter((x) => x.done).length + "/" + t.length, open]);
        return [`<span class="ref">${e.ref}</span>`, safe(getClient(e.clientId).name), pill(e.stage), shortDate(e.due), t.filter((x) => x.done).length + "/" + t.length, open];
      });
      body = numbers([
        ["Active audits", active.length],
        ["Tasks done", db.tasks.filter((t) => t.done).length + "/" + db.tasks.length],
        ["Overdue tasks", db.tasks.filter((t) => !t.done && daysUntil(t.due) < 0).length],
        ["Open findings", db.findings.filter((f) => findingStatus(f) !== "Closed").length]
      ]) + table(["Engagement", "Client", "Stage", "Due", "Tasks done", "Open findings"], rows);
    } else {
      const eng = getEngagement(engSelect.value);
      const client = getClient(eng.clientId);
      const findings = db.findings.filter((f) => f.engId === eng.id);
      const tasks = db.tasks.filter((t) => t.engId === eng.id);
      const docs = db.documents.filter((d) => d.engId === eng.id);
      title = type + " report: " + client.name;
      meta = eng.ref + " · " + eng.type + " · Lead: " + getUser(eng.leadId).name + " · " + longDate(eng.start) + " to " + longDate(eng.due);
      fileName = eng.ref + "_" + type.toLowerCase().replace(/ /g, "_") + ".csv";

      csvRows = [["Finding", "Title", "Risk", "Corrective action", "Owner", "Fix by", "Status"]];
      const findingRows = findings.map((f) => {
        const a = actionFor(f.id);
        const owner = a.ownerId ? getUser(a.ownerId).name : client.contact;
        csvRows.push([f.ref, f.title, f.risk, a.description, owner, a.target, findingStatus(f)]);
        return [`<span class="ref">${f.ref}</span>`, safe(f.title), pill(f.risk), safe(owner), shortDate(a.target), pill(findingStatus(f))];
      });
      const findingTable = findings.length ? table(["Ref", "Finding", "Risk", "Owner", "Fix by", "Status"], findingRows) : emptyState("No findings for this engagement.");

      if (type === "Findings summary") {
        body = numbers([
          ["High risk", findings.filter((f) => f.risk === "High").length],
          ["Medium risk", findings.filter((f) => f.risk === "Medium").length],
          ["Low risk", findings.filter((f) => f.risk === "Low").length],
          ["Closed", findings.filter((f) => findingStatus(f) === "Closed").length + "/" + findings.length]
        ]) + findingTable;
      } else {
        const taskRows = tasks.map((t) => [safe(t.title), safe(getUser(t.assignedTo).name), shortDate(t.due), duePill(t.due, t.done)]);
        body = numbers([
          ["Stage", eng.stage],
          ["Tasks done", tasks.filter((t) => t.done).length + "/" + tasks.length],
          ["Documents on file", docs.filter((d) => d.status === "Submitted").length + "/" + docs.length],
          ["Days to report due", eng.stage === "Closed" ? "Closed" : daysUntil(eng.due)]
        ]) + `<p class="muted">Scope: ${safe(eng.scope)}</p><h3>Tasks</h3>` +
          (tasks.length ? table(["Task", "Assigned to", "Due", "Status"], taskRows) : emptyState("No tasks.")) +
          `<h3>Findings</h3>` + findingTable;
      }
    }

    report.innerHTML = `
      <div class="card-head">
        <div>
          <p class="ref" style="margin:0">Generated ${longDate(TODAY)} by ${safe(me.name)}</p>
          <h2 style="margin:.2rem 0">${safe(title)}</h2>
          <p class="small muted" style="margin:0">${safe(meta)}</p>
        </div>
        <div class="btn-row no-print">
          <button class="btn ghost small" id="download-csv">Download Excel (CSV)</button>
          <button class="btn ghost small" id="print-report">Print / Save as PDF</button>
        </div>
      </div>${body}`;
    report.hidden = false;
  }

  document.querySelector("#report-form").addEventListener("submit", (event) => {
    event.preventDefault();
    generate();
    showToast("Report generated");
  });

  document.querySelector("#report").addEventListener("click", (event) => {
    if (event.target.closest("#print-report")) window.print();
    if (event.target.closest("#download-csv")) {
      // Turn the rows into CSV text that Excel can open
      const csv = csvRows.map((row) => row.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(",")).join("\r\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast("Downloaded " + fileName);
    }
  });

  if (fromUrl) generate();
}

// ============ 13. Client portal ============
function portalPage() {
  const client = getClient(me.clientId);
  document.querySelector("#greeting").textContent = "Hi, " + me.name.split(" ")[0];
  document.querySelector("#portal-intro").textContent = client.name + " · Upload what your auditors need and fix any findings here.";

  function render() {
    const mine = db.engagements.filter((e) => e.clientId === client.id);
    const active = mine.filter((e) => e.stage !== "Closed");
    const closed = mine.filter((e) => e.stage === "Closed");

    let html = active.map((eng) => {
      const docs = db.documents.filter((d) => d.engId === eng.id && (d.status === "Requested" || getUser(d.uploadedBy).role === "Client"));
      const findings = db.findings.filter((f) => f.engId === eng.id);
      const docsLeft = docs.filter((d) => d.status === "Requested").length;
      const fixesLeft = findings.filter((f) => ["Open", "Returned"].includes(findingStatus(f))).length;
      const todo = docsLeft || fixesLeft
        ? `You have <b>${docsLeft}</b> document${docsLeft === 1 ? "" : "s"} to upload and <b>${fixesLeft}</b> finding${fixesLeft === 1 ? "" : "s"} to fix.`
        : "You are all caught up. Thank you!";

      return `
        <section class="card">
          <div class="eng-head">
            <div><p class="ref" style="margin:0">${eng.ref}</p><h2 style="margin:.2rem 0">${safe(eng.type)} audit</h2>
            <p class="small muted" style="margin:0">Lead auditor: ${safe(getUser(eng.leadId).name)} &middot; Report due ${longDate(eng.due)}</p></div>
            ${pill(eng.stage)}
          </div>
          <ol class="stages">${stageSteps(eng)}</ol>
        </section>
        <div class="callout">${todo}</div>
        <section class="card">
          <h2>Documents we need from you</h2>
          ${progressBar("Uploaded", docs.length - docsLeft, docs.length)}
          <ul class="list">${docs.map((d) => `
            <li>
              <div class="text"><strong>${safe(d.name)}</strong>
                <div class="small">${d.status === "Requested" ? "Please upload by " + longDate(d.due) : "Uploaded " + shortDate(d.date) + " · v" + d.version + " · <span class='ref'>" + safe(d.file) + "</span>"}</div>
              </div>
              <div class="btn-row">
                ${d.status === "Requested" ? duePill(d.due) : pill("Uploaded")}
                <label class="btn small ${d.status === "Requested" ? "" : "ghost"}">${d.status === "Requested" ? "Upload" : "Replace"}<input type="file" data-doc="${d.id}"></label>
              </div>
            </li>`).join("") || `<li>${emptyState("No documents requested.")}</li>`}
          </ul>
        </section>
        <section class="card stack">
          <h2 style="margin:0">Findings to fix</h2>
          ${findings.map((f) => findingCard(f, "client", false)).join("") || emptyState("No findings so far.")}
        </section>`;
    }).join("");

    if (!active.length) html = `<section class="card">${emptyState("You have no active audits right now.")}</section>`;
    if (closed.length) {
      html += `<section class="card"><h2>Past audits</h2><ul class="list">${closed.map((e) =>
        `<li><div class="text"><strong>${safe(e.type)}</strong><div class="small">${e.ref} &middot; finished ${longDate(e.due)}</div></div>${pill("Closed")}</li>`).join("")}</ul></section>`;
    }
    document.querySelector("#portal").innerHTML = html;
    renderHeader();
  }

  const portal = document.querySelector("#portal");

  // Uploading a requested document, or picking a proof file
  portal.addEventListener("change", (event) => {
    const input = event.target;
    if (input.classList.contains("proof-file")) {
      input.closest(".btn-row").querySelector(".file-picked").textContent = input.files.length ? input.files[0].name : "No file chosen";
      return;
    }
    if (input.dataset.doc && input.files.length) {
      const doc = db.documents.find((d) => d.id === input.dataset.doc);
      const eng = getEngagement(doc.engId);
      doc.file = input.files[0].name;
      doc.status = "Submitted";
      doc.uploadedBy = me.id;
      doc.date = TODAY;
      doc.version = doc.version + 1;
      addLog(eng.id, me.id, "Uploaded \"" + doc.name + "\" (v" + doc.version + ")");
      notify(eng.leadId, me.name + " uploaded \"" + doc.name + "\" for " + eng.ref + ".", eng.id);
      saveData();
      render();
      showToast("Uploaded " + doc.file + ". Your auditor was notified.");
    }
  });

  // Sending proof of a fix
  portal.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    const response = form.elements.response.value.trim();
    if (!response) { form.querySelector(".form-error").textContent = "Please describe how you fixed it."; return; }
    const action = db.actions.find((a) => a.id === form.dataset.actionId);
    const finding = db.findings.find((f) => f.id === action.findingId);
    const eng = getEngagement(finding.engId);
    const file = form.elements.proof.files[0];
    action.status = "Submitted";
    action.response = response;
    action.proofFile = file ? file.name : "";
    action.submittedOn = TODAY;
    action.reason = "";
    addLog(eng.id, me.id, "Submitted proof of fix for " + finding.ref);
    notify(eng.leadId, me.name + " submitted proof of fix for " + finding.ref + ".", eng.id);
    saveData();
    render();
    showToast("Proof sent. " + getUser(eng.leadId).name + " will review it.");
  });

  render();
}

// ============ Start ============
// Find which page we are on and run its part
if (checkAccess()) {
  renderHeader();
  const pages = {
    login: loginPage, dashboard: dashboardPage, engagements: engagementsPage, audit: auditPage,
    tasks: tasksPage, clients: clientsPage, reports: reportsPage, portal: portalPage
  };
  if (pages[page]) pages[page]();
  showSavedToast();
}

// Footer year updates automatically
const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();
