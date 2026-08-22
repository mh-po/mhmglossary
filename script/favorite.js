/**
 * MH Database - Centralized Favorites Logic
 * 全站我的最愛整合頁 (依賴 card-templates.js 進行渲染)
 */

// 1. 設定註冊表：定義所有資料庫的 localStorage Key、路徑與對應的渲染工廠
const FAV_CONFIG = [
    { category: 'MONSTERS', key: 'mh_fav_monsters', url: 'data/monsters.json', renderFn: 'createMonsterCard' },
    { category: 'SKILLS', key: 'mh_fav_skills', url: 'data/skills.json', renderFn: 'createSkillCard' },
    { category: 'JEWELS', key: 'mh_fav_jewels', url: 'data/jewels.json', renderFn: 'createJewelCard' },
    { category: 'MEALSKILLS', key: 'mh_fav_mealskills', url: 'data/mealskills.json', renderFn: 'createMealSkillCard' },
    { category: 'CHARMS', key: 'mh_fav_charms', url: 'data/charms.json', renderFn: 'createCharmCard' },
    { category: 'HUNTINGHORNS', key: 'mh_fav_huntinghorns', url: 'data/huntinghorns.json', renderFn: 'createHuntingHornCard' },
    { category: 'KINSECTS', key: 'mh_fav_kinsects', url: 'data/kinsects.json', renderFn: 'createKinsectCard' },
    { category: 'GENERAL', key: 'mh_fav_general', url: 'data/general.json', renderFn: 'createGeneralCard' }
];

let allFavoritesData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 20;

let currentFilter = {
    keyword: '',
    category: 'ALL'
};

// ==========================================
// 2. 資料載入與整合
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    await loadAllFavorites();
});

async function loadAllFavorites() {
    const container = document.getElementById('cardsContainer');
    allFavoritesData = []; // 重置

    try {
        // 同時啟動所有資料庫的檢查與載入
        const fetchPromises = FAV_CONFIG.map(async (config) => {
            // 從 LocalStorage 讀取該分類的收藏 ID 陣列
            const favIds = JSON.parse(localStorage.getItem(config.key)) || [];
            
            // 如果該分類完全沒有收藏，就不浪費網路發 fetch 請求
            if (favIds.length === 0) return [];

            try {
                const response = await fetch(config.url);
                if (!response.ok) return [];
                
                const data = await response.json();
                
                // 找出被收藏的項目，並打上「分類標籤」與「設定檔引用」
                return data
                    .filter(item => favIds.includes(String(item.id || item.iD || item.siteId || item.skillId || '').trim()))
                    .map(item => ({ 
                        ...item, 
                        _favCategory: config.category, 
                        _renderFn: config.renderFn 
                    }));
            } catch (err) {
                console.warn(`載入 ${config.category} 失敗:`, err);
                return [];
            }
        });

        // 等待所有請求完成，並攤平陣列 (Flat)
        const resultsArray = await Promise.all(fetchPromises);
        allFavoritesData = resultsArray.flat();

        applyFiltersAndRender();

    } catch (error) {
        console.error('整合收藏資料發生嚴重錯誤：', error);
        container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color: #ef4444; padding: 40px;">讀取收藏資料發生錯誤。</div>`;
    }
}

// ==========================================
// 3. 移除收藏全域函數 (對接 CardTemplates)
// ==========================================
// CardTemplates 預設會呼叫對應的 toggleXXXFavorite 函數，我們在這裡將它們導向統一的刪除邏輯
window.toggleMonsterFavorite = (id, e) => handleRemoveFavorite(id, 'MONSTERS', e);
window.toggleSkillFavorite = (id, e) => handleRemoveFavorite(id, 'SKILLS', e);
window.toggleJewelFavorite = (id, e) => handleRemoveFavorite(id, 'JEWELS', e);
window.toggleMealSkillFavorite = (id, e) => handleRemoveFavorite(id, 'MEALSKILLS', e);
window.toggleCharmFavorite = (id, e) => handleRemoveFavorite(id, 'CHARMS', e);
window.toggleHuntingHornFavorite = (id, e) => handleRemoveFavorite(id, 'HUNTINGHORNS', e);
window.toggleKinsectFavorite = (id, e) => handleRemoveFavorite(id, 'KINSECTS', e);
window.toggleGeneralFavorite = (id, e) => handleRemoveFavorite(id, 'GENERAL', e);

function handleRemoveFavorite(id, category, event) {
    if (event) event.stopPropagation();

    const config = FAV_CONFIG.find(c => c.category === category);
    if (!config) return;

    // 1. 從 LocalStorage 移除
    let favs = JSON.parse(localStorage.getItem(config.key)) || [];
    favs = favs.filter(favId => String(favId) !== String(id));
    localStorage.setItem(config.key, JSON.stringify(favs));

    // 2. 從記憶體中的整合陣列移除
    allFavoritesData = allFavoritesData.filter(item => {
        const itemId = String(item.id || item.iD || item.siteId || item.skillId || '').trim();
        // 如果是同一個分類且 ID 相同，就踢除
        return !(item._favCategory === category && itemId === String(id));
    });

    // 3. 重新渲染畫面
    applyFiltersAndRender();
}

// ==========================================
// 4. 篩選與渲染主邏輯
// ==========================================
function applyFiltersAndRender() {
    filteredData = allFavoritesData.filter(item => {
        // 1. 頁籤分類篩選
        if (currentFilter.category !== 'ALL' && item._favCategory !== currentFilter.category) {
            return false;
        }

        // 2. 萬用關鍵字搜尋 (這是一個黑科技，會把整包 JSON 資料轉字串來暴力比對，省去指定欄位的麻煩)
        if (currentFilter.keyword) {
            const k = currentFilter.keyword.toLowerCase().trim();
            // 抓出物件中所有的純字串值，拼接在一起比對
            const allValuesString = Object.values(item)
                .filter(val => typeof val === 'string')
                .join(' ')
                .toLowerCase();
            
            if (!allValuesString.includes(k)) return false;
        }

        return true;
    });

    currentPage = 1;
    renderCurrentPage();
}

function renderCurrentPage() {
    const container = document.getElementById('cardsContainer');
    const stats = document.getElementById('resultStats');
    const pageIndicator = document.getElementById('pageIndicator');
    if (!container) return;

    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    let filterHint = currentFilter.category !== 'ALL' ? ` (篩選分類)` : '';
    if (stats) stats.innerHTML = `共 <strong>${totalItems}</strong> 個收藏項目<span style="color: var(--primary-color);">${filterHint}</span>`;
    if (pageIndicator) pageIndicator.textContent = `頁數 ${currentPage} / ${totalPages}`;

    if (totalItems === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding: 60px 20px; color: var(--text-muted);">
                <div style="font-size: 3rem; margin-bottom: 12px;">⭐️</div>
                <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 6px;">查無符合條件的收藏</div>
                <div style="font-size: 0.9rem;">試著切換「全部」頁籤，或是去各專區加入一些最愛吧！</div>
            </div>`;
        renderPaginationControls(0);
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    // 核心：動態呼叫 card-templates.js 的工廠函數！
    // 第二個參數 true 代表 isFav，這樣心心才會預設亮紅燈
    container.innerHTML = pageData.map(item => {
        if (CardTemplates && typeof CardTemplates[item._renderFn] === 'function') {
            return CardTemplates[item._renderFn](item, true);
        } else {
            console.warn('找不到對應的卡片渲染模板:', item._renderFn);
            return '';
        }
    }).join('');

    renderPaginationControls(totalPages);
}

// ==========================================
// 5. 分頁與 DOM 事件
// ==========================================
function renderPaginationControls(totalPages) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    html += `<button class="btn-filter" ${currentPage === 1 ? 'disabled style="opacity:0.4"' : ''} onclick="goToPage(1)">首頁</button>`;
    html += `<button class="btn-filter" ${currentPage === 1 ? 'disabled style="opacity:0.4"' : ''} onclick="goToPage(${currentPage - 1})">上一頁</button>`;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="btn-filter ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    html += `<button class="btn-filter" ${currentPage === totalPages ? 'disabled style="opacity:0.4"' : ''} onclick="goToPage(${currentPage + 1})">下一頁</button>`;
    html += `<button class="btn-filter" ${currentPage === totalPages ? 'disabled style="opacity:0.4"' : ''} onclick="goToPage(${totalPages})">末頁</button>`;
    container.innerHTML = html;
}

window.goToPage = function(page) {
    currentPage = page;
    renderCurrentPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupEventListeners() {
    // 搜尋框
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentFilter.keyword = e.target.value;
            applyFiltersAndRender();
        });
    }

    // 重置按鈕
    const btnReset = document.getElementById('btnResetSearch');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            currentFilter = { keyword: '', category: 'ALL' };
            if (searchInput) searchInput.value = '';
            
            const tabs = document.getElementById('favCategoryTabs');
            if (tabs) {
                tabs.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
                tabs.querySelector('[data-category="ALL"]').classList.add('active');
            }
            applyFiltersAndRender();
        });
    }

    // 頁籤切換
    const tabsContainer = document.getElementById('favCategoryTabs');
    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-filter');
            if (!btn) return;

            tabsContainer.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentFilter.category = btn.getAttribute('data-category');
            applyFiltersAndRender();
        });
    }

    // 清空所有收藏 (加入防呆確認與強化回饋)
    const btnClearAll = document.getElementById('btnClearAllFav');
    if (btnClearAll) {
        btnClearAll.addEventListener('click', () => {
            // 1. 直接掃描 LocalStorage，檢查是否真的有任何收藏
            const hasAnyFav = FAV_CONFIG.some(config => {
                const favs = JSON.parse(localStorage.getItem(config.key)) || [];
                return favs.length > 0;
            });

            // 2. 如果全空，跳出提示並中斷
            if (!hasAnyFav) {
                alert("目前沒有任何收藏可以清空喔！");
                return;
            }
            
            // 3. 執行清空確認
            const confirmDelete = confirm("⚠️ 確定要清空所有的收藏項目嗎？此動作無法復原。");
            if (confirmDelete) {
                // 將設定檔中註冊的所有 LocalStorage 鑰匙拔除
                FAV_CONFIG.forEach(config => {
                    localStorage.removeItem(config.key);
                });
                
                // 同步清空記憶體陣列，並呼叫重新渲染
                allFavoritesData = [];
                applyFiltersAndRender();
                
                // 給予成功回饋
                alert("✅ 已成功清空所有收藏！");
            }
        });
    }
}