/**
 * Модель задачи:
 * { id: string, text: string, done: boolean, createdAt: number, priority: "low"|"normal"|"high" }
 */
let tasks = [];
const LS_KEY = "tasks_v2";

/* ===== Загрузка/миграция ===== */
document.addEventListener("DOMContentLoaded", () => {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        tasks = arr.map(t => ({
          id: t.id || cryptoRandomId(),
          text: String(t.text ?? ""),
          done: !!t.done,
          createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
          // миграция: если раньше не было приоритета — ставим normal
          priority: (t.priority === "low" || t.priority === "high" || t.priority === "normal") ? t.priority : "normal",
        }));
      }
    } catch { tasks = []; }
  }

  renderTasks();

  // события UI
  document.getElementById("addBtn").addEventListener("click", addTask);
  document.getElementById("taskInput").addEventListener("keydown", e => {
    if (e.key === "Enter") addTask();
  });
  // export/import остаются без изменений, если они у тебя уже были
});

/* ===== Добавление ===== */
function addTask() {
  const input = document.getElementById("taskInput");
  const priority = document.getElementById("prioritySelect")?.value || "normal";
  const text = input.value.trim();
  if (!text) return;

  tasks.push({
    id: cryptoRandomId(),
    text,
    done: false,
    createdAt: Date.now(),
    priority, // сохраняем выбранный приоритет
  });
  saveTasks();
  renderTasks();
  input.value = "";
}

/* ===== Переключение статуса и удаление ===== */
function toggleDone(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  const li = document.querySelector(`li.task[data-id="${id}"]`);
  if (li) {
    li.classList.add("fade-out");      // визуальная анимация удаления
    setTimeout(() => {
      tasks = tasks.filter(x => x.id !== id);
      saveTasks();
      renderTasks();
    }, 200);
  } else {
    tasks = tasks.filter(x => x.id !== id);
    saveTasks();
    renderTasks();
  }
}

/* ===== Рендер со статусом/датой/приоритетом (с комментариями) ===== */
function renderTasks() {
  const list = document.getElementById("taskList");
  list.innerHTML = "";

  // хотим, чтобы новые задачи были наверху → рендерим в обратном порядке
  const toRender = [...tasks].reverse();

  toRender.forEach(t => {
    /* <li class="task ..."> — контейнер задачи */
    const li = document.createElement("li");
    li.className = "task" + (t.done ? " done" : "");
    li.dataset.id = t.id;

    /* <input type="checkbox"> — чекбокс статуса (выполнено/нет) */
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = t.done;
    checkbox.addEventListener("change", () => toggleDone(t.id));

    /* <div class="title"> — текст задачи */
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = t.text;

    /* <span class="badge ..."> — бейдж приоритета (low/normal/high) */
    const priority = document.createElement("span");
    priority.className = "badge " + t.priority;
    priority.textContent = priorityLabel(t.priority);

    /* <div class="meta"> — мета‑инфо: дата + человекочитаемый статус */
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${formatDate(t.createdAt)} — ${t.done ? "✅ Выполнено" : "🕓 В процессе"}`;

    /* <button class="delete-btn"> — кнопка удаления */
    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteTask(t.id));

    /* Вкладываем элементы внутрь li в удобном порядке */
    li.appendChild(checkbox);  // чекбокс слева
    li.appendChild(title);     // затем название задачи
    li.appendChild(priority);  // бейдж приоритета справа от названия
    li.appendChild(meta);      // строка с датой/статусом (мелким текстом)
    li.appendChild(del);       // кнопка удаления справа

    /* Добавляем собранный li в список задач */
    list.appendChild(li);
  });
}

/* ===== Хранилище и утилиты ===== */
function saveTasks() {
  localStorage.setItem(LS_KEY, JSON.stringify(tasks));
}

function formatDate(ts) {
  const d = new Date(ts);
  // пример: 10 авг., 14:32 (русская локаль)
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function priorityLabel(p) {
  if (p === "low") return "Low";
  if (p === "high") return "High";
  return "Normal";
}

function cryptoRandomId() {
  if (window.crypto?.getRandomValues) {
    const arr = new Uint32Array(4);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, n => n.toString(16)).join("");
  }
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
