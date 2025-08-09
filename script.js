/**
 * Модель задачи:
 * { id: string, text: string, done: boolean, createdAt: number }
 */
let tasks = [];

const LS_KEY = "tasks_v2"; // новая версия ключа, чтобы не конфликтовать со старым форматом

document.addEventListener("DOMContentLoaded", () => {
  // Загрузить данные
  loadTasks();
  renderTasks();

  // UI события
  document.getElementById("addBtn").addEventListener("click", addTask);
  document.getElementById("taskInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTask();
  });

  document.getElementById("exportBtn").addEventListener("click", exportTasks);
  document.getElementById("importInput").addEventListener("change", importTasksFromFile);
});

function addTask() {
  const input = document.getElementById("taskInput");
  const text = input.value.trim();
  if (!text) return;

  tasks.push({
    id: cryptoRandomId(),
    text,
    done: false,
    createdAt: Date.now(),
  });
  saveTasks();
  renderTasks();
  input.value = "";
}

function toggleDone(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  // анимация: добавляем класс, затем удаляем
  const li = document.querySelector(`li.task[data-id="${id}"]`);
  if (!li) return;
  li.classList.add("fade-out");
  setTimeout(() => {
    tasks = tasks.filter((x) => x.id !== id);
    saveTasks();
    renderTasks();
  }, 200); // должно совпадать с transition в CSS
}

function saveTasks() {
  localStorage.setItem(LS_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      // Миграция: если старый формат (строки), конвертим
      tasks = arr.map((x) => {
        if (typeof x === "string") {
          return { id: cryptoRandomId(), text: x, done: false, createdAt: Date.now() };
        }
        return x;
      });
    }
  } catch {
    tasks = [];
  }
}

function renderTasks() {
  const list = document.getElementById("taskList");
  list.innerHTML = "";

  tasks.forEach((t) => {
    const li = document.createElement("li");
    li.className = "task" + (t.done ? " done" : "");
    li.dataset.id = t.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = t.done;
    checkbox.addEventListener("change", () => toggleDone(t.id));

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = t.text;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = formatDate(t.createdAt);

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "Удалить";
    del.addEventListener("click", () => deleteTask(t.id));

    li.appendChild(checkbox);
    li.appendChild(title);
    li.appendChild(meta);
    li.appendChild(del);
    list.appendChild(li);
  });
}

/* ===== Экспорт/Импорт ===== */

function exportTasks() {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tasks_backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importTasksFromFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (Array.isArray(data)) {
        // мягкая стратегия: просто присваиваем (или можно мёрджить)
        tasks = data.map((t) => ({
          id: t.id || cryptoRandomId(),
          text: String(t.text || ""),
          done: !!t.done,
          createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
        }));
        saveTasks();
        renderTasks();
      } else {
        alert("Invalid file format");
      }
    } catch {
      alert("Failed to parse JSON");
    } finally {
      e.target.value = "";
    }
  };
  reader.readAsText(file);
}

/* ===== Утилиты ===== */

function formatDate(ts) {
  const d = new Date(ts);
  // Короткий формат: 09 Aug, 14:32
  return d.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function cryptoRandomId() {
  // кросс-платформенный рандомный id
  if (window.crypto?.getRandomValues) {
    const arr = new Uint32Array(4);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, (n) => n.toString(16)).join("");
  }
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
