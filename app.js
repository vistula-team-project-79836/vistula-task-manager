const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");
const submitButton = document.getElementById("task-submit");
const cancelButton = document.getElementById("task-cancel");
const formHeading = document.getElementById("form-heading");
const taskList = document.getElementById("task-list");
const statusMessage = document.getElementById("status-message");

let config = null;
let editingTask = null;

function showStatus(text, type = "info") {
  statusMessage.textContent = text;
  statusMessage.className = type;
}

async function loadConfig() {
  const response = await fetch("config.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load config.json (HTTP ${response.status})`);
  }
  const data = await response.json();
  if (!data.supabaseUrl || !data.supabasePublishableKey || !data.tableName) {
    throw new Error("config.json must contain supabaseUrl, supabasePublishableKey and tableName");
  }
  return {
    baseUrl: data.supabaseUrl.replace(/\/+$/, "") + "/rest/v1",
    key: data.supabasePublishableKey,
    table: data.tableName,
  };
}

async function api(method, query, body, prefer) {
  if (!config) throw new Error("Supabase configuration is not loaded");
  const headers = {
    apikey: config.key,
    "Content-Type": "application/json",
  };
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(`${config.baseUrl}/${config.table}${query}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const error = await response.json();
      detail = error.message || error.hint || JSON.stringify(error);
    } catch {}
    throw new Error(`${method} failed (HTTP ${response.status}): ${detail}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function getAllTasks() {
  return api("GET", "?select=*&order=id.asc");
}

async function getTask(id) {
  const rows = await api("GET", `?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!rows.length) throw new Error(`Task ${id} no longer exists`);
  return rows[0];
}

function createTask(title, description) {
  return api("POST", "", { title, description, completed: false }, "return=representation");
}

function saveTask(task) {
  return api("PUT", `?id=eq.${encodeURIComponent(task.id)}`, task, "return=representation");
}

function setCompleted(id, completed) {
  return api("PATCH", `?id=eq.${encodeURIComponent(id)}`, { completed }, "return=representation");
}

function deleteTask(id) {
  return api("DELETE", `?id=eq.${encodeURIComponent(id)}`);
}

function renderTasks(tasks) {
  taskList.replaceChildren();

  if (!tasks.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No tasks yet. Add one above.";
    taskList.append(empty);
    return;
  }

  for (const task of tasks) {
    taskList.append(renderTask(task));
  }
}

function renderTask(task) {
  const item = document.createElement("div");
  item.className = "task-item" + (task.completed ? " completed" : "");
  item.dataset.id = task.id;

  const title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.title;

  const description = document.createElement("p");
  description.className = "task-description";
  description.textContent = task.description || "";

  const status = document.createElement("span");
  status.className = "task-status";
  status.textContent = task.completed ? "Completed" : "Incomplete";

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(
    makeButton("toggle-task", task.completed ? "Mark incomplete" : "Mark complete"),
    makeButton("edit-task", "Edit"),
    makeButton("delete-task", "Delete"),
  );

  item.append(title, description, status, actions);
  return item;
}

function makeButton(className, text) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  return button;
}

function startEditing(task) {
  editingTask = task;
  titleInput.value = task.title;
  descriptionInput.value = task.description || "";
  formHeading.textContent = `Edit task #${task.id}`;
  submitButton.textContent = "Save changes";
  cancelButton.hidden = false;
  titleInput.focus();
}

function stopEditing() {
  editingTask = null;
  form.reset();
  formHeading.textContent = "Add a task";
  submitButton.textContent = "Add task";
  cancelButton.hidden = true;
}

async function refresh() {
  const tasks = await getAllTasks();
  renderTasks(tasks);
  return tasks;
}

async function run(busyText, action) {
  showStatus(busyText);
  try {
    const message = await action();
    showStatus(message, "success");
  } catch (error) {
    console.error(error);
    showStatus(`Error: ${error.message}`, "error");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!title) {
    showStatus("Error: the task title is required.", "error");
    titleInput.focus();
    return;
  }

  submitButton.disabled = true;
  run("Saving…", async () => {
    if (editingTask) {
      await saveTask({ ...editingTask, title, description });
      stopEditing();
      await refresh();
      return "Task updated.";
    }
    await createTask(title, description);
    form.reset();
    await refresh();
    return "Task added.";
  }).finally(() => {
    submitButton.disabled = false;
  });
});

cancelButton.addEventListener("click", () => {
  stopEditing();
  showStatus("Edit cancelled.");
});

taskList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const item = button.closest(".task-item");
  const id = item.dataset.id;

  if (button.classList.contains("edit-task")) {
    run("Loading task…", async () => {
      startEditing(await getTask(id));
      return `Editing task #${id}.`;
    });
  } else if (button.classList.contains("toggle-task")) {
    const completed = !item.classList.contains("completed");
    run("Updating…", async () => {
      await setCompleted(id, completed);
      await refresh();
      return completed ? "Task marked as completed." : "Task marked as incomplete.";
    });
  } else if (button.classList.contains("delete-task")) {
    if (!confirm("Delete this task?")) return;
    run("Deleting…", async () => {
      await deleteTask(id);
      if (editingTask && String(editingTask.id) === id) stopEditing();
      await refresh();
      return "Task deleted.";
    });
  }
});

run("Loading tasks…", async () => {
  config = await loadConfig();
  const tasks = await refresh();
  return `Loaded ${tasks.length} task(s).`;
});
