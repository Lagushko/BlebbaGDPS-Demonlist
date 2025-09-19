(function () {
  const path = window.location.pathname;

  let listType = null;

  if (path.includes('/main-list')) {
    listType = 1;
  } else if (path.includes('/extended-list')) {
    listType = 2;
  } else if (path.includes('/full-list')) {
    listType = 3;
  }

  const baseLink = 'https://raw.githubusercontent.com/Lagushko/BlebbaGDPS-Data/main/data/lists/';
  let listData = {};
  let timeData = {};

  async function loadLists(type) {
    const files = ['1.json', '2.json', '3.json'];

    let maxIndex = type;

    for (let i = 0; i < maxIndex; i++) {
      const url = baseLink + files[i];
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();

        listData[i + 1] = data;
        timeData[i + 1] = data;
      } catch (err) {
        console.error(`Failed to load ${files[i]}:`, err);
      }
    }

    console.log('Final listData:', listData);
    renderList(type, listData);
  }

  function renderList(type, data) {
    const wrapper = document.querySelector('.levels-wrapper');
    if (!wrapper) return;

    wrapper.innerHTML = '';

    const difficultyMap = {
        1: 'easy.webp',
        2: 'medium.webp',
        3: 'hard.webp',
        4: 'insane.webp',
        5: 'extreme.webp'
    };

    let rankCounter = 1;

    for (let listIndex = 1; listIndex <= 3; listIndex++) {
        if (!data[listIndex]) continue;

        data[listIndex].forEach((level, i) => {
            const currentRank = rankCounter;
            rankCounter++;

            if (level.hasOwnProperty("show") && level.show === false) {
                return;
            }

            const item = document.createElement('div');
            item.className = 'level-item';

            const previewSrc = `https://raw.githubusercontent.com/Lagushko/BlebbaGDPS-Data/main/data/previews/${level.id}.jpg`;
            const difficultyImg = `/assets/images/difficulties/${difficultyMap[level.difficulty] || 'hard.webp'}`;

            item.innerHTML = `
                <div class="level-rank">#${currentRank}</div>
                <img src="${previewSrc}" alt="Preview" class="level-preview">
                <div class="level-info">
                    <div class="level-name">${level.name}</div>
                    <div class="level-author">от ${level.author}</div>
                </div>
                <div class="level-actions">
                    <a href="https://blebba.ps.fhgdps.com/dashboard/stats/levelLeaderboards.php?levelID=${level.id}" class="btn view-btn">Смотреть</a>
                    <img src="${difficultyImg}" alt="Difficulty" class="level-difficulty">
                </div>
            `;

            wrapper.appendChild(item);
        });
    }
  }


  if (listType) {
    loadLists(listType);
  } else {
    console.error('Unknown list type');
  }

  const GAP = 10;

  function updateOne(item) {
    const actions = item.querySelector('.level-actions');
    const viewBtn = item.querySelector('.view-btn');
    const diff = item.querySelector('.level-difficulty');
    if (!actions || !viewBtn || !diff) return;

    const actionsWidth = actions.clientWidth;

    const viewW = Math.ceil(viewBtn.getBoundingClientRect().width);
    const diffW = Math.ceil(diff.getBoundingClientRect().width);

    const required = viewW + diffW + GAP;

    const hasViewRow = !!item.querySelector('.view-row');

    if (required > actionsWidth + 1) {
      if (!hasViewRow) {
        const viewRow = document.createElement('div');
        viewRow.className = 'view-row';
        viewRow.appendChild(viewBtn);
        item.appendChild(viewRow);
      }
    } else {
      if (hasViewRow) {
        const viewRow = item.querySelector('.view-row');
        actions.insertBefore(viewBtn, diff);
        viewRow.remove();
      }
    }
  }

  function updateAll() {
    document.querySelectorAll('.level-item').forEach(updateOne);
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateAll, 80);
  });

  window.addEventListener('load', () => {
    updateAll();

    const ro = new ResizeObserver(() => {
      updateAll();
    });
    document.querySelectorAll('.level-item').forEach(el => ro.observe(el));

    const wrapper = document.querySelector('.levels-wrapper');
    if (wrapper) {
      const mo = new MutationObserver(() => {
        setTimeout(() => {
          document.querySelectorAll('.level-item').forEach(el => ro.observe(el));
          updateAll();
        }, 30);
      });
      mo.observe(wrapper, { childList: true, subtree: true });
    }
  });

  const timeBtn = document.querySelector(".time-travel-btn");
  const dropdown = document.querySelector(".time-travel-dropdown");

  if (timeBtn && dropdown) {
    timeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("show");
    });

    document.addEventListener("click", () => {
      dropdown.classList.remove("show");
    });

    dropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    const confirmBtn = dropdown.querySelector(".confirm-btn");
    const input = dropdown.querySelector("input");

    input.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 8) value = value.slice(0, 8);

      let formatted = "";
      if (value.length > 0) formatted = value.slice(0, 2);
      if (value.length > 2) formatted += "-" + value.slice(2, 4);
      if (value.length > 4) formatted += "-" + value.slice(4, 8);

      e.target.value = formatted;
    });

    confirmBtn.addEventListener("click", () => {
      const date = input.value.trim();
      const regex = /^\d{2}-\d{2}-\d{4}$/;

      if (!regex.test(date)) {
          alert("Введите дату в формате ДД-ММ-ГГГГ");
          return;
      }

      const [day, month, year] = date.split("-").map(Number);
      const chosenDate = new Date(year, month - 1, day);

      const minDate = new Date(2025, 7, 1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (chosenDate < minDate || chosenDate > today) {
          alert(
              `Дата должна быть в диапазоне от 01-08-2025 до ${today
                  .toLocaleDateString("ru-RU")
                  .replace(/\./g, "-")}`
          );
          return;
      }

      console.log("Selected date:", date);

      timeData = {};
      for (const [key, levels] of Object.entries(listData)) {
          timeData[key] = levels.filter(level => {
              const [d, m, y] = level.time.split(".").map(Number);
              const levelDate = new Date(y, m - 1, d);

              return levelDate <= chosenDate;
          });
      }

      renderList(listType, timeData);

      dropdown.classList.remove("show");
    });
  }

  document.querySelector(".search-btn").addEventListener("click", () => {
    const searchInput = document.querySelector(".search-input");
    const query = searchInput.value.trim().toLowerCase();

    const wrapper = document.querySelector(".levels-wrapper");
    wrapper.innerHTML = "";

    if (!query) {
      renderList(listType, timeData);
      return;
    }

    let searchData = {};
    for (const [key, levels] of Object.entries(timeData)) {
        searchData[key] = levels.map(level => {
            let newLevel = { ...level };

            if (newLevel.name.toLowerCase().includes(query)) {
                newLevel.show = true;
            } else {
                newLevel.show = false;
            }

            return newLevel;
        });
    }

    renderList(listType, searchData);
  });
})();