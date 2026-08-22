/**
 * MH Database - Jewels Page Logic
 * 飾品珠資料庫模組 (附帶技能 Cross-Reference Modal)
 */

const JEWEL_FAV_KEY = 'mh_fav_jewels';

let allJewelsData = [];
let filteredJewelsData = [];
let skillsMap = {}; // 用來存放 skills.json 的資料字典
let currentPage = 1;
const itemsPerPage = 20;

let currentFilter = {
    keyword: '',
    gameVersion: 'ALL',
    jewelType: 'ALL',
    onlyFavorite: false
};

// ==========================================
// 1. 助手函式
// ==========================================
function getJewelId(item) {
    if (!item) return '';
    return String(item.id || item.iD || item.siteId || '').trim();
}

// 供 Modal 使用的 Regex 切割 Lv 描述
function parseLvDescription(str) {
    if (!str) return [];
    return str.split(/(?=Lv\d+:)/)
              .map(s => s.trim().replace(/,$/, ''))
              .filter(Boolean);
}

// ==========================================
// 2. Favorites 收藏工具
// ==========================================
function getFavoriteJewels() {
    return CommonFav.get('mh_fav_jewels');
}

function isJewelFavorite(id) {
    if (!id || id === 'undefined') return false;
    return getFavoriteJewels().includes(String(id));
}

function toggleJewelFavorite(id, event) {
    if (event) event.stopPropagation();
    const btnElement = event ? event.currentTarget : null;
    
    CommonFav.toggle('mh_fav_jewels', id, btnElement, () => {
        if (currentFilter.onlyFavorite) {
            applyFiltersAndRender();
        }
    });
}
// ==========================================
// 3. 剪貼簿複製
// ==========================================
function handleCardCopy(text, btnElement, event) {
    if (event) event.stopPropagation();
    if (typeof copyToClipboard === 'function') {
        copyToClipboard(text, btnElement);
    }
}

// ==========================================
// 4. 資料初始化 (同時抓取 Jewels 與 Skills)
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
    setupThemeToggle();
});

async function loadData() {
    const container = document.getElementById('cardsContainer');
    try {
        // 同時發送兩個請求
        const [jewelsRes, skillsRes] = await Promise.all([
            fetch('data/jewels.json'),
            fetch('data/skills.json').catch(() => null) // 若 skills 找不到不至於讓頁面死掉
        ]);

        if (!jewelsRes.ok) throw new Error(`HTTP Error: ${jewelsRes.status}`);
        allJewelsData = await jewelsRes.json();

        // 如果成功抓到技能資料，建立字典 (Dictionary) 供快速查找
        if (skillsRes && skillsRes.ok) {
            const skillsData = await skillsRes.json();
            skillsData.forEach(skill => {
                const sId = skill.id || skill.iD || skill.skillId;
                if (sId) skillsMap[sId] = skill;
            });
        }
        
        initDynamicFilters(allJewelsData);
        applyFiltersAndRender();
    } catch (error) {
        console.error('載入資料失敗:', error);
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 40px;">
                    無法載入飾品珠資料，請確認檔案 <code>data/jewels.json</code> 存在且格式正確。
                </div>`;
        }
    }
}

function initDynamicFilters(data) {
    const types = new Set();
    data.forEach(item => {
        if (item.jewelType && item.jewelType.trim()) types.add(item.jewelType.trim());
    });

    const typeContainer = document.getElementById('jewelTypeFilter');
    if (typeContainer) {
        typeContainer.innerHTML = '<button class="btn-filter active" data-value="ALL">全部</button>';
        types.forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'btn-filter';
            btn.dataset.value = type;
            btn.textContent = type;
            typeContainer.appendChild(btn);
        });
    }
}

// ==========================================
// 5. 篩選與渲染主邏輯
// ==========================================
function applyFiltersAndRender() {
    const favs = getFavoriteJewels();

    filteredJewelsData = allJewelsData.filter(item => {
        const id = getJewelId(item);

        // 搜尋關鍵字
        if (currentFilter.keyword) {
            const k = currentFilter.keyword.toLowerCase().trim();
            const matchZh = item.jewelZh?.toLowerCase().includes(k);
            const matchJa = item.jewelJa?.toLowerCase().includes(k);
            const matchEn = item.jewelEn?.toLowerCase().includes(k);
            const matchSkill = item.jewelSkillZh?.toLowerCase().includes(k);
            
            if (!matchZh && !matchJa && !matchEn && !matchSkill) return false;
        }

        if (currentFilter.onlyFavorite && !favs.includes(id)) return false;

        // 修正：現在使用 item.gameVersion 進行過濾
        if (currentFilter.gameVersion !== 'ALL' && item.gameVersion !== currentFilter.gameVersion) return false;

        if (currentFilter.jewelType !== 'ALL' && item.jewelType !== currentFilter.jewelType) return false;

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

    const totalItems = filteredJewelsData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    if (stats) stats.innerHTML = `共 <strong>${totalItems}</strong> 顆飾品珠`;
    if (pageIndicator) pageIndicator.textContent = `頁數 ${currentPage} / ${totalPages}`;

    if (totalItems === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted, #94a3b8);">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">🔍</div>
                <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 6px;">查無符合條件的飾品珠</div>
                <div style="font-size: 0.85rem;">請嘗試調整搜尋關鍵字或重置篩選條件</div>
            </div>`;
        renderPaginationControls(0);
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageData = filteredJewelsData.slice(startIndex, startIndex + itemsPerPage);

    container.innerHTML = pageData.map(jewel => createJewelCardHTML(jewel)).join('');
    renderPaginationControls(totalPages);
}

function createJewelCardHTML(jewel) {
    const id = getJewelId(jewel);
    const isFav = isJewelFavorite(id);

    // 判斷是否有技能資料，產生 Cross-Reference 區塊
    let skillRowHTML = '';
    if (jewel.refId && jewel.jewelSkillZh) {
        skillRowHTML = `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border-color, rgba(255,255,255,0.1));">
                <div style="font-size: 0.8rem; color: var(--text-muted, #94a3b8); margin-bottom: 6px;">裝備技能 (點擊詳情)：</div>
                <button class="btn-skill-ref" onclick="showSkillDetail('${jewel.refId}')">
                    <div style="display: flex; flex-direction: column; align-items: flex-start;">
                        <span style="font-weight: bold; font-size: 0.95rem; color: var(--text-main);">${jewel.jewelSkillZh}</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                            ${jewel.jewelSkillJa || ''} ${jewel.jewelSkillJa && jewel.jewelSkillEn ? '|' : ''} ${jewel.jewelSkillEn || ''}
                        </span>
                    </div>
                    <span class="material-symbols-outlined" style="color: var(--primary-color);">open_in_new</span>
                </button>
            </div>
        `;
    }

    return `
        <div class="data-card" id="jewel-card-${id}">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                    <div class="card-title" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="color: #38bdf8; font-weight: bold; font-size: 1.1rem;">${jewel.jewelZh || '未命名飾品珠'}</span>
                        <button class="btn-icon-copy" onclick="handleCardCopy('${jewel.jewelZh || ''}', this, event)" title="複製繁體名稱">
                            <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                        </button>
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                    <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);">
                        ${jewel.jewelType || '飾品珠'}
                    </span>
                    <button class="btn-fav ${isFav ? 'active' : ''}" 
                            onclick="toggleJewelFavorite('${id}', event)" 
                            style="background: none; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-outlined" style="font-size: 22px; color: ${isFav ? '#ef4444' : 'var(--text-muted)'}; font-variation-settings: 'FILL' ${isFav ? 1 : 0};">favorite</span>
                    </button>
                </div>
            </div>

            <div class="card-body">
                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.88rem; color: var(--text-muted); margin-bottom: 8px;">
                    ${jewel.jewelJa ? `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="min-width: 24px; font-weight: bold; color: var(--text-main);">日</span>
                            <span>${jewel.jewelJa}</span>
                            <button class="btn-icon-copy" onclick="handleCardCopy('${jewel.jewelJa}', this, event)"><span class="material-symbols-outlined" style="font-size: 15px;">content_copy</span></button>
                        </div>
                    ` : ''}
                    ${jewel.jewelEn ? `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="min-width: 24px; font-weight: bold; color: var(--text-main);">英</span>
                            <span>${jewel.jewelEn}</span>
                            <button class="btn-icon-copy" onclick="handleCardCopy('${jewel.jewelEn}', this, event)"><span class="material-symbols-outlined" style="font-size: 15px;">content_copy</span></button>
                        </div>
                    ` : ''}
                </div>

                <div style="display: flex; justify-content: flex-end; align-items: center; font-size: 0.8rem;">
                    <span class="tag" style="font-size: 0.75rem;">${jewel.gameVersion || ''}</span>
                </div>

                <!-- 技能 Cross-Reference 區塊 -->
                ${skillRowHTML}
            </div>
        </div>
    `;
}

// ==========================================
// 6. 技能詳情 Modal 控制
// ==========================================
function showSkillDetail(refId) {
    const modal = document.getElementById('skillModalOverlay');
    const title = document.getElementById('modalSkillTitle');
    const sub = document.getElementById('modalSkillSub');
    const desc = document.getElementById('modalSkillDesc');
    const levelsContainer = document.getElementById('modalSkillLevels');

    if (!modal) return;

    // 從字典尋找技能
    const skill = skillsMap[refId];

    if (!skill) {
        title.textContent = "無法載入技能";
        sub.textContent = `ID: ${refId}`;
        desc.textContent = "未能從技能資料庫 (skills.json) 找到此技能的詳細資料。";
        levelsContainer.innerHTML = '';
    } else {
        title.textContent = skill.skillZh || '未知技能';
        sub.textContent = `${skill.skillJa || ''} | ${skill.skillEn || ''}`;
        desc.textContent = skill.skillDescription || '無詳細描述';

        const lvList = parseLvDescription(skill.lvDescription);
        levelsContainer.innerHTML = lvList.length > 0 
            ? lvList.map(lv => `<div style="font-size: 0.82rem; color: var(--text-main); line-height: 1.4; padding: 4px 0; border-bottom: 1px dotted rgba(255,255,255,0.05);">${lv}</div>`).join('') 
            : '<div style="font-size: 0.8rem; color: var(--text-muted);">無等級詳細數據</div>';
    }

    modal.style.display = 'flex';
}

function closeSkillModal() {
    const modal = document.getElementById('skillModalOverlay');
    if (modal) modal.style.display = 'none';
}

// 點擊背景關閉 Modal
document.addEventListener('click', (e) => {
    const modal = document.getElementById('skillModalOverlay');
    if (modal && e.target === modal) {
        closeSkillModal();
    }
});

// ==========================================
// 7. Pagination 與事件
// ==========================================
function renderPaginationControls(totalPages) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    html += `<button class="btn-filter" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(1)">首頁</button>`;
    html += `<button class="btn-filter" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">上一頁</button>`;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="btn-filter ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    html += `<button class="btn-filter" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">下一頁</button>`;
    html += `<button class="btn-filter" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${totalPages})">末頁</button>`;

    container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderCurrentPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', (e) => { currentFilter.keyword = e.target.value; applyFiltersAndRender(); });

    const btnReset = document.getElementById('btnResetSearch');
    if (btnReset) btnReset.addEventListener('click', () => {
        currentFilter = { keyword: '', gameVersion: 'ALL', jewelType: 'ALL', onlyFavorite: false };
        if (searchInput) searchInput.value = '';
        document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.btn-group-filter').forEach(group => {
            const firstBtn = group.querySelector('[data-value="ALL"]');
            if (firstBtn) firstBtn.classList.add('active');
        });
        const favBtn = document.getElementById('btnFavFilter');
        if (favBtn) favBtn.classList.remove('active');
        applyFiltersAndRender();
    });

    const favFilterBtn = document.getElementById('btnFavFilter');
    if (favFilterBtn) favFilterBtn.addEventListener('click', () => {
        currentFilter.onlyFavorite = !currentFilter.onlyFavorite;
        favFilterBtn.classList.toggle('active', currentFilter.onlyFavorite);
        applyFiltersAndRender();
    });

    document.querySelectorAll('.filter-groups-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-filter');
            if (!btn) return;
            const group = btn.closest('.btn-group-filter');
            if (!group) return;

            group.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (group.id === 'jewelTypeFilter') currentFilter.jewelType = btn.dataset.value;
            else if (group.id === 'gameVersionFilter') currentFilter.gameVersion = btn.dataset.value;

            applyFiltersAndRender();
        });
    });
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