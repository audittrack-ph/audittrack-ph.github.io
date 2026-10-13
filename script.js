// AuditTrack - small helper script
// This is a front-end demo only: nothing is saved, so refreshing a page resets it.

// 1. Pop-up message at the bottom of the screen
function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

// 2. Mobile menu button: shows and hides the navigation on small screens
const toggle = document.querySelector(".menu-toggle");
const menu = document.querySelector(".menu");
if (toggle && menu) {
  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", isOpen);
  });
}

// 3. Sign-in form: goes to the page for the role you picked
const loginForm = document.querySelector("#login-form");
if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    window.location.href = loginForm.elements["role"].value;
  });
}

// 4. New engagement form: adds a new row to the top of the table
const engForm = document.querySelector("#new-engagement-form");
if (engForm) {
  let nextNumber = 45;
  engForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const ref = "ENG-2026-0" + nextNumber;
    nextNumber = nextNumber + 1;
    const client = engForm.elements["client"].value;
    const type = engForm.elements["type"].value;
    const lead = engForm.elements["lead"].value;
    const due = new Date(engForm.elements["due"].value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const row = document.createElement("tr");
    row.innerHTML =
      "<td class='ref'>" + ref + "</td><td><strong>" + client + "</strong></td><td>" + type +
      "</td><td>" + lead + "</td><td>" + due + "</td><td><span class='pill info'>Planning</span></td>";
    document.querySelector("#engagement-rows").prepend(row);
    engForm.closest("details").open = false;
    showToast(ref + " created. " + lead + " was notified.");
  });
}

// 5. Tabs on the audit page: show one panel, hide the others
const tabs = document.querySelectorAll(".tab");
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".panel").forEach((panel) => {
      panel.hidden = panel.id !== tab.dataset.tab;
    });
  });
});

// 6. Task checkboxes: cross out the task and update "x of y done"
const taskBoxes = document.querySelectorAll(".task input[type='checkbox']");
taskBoxes.forEach((box) => {
  box.addEventListener("change", () => {
    box.closest(".task").classList.toggle("done", box.checked);
    const doneCount = document.querySelectorAll(".task input:checked").length;
    document.querySelector("#task-count").textContent = doneCount + " of " + taskBoxes.length + " done";
    showToast(box.checked ? "Task marked done" : "Task reopened");
  });
});

// 7. Verify or reject a client's fix
document.querySelectorAll(".verify").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".finding");
    const status = card.querySelector(".status");
    status.textContent = "Closed";
    status.className = "pill good status";
    card.querySelector(".review").innerHTML = "<strong style='color:var(--good)'>Verified by Marco Santos today</strong>";
    showToast("Fix verified. The finding is now closed.");
  });
});
document.querySelectorAll(".reject").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".finding");
    const status = card.querySelector(".status");
    status.textContent = "Returned";
    status.className = "pill crit status";
    card.querySelector(".review").innerHTML = "<strong style='color:var(--crit)'>Returned to client for more proof</strong>";
    showToast("Fix returned to the client");
  });
});

// 8. Log finding form: adds a new finding card to the top of the list
const findingForm = document.querySelector("#finding-form");
if (findingForm) {
  let findingNumber = 4;
  findingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const risk = findingForm.elements["risk"].value;
    const fixBy = new Date(findingForm.elements["date"].value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const card = document.createElement("article");
    card.className = "finding " + risk.toLowerCase();
    card.innerHTML =
      "<div class='top'><span class='ref'>FND-041-0" + findingNumber + " &middot; " + risk + " risk</span><span class='pill crit'>Open</span></div>" +
      "<h3>" + findingForm.elements["title"].value + "</h3>" +
      "<p>" + findingForm.elements["desc"].value + "</p>" +
      "<div class='action'><b>Corrective action</b>" + findingForm.elements["action"].value + " Owner: Liza Cruz &middot; Fix by " + fixBy + "</div>";
    document.querySelector("#finding-list").prepend(card);
    findingNumber = findingNumber + 1;
    findingForm.reset();
    findingForm.closest("details").open = false;
    showToast("Finding logged. The client was notified.");
  });
}

// 9. Upload buttons: show the chosen file name
document.querySelectorAll(".upload").forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.files.length) return;
    const fileName = input.files[0].name;
    const item = input.closest("li");

    if (item && item.classList.contains("needed")) {
      // Client portal: mark this document as uploaded and move the progress bar
      item.classList.remove("needed");
      item.querySelector(".file-name").textContent = fileName;
      input.closest("label").outerHTML = "<span class='pill good'>Uploaded</span>";
      const total = 5; // number of documents on the checklist
      const left = document.querySelectorAll("li.needed").length;
      document.querySelector("#doc-count").textContent = (total - left) + "/" + total;
      document.querySelector("#doc-bar").style.width = ((total - left) / total) * 100 + "%";
    } else if (input.closest(".proof-form")) {
      // Proof of fix: show the file name beside the button
      input.closest(".btn-row").insertAdjacentHTML("beforeend", "<span class='ref'>" + fileName + "</span>");
    } else {
      // Audit page: add the file to the documents list
      const list = input.closest(".card").querySelector(".list");
      list.insertAdjacentHTML("afterbegin",
        "<li><div class='text'><strong>" + fileName + "</strong><div class='small'>Evidence &middot; v1 &middot; Marco Santos &middot; today</div></div><span class='pill good'>Submitted</span></li>");
    }
    showToast("Uploaded " + fileName);
  });
});

// 10. Client sends proof of fix
document.querySelectorAll(".proof-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const card = form.closest(".finding");
    const status = card.querySelector(".status");
    status.textContent = "Awaiting review";
    status.className = "pill info status";
    form.outerHTML = "<p class='muted'>Sent. Waiting for the auditor to check your fix.</p>";
    showToast("Proof sent to your auditor");
  });
});

// 11. Reports: show the report when you press Generate
const reportForm = document.querySelector("#report-form");
if (reportForm) {
  reportForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const type = document.querySelector("#r-type").value;
    document.querySelector("#report-title").textContent = type + " report: Bayanihan Foods Corp.";
    document.querySelector("#report").hidden = false;
    showToast("Report generated");
  });
  document.querySelectorAll(".export").forEach((button) => {
    button.addEventListener("click", () => showToast(button.textContent + " (demo only)"));
  });
}

// 12. Footer year updates automatically
const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();
