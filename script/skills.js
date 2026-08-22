/**
 * MH Database - Skills Page Logic
 * 技能資料庫模組 (多重選取標籤 / ID 辨識修復 / Favorites)
 */

// LocalStorage 鍵名
const SKILL_FAV_KEY = 'mh_fav_skills';

let allSkillsData = [];
let filteredSkillsData = [];
let currentPage = 1;
const itemsPerPage = 20;

// 將 skillTag 變更為陣列以支援多選
let currentFilter = {
    keyword: '',
    gameVersion: 'ALL',
    skillSource: 'ALL',
    skillTag: [], // 空陣列代表「全部」
    onlyFavorite: false
};

// ==========================================
// 1. 助手函式：統一安全取得技能 ID
// ==========================================
function getSkillId(item) {
    if (!item) return '';
    return String(item.iD || item.id || item.skillId || '').trim();
}

// ==========================================
// 2. Favorites 技能收藏工具
// ==========================================
function getFavoriteSkills() {
    return CommonFav.get('mh_fav_skills');
}

function isSkillFavorite(id) {
    if (!id || id === 'undefined') return false;
    return getFavoriteSkills().includes(String(id));
}

function toggleSkillFavorite(id, event) {
    if (event) event.stopPropagation();
    const btnElement = event ? event.currentTarget : null;
    
    CommonFav.toggle('mh_fav_skills', id, btnElement, () => {
        if (currentFilter.onlyFavorite) {
            applyFiltersAndRender();
        }
    });
}

// ==========================================
// 3. 剪貼簿複製 (使用 common.js 的 copyToClipboard)
// ==========================================
function handleCardCopy(text, btnElement, event) {
    if (event) event.stopPropagation();
    // 呼叫 common.js 的全域防護複製函式
    if (typeof copyToClipboard === 'function') {
        copyToClipboard(text, btnElement);
    }
}

// ==========================================
// 4. 資料初始化與動態 Filter 生成
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadSkillsData();
    setupEventListeners();
});

async function loadSkillsData() {
    const container = document.getElementById('cardsContainer');
    try {
        const response = await fetch('data/skills.json');
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        allSkillsData = await response.json();
        
        initDynamicFilters(allSkillsData);
        applyFiltersAndRender();
    } catch (error) {
        console.error('載入 data/skills.json 失敗:', error);
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 40px;">
                    無法載入技能資料，請確認檔案 <code>data/skills.json</code> 存在且格式正確。
                </div>`;
        }
    }
}

function initDynamicFilters(data) {
    const sources = new Set();
    const tagCounts = {};

    data.forEach(item => {
        if (item.skillSource && item.skillSource.trim()) {
            sources.add(item.skillSource.trim());
        }
        if (item.skillTag) {
            item.skillTag.split(',').forEach(tag => {
                const cleanTag = tag.trim().replace(/,$/, '');
                if (cleanTag) {
                    tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
                }
            });
        }
    });

    const sourceContainer = document.getElementById('skillSourceFilter');
    if (sourceContainer) {
        sourceContainer.innerHTML = '<button class="btn-filter active" data-value="ALL">全部</button>';
        sources.forEach(src => {
            const btn = document.createElement('button');
            btn.className = 'btn-filter';
            btn.dataset.value = src;
            btn.textContent = src;
            sourceContainer.appendChild(btn);
        });
    }

    const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
    const tagContainer = document.getElementById('skillTagFilter');
    if (tagContainer) {
        tagContainer.innerHTML = '<button class="btn-filter active" data-value="ALL">全部</button>';
        sortedTags.forEach(tag => {
            const btn = document.createElement('button');
            btn.className = 'btn-filter';
            btn.dataset.value = tag;
            btn.textContent = tag;
            tagContainer.appendChild(btn);
        });
    }
}

// ==========================================
// 5. 篩選與渲染主邏輯
// ==========================================
function applyFiltersAndRender() {
    const favs = getFavoriteSkills();

    filteredSkillsData = allSkillsData.filter(item => {
        const id = getSkillId(item);

        if (currentFilter.keyword) {
            const k = currentFilter.keyword.toLowerCase().trim();
            const matchZh = item.skillZh?.toLowerCase().includes(k);
            const matchZhS = item.skillZhS?.toLowerCase().includes(k);
            const matchJa = item.skillJa?.toLowerCase().includes(k);
            const matchEn = item.skillEn?.toLowerCase().includes(k);
            const matchAlt = (item.alternativeZh || item.alternativeZhS || item.alternativeJa || item.alternativeEn)?.toLowerCase().includes(k);
            
            if (!matchZh && !matchZhS && !matchJa && !matchEn && !matchAlt) return false;
        }

        if (currentFilter.onlyFavorite && !favs.includes(id)) {
            return false;
        }

        if (currentFilter.gameVersion !== 'ALL' && item.gameVersion !== currentFilter.gameVersion) return false;
        
        if (currentFilter.skillSource !== 'ALL' && item.skillSource !== currentFilter.skillSource) return false;

        // 技能標籤 (多選 OR 邏輯：擁有任何一個勾選的標籤即顯示)
        if (currentFilter.skillTag.length > 0) {
            const itemTags = item.skillTag ? item.skillTag.split(',').map(t => t.trim()) : [];
            const hasMatch = currentFilter.skillTag.some(selectedTag => itemTags.includes(selectedTag));
            if (!hasMatch) return false;
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

    const totalItems = filteredSkillsData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    if (stats) stats.innerHTML = `共 <strong>${totalItems}</strong> 個技能`;
    if (pageIndicator) pageIndicator.textContent = `頁數 ${currentPage} / ${totalPages}`;

    if (totalItems === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted, #94a3b8);">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">🔍</div>
                <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 6px;">查無符合條件的技能</div>
                <div style="font-size: 0.85rem;">請嘗試調整搜尋關鍵字或重置篩選條件</div>
            </div>`;
        renderPaginationControls(0);
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageData = filteredSkillsData.slice(startIndex, startIndex + itemsPerPage);

    container.innerHTML = pageData.map(skill => createSkillCardHTML(skill)).join('');
    renderPaginationControls(totalPages);
}

function parseLvDescription(str) {
    if (!str) return [];
    return str.split(/(?=Lv\d+:)/ ||/(?=\n\d)/ )
              .map(s => s.trim().replace(/,$/, ''))
              .filter(Boolean);
}

function createSkillCardHTML(skill) {
    const id = getSkillId(skill);
    const isFav = isSkillFavorite(id);
    const lvList = parseLvDescription(skill.lvDescription);
    
    const altTextCombined = [
        skill.alternativeZh,
        skill.alternativeZhS,
        skill.alternativeJa,
        skill.alternativeEn
    ].filter(Boolean).join(' | ');

    // 動態收集有值的語言區塊
    const subtitles = [];
    if (skill.skillZhS) {
        subtitles.push(`
            <span style="display: inline-flex; align-items: center; gap: 2px; white-space: nowrap;">
                ${skill.skillZhS}
                <button class="btn-icon-copy" onclick="handleCardCopy('${skill.skillZhS}', this, event)"><span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span></button>
            </span>
        `);
    }
    if (skill.skillEn) {
        subtitles.push(`
            <span style="display: inline-flex; align-items: center; gap: 2px; white-space: nowrap;">
                ${skill.skillEn}
                <button class="btn-icon-copy" onclick="handleCardCopy('${skill.skillEn}', this, event)"><span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span></button>
            </span>
        `);
    }
    if (skill.skillJa) {
        subtitles.push(`
            <span style="display: inline-flex; align-items: center; gap: 2px; white-space: nowrap;">
                ${skill.skillJa}
                <button class="btn-icon-copy" onclick="handleCardCopy('${skill.skillJa}', this, event)"><span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span></button>
            </span>
        `);
    }

    return `
        <div class="data-card" id="skill-card-${id}">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                    <div class="card-title" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="color: #f59e0b; font-weight: bold; font-size: 1.1rem;">${skill.skillZh || '未命名技能'}</span>
                        <button class="btn-icon-copy" onclick="handleCardCopy('${skill.skillZh || ''}', this, event)" title="複製技能名稱">
                            <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                        </button>
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                    <span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);">
                        ${skill.skillSource || '技能'}
                    </span>
                    <button class="btn-fav ${isFav ? 'active' : ''}" 
                            onclick="toggleSkillFavorite('${id}', event)" 
                            title="${isFav ? '取消收藏' : '加入收藏'}" 
                            style="background: none; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-outlined" style="font-size: 22px; color: ${isFav ? '#ef4444' : 'var(--text-muted, #94a3b8)'};">
                            favorite
                        </span>
                    </button>
                </div>
            </div>

            <div class="card-body">
                <div class="card-subtitle" style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px; font-size: 0.82rem; color: var(--text-muted, #94a3b8); margin-bottom: 8px;">
                    ${subtitles.join('<span style="color: rgba(255,255,255,0.2); margin: 0 2px;">|</span>')}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px; font-size: 0.88rem; color: var(--text-main, #e2e8f0);">
                    <div style="flex: 1;">${skill.skillDescription || '無說明'}</div>
                    <span class="badge" style="background: rgba(255,255,255,0.08); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); flex-shrink: 0;">
                        Max Lv.${skill.maxSkillLv || 1}
                    </span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-muted, #94a3b8); margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <span class="material-symbols-outlined" style="font-size: 15px;">label</span>
                        <span>${skill.skillTag || '無標籤'}</span>
                    </div>
                    <span class="tag" style="font-size: 0.75rem;">${skill.gameVersion || ''}</span>
                </div>

                ${altTextCombined ? `
                    <div style="padding: 6px 10px; background: rgba(245, 158, 11, 0.08); border-radius: 4px; border: 1px dashed rgba(245, 158, 11, 0.3); margin-bottom: 10px; font-size: 0.82rem; color: #fbbf24; display: flex; justify-content: space-between; align-items: center;">
                        <div><strong>其他名稱/套裝：</strong> ${altTextCombined}</div>
                        <button class="btn-icon-copy" onclick="handleCardCopy('${altTextCombined}', this, event)" style="color: #fbbf24;">
                            <span class="material-symbols-outlined" style="font-size: 15px;">content_copy</span>
                        </button>
                    </div>
                ` : ''}

                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-color, rgba(255,255,255,0.1));">
                    <div style="font-weight: bold; font-size: 0.82rem; color: var(--primary-color, #10b981); margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                        <span class="material-symbols-outlined" style="font-size: 16px;">format_list_bulleted</span> 各等級效果：
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; background: rgba(0,0,0,0.15); padding: 8px; border-radius: 6px;">
                        ${lvList.length > 0 ? lvList.map(lv => `
                            <div style="font-size: 0.82rem; color: var(--text-main, #e2e8f0); line-height: 1.4; padding: 2px 0; border-bottom: 1px dotted rgba(255,255,255,0.05);">
                                ${lv}
                            </div>
                        `).join('') : '<div style="font-size: 0.8rem; color: var(--text-muted, #94a3b8);">無等級詳細數據</div>'}
                    </div>
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
            currentFilter = { keyword: '', gameVersion: 'ALL', skillSource: 'ALL', skillTag: [], onlyFavorite: false };
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

    document.querySelectorAll('.filter-groups-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-filter');
            if (!btn) return;

            const group = btn.closest('.btn-group-filter');
            if (!group) return;

            const filterType = group.id;
            const val = btn.dataset.value;

            // 處理標籤(Tag)多重選取邏輯
            if (filterType === 'skillTagFilter') {
                if (val === 'ALL') {
                    currentFilter.skillTag = [];
                    group.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                } else {
                    // 取消「全部」按鈕的選中狀態
                    const allBtn = group.querySelector('[data-value="ALL"]');
                    if (allBtn) allBtn.classList.remove('active');

                    // 切換當前標籤按鈕的選中狀態
                    btn.classList.toggle('active');

                    if (currentFilter.skillTag.includes(val)) {
                        currentFilter.skillTag = currentFilter.skillTag.filter(t => t !== val);
                    } else {
                        currentFilter.skillTag.push(val);
                    }

                    // 如果所有的標籤都被取消了，重新激活「全部」按鈕
                    if (currentFilter.skillTag.length === 0) {
                        if (allBtn) allBtn.classList.add('active');
                    }
                }
            } else {
                // 其他群組維持單選邏輯
                group.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (filterType === 'gameVersionFilter') currentFilter.gameVersion = val;
                if (filterType === 'skillSourceFilter') currentFilter.skillSource = val;
            }

            applyFiltersAndRender();
        });
    });
}