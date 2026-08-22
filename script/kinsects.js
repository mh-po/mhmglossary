/**
 * MH Database - Kinsects Search Logic & Favorites Management
 */

// 全局狀態
let rawKinsects = [];

// 篩選條件狀態
let currentGameVersion = 'ALL';
let currentTypeFilter = 'ALL';
let currentDustFilter = 'ALL';
let currentSkillFilter = []; // 陣列，支援多選 AND 篩選
let currentSearchText = '';
let showOnlyFav = false;     // 我的最愛開關狀態

// 分頁設定
let currentPage = 1;
const itemsPerPage = 20;

// LocalStorage 鍵名
const FAV_STORAGE_KEY = 'mh_fav_kinsects';

// ==========================================
// 1. 資料載入 (Data Loading)
// ==========================================

async function loadData() {
    const container = document.getElementById('cardsContainer');
    try {
        const res = await fetch('data/kinsects.json');
        if (!res.ok) throw new Error(`HTTP 錯誤！狀態：${res.status}`);

        rawKinsects = await res.json();

        // 依 Rare 降序排序 (R5 -> R1)
        rawKinsects.sort((a, b) => parseInt(b.rare || 0) - parseInt(a.rare || 0));

        filterAndRender();
    } catch (error) {
        console.error('資料載入失敗：', error);
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; color: #ef4444; padding: 40px;">
                    載入獵蟲資料失敗！請確認 <code>data/kinsects.json</code> 檔案路徑與內容是否正確。
                </div>`;
        }
    }
}

// ==========================================
// 2. 核心過濾邏輯 (Filter Logic)
// ==========================================

function filterAndRender() {
    // 改用 CommonFav 取得收藏清單
    const favorites = CommonFav.get(FAV_STORAGE_KEY);

    const filtered = rawKinsects.filter(bug => {
        const bugSkills = bug.kinSkills || '';
        const bugDust = bug.dustElm || '';
        const bugIdStr = String(bug.id);

        // A. 我的最愛過濾
        const matchesFav = !showOnlyFav || favorites.includes(bugIdStr);

        // B. 關鍵字全文搜尋
        const matchesSearch = !currentSearchText || 
            (bug.kinSect && bug.kinSect.toLowerCase().includes(currentSearchText)) ||
            (bug.kinSectJa && bug.kinSectJa.toLowerCase().includes(currentSearchText)) ||
            (bug.kinSectEn && bug.kinSectEn.toLowerCase().includes(currentSearchText)) ||
            (bug.kinEvo && bug.kinEvo.toLowerCase().includes(currentSearchText)) ||
            bugSkills.toLowerCase().includes(currentSearchText);

        // C. 遊戲版本
        const matchesVersion = currentGameVersion === 'ALL' || 
            (bug.gameVersion && bug.gameVersion.toString() === currentGameVersion);

        // D. 攻擊類型
        const matchesType = currentTypeFilter === 'ALL' || bug.kinTyp === currentTypeFilter;

        // E. 粉塵屬性
        const matchesDust = currentDustFilter === 'ALL' || bugDust.includes(currentDustFilter);

        // F. 獵蟲技能 (多選 AND 邏輯)
        const matchesSkills = currentSkillFilter.length === 0 || 
            currentSkillFilter.every(skill => bugSkills.includes(skill));

        return matchesFav && matchesSearch && matchesVersion && matchesType && matchesDust && matchesSkills;
    });

    renderCardsWithPagination(filtered);
}

// ==========================================
// 3. 渲染卡片與分頁 (UI Rendering)
// ==========================================

function renderCardsWithPagination(items) {
    const favorites = CommonFav.get(FAV_STORAGE_KEY);
    const container = document.getElementById('cardsContainer');
    const stats = document.getElementById('resultStats');
    const pagination = document.getElementById('paginationContainer');

    if (!container) return;

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    if (stats) {
        stats.innerHTML = `共 <strong>${totalItems}</strong> 隻獵蟲 (第 ${currentPage} / ${totalPages} 頁)`;
    }

    if (totalItems === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted, #94a3b8);">
                找不到符合條件的獵蟲 🪲
            </div>`;
        if (pagination) pagination.innerHTML = '';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageItems = items.slice(startIndex, startIndex + itemsPerPage);

    container.innerHTML = pageItems.map(bug => {
        const rareVal = bug.rare || '1';
        const bugIdStr = String(bug.id);
        const skillsList = bug.kinSkills ? bug.kinSkills.split(/,\s*/) : [];

        const powerPct = Math.min((parseInt(bug.power || 0) / 20) * 100, 100);
        const speedPct = Math.min((parseInt(bug.speed || 0) / 20) * 100, 100);
        const healPct  = Math.min((parseInt(bug.heal || 0) / 20) * 100, 100);

        const isFav = favorites.includes(bugIdStr);

        return `
            <div class="data-card">
                <div class="card-header">
                    <div>
                        <div class="card-title">${bug.kinSect || '未命名獵蟲'}</div>
                        <div class="card-subtitle">${bug.kinSectJa || ''} | ${bug.kinSectEn || ''}</div>
                        <div class="card-subtitle" style="margin-top: 2px;">版本：${bug.gameVersion || ''} | 進化自：${bug.kinEvo || '無'}</div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button class="btn-fav" onclick="handleToggleFav('${bugIdStr}', this)" style="background: none; border: none; cursor: pointer; padding: 2px; display: inline-flex;" title="${isFav ? '取消收藏' : '加入收藏'}">
                            <span class="material-symbols-outlined" style="font-size: 22px; color: ${isFav ? '#ef4444' : '#9ca3af'}; font-variation-settings: 'FILL' ${isFav ? 1 : 0};">
                                favorite
                            </span>
                        </button>
                        <span class="badge badge-rare-${rareVal}">R${rareVal}</span>
                    </div>
                </div>

                <div class="card-body">
                    <div style="margin: 8px 0;">
                        <span class="tag tag-type">${bug.kinTyp || '未知'}</span>
                        <span class="tag tag-dust">粉塵：${bug.dustElm || '無'} (LV ${bug.dustPowder || 0})</span>
                    </div>

                    <div class="stat-bar-container">
                        <div class="stat-bar-item">
                            <span class="stat-label">力量</span>
                            <div class="stat-bar-bg">
                                <div class="stat-bar-fill power" style="width: ${powerPct}%;"></div>
                            </div>
                            <span style="font-weight:bold; width: 24px; text-align: right;">${bug.power || 0}</span>
                        </div>
                        <div class="stat-bar-item">
                            <span class="stat-label">速度</span>
                            <div class="stat-bar-bg">
                                <div class="stat-bar-fill speed" style="width: ${speedPct}%;"></div>
                            </div>
                            <span style="font-weight:bold; width: 24px; text-align: right;">${bug.speed || 0}</span>
                        </div>
                        <div class="stat-bar-item">
                            <span class="stat-label">回復</span>
                            <div class="stat-bar-bg">
                                <div class="stat-bar-fill heal" style="width: ${healPct}%;"></div>
                            </div>
                            <span style="font-weight:bold; width: 24px; text-align: right;">${bug.heal || 0}</span>
                        </div>
                    </div>

                    ${skillsList.length > 0 ? `
                        <div style="margin-top: 10px;">
                            <div style="font-weight: bold; font-size: 0.85rem; color: var(--primary-color, #10b981); margin-bottom: 6px;">🪲 獵蟲技能：</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                                ${skillsList.map(s => `<span class="tag tag-skill">${s}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    if (pagination) {
        pagination.innerHTML = `
            <button class="btn-page" id="btnPrev" ${currentPage === 1 ? 'disabled' : ''}>上一頁</button>
            <span class="page-info">${currentPage} / ${totalPages}</span>
            <button class="btn-page" id="btnNext" ${currentPage === totalPages ? 'disabled' : ''}>下一頁</button>
        `;

        document.getElementById('btnPrev')?.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderCardsWithPagination(items);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });

        document.getElementById('btnNext')?.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderCardsWithPagination(items);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
}

/**
 * 卡片上的收藏按鈕點擊事件代理
 */
function handleToggleFav(id, btnElement) {
    CommonFav.toggle(FAV_STORAGE_KEY, id, btnElement, () => {
        if (showOnlyFav) {
            filterAndRender();
        }
    });
}

// ==========================================
// 4. DOM 事件初始化 (Initialization)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    loadData();

    const searchInput = document.getElementById('searchInput');

    // 關鍵字搜尋輸入
    searchInput?.addEventListener('input', (e) => {
        currentSearchText = e.target.value.toLowerCase().trim();
        currentPage = 1;
        filterAndRender();
    });

    // Reset 重置按鈕 (使用 CommonFav.resetUI)
    document.getElementById('btnResetSearch')?.addEventListener('click', () => {
        // 1. 統一重置 UI (輸入框、最愛按鈕、按鈕群組)
        CommonFav.resetUI({
            searchInputId: 'searchInput',
            favBtnId: 'btnFavFilter',
            groupIds: ['gameVersionButtons', 'typeButtons', 'dustButtons', 'skillButtons']
        });

        // 2. 重置內部 JS 狀態
        currentGameVersion = 'ALL';
        currentTypeFilter = 'ALL';
        currentDustFilter = 'ALL';
        currentSkillFilter = [];
        currentSearchText = '';
        showOnlyFav = false;
        currentPage = 1;

        // 3. 重新渲染
        filterAndRender();
    });

    // 我的最愛篩選開關按鈕
    document.getElementById('btnFavFilter')?.addEventListener('click', (e) => {
        showOnlyFav = !showOnlyFav;
        e.currentTarget.classList.toggle('active', showOnlyFav);
        currentPage = 1;
        filterAndRender();
    });

    // 綁定篩選按鈕群組
    bindButtonGroup('gameVersionButtons', 'data-ver', val => currentGameVersion = val);
    bindButtonGroup('typeButtons', 'data-type', val => currentTypeFilter = val);
    bindButtonGroup('dustButtons', 'data-dust', val => currentDustFilter = val);
    bindMultiSelectGroup('skillButtons', 'data-skill', valArray => currentSkillFilter = valArray);
});

// ==========================================
// 5. 按鈕綁定 Helper 工具函式
// ==========================================

/**
 * 單選按鈕組綁定工具
 */
function bindButtonGroup(groupId, dataAttr, updateStateCallback) {
    const group = document.getElementById(groupId);
    if (!group) return;

    group.addEventListener('click', (e) => {
        const btn = e.target.closest('button, .btn-filter');
        if (btn) {
            group.querySelectorAll('.btn-filter, button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const val = btn.getAttribute(dataAttr);
            updateStateCallback(val);
            currentPage = 1;
            filterAndRender();
        }
    });
}

/**
 * 多選按鈕組綁定工具 (具有 ALL 自動互斥邏輯)
 */
function bindMultiSelectGroup(groupId, dataAttr, updateStateCallback) {
    const group = document.getElementById(groupId);
    if (!group) return;

    group.addEventListener('click', (e) => {
        const btn = e.target.closest('button, .btn-filter');
        if (btn) {
            const val = btn.getAttribute(dataAttr);
            const allBtn = group.querySelector(`[${dataAttr}="ALL"]`);

            if (val === 'ALL') {
                group.querySelectorAll('.btn-filter, button').forEach(b => b.classList.remove('active'));
                allBtn?.classList.add('active');
                updateStateCallback([]);
            } else {
                allBtn?.classList.remove('active');
                btn.classList.toggle('active');

                const activeBtns = Array.from(group.querySelectorAll('.btn-filter.active, button.active'))
                                       .map(b => b.getAttribute(dataAttr))
                                       .filter(v => v && v !== 'ALL');

                if (activeBtns.length === 0) {
                    allBtn?.classList.add('active');
                }

                updateStateCallback(activeBtns);
            }

            currentPage = 1;
            filterAndRender();
        }
    });
}