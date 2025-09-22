(function () {
  const params = new URLSearchParams(window.location.search);
  const dataParam = params.get("data");

  const setupContainer = document.querySelector(".setup-container");
  const rouletteContainer = document.querySelector(".roulette-container");

  let rouletteData = null;

  if (dataParam) {
    if (setupContainer) setupContainer.remove();

    document.documentElement.style.height = '';
    document.documentElement.style.overflowY = '';
    document.body.style.height = '';
    document.body.style.overflowY = '';

    try {
      const decoded = decodeURIComponent(atob(dataParam));
      rouletteData = JSON.parse(decoded);
      console.log("Decoded roulette data:", rouletteData);
    } catch (err) {
      console.error("Failed to decode data param:", err);
    }
  } else {
    if (rouletteContainer) rouletteContainer.remove();

    const startBtn = document.getElementById("startBtn");
    if (startBtn) {
      startBtn.addEventListener("click", (e) => {
        if (!startBtn.classList.contains("enabled")) {
            e.preventDefault();
            return;
        }

        const listInput = document.querySelector("input[name='list']:checked");
        const diffInputs = document.querySelectorAll("input[name='difficulty']:checked");

        const list = listInput ? (
          listInput.value === "main" ? 1 :
          listInput.value === "extended" ? 2 :
          listInput.value === "full" ? 3 : null
        ) : null;

        const difficulties = [...diffInputs].map(d => {
          switch (d.value) {
            case "easy": return 1;
            case "medium": return 2;
            case "hard": return 3;
            case "insane": return 4;
            case "extreme": return 5;
            default: return null;
          }
        }).filter(Boolean);

        const payload = {
          list: list,
          difficulties: difficulties,
          history: []
        };

        const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
        startBtn.href = `/roulette?data=${encoded}`;
      });
    }
  }

  function init() {
    const optionsWrap = document.querySelector('.options');
    const startBtn = document.getElementById('startBtn');
    if (!optionsWrap || !startBtn) return;

    function state() {
      const listSelected = !!document.querySelector("input[name='list']:checked");
      const diffSelected = !!document.querySelector("input[name='difficulty']:checked");
      return { listSelected, diffSelected };
    }

    function updateButton() {
        const s = state();
        const enable = (s.listSelected && !s.diffSelected) || (!s.listSelected && s.diffSelected);

        const startBtn = document.getElementById('startBtn');
        startBtn.classList.toggle('enabled', enable);
    }

    optionsWrap.addEventListener('change', (e) => {
      const t = e.target;
      if (!t) return;

      if (t.matches("input[name='list']") && t.checked) {
        document.querySelectorAll("input[name='difficulty']:checked").forEach(ch => ch.checked = false);
      } else if (t.matches("input[name='difficulty']") && t.checked) {
        document.querySelectorAll("input[name='list']:checked").forEach(r => r.checked = false);
      }

      updateButton();
    });

    updateButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.__ROULETTE_DATA__ = rouletteData;

  if (rouletteData) {
    function showWinText() {
        const winText = document.querySelector('.win-text');
        if (!winText) return;

        const history = window.__ROULETTE_DATA__.history || [];
        const lastPercent = history.length ? history[history.length - 1].percent : 0;

        if (lastPercent === 100) {
            winText.textContent = `Вы дошли до конца!\nПройдено уровней: ${history.length}`;
        } else {
            winText.textContent = `Демоны закончились.\nПройдено уровней: ${history.length}`;
        }

        winText.style.opacity = '1';
    }
    function updateURL() {
        if (!window.__ROULETTE_DATA__) return;
        const encoded = btoa(encodeURIComponent(JSON.stringify(window.__ROULETTE_DATA__)));
        const newURL = `/roulette?data=${encoded}`;
        window.history.replaceState(null, '', newURL);
    }

    const baseLink = 'https://raw.githubusercontent.com/Lagushko/BlebbaGDPS-Data/main/data/lists/';
    let listData = {};
    let filteredData = {};
    let selectorData = [];

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
            } catch (err) {
                console.error(`Failed to load ${files[i]}:`, err);
            }
        }

        filteredData = structuredClone(listData);

        if (rouletteData.list !== null) {
            Object.keys(filteredData).forEach((key) => {
                if (Number(key) > rouletteData.list) {
                    delete filteredData[key];
                }
            });
        } else {
            Object.keys(filteredData).forEach((key) => {
                filteredData[key] = filteredData[key].filter(level =>
                    rouletteData.difficulties.includes(level.difficulty)
                );
            });
        }

        selectorData = Object.values(filteredData).flat();

        if (Array.isArray(rouletteData.history)) {
            const historyIds = new Set(rouletteData.history.map(l => l.id));
            selectorData = selectorData.filter(level => !historyIds.has(level.id));
        }

        console.log("List Data", listData);
        console.log("Filtered Data", filteredData);
    }

    function getCurrentLevelNumber(level) {
        const history = window.__ROULETTE_DATA__.history || [];
        const index = history.findIndex(l => l.id === level.id);
        if (index !== -1) return index + 1;

        return history.length + 1;
    }

    function getLevelNumber(id) {
        let count = 0;
        for (let key = 1; key <= 3; key++) {
            let arr = listData[key];
            for (let i = 0; i < arr.length; i++) {
                if (arr[i].id === id) {
                    return count + i + 1;
                }
            }
            count += arr.length;
        }
        return null;
    }

    let resizeTimer = null;

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
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateAll, 80);
    });
    window.addEventListener('load', () => {
        updateAll();
        const ro = new ResizeObserver(() => updateAll());
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

    function addLevel(level, percent, isRandom = false, placeholderPercent = null) {
        const wrapper = document.querySelector('.levels-wrapper');
        if (!wrapper) return;

        const number = getCurrentLevelNumber(level);
        const difficultyMap = {
            1: 'easy.webp',
            2: 'medium.webp',
            3: 'hard.webp',
            4: 'insane.webp',
            5: 'extreme.webp'
        };

        const item = document.createElement('div');
        item.className = 'level-item';

        const previewSrc = `https://raw.githubusercontent.com/Lagushko/BlebbaGDPS-Data/main/data/previews/${level.id}.jpg`;
        const difficultyImg = `/assets/images/difficulties/${difficultyMap[level.difficulty] || 'hard.webp'}`;

        let percentHTML = (percent === null)
            ? `<input type="number" class="level-percent-input" placeholder="${placeholderPercent || 1}%">`
            : `<div class="level-percent">${percent}%</div>`;

        let viewBtnHTML = (percent === null)
            ? `<button class="btn view-btn">✔</button>`
            : `<a class="btn view-btn" href="https://blebba.ps.fhgdps.com/dashboard/stats/levelLeaderboards.php?levelID=${level.id}&type=1">Смотреть</a>`;

        item.innerHTML = `
            <div class="level-rank">#${number}</div>
            <img src="${previewSrc}" alt="Preview" class="level-preview">
            <div class="level-info">
                <div class="level-name">${level.name}</div>
                <div class="level-author">от ${level.author}</div>
            </div>
            <div class="level-actions">
                ${percentHTML}
                ${viewBtnHTML}
                <img src="${difficultyImg}" alt="Difficulty" class="level-difficulty">
            </div>
        `;

        wrapper.appendChild(item);

        if (percent === null) {
            const btn = item.querySelector('.view-btn');
            const input = item.querySelector('.level-percent-input');
            btn.addEventListener('click', () => {
                const val = parseInt(input.value);
                const minVal = parseInt(input.placeholder);
                if (!isNaN(val) && val >= minVal && val <= 100) {
                    const percentDiv = document.createElement('div');
                    percentDiv.className = 'level-percent';
                    percentDiv.textContent = val + '%';
                    input.replaceWith(percentDiv);

                    const link = document.createElement('a');
                    link.href = `https://blebba.ps.fhgdps.com/dashboard/stats/levelLeaderboards.php?levelID=${level.id}&type=1`;
                    link.className = 'btn view-btn';
                    link.textContent = 'Смотреть';
                    btn.replaceWith(link);

                    const historyLevel = window.__ROULETTE_DATA__.history.find(l => l.id === level.id);
                    if (historyLevel) {
                        historyLevel.percent = val;
                    } else {
                        window.__ROULETTE_DATA__.history.push({ ...level, percent: val });
                    }

                    updateURL();

                    if (val < 100) {
                        addRandomLevel(val + 1);
                    } else {
                        showWinText();
                    }

                    updateOne(item);
                }
            });
        }

        updateOne(item);
    }

    function loadHistory() {
        if (Array.isArray(rouletteData.history)) {
            rouletteData.history.forEach(level => {
                addLevel(level, level.percent);
            });
        }
    }

    function addRandomLevel(startPercent) {
        if (selectorData.length === 0) {
            showWinText();
            return;
        }
        const index = Math.floor(Math.random() * selectorData.length);
        const level = selectorData.splice(index, 1)[0];
        addLevel(level, null, true, startPercent);
    }

    (async () => {
        await loadLists(3);
        loadHistory();

        const lastUnfinished = window.__ROULETTE_DATA__.history.find(l => l.percent === null);
        if (lastUnfinished) {
            addLevel(lastUnfinished, null, true, lastUnfinished.startPercent || 1);
        } else if (window.__ROULETTE_DATA__.history.length > 0) {
            const lastPercent = window.__ROULETTE_DATA__.history[window.__ROULETTE_DATA__.history.length - 1].percent;
            if (lastPercent < 100) addRandomLevel(lastPercent + 1);
            else showWinText();
        } else {
            addRandomLevel(1);
        }

        updateURL();
    })();
  }

})();
