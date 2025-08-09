let tasks = [];

// Загружаем задачи при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("tasks");
  if (saved) {
    try { tasks = JSON.parse(saved) || []; } catch { tasks = []; }
  }
  renderTasks();

  // Добавление по Enter
  const input = document.getElementById("taskInput");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTask();
  });
});

function addTask() {
  const input = document.getElementById("taskInput");
  const text = input.value.trim();
  if (!text) return;
  tasks.push(text);
  saveTasks();
  renderTasks();
  input.value = "";
}

function deleteTask(index) {
  tasks.splice(index, 1);
  saveTasks();
  renderTasks();
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function renderTasks() {
  const list = document.getElementById("taskList");
  list.innerHTML = "";
  tasks.forEach((t, i) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = t;

    const btn = document.createElement("button");
    btn.textContent = "Удалить";
    btn.style.marginLeft = "10px";
    btn.onclick = () => deleteTask(i);

    li.appendChild(span);
    li.appendChild(btn);
    list.appendChild(li);
  });
}