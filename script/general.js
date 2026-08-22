/**
 * MH Database - General Dictionary Logic
 * 綜合速查辭典 (三語複製 / 點擊 Badge 篩選)
 */

// LocalStorage 鍵名
const GENERAL_FAV_KEY = 'mh_fav_general';

let allGeneralData = [];
let filteredGeneralData = [];
let currentPage = 1;
const itemsPerPage = 20;

let currentFilter = {
    keyword: '',
    typeSub: 'ALL', // 新增：用於記錄當前點擊的 Badge 分類
    onlyFavorite: false
};

// ==========================================
// 1. 助手函式：安全取得 ID
// ==========================================
function getGeneralId(item) {
    if (!item) return '';
    return String(item.id || item.iD || item.siteId || '').trim();
}

// ==========================================
// 2. Favorites 收藏工具
// ==========================================
function getFavoriteGeneral() {
    return CommonFav.get('mh_fav_general');
}

function isGeneralFavorite(id) {
    if (!id || id === 'undefined') return false;
    return getFavoriteGeneral().includes(String(id));
}

function toggleGeneralFavorite(id, event) {
    if (event) event.stopPropagation();
    const btnElement = event ? event.currentTarget : null;
    
    // 使用 CommonFav 處理核心邏輯，並在完成後判斷是否需要重繪畫面
    CommonFav.toggle('mh_fav_general', id, btnElement, () => {
        // 如果目前處於「只顯示我的最愛」過濾模式，取消收藏時卡片必須消失，所以要重新渲染
        if (currentFilter.onlyFavorite) {
            applyFiltersAndRender();
        }
    });
}

// ==========================================
// 3. 剪貼簿複製代理 & Badge 過濾控制
// ==========================================
function handleCardCopy(text, btnElement, event) {
    if (event) event.stopPropagation();
    if (typeof copyToClipboard === 'function') {
        copyToClipboard(text, btnElement);
    }
}

// 新增：點擊 Badge 切換過濾狀態
window.toggleTypeSubFilter = function(type, event) {
    if (event) event.stopPropagation();
    
    if (!type) return;

    // 如果點擊的是目前已經過濾的分類，則取消過濾 (Toggle)
    if (currentFilter.typeSub === type) {
        currentFilter.typeSub = 'ALL';
    } else {
        currentFilter.typeSub = type;
    }
    
    applyFiltersAndRender();
};

// ==========================================
// 4. 資料初始化 
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadGeneralData();
    setupEventListeners();
    setupThemeToggle();
});

async function loadGeneralData() {
    const container = document.getElementById('cardsContainer');
    try {
        const response = await fetch('data/general.json');
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        allGeneralData = await response.json();
        applyFiltersAndRender();
    } catch (error) {
        console.error('載入 data/general.json 失敗:', error);
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 40px;">
                    無法載入資料，請確認檔案 <code>data/general.json</code> 存在且格式正確。
                </div>`;
        }
    }
}

// ==========================================
// 5. 篩選與渲染主邏輯
// ==========================================
function applyFiltersAndRender() {
    const favs = getFavoriteGeneral();

    filteredGeneralData = allGeneralData.filter(item => {
        const id = getGeneralId(item);

        // 搜尋關鍵字
        if (currentFilter.keyword) {
            const k = currentFilter.keyword.toLowerCase().trim();
            const matchZh = item.generalZh?.toLowerCase().includes(k);
            const matchJa = item.generalJa?.toLowerCase().includes(k);
            const matchEn = item.generalEn?.toLowerCase().includes(k);
            const matchType = item.typeSub?.toLowerCase().includes(k);
            const matchNote = item.genNote?.toLowerCase().includes(k);
            
            if (!matchZh && !matchJa && !matchEn && !matchType && !matchNote) return false;
        }

        // 我的最愛過濾
        if (currentFilter.onlyFavorite && !favs.includes(id)) {
            return false;
        }

        // Badge 點擊分類過濾
        if (currentFilter.typeSub !== 'ALL' && item.typeSub !== currentFilter.typeSub) {
            return false;
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

    const totalItems = filteredGeneralData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    // 如果有選中分類，在統計文字旁加個小提示
    let filterHint = currentFilter.typeSub !== 'ALL' ? ` (篩選: ${currentFilter.typeSub})` : '';
    if (stats) stats.innerHTML = `共 <strong>${totalItems}</strong> 筆資料<span style="color: var(--primary-color);">${filterHint}</span>`;
    if (pageIndicator) pageIndicator.textContent = `頁數 ${currentPage} / ${totalPages}`;

    if (totalItems === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted, #94a3b8);">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">🔍</div>
                <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 6px;">查無符合條件的資料</div>
                <div style="font-size: 0.85rem;">請嘗試調整搜尋關鍵字</div>
            </div>`;
        renderPaginationControls(0);
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageData = filteredGeneralData.slice(startIndex, startIndex + itemsPerPage);

    container.innerHTML = pageData.map(data => createGeneralCardHTML(data)).join('');
    renderPaginationControls(totalPages);
}

// 產生單張卡片 HTML
function createGeneralCardHTML(data) {
    const id = getGeneralId(data);
    const isFav = isGeneralFavorite(id);

    // 判斷該 Badge 是否為正在過濾的狀態，改變視覺效果
    const isActiveFilter = (currentFilter.typeSub !== 'ALL' && currentFilter.typeSub === data.typeSub);
    const badgeStyle = isActiveFilter 
        ? "background: #8b5cf6; color: #ffffff; border: 1px solid #8b5cf6; cursor: pointer; transform: scale(1.05);" // 選中時：實心紫
        : "background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); cursor: pointer;"; // 預設：透明紫

    return `
        <div class="data-card" id="general-card-${id}">
            <!-- 第一行：主名稱與我的最愛 (含 typeSub Badge) -->
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                    <div class="card-title" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="color: #38bdf8; font-weight: bold; font-size: 1.1rem;">${data.generalZh || '未命名項目'}</span>
                        <button class="btn-icon-copy" onclick="handleCardCopy('${data.generalZh || ''}', this, event)" title="複製繁體名稱">
                            <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                        </button>
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                    <!-- 子分類 Badge (typeSub) 升級為可點擊按鈕 -->
                    <button class="badge" 
                            onclick="toggleTypeSubFilter('${data.typeSub}', event)" 
                            style="${badgeStyle} transition: all 0.2s;" 
                            title="點擊篩選此分類">
                        ${data.typeSub || '分類'}
                    </button>

                    <button class="btn-fav ${isFav ? 'active' : ''}" 
                            onclick="toggleGeneralFavorite('${id}', event)" 
                            title="${isFav ? '取消收藏' : '加入收藏'}" 
                            style="background: none; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-outlined" style="font-size: 22px; color: ${isFav ? '#ef4444' : 'var(--text-muted)'}; font-variation-settings: 'FILL' ${isFav ? 1 : 0};">
                            favorite
                        </span>
                    </button>
                </div>
            </div>

            <!-- 第二行：日文與英文複製列 -->
            <div class="card-body">
                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.9rem; color: var(--text-muted); margin-bottom: 12px;">
                    
                    ${data.generalJa ? `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="min-width: 24px; font-weight: bold; color: var(--text-main);">日</span>
                            <span>${data.generalJa}</span>
                            <button class="btn-icon-copy" onclick="handleCardCopy('${data.generalJa}', this, event)" title="複製日文名稱">
                                <span class="material-symbols-outlined" style="font-size: 15px;">content_copy</span>
                            </button>
                        </div>
                    ` : ''}

                    ${data.generalEn ? `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="min-width: 24px; font-weight: bold; color: var(--text-main);">英</span>
                            <span>${data.generalEn}</span>
                            <button class="btn-icon-copy" onclick="handleCardCopy('${data.generalEn}', this, event)" title="複製英文名稱">
                                <span class="material-symbols-outlined" style="font-size: 15px;">content_copy</span>
                            </button>
                        </div>
                    ` : ''}

                </div>

                <!-- 備註區塊 (genNote) -->
                ${data.genNote ? `
                    <div style="background: rgba(0,0,0,0.15); border-left: 3px solid var(--info-color, #17a2b8); padding: 8px 10px; border-radius: 4px; font-size: 0.85rem; color: var(--text-main); margin-bottom: 10px; line-height: 1.4;">
                        ${data.genNote}
                    </div>
                ` : ''}

                <!-- 遊戲版本標籤 -->
                <div style="display: flex; justify-content: flex-end; align-items: center;">
                    <span class="tag" style="font-size: 0.75rem;">${data.gameVersion || ''}</span>
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// 6. Pagination 分頁 UI
// ==========================================
function renderPaginationControls(totalPages) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    html += `<button class="btn-filter" ${currentPage === 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''} onclick="goToPage(1)">首頁</button>`;
    html += `<button class="btn-filter" ${currentPage === 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''} onclick="goToPage(${currentPage - 1})">上一頁</button>`;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="btn-filter ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    html += `<button class="btn-filter" ${currentPage === totalPages ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''} onclick="goToPage(${currentPage + 1})">下一頁</button>`;
    html += `<button class="btn-filter" ${currentPage === totalPages ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''} onclick="goToPage(${totalPages})">末頁</button>`;

    container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderCurrentPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// 7. DOM 事件監聽
// ==========================================
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentFilter.keyword = e.target.value;
            applyFiltersAndRender();
        });
    }

    const btnReset = document.getElementById('btnResetSearch');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            // 重置時，一併清除 typeSub 的過濾狀態
            currentFilter = { keyword: '', typeSub: 'ALL', onlyFavorite: false };
            if (searchInput) searchInput.value = '';

            const favBtn = document.getElementById('btnFavFilter');
            if (favBtn) favBtn.classList.remove('active');

            applyFiltersAndRender();
        });
    }

    const favFilterBtn = document.getElementById('btnFavFilter');
    if (favFilterBtn) {
        favFilterBtn.addEventListener('click', () => {
            currentFilter.onlyFavorite = !currentFilter.onlyFavorite;
            if (currentFilter.onlyFavorite) {
                favFilterBtn.classList.add('active');
            } else {
                favFilterBtn.classList.remove('active');
            }
            applyFiltersAndRender();
        });
    }
}

function setupThemeToggle() {
    const btn = document.getElementById('themeToggleBtn');
    const icon = document.getElementById('themeIcon');
    if (!btn || !icon) return;

    btn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('light-theme');
        icon.innerText = isDark ? 'light_mode' : 'dark_mode';
    });
}