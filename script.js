(() => {
  // ---------- Utilities ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const fmtDate = (ts) => {
    const d = new Date(ts);
    // Авто-локаль по браузеру
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

  // ---------- State & Storage ----------
const STORAGE_KEY = 'todo_lists_v2';

function seed() {
  const id = uid();
  return {
    lists: [{
      id,
      name: 'Мой первый список',
      createdAt: Date.now(),
      tasks: [
        { id: uid(), text: 'Попробовать инлайн-редактирование ✏️', completed: false, createdAt: Date.now() },
        { id: uid(), text: 'Переключить тему 🌓', completed: false, createdAt: Date.now() },
      ],
    }],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);

    // проверка структуры
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.lists)) {
      return seed();
    }
    return parsed;
  } catch {
    return seed();
  }
}

let state = load();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

  // ---------- Theme ----------
  const root = document.documentElement;
  const themeToggle = $('#themeToggle');
  themeToggle.addEventListener('click', () => {
    const current = root.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : current === 'dark' ? '' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
  // restore theme
  (function restoreTheme() {
    const saved = localStorage.getItem('theme');
    if (saved !== null) root.setAttribute('data-theme', saved);
  })();

  // ---------- Views ----------
  const listsView = $('#listsView');
  const tasksView = $('#tasksView');

  const listsContainer = $('#listsContainer');
  const listItemTpl = $('#listItemTpl');
  const addListBtn = $('#addListBtn');

  const tasksContainer = $('#tasksContainer');
  const taskItemTpl = $('#taskItemTpl');
  const newTaskInput = $('#newTaskInput');
  const addTaskBtn = $('#addTaskBtn');
  const backToLists = $('#backToLists');
  const deleteListBtn = $('#deleteListBtn');
  const currentListNameSpan = $('#currentListName');
  const editListNameBtn = $('#editListNameBtn');

  let currentListId = null;

  function showLists() {
    listsView.classList.add('active');
    tasksView.classList.remove('active');
    renderLists();
  }
  function showTasks(listId) {
    currentListId = listId;
    listsView.classList.remove('active');
    tasksView.classList.add('active');
    const list = getList(listId);
    currentListNameSpan.textContent = list?.name ?? '';
    renderTasks(listId);
  }

  function getList(id) {
    return state.lists.find(l => l.id === id);
  }

  // ---------- Render Lists ----------
  function renderLists() {
    listsContainer.innerHTML = '';
    state.lists
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach(list => {
        const li = listItemTpl.content.firstElementChild.cloneNode(true);
        li.dataset.id = list.id;
        $('.list-name', li).textContent = list.name;
        const tasksCount = list.tasks.length;
        $('.list-meta', li).textContent = `Создан: ${fmtDate(list.createdAt)} • Задач: ${tasksCount}`;
        // open
        $('.list-open', li).addEventListener('click', () => showTasks(list.id));
        // rename
        $('.rename-list', li).addEventListener('click', (e) => {
          e.stopPropagation();
          inlineRename(list.id);
        });
        // delete
        $('.delete-list', li).addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Удалить список «${list.name}»?`)) {
            state.lists = state.lists.filter(l => l.id !== list.id);
            save();
            renderLists();
          }
        });

        listsContainer.appendChild(li);
      });

    if (state.lists.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'card';
      empty.style.textAlign = 'center';
      empty.textContent = 'Пока нет списков. Создайте первый!';
      listsContainer.appendChild(empty);
    }
  }

  // Inline rename list from lists grid or header
  function inlineRename(listId) {
    const list = getList(listId);
    if (!list) return;

    // If in lists grid
    const card = $(`.list-card[data-id="${listId}"]`);
    if (card) {
      const nameEl = $('.list-name', card);
      makeInlineInput(nameEl, list.name, (val) => {
        list.name = val.trim() || list.name;
        save();
        renderLists();
        // sync header if open
        if (currentListId === listId) currentListNameSpan.textContent = list.name;
      });
      return;
    }

    // If in header (tasks view)
    if (currentListId === listId) {
      makeInlineInput(currentListNameSpan, list.name, (val) => {
        list.name = val.trim() || list.name;
        save();
        currentListNameSpan.textContent = list.name;
        renderLists();
      });
    }
  }

  // ---------- Render Tasks ----------
  function renderTasks(listId) {
    tasksContainer.innerHTML = '';
    const list = getList(listId);
    if (!list) return;

    list.tasks
      .slice()
      .sort((a, b) => Number(a.completed) - Number(b.completed) || b.createdAt - a.createdAt)
      .forEach(task => {
        const li = taskItemTpl.content.firstElementChild.cloneNode(true);
        li.dataset.id = task.id;
        const checkbox = $('.toggle', li);
        const textEl = $('.task-text', li);

        checkbox.checked = task.completed;
        textEl.textContent = task.text;
        li.classList.toggle('completed', task.completed);

        checkbox.addEventListener('change', () => {
          task.completed = checkbox.checked;
          save();
          li.classList.toggle('completed', task.completed);
        });

        $('.edit-task', li).addEventListener('click', () => {
          makeInlineInput(textEl, task.text, (val) => {
            task.text = val.trim() || task.text;
            save();
            renderTasks(listId);
          }, { selectAll: true });
        });

        $('.delete-task', li).addEventListener('click', () => {
          if (confirm('Удалить задачу?')) {
            list.tasks = list.tasks.filter(t => t.id !== task.id);
            save();
            renderTasks(listId);
            renderLists(); // обновим счётчик задач на карточке списка
          }
        });

        tasksContainer.appendChild(li);
      });
  }

  function makeInlineInput(targetEl, initialValue, onCommit, opts = {}) {
    const { selectAll = false } = opts;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-edit';
    input.value = initialValue;
    targetEl.replaceWith(input);
    input.focus();
    if (selectAll) input.select(); else input.setSelectionRange(input.value.length, input.value.length);

    const commit = () => {
      const span = document.createElement('span');
      span.className = targetEl.className;
      span.textContent = input.value.trim() || initialValue;
      input.replaceWith(span);
      onCommit(span.textContent);
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') {
        const span = document.createElement('span');
        span.className = targetEl.className;
        span.textContent = initialValue;
        input.replaceWith(span);
      }
    });
    input.addEventListener('blur', commit);
  }

  // ---------- Handlers ----------
  addListBtn.addEventListener('click', () => {
    const name = prompt('Название списка:', 'Новый список');
    if (!name) return;
    const id = uid();
    state.lists.unshift({ id, name: name.trim(), createdAt: Date.now(), tasks: [] });
    save();
    renderLists();
  });

  backToLists.addEventListener('click', showLists);

  deleteListBtn.addEventListener('click', () => {
    const list = getList(currentListId);
    if (!list) return;
    if (confirm(`Удалить список «${list.name}» со всеми задачами?`)) {
      state.lists = state.lists.filter(l => l.id !== currentListId);
      save();
      currentListId = null;
      showLists();
    }
  });

  addTaskBtn.addEventListener('click', addTask);
  newTaskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
  });
  function addTask() {
    const list = getList(currentListId);
    if (!list) return;
    const txt = newTaskInput.value.trim();
    if (!txt) return;
    list.tasks.unshift({ id: uid(), text: txt, completed: false, createdAt: Date.now() });
    newTaskInput.value = '';
    save();
    renderTasks(list.id);
    renderLists();
  }

  editListNameBtn.addEventListener('click', () => {
    if (!currentListId) return;
    inlineRename(currentListId);
  });

  // ---------- Init ----------
  showLists();
})();
