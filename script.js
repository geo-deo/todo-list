/**
 * Task model:
 * { id, text, done, createdAt, priority: "low"|"normal"|"high" }
 */
let tasks = [];

const LS_KEY = "tasks_v2";
const TITLE_KEY = "todo_title_v1";
const THEME_KEY = "todo_theme_v1";
const FILTER_KEY = "todo_filter_v1";

let currentFilter = "all"; // all | active | completed

document.addEventListener("DOMContentLoaded", () => {
  /* ---- Тема ---- */
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  setTheme(savedTheme);

  /* ---- Заголовок ---- */
  const $title = document.getElementById("appTitle");
  $title.textContent = localStorage.getItem(TITLE_KEY) || "My To-Do List";
  // сохраняем при Enter/blur
  $title.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); $title.blur(); }
  });
  $title.addEventListener("blur", () => {
    localStorage.setItem(TITLE_KEY, $title.textContent.trim() || "My To-Do List");
  });

  /* ---- Загрузка задач ---- */
  loadTasks();

  /* ---- Фильтр ---- */
  currentFilter = localStorage.getItem(FILTER_KEY) || "all";
  document.getElementById("filterSelect").value = currentFilter;
  document.getElementById("filterSelect").addEventListener("change", (e) => {
    currentFilter = e.target.value;
    localStorage.setItem(FILTER_KEY, currentFilter);
    renderTasks();
  });

  /* ---- Кнопки ---- */
  document.getElementById("addBtn").addEventListener("click", addTask);
  document.getElementById("taskInput").addEventListener("keydown", e => {
    if (e.key === "Enter") addTask();
  });
  document.getElementById("themeToggle").addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });
  document.getElementById("exportBtn").addEventListener("click", exportTasks);
  document.getElementById("importInput").addEventListener("change", importTasksFromFile);

  renderTasks();
});

/* ========= Core ========= */

function addTask() {
  const input = document.getElementById("taskInput");
  const priority = document.getElementById("prioritySelect").value;
  const text = input.value.trim();
  if (!text) return;

  tasks.push({
    id: uid(),
    text,
    done: false,
    createdAt: Date.now(),
    priority
  });
  saveTasks();
  input.value = "";
  renderTasks();
}

function toggleDone(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  const el = document.querySelector(`li.task[data-id="${id}"]`);
  if (el) {
    el.classList.add("fade-out");
    setTimeout(() => {
      tasks = tasks.filter(x => x.id !== id);
      saveTasks();
      renderTasks();
    }, 200);
  }
}

/* ========= Inline edit ========= */
function startEditTitle(id) {
  const li = document.querySelector(`li.task[data-id="${id}"]`);
  if (!li) return;

  const titleDiv = li.querySelector(".title");
  const oldText = titleDiv.textContent;

  // создаём input и подменяем title
  const input = document.createElement("input");
  input.className = "edit-input";
  input.value = oldText;
  titleDiv.replaceWith(input);
  input.focus();
  input.setSelectionRange(oldText.length, oldText.length);

  const commit = () => {
    const t = tasks.find(x => x.id === id);
    if (t) {
      t.text = input.value.trim() || t.text; // пустые не сохраняем
      saveTasks();
    }
    renderTasks();
  };
  const cancel = () => { renderTasks(); };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") cancel();
  });
  input.addEventListener("blur", commit);
}

/* ========= Render ========= */
function renderTasks() {
  const list = document.getElementById("taskList");
  list.innerHTML = "";

  // фильтрация
  let view = tasks;
  if (currentFilter === "active") view = tasks.filter(t => !t.done);
  if (currentFilter === "completed") view = tasks.filter(t => t.done);

  // новые задачи сверху
  view = [...view].reverse();

  view.forEach(t => {
    /* li — контейнер */
    const li = document.createElement("li");
    li.className = "task" + (t.done ? " done" : "");
    li.dataset.id = t.id;

    /* чекбокс статуса */
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = t.done;
    checkbox.addEventListener("change", () => toggleDone(t.id));

    /* заголовок (клик/даблклик — редактирование) */
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = t.text;
    title.title = "Double‑click to edit";
    title.addEventListener("dblclick", () => startEditTitle(t.id));

    /* бейдж приоритета */
    const badge = document.createElement("span");
    badge.className = "badge " + t.priority;
    badge.textContent = priorityLabel(t.priority);

    /* мета: дата + статус */
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${formatDate(t.createdAt)} — ${t.done ? "✅ Done" : "🕓 In Progress"}`;

    /* удалить */
    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteTask(t.id));

    // порядок элементов
    li.appendChild(checkbox);
    li.appendChild(title);
    li.appendChild(badge);
    li.appendChild(meta);
    li.appendChild(del);

    list.appendChild(li);
  });
}

/* ========= Persistence & utils ========= */
function saveTasks(){ localStorage.setItem(LS_KEY, JSON.stringify(tasks)); }

function loadTasks(){
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;
  try{
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      tasks = arr.map(t => ({
        id: t.id || uid(),
        text: String(t.text ?? ""),
        done: !!t.done,
        createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
        priority: (t.priority === "low" || t.priority === "high" || t.priority === "normal") ? t.priority : "normal",
      }));
    }
  }catch{ tasks = []; }
}

function setTheme(mode){
  document.documentElement.dataset.theme = (mode === "dark" ? "dark" : "light");
  localStorage.setItem(THEME_KEY, document.documentElement.dataset.theme);
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = document.documentElement.dataset.theme === "dark" ? "Light" : "Dark";
}

function formatDate(ts) {
  const d = new Date(ts);
  const opts = { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" };

  try {
    // undefined = использовать язык браузера/системы
    return d.toLocaleString(undefined, opts);
  } catch {
    // fallback на ISO-строку, если вдруг что-то пошло не так
    return d.toISOString();
  }
}

function priorityLabel(p){ return p === "high" ? "High" : p === "low" ? "Low" : "Normal"; }

function uid(){
  if (crypto?.getRandomValues){
    const a = new Uint32Array(3); crypto.getRandomValues(a);
    return Array.from(a, n=>n.toString(16)).join("");
  }
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

/* ===== Export/Import (как в предыдущей версии) ===== */
function exportTasks(){
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "tasks_backup.json"; a.click();
  URL.revokeObjectURL(url);
}
function importTasksFromFile(e){
  const file = e.target.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      if (Array.isArray(data)){
        tasks = data.map(t => ({
          id: t.id || uid(),
          text: String(t.text ?? ""),
          done: !!t.done,
          createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
          priority: (t.priority === "low" || t.priority === "high" || t.priority === "normal") ? t.priority : "normal",
        }));
        saveTasks(); renderTasks();
      } else { alert("Invalid file format"); }
    }catch{ alert("Failed to parse JSON"); }
    e.target.value = "";
  };
  reader.readAsText(file);
}
