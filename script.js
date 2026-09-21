/* ==========================================================================
   Smart University Attendance Tracker — shared script
   Loaded by every page in /attendance-tracker/
   Every function checks for the DOM elements it needs before using them,
   so this one file can safely run on pages that don't contain them.
   ========================================================================== */

/* ---------------- Storage keys ---------------- */

const ATTENDANCE_KEY = "attendance";
const SETTINGS_KEY = "settings";
const HISTORY_KEY = "attendanceHistory";

/* ---------------- Default data (used only when localStorage is empty) ---------------- */

const DEFAULT_ATTENDANCE = {
  Mathematics: { present: 18, absent: 4 },
  "Engineering Chemistry": { present: 15, absent: 6 },
  Physics: { present: 19, absent: 5 },
  Programming: { present: 17, absent: 4 }
};

const DEFAULT_SETTINGS = {
  name: "Your Name",
  roll: "123456",
  course: "B.Tech AI & Data Science",
  semester: "1st Semester",
  target: 75
};

/* In-memory copies, loaded from localStorage on every page load */
let attendance = {};
let settings = {};
let history = [];

/* ==========================================================================
   Attendance data — the single source of truth every page reads from
   ========================================================================== */

function loadAttendance() {
  const saved = localStorage.getItem(ATTENDANCE_KEY);
  if (saved) {
    attendance = JSON.parse(saved);
  } else {
    attendance = JSON.parse(JSON.stringify(DEFAULT_ATTENDANCE));
    saveAttendance();
  }
  return attendance;
}

function saveAttendance() {
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendance));
}

/* Marks one class as present/absent for a subject, persists it, and logs history */
function updateAttendance(subject, status) {
  if (!attendance[subject]) return;

  if (status === "present") {
    attendance[subject].present += 1;
  } else if (status === "absent") {
    attendance[subject].absent += 1;
  }

  saveAttendance();
  addHistoryRecord(subject, status);
}

/* Stats for a single subject: present, absent, total, percentage, status */
function getSubjectStats(subject) {
  const record = attendance[subject] || { present: 0, absent: 0 };
  const total = record.present + record.absent;
  const percentage = total === 0 ? 0 : (record.present / total) * 100;
  return {
    present: record.present,
    absent: record.absent,
    total,
    percentage,
    status: getStatus(percentage)
  };
}

/* Combined stats across every subject */
function getOverallStats() {
  let present = 0;
  let absent = 0;

  Object.keys(attendance).forEach((subject) => {
    present += attendance[subject].present;
    absent += attendance[subject].absent;
  });

  const total = present + absent;
  const percentage = total === 0 ? 0 : (present / total) * 100;

  return { present, absent, total, percentage, status: getStatus(percentage) };
}

/* "Good" once percentage reaches the target from Settings, otherwise "Low" */
function getStatus(percentage) {
  const target = settings.target || DEFAULT_SETTINGS.target;
  return percentage >= target ? "Good" : "Low";
}

/* ==========================================================================
   Settings
   ========================================================================== */

function loadSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  settings = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  if (!saved) saveSettings();
  return settings;
}

function saveSettings(newSettings) {
  if (newSettings) settings = newSettings;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/* ==========================================================================
   Attendance history — separate log, independent of the attendance totals
   ========================================================================== */

function loadHistory() {
  const saved = localStorage.getItem(HISTORY_KEY);
  history = saved ? JSON.parse(saved) : [];
  return history;
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addHistoryRecord(subject, status) {
  const now = new Date();
  history.unshift({
    date: formatDate(now),
    time: formatTime(now),
    subject,
    status,
    timestamp: now.getTime()
  });
  saveHistory();
}

/* Clears the history log only — attendance totals are untouched */
function clearHistory() {
  history = [];
  saveHistory();
  displayHistory();
}

function formatDate(date) {
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(date) {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

/* ==========================================================================
   Dashboard page (index.html)
   ========================================================================== */

function updateDashboard() {
  const percentageEl = document.getElementById("overallPercentage");
  if (!percentageEl) return; // not on the dashboard page

  const overall = getOverallStats();

  percentageEl.textContent = overall.percentage.toFixed(1) + "%";

  const attendedEl = document.getElementById("overallAttended");
  if (attendedEl) attendedEl.textContent = `${overall.present} / ${overall.total} classes attended`;

  const presentEl = document.getElementById("overallPresent");
  if (presentEl) presentEl.textContent = overall.present;

  const absentEl = document.getElementById("overallAbsent");
  if (absentEl) absentEl.textContent = overall.absent;

  const totalEl = document.getElementById("overallTotal");
  if (totalEl) totalEl.textContent = overall.total;

  const statusEl = document.getElementById("overallStatus");
  if (statusEl) {
    statusEl.textContent = overall.status;
    statusEl.className = "badge " + (overall.status === "Good" ? "badge-good" : "badge-low");
  }

  const progressEl = document.getElementById("overallProgressFill");
  if (progressEl) {
    progressEl.style.width = Math.min(overall.percentage, 100) + "%";
    progressEl.className = "progress-fill " + (overall.status === "Good" ? "success" : "warning");
  }

  const nameEl = document.getElementById("studentName");
  if (nameEl) nameEl.textContent = settings.name;

  const rollEl = document.getElementById("studentRoll");
  if (rollEl) rollEl.textContent = settings.roll;

  const courseEl = document.getElementById("studentCourse");
  if (courseEl) courseEl.textContent = settings.course;

  const semesterEl = document.getElementById("studentSemester");
  if (semesterEl) semesterEl.textContent = settings.semester || "";

  renderDashboardSubjectList();
}

/* Small subject preview list shown on the dashboard */
function renderDashboardSubjectList() {
  const container = document.getElementById("dashboardSubjectList");
  if (!container) return;

  container.innerHTML = "";

  Object.keys(attendance).forEach((subject) => {
    const stats = getSubjectStats(subject);
    const row = document.createElement("div");
    row.className = "chart-bar-row";
    row.innerHTML = `
      <span class="chart-bar-label">${subject}</span>
      <div class="progress-track">
        <div class="progress-fill ${stats.status === "Good" ? "success" : "warning"}" style="width:${Math.min(stats.percentage, 100)}%"></div>
      </div>
      <span class="chart-bar-value">${stats.percentage.toFixed(1)}%</span>
    `;
    container.appendChild(row);
  });
}

/* ==========================================================================
   Subjects page (subjects.html)
   ========================================================================== */

function updateSubjectsPage() {
  const container = document.getElementById("subjectsList");
  if (!container) return; // not on the subjects page

  container.innerHTML = "";

  Object.keys(attendance).forEach((subject) => {
    const stats = getSubjectStats(subject);
    const card = document.createElement("div");
    card.className = "card subject-card";
    card.innerHTML = `
      <div class="subject-card-head">
        <div>
          <h3>${subject}</h3>
          <span class="badge ${stats.status === "Good" ? "badge-good" : "badge-low"}">${stats.status}</span>
        </div>
        <div class="subject-pct">${stats.percentage.toFixed(1)}%</div>
      </div>
      <div class="progress-track">
        <div class="progress-fill ${stats.status === "Good" ? "success" : "warning"}" style="width:${Math.min(stats.percentage, 100)}%"></div>
      </div>
      <div class="subject-stats-row">
        <span>Present: <strong>${stats.present}</strong></span>
        <span>Absent: <strong>${stats.absent}</strong></span>
        <span>Total: <strong>${stats.total}</strong></span>
      </div>
    `;
    container.appendChild(card);
  });
}

/* ==========================================================================
   Add Attendance page (add-attendance.html)
   ========================================================================== */

let selectedStatus = null; // "present" | "absent" | null

function initAddAttendancePage() {
  const subjectSelect = document.getElementById("subjectSelect");
  if (!subjectSelect) return; // not on the add-attendance page

  populateSubjectSelect(subjectSelect);

  const presentBtn = document.getElementById("presentBtn");
  const absentBtn = document.getElementById("absentBtn");
  const saveBtn = document.getElementById("saveAttendanceBtn");
  const messageEl = document.getElementById("attendanceMessage");

  function setSelectedStatus(status) {
    selectedStatus = status;
    if (presentBtn) presentBtn.classList.toggle("selected-present", status === "present");
    if (absentBtn) absentBtn.classList.toggle("selected-absent", status === "absent");
  }

  if (presentBtn) presentBtn.addEventListener("click", () => setSelectedStatus("present"));
  if (absentBtn) absentBtn.addEventListener("click", () => setSelectedStatus("absent"));

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const subject = subjectSelect.value;

      if (!subject) {
        showMessage(messageEl, "Please select a subject before saving.", "danger");
        return;
      }

      if (!selectedStatus) {
        showMessage(messageEl, "Please choose Present or Absent before saving.", "danger");
        return;
      }

      updateAttendance(subject, selectedStatus);
      showMessage(messageEl, `Marked ${subject} as ${selectedStatus === "present" ? "Present" : "Absent"}.`, "success");

      setSelectedStatus(null);
    });
  }
}

function populateSubjectSelect(selectEl) {
  const currentValue = selectEl.value;
  selectEl.innerHTML = '<option value="">-- Select Subject --</option>';
  Object.keys(attendance).forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    selectEl.appendChild(option);
  });
  if (currentValue) selectEl.value = currentValue;
}

function showMessage(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = "alert visible alert-" + type;
}

/* ==========================================================================
   History page (history.html)
   ========================================================================== */

function displayHistory() {
  const container = document.getElementById("historyList");
  if (!container) return; // not on the history page

  if (history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🗒️</div>
        <p>No attendance records yet. Mark attendance to see it appear here.</p>
      </div>
    `;
    return;
  }

  const rows = history
    .map(
      (record) => `
      <tr>
        <td>${record.date}</td>
        <td>${record.time}</td>
        <td>${record.subject}</td>
        <td><span class="badge ${record.status === "present" ? "badge-present" : "badge-absent"}">${
          record.status === "present" ? "Present" : "Absent"
        }</span></td>
      </tr>`
    )
    .join("");

  container.innerHTML = `
    <div class="history-table-wrap">
      <table class="history-table">
        <thead>
          <tr><th>Date</th><th>Time</th><th>Subject</th><th>Status</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function initHistoryPage() {
  const container = document.getElementById("historyList");
  if (!container) return; // not on the history page

  displayHistory();

  const clearBtn = document.getElementById("clearHistoryBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (history.length === 0) return;
      const confirmed = window.confirm(
        "Clear all attendance history? This only removes the history log — your subject attendance totals will not change."
      );
      if (confirmed) clearHistory();
    });
  }
}

/* ==========================================================================
   Charts / Analytics page (charts.html)
   ========================================================================== */

function updateChartsPage() {
  const container = document.getElementById("chartsList");
  if (!container) return; // not on the charts page

  container.innerHTML = "";

  Object.keys(attendance).forEach((subject) => {
    const stats = getSubjectStats(subject);
    const row = document.createElement("div");
    row.className = "chart-bar-row";
    row.innerHTML = `
      <span class="chart-bar-label">${subject}</span>
      <div class="progress-track chart-target-line">
        <div class="progress-fill ${stats.status === "Good" ? "success" : "warning"}" style="width:${Math.min(stats.percentage, 100)}%"></div>
        <div class="chart-target-marker" style="left:${Math.min(settings.target, 100)}%"></div>
      </div>
      <span class="chart-bar-value">${stats.percentage.toFixed(1)}%</span>
    `;
    container.appendChild(row);
  });

  const targetLabel = document.getElementById("chartTargetLabel");
  if (targetLabel) targetLabel.textContent = settings.target + "%";
}

/* ==========================================================================
   Target Calculator page (target.html)
   ========================================================================== */

function initTargetPage() {
  const form = document.getElementById("targetForm");
  if (!form) return; // not on the target calculator page

  const subjectSelect = document.getElementById("targetSubjectSelect");
  const targetInput = document.getElementById("targetPercentInput");
  const resultEl = document.getElementById("targetResult");

  populateSubjectSelect(subjectSelect);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculateTarget(subjectSelect.value, targetInput.value, resultEl);
  });
}

function calculateTarget(subject, targetRaw, resultEl) {
  if (!resultEl) return;

  if (!subject) {
    resultEl.className = "alert visible alert-danger";
    resultEl.innerHTML = "Please select a subject.";
    return;
  }

  const target = Number(targetRaw);

  if (targetRaw === "" || Number.isNaN(target) || target <= 0 || target > 100) {
    resultEl.className = "alert visible alert-danger";
    resultEl.innerHTML = "Please enter a valid target between 1 and 100.";
    return;
  }

  const stats = getSubjectStats(subject);
  const current = stats.percentage;

  let message = `Current attendance: <strong>${current.toFixed(1)}%</strong><br>Target: <strong>${target}%</strong><br><br>`;

  if (current >= target) {
    message += "You have already reached your target.";
    resultEl.className = "alert visible alert-success";
    resultEl.innerHTML = message;
    return;
  }

  if (target === 100) {
    if (stats.absent > 0) {
      message +=
        "100% cannot be reached anymore — you already have " +
        stats.absent +
        " absence(s) recorded, and attending every future class cannot erase them.";
      resultEl.className = "alert visible alert-danger";
      resultEl.innerHTML = message;
      return;
    }
  }

  // x = ceil( (target * total - 100 * present) / (100 - target) )
  const neededClasses = Math.ceil((target * stats.total - 100 * stats.present) / (100 - target));

  message += `You need approximately <strong>${neededClasses}</strong> consecutive present class${
    neededClasses === 1 ? "" : "es"
  } to reach ${target}%.`;
  resultEl.className = "alert visible alert-info";
  resultEl.innerHTML = message;
}

/* ==========================================================================
   Settings page (settings.html)
   ========================================================================== */

function initSettingsPage() {
  const form = document.getElementById("settingsForm");
  if (!form) return; // not on the settings page

  const nameInput = document.getElementById("settingsName");
  const rollInput = document.getElementById("settingsRoll");
  const courseInput = document.getElementById("settingsCourse");
  const semesterInput = document.getElementById("settingsSemester");
  const targetInput = document.getElementById("settingsTarget");
  const messageEl = document.getElementById("settingsMessage");

  if (nameInput) nameInput.value = settings.name || "";
  if (rollInput) rollInput.value = settings.roll || "";
  if (courseInput) courseInput.value = settings.course || "";
  if (semesterInput) semesterInput.value = settings.semester || "";
  if (targetInput) targetInput.value = settings.target || DEFAULT_SETTINGS.target;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const targetValue = Number(targetInput.value);
    if (Number.isNaN(targetValue) || targetValue <= 0 || targetValue > 100) {
      showMessage(messageEl, "Default target must be a number between 1 and 100.", "danger");
      return;
    }

    saveSettings({
      name: nameInput.value.trim() || DEFAULT_SETTINGS.name,
      roll: rollInput.value.trim() || DEFAULT_SETTINGS.roll,
      course: courseInput.value.trim() || DEFAULT_SETTINGS.course,
      semester: semesterInput.value.trim(),
      target: targetValue
    });

    showMessage(messageEl, "Settings saved successfully!", "success");
  });
}

/* ==========================================================================
   Shared navigation (mobile sidebar toggle)
   ========================================================================== */

function initNav() {
  const hamburger = document.getElementById("hamburgerBtn");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (!hamburger || !sidebar || !overlay) return;

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  }

  hamburger.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("open");
  });

  overlay.addEventListener("click", closeSidebar);
}

/* ==========================================================================
   Init — runs on every page
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  loadAttendance();
  loadSettings();
  loadHistory();

  initNav();

  updateDashboard();
  updateSubjectsPage();
  updateChartsPage();
  initAddAttendancePage();
  initHistoryPage();
  initTargetPage();
  initSettingsPage();
});