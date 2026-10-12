// For local development use http://localhost:5000.
// Before publishing, replace the production placeholder with your Render API base URL.
const API_BASE_URL = (window.API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

const form = document.getElementById("student-form");
const studentList = document.getElementById("student-list");
const searchInput = document.getElementById("search");
const notice = document.getElementById("notice");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit");
const formTitle = document.getElementById("form-title");

let students = [];
let editingId = null;
let noticeTimer;

function showNotice(message, type = "success") {
  clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.className = `notice ${type}`;
  notice.hidden = false;
  noticeTimer = setTimeout(() => { notice.hidden = true; }, 5000);
}

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
  } catch {
    throw new Error("Cannot reach the API. Check that the backend is running and the API URL is correct.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
}

function renderStudents() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = students.filter(student =>
    [student.studentId, student.name, student.email, student.department, student.semester]
      .some(value => String(value ?? "").toLowerCase().includes(query))
  );

  document.getElementById("total-count").textContent = students.length;
  document.getElementById("department-count").textContent =
    new Set(students.map(student => student.department.trim().toLowerCase())).size;
  document.getElementById("record-count").textContent =
    `${filtered.length} ${filtered.length === 1 ? "record" : "records"}`;

  if (!filtered.length) {
    studentList.innerHTML = `<tr><td colspan="4" class="empty">${query ? "No records match your search." : "No student records yet. Add your first student using the form."}</td></tr>`;
    return;
  }

  studentList.innerHTML = filtered.map(student => `
    <tr>
      <td>
        <div class="student-cell">
          <div class="avatar">${escapeHtml(initials(student.name))}</div>
          <div>
            <div class="student-name">${escapeHtml(student.name)}</div>
            <div class="student-meta">${escapeHtml(student.studentId)} · ${escapeHtml(student.email)}</div>
          </div>
        </div>
      </td>
      <td><span class="department-pill" title="${escapeHtml(student.department)}">${escapeHtml(student.department)}</span></td>
      <td><span class="semester-pill">Sem ${escapeHtml(student.semester)}</span></td>
      <td>
        <div class="actions">
          <button class="action-btn" data-action="edit" data-id="${escapeHtml(student._id)}">Edit</button>
          <button class="action-btn delete" data-action="delete" data-id="${escapeHtml(student._id)}">Delete</button>
        </div>
      </td>
    </tr>`).join("");
}

async function loadStudents() {
  studentList.innerHTML = `<tr><td colspan="4" class="empty">Loading student records…</td></tr>`;
  try {
    students = await apiRequest("/api/students");
    document.getElementById("api-status").textContent = "Connected";
    renderStudents();
  } catch (error) {
    students = [];
    document.getElementById("api-status").textContent = "Offline";
    renderStudents();
    showNotice(error.message, "error");
  }
}

function resetForm() {
  form.reset();
  editingId = null;
  formTitle.textContent = "Add a student";
  submitBtn.textContent = "＋ Add student";
  cancelEditBtn.hidden = true;
  document.getElementById("studentId").disabled = false;
}

function startEdit(student) {
  editingId = student._id;
  form.elements.studentId.value = student.studentId;
  form.elements.name.value = student.name;
  form.elements.email.value = student.email;
  form.elements.department.value = student.department;
  form.elements.semester.value = String(student.semester);
  formTitle.textContent = "Edit student";
  submitBtn.textContent = "Save changes";
  cancelEditBtn.hidden = false;
  document.getElementById("studentId").disabled = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const payload = {
    studentId: form.elements.studentId.value.trim(),
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    department: form.elements.department.value.trim(),
    semester: Number(form.elements.semester.value)
  };

  submitBtn.disabled = true;
  submitBtn.textContent = editingId ? "Saving…" : "Adding…";
  try {
    if (editingId) {
      await apiRequest(`/api/students/${encodeURIComponent(editingId)}`, {
        method: "PUT", body: JSON.stringify(payload)
      });
      showNotice("Student details updated successfully.");
    } else {
      await apiRequest("/api/students", {
        method: "POST", body: JSON.stringify(payload)
      });
      showNotice("Student added successfully.");
    }
    resetForm();
    await loadStudents();
  } catch (error) {
    showNotice(error.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingId ? "Save changes" : "＋ Add student";
  }
});

studentList.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const student = students.find(item => item._id === button.dataset.id);
  if (!student) return;

  if (button.dataset.action === "edit") {
    startEdit(student);
    return;
  }

  if (button.dataset.action === "delete") {
    if (!confirm(`Delete the record for ${student.name} (${student.studentId})?`)) return;
    button.disabled = true;
    try {
      await apiRequest(`/api/students/${encodeURIComponent(student._id)}`, { method: "DELETE" });
      if (editingId === student._id) resetForm();
      showNotice("Student record deleted successfully.");
      await loadStudents();
    } catch (error) {
      showNotice(error.message, "error");
      button.disabled = false;
    }
  }
});

searchInput.addEventListener("input", renderStudents);
cancelEditBtn.addEventListener("click", resetForm);
document.getElementById("refresh-btn").addEventListener("click", loadStudents);

async function checkHealth() {
  try {
    await apiRequest("/api/health");
    document.getElementById("api-status").textContent = "Connected";
  } catch {
    document.getElementById("api-status").textContent = "Offline";
  }
}

checkHealth();
loadStudents();
