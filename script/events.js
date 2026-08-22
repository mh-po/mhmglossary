/**
 * MH Database - Event & Quest Engine (script/events.js)
 */

(function () {
  const JSON_URL = 'data/events.json';
  const NEW_DAYS_LIMIT = 14; // 14 天內首次開放視為新任務
  const ITEMS_PER_PAGE = 21;

  let rawQuests = [];
  let filteredQuests = [];
  let currentPage = 1;

  // 篩選與排序狀態
  const state = {
    search: '',
    rank: 'ALL',
    questType: 'ALL',
    difficulty: 'ALL',
    rewardType: 'ALL',
    sort: 'default'
  };

  // 1. 初始化入口
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const res = await fetch(JSON_URL);
      if (!res.ok) throw new Error('Network response was not ok');
      rawQuests = await res.json();

      renderActiveEventsTop();
      setupEventListeners();
      applyFilters();
    } catch (err) {
      console.error('[Events] Load error:', err);
      const grid = document.getElementById('quests-grid');
      if (grid) {
        grid.innerHTML = '<p style="color:red; grid-column: 1/-1; text-align:center;">無法載入任務資料，請確認 JSON 路徑與格式。</p>';
      }
    }
  });

  // 2. 日期字串解析輔助 (自動修正少補 0 的時區如 +8:00 -> +08:00)
  function parseISO(dateStr) {
    if (!dateStr) return new Date(NaN);
    let s = dateStr.trim();
    // 修正時區格式相容性問題
    s = s.replace(/([+-])(\d)(:\d{2})$/, '$10$2$3');
    return new Date(s);
  }

  // 3. 開放期間美化輸出 (例如：2026/07/08 08:00 ～ 08/19 07:59)
  function formatPeriodText(periodStr) {
    if (!periodStr) return '';
    
    return periodStr.split(';').map(p => {
      const parts = p.split('~');
      if (parts.length !== 2) return p;

      const start = parseISO(parts[0]);
      const end = parseISO(parts[1]);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return p;

      const pad = n => String(n).padStart(2, '0');
      
      const startText = `${start.getFullYear()}/${pad(start.getMonth() + 1)}/${pad(start.getDate())} ${pad(start.getHours())}:${pad(start.getMinutes())}`;
      const endText = `${pad(end.getMonth() + 1)}/${pad(end.getDate())} ${pad(end.getHours())}:${pad(end.getMinutes())}`;

      return `${startText} ～ ${endText}`;
    }).join('<br>');
  }

  // 4. 判定任務開放狀態與 NEW 標籤
  function getQuestStatus(quest) {
    const isPerm = quest.isPermanent === true || String(quest.isPermanent).toUpperCase() === 'TRUE';
    if (isPerm) return { status: 'permanent', isNew: false, activeStart: null };

    if (!quest.activePeriods) return { status: 'ended', isNew: false, activeStart: null };

    const now = new Date();
    const periods = quest.activePeriods.split(';').map(p => p.trim());
    let isRunning = false;
    let firstStartDate = null;

    periods.forEach(p => {
      const parts = p.split('~');
      if (parts.length === 2) {
        const s = parseISO(parts[0]);
        const e = parseISO(parts[1]);
        if (!firstStartDate || s < firstStartDate) firstStartDate = s;
        if (now >= s && now <= e) isRunning = true;
      }
    });

    let isNew = false;
    if (firstStartDate && !isNaN(firstStartDate.getTime())) {
      const diffDays = (now - firstStartDate) / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays <= NEW_DAYS_LIMIT) isNew = true;
    }

    return {
      status: isRunning ? 'active' : 'ended',
      isNew: isNew,
      activeStart: firstStartDate
    };
  }

  // 5. 難度數字抽取
  function getDifficultyLevel(diffStr) {
    if (!diffStr) return 0;
    const match = String(diffStr).match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  // 6. 頂部焦點區渲染 (僅展示 active 開放中)
  function renderActiveEventsTop() {
    const topGrid = document.getElementById('active-events-grid');
    const topWrapper = document.getElementById('active-events-wrapper');
    if (!topGrid || !topWrapper) return;

    const activeList = rawQuests.filter(q => {
      const st = getQuestStatus(q);
      return st.status === 'active';
    });

    if (activeList.length === 0) {
      topWrapper.style.display = 'none';
      return;
    }

    topWrapper.style.display = 'block';
    topGrid.innerHTML = activeList.map(q => createCardHTML(q, true)).join('');
  }

  // 7. 排序引擎
  function sortQuests(list) {
    return list.sort((a, b) => {
      // 報酬金由高至低
      if (state.sort === 'zenny') {
        const zA = Number(a.zenny) || 0;
        const zB = Number(b.zenny) || 0;
        return zB - zA;
      }

      // 純星數難度由高至低
      if (state.sort === 'difficulty') {
        return getDifficultyLevel(b.difficulty) - getDifficultyLevel(a.difficulty);
      }

      // 預設綜合推薦權重 (P1 -> P2 -> P3 -> P4 -> P5)
      const groupA = getGroupPriority(a);
      const groupB = getGroupPriority(b);

      if (groupA !== groupB) return groupA - groupB;

      // P5: 主/支線依序號升序 (101, 102...)
      if (groupA === 5) {
        return (Number(a.order) || 9999) - (Number(b.order) || 9999);
      }

      // P1: NEW 任務依開始時間倒序 (最新在前)
      if (groupA === 1) {
        const timeA = parseISO(a.activePeriods?.split('~')[0]).getTime() || 0;
        const timeB = parseISO(b.activePeriods?.split('~')[0]).getTime() || 0;
        return timeB - timeA;
      }

      // 其餘一律按星數倒序
      return getDifficultyLevel(b.difficulty) - getDifficultyLevel(a.difficulty);
    });
  }

  function getGroupPriority(quest) {
    if (quest.questType === 'main' || quest.questType === 'side') return 5;
    const st = getQuestStatus(quest);
    if (st.isNew) return 1;
    if (st.status === 'active') return 2;
    if (st.status === 'permanent') return 3;
    return 4; // ended
  }

  // 8. 核心篩選與搜尋
  function applyFilters() {
    filteredQuests = rawQuests.filter(q => {
      // 1. Rank 階級
      if (state.rank !== 'ALL' && q.rank !== state.rank) return false;

      // 2. 任務分類
      if (state.questType !== 'ALL' && q.questType !== state.questType) return false;

      // 3. 難度星數
      if (state.difficulty !== 'ALL') {
        const dNum = getDifficultyLevel(q.difficulty);
        if (state.difficulty === '★4-1') {
          if (dNum > 4) return false;
        } else {
          if (q.difficulty !== state.difficulty) return false;
        }
      }

      // 4. 獎勵標籤
      if (state.rewardType !== 'ALL') {
        const tags = (q.rewardType || '').split(',').map(t => t.trim());
        if (!tags.includes(state.rewardType)) return false;
      }

      // 5. 文字搜尋
      if (state.search) {
        const s = state.search.toLowerCase();
        const targets = [
          q.questNameZh,
          q.questNameZhS,
          q.questNameJa,
          q.questNameEn,
          q.monster,
          q.ticket,
          q.armor,
          q.weapon,
          q.palicoArmor,
          q.pendant,
          q.reward
        ].filter(Boolean).map(v => String(v).toLowerCase());

        const matched = targets.some(val => val.includes(s));
        if (!matched) return false;
      }

      return true;
    });

    sortQuests(filteredQuests);
    currentPage = 1;
    renderGrid();
  }

  // 9. 生成卡片 HTML (空白項目自動隱藏)
  function createCardHTML(q, isTopSection = false) {
    const st = getQuestStatus(q);
    const newBadge = st.isNew ? '<span class="badge-new">NEW</span>' : '';
    
    // 狀態標籤
    let statusBadge = '';
    if (st.status === 'active') statusBadge = '<span class="badge badge-active">開放中</span>';
    else if (st.status === 'permanent') statusBadge = '<span class="badge badge-permanent">常駐</span>';
    else statusBadge = '<span class="badge badge-ended">已結束</span>';

    // Zenny
    const zennyHTML = q.zenny ? `<span class="zenny-text">${Number(q.zenny).toLocaleString()} z</span>` : '';

    // 備註清單 (支援 HTML 標籤與分號切分)
    let remarksHTML = '';
    if (q.remarks) {
      const items = q.remarks.split(';').map(item => item.trim()).filter(Boolean);
      if (items.length > 0) {
        remarksHTML = `
          <div class="remarks-box">
            <ul style="margin: 0; padding-left: 0;">
              ${items.map(it => `<li style="padding: 6px 10px; margin: 4px 0; font-size: 0.85rem;">${it}</li>`).join('')}
            </ul>
          </div>
        `;
      }
    }

    return `
      <div class="card quest-card" id="card-${q.id}">
        <div>
          <div class="card-header">
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              <span class="badge badge-rare-${q.rank || 'HR'}">${q.rank || 'HR'}</span>
              <span class="tag tag-type">${q.difficulty || '★'}</span>
              ${statusBadge}
            </div>
            <button class="btn-copy" onclick="copyToClipboard('${q.questNameZh} ${q.questNameJa} ${q.questNameEn}', this)" title="複製任務名">
              <span class="material-symbols-outlined">content_copy</span>
            </button>
          </div>

          <div class="title-group" style="margin-bottom: 8px;">
            <h3 style="font-size: 1.05rem; font-weight: bold; color: var(--text-main);">
              ${newBadge}${q.questNameZh}
            </h3>
            <div class="en-title" style="font-size: 0.78rem; color: var(--text-muted);">
             ${q.questNameZhS || ''}  
            </div>
            <div class="en-title" style="font-size: 0.78rem; color: var(--text-muted);">
             ${q.questNameEn || ''} ${q.questNameJa ? `| ${q.questNameJa}` : ''}
            </div>
      
          </div>

          <div class="card-body">
            ${q.monster ? `
              <div class="quest-prop-row">
                <span class="quest-prop-label">目標：</span>
                <span class="quest-prop-val"><strong>${q.monster}</strong></span>
              </div>` : ''}
            
            ${q.requirement && q.requirement !== '無' ? `
              <div class="quest-prop-row">
                <span class="quest-prop-label">條件：</span>
                <span class="quest-prop-val">${q.requirement}</span>
              </div>` : ''}

            ${q.ticket ? `
              <div class="quest-prop-row">
                <span class="quest-prop-label">獨有票券：</span>
                <span class="quest-prop-val" style="color: var(--accent-color); font-weight:600;">${q.ticket}</span>
              </div>` : ''}

            ${q.armor ? `
              <div class="quest-prop-row">
                <span class="quest-prop-label">防具外觀：</span>
                <span class="quest-prop-val">${q.armor}</span>
              </div>` : ''}

            ${q.weapon ? `
              <div class="quest-prop-row">
                <span class="quest-prop-label">特殊武器：</span>
                <span class="quest-prop-val">${q.weapon}</span>
              </div>` : ''}

            ${q.palicoArmor ? `
              <div class="quest-prop-row">
                <span class="quest-prop-label">隨從裝備：</span>
                <span class="quest-prop-val">${q.palicoArmor}</span>
              </div>` : ''}

            ${q.pendant ? `
              <div class="quest-prop-row">
                <span class="quest-prop-label">飾物吊飾：</span>
                <span class="quest-prop-val">${q.pendant}</span>
              </div>` : ''}

            ${q.reward ? `
              <div class="quest-prop-row">
                <span class="quest-prop-label">主要報酬：</span>
                <span class="quest-prop-val">${q.reward}</span>
              </div>` : ''}

            ${zennyHTML ? `
              <div class="quest-prop-row">
                <span class="quest-prop-label">報酬金：</span>
                <span class="quest-prop-val">${zennyHTML}</span>
              </div>` : ''}

            ${q.activePeriods && !isTopSection ? `
              <div class="quest-prop-row">
                <span class="quest-prop-label">開放期間：</span>
                <span class="quest-prop-val" style="font-size:0.8rem; color:var(--text-muted);">${formatPeriodText(q.activePeriods)}</span>
              </div>` : ''}
          </div>
        </div>

        ${remarksHTML}
      </div>
    `;
  }

  // 10. 渲染資料庫列表與分頁
  function renderGrid() {
    const grid = document.getElementById('quests-grid');
    const stats = document.getElementById('quests-stats');
    if (!grid) return;

    const total = filteredQuests.length;
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filteredQuests.slice(start, start + ITEMS_PER_PAGE);

    if (stats) {
      stats.innerHTML = `共 <strong>${total}</strong> 個任務 (第 ${currentPage} / ${totalPages} 頁)`;
    }

    if (pageItems.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">沒有符合條件的任務</div>';
    } else {
      grid.innerHTML = pageItems.map(q => createCardHTML(q, false)).join('');
    }

    renderPagination(totalPages);
  }

  // 11. 分頁控制器
  function renderPagination(totalPages) {
    const container = document.getElementById('quests-pagination');
    if (!container) return;

    container.innerHTML = `
      <button class="btn-page" id="btn-quest-prev" ${currentPage === 1 ? 'disabled' : ''}>上一頁</button>
      <span class="page-info">${currentPage} / ${totalPages}</span>
      <button class="btn-page" id="btn-quest-next" ${currentPage === totalPages ? 'disabled' : ''}>下一頁</button>
    `;

    document.getElementById('btn-quest-prev')?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderGrid();
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
    });

    document.getElementById('btn-quest-next')?.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderGrid();
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
    });
  }

  // 12. 事件監聽 (篩選、搜尋、重設)
  function setupEventListeners() {
    const searchInput = document.getElementById('quest-search');
    searchInput?.addEventListener('input', (e) => {
      state.search = e.target.value.trim();
      applyFilters();
    });

    // 篩選按鈕組切換
    document.querySelectorAll('.filter-buttons .btn-filter[data-group]').forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.dataset.group;
        const val = btn.dataset.value;

        document.querySelectorAll(`.filter-buttons .btn-filter[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        state[group] = val;
        applyFilters();
      });
    });

    // 排序切換
    document.querySelectorAll('#sort-controls .btn-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#sort-controls .btn-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        state.sort = btn.dataset.sort;
        applyFilters();
      });
    });

    // 重設按鈕
    document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
      state.search = '';
      state.rank = 'ALL';
      state.questType = 'ALL';
      state.difficulty = 'ALL';
      state.rewardType = 'ALL';
      state.sort = 'default';

      if (searchInput) searchInput.value = '';

      document.querySelectorAll('.filter-buttons .btn-filter').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.filter-buttons .btn-filter[data-value="ALL"]').forEach(btn => btn.classList.add('active'));
      document.querySelector('#sort-controls .btn-filter[data-sort="default"]')?.classList.add('active');

      applyFilters();
    });
  }

})();