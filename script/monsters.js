/**
 * MH Database - Monsters Search Logic & Favorites (完全對齊實際 JSON 欄位版)
 */

// 全局狀態
let rawMonsters = [];

// 篩選條件狀態
let currentGameVersion = 'ALL';
let currentCategoryFilter = 'ALL';
let currentRareFilter = 'ALL';
let currentSearchText = '';
let showOnlyFav = false;

// 分頁設定
let currentPage = 1;
const itemsPerPage = 20;

const FAV_STORAGE_KEY = 'mh_fav_monsters';

// ==========================================
// 1. 資料載入
// ==========================================

async function loadData() {
    const container = document.getElementById('cardsContainer');
    try {
        const res = await fetch('data/monsters.json');
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

        rawMonsters = await res.json();
        
        // 預設按防具稀有度 (armorRare) 降序排序
        rawMonsters.sort((a, b) => parseInt(b.armorRare || 0) - parseInt(a.armorRare || 0));

        filterAndRender();
    } catch (error) {
        console.error('載入魔物資料失敗：', error);
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; color: #ef4444; padding: 40px;">
                    載入魔物資料失敗！<br>
                    <small style="color: #64748b; font-family: monospace;">原因：${error.message}</small>
                </div>`;
        }
    }
}

// ==========================================
// 2. 核心過濾邏輯
// ==========================================

function filterAndRender() {
    const favorites = CommonFav.get(FAV_STORAGE_KEY);

    const filtered = rawMonsters.filter(m => {
        const mIdStr = String(m.iD);

        // A. 我的最愛
        const matchesFav = !showOnlyFav || favorites.includes(mIdStr);

        // B. 全文搜尋 (包含中/日/英名稱、種族、防具派生)
        const matchesSearch = !currentSearchText || 
            (m.monsterZh && m.monsterZh.toLowerCase().includes(currentSearchText)) ||
            (m.monsterNameJa && m.monsterNameJa.toLowerCase().includes(currentSearchText)) ||
            (m.monsterNameEn && m.monsterNameEn.toLowerCase().includes(currentSearchText)) ||
            (m.mSpecies && m.mSpecies.toLowerCase().includes(currentSearchText)) ||
            (m.armorPrefixJa && m.armorPrefixJa.toLowerCase().includes(currentSearchText)) ||
            (m.armorPrefixEn && m.armorPrefixEn.toLowerCase().includes(currentSearchText));

        // C. 遊戲版本 (MHWilds / MHW / MHI 等)
        const matchesVersion = currentGameVersion === 'ALL' || String(m.gameVersion) === currentGameVersion;

        // D. 種族 (海龍種 / 飛龍種 等)
        const matchesCategory = currentCategoryFilter === 'ALL' || m.mSpecies === currentCategoryFilter;

        // E. 稀有度 (1, 2, 3... 5)
        const matchesRare = currentRareFilter === 'ALL' || String(m.armorRare) === currentRareFilter;

        return matchesFav && matchesSearch && matchesVersion && matchesCategory && matchesRare;
    });

    renderCardsWithPagination(filtered);
}

// ==========================================
// 3. 渲染卡片與分頁
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
        stats.innerHTML = `共 <strong>${totalItems}</strong> 筆資料 (第 ${currentPage} / ${totalPages} 頁)`;
    }

    if (totalItems === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted, #94a3b8);">
                找不到符合條件的魔物 🦖
            </div>`;
        if (pagination) pagination.innerHTML = '';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageItems = items.slice(startIndex, startIndex + itemsPerPage);

    container.innerHTML = pageItems.map(m => {
        const mIdStr = String(m.iD);
        const isFav = favorites.includes(mIdStr);
        const rareVal = m.armorRare || '1';

        const nameZh = m.monsterZh || '未命名魔物';
        const nameJa = m.monsterNameJa || '';
        const nameEn = m.monsterNameEn || '';

        const prefixJa = m.armorPrefixJa || '';
        const prefixEn = m.armorPrefixEn || '';

        return `
            <div class="data-card">
                <div class="card-header">
                    <div>
                        <!-- 中文名 + 獨立複製鈕 -->
                        <div class="card-title" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span>${nameZh}</span>
                            ${nameZh ? `
                            <button class="btn-copy" title="複製中文" onclick="copyToClipboard('${escapeQuotes(nameZh)}', this)">
                                <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                            </button>` : ''}
                            <span class="tag tag-type">${m.mSpecies || '未知'}</span>
                        </div>
                        
                        <!-- 日英名 + 各自獨立複製鈕 -->
                        <div class="card-subtitle" style="margin-top: 4px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                            <span>日：${nameJa || '本站未有資料'}</span>
                            ${nameJa ? `
                            <button class="btn-copy" title="複製日文" onclick="copyToClipboard('${escapeQuotes(nameJa)}', this)">
                                <span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span>
                            </button>` : ''} 
                            <span style="margin: 0 4px;">|</span>
                            <span>En: ${nameEn || '本站未有資料'}</span> 
                            ${nameEn ? `
                            <button class="btn-copy" title="複製英文" onclick="copyToClipboard('${escapeQuotes(nameEn)}', this)">
                                <span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span>
                            </button>` : ''}
                        </div>
                    </div>

                    <!-- 右側控制區：我的最愛 + 防具稀有度 R 標籤 -->
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <button class="btn-fav" onclick="handleToggleFav('${mIdStr}', this)" style="background: none; border: none; cursor: pointer; padding: 2px; display: inline-flex;" title="${isFav ? '取消收藏' : '加入收藏'}">
                            <span class="material-symbols-outlined" style="font-size: 22px; color: ${isFav ? '#ef4444' : '#9ca3af'}; font-variation-settings: 'FILL' ${isFav ? 1 : 0};">
                                favorite
                            </span>
                        </button>
                        <span class="badge badge-rare-${rareVal}">R${rareVal}</span>
                    </div>
                </div>

                <!-- 卡片內容區：防具派生 -->
                <div class="card-body">
                    <div style="background: var(--input-bg, #f8fafc); padding: 8px 10px; border-radius: 6px; font-size: 0.85rem; margin-top: 6px;">
                        <span style="font-weight: bold; color: var(--primary-color, #10b981);">🔸 防具派生：</span>
                        <span>${prefixJa}${prefixEn ? ` (${prefixEn})` : '本站未有資料'}</span>
                    </div>
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

// ==========================================
// 4. 事件處理：收藏與複製
// ==========================================

function handleToggleFav(id, btnElement) {
    CommonFav.toggle(FAV_STORAGE_KEY, id, btnElement, () => {
        if (showOnlyFav) {
            filterAndRender();
        }
    });
}

// ==========================================
// 4. 事件處理：收藏與複製
// ==========================================

// ... (保留原本的 handleToggleFav 函式)

function copyToClipboard(text, btnElement) {
    if (!text) return;

    // 成功時切換 icon 的小幫手函式
    const showSuccessUI = () => {
        const icon = btnElement.querySelector('.material-symbols-outlined');
        if (icon) {
            const originalIcon = icon.textContent;
            const originalColor = icon.style.color;

            icon.textContent = 'check';
            icon.style.color = '#10b981';

            setTimeout(() => {
                icon.textContent = originalIcon;
                icon.style.color = originalColor;
            }, 1200);
        }
    };

    // 優先使用現代 Clipboard API (需在 HTTPS 或 localhost)
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showSuccessUI();
        }).catch(err => {
            console.error('Clipboard API 複製失敗：', err);
        });
    } else {
        // Fallback：適用於 file:/// 協議或非 HTTPS 環境
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            
            // 確保 textArea 不會影響畫面排版
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            
            textArea.focus();
            textArea.select();

            const successful = document.execCommand('copy');
            if (successful) {
                showSuccessUI();
            } else {
                console.error('Fallback 複製失敗');
            }
            
            document.body.removeChild(textArea);
        } catch (err) {
            console.error('Fallback 執行時發生錯誤：', err);
        }
    }
}

function escapeQuotes(str) {
    return String(str).replace(/'/g, "\\'");
}

// ==========================================
// 5. DOM 事件初始化
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    loadData();

    const searchInput = document.getElementById('searchInput');

    searchInput?.addEventListener('input', (e) => {
        currentSearchText = e.target.value.toLowerCase().trim();
        currentPage = 1;
        filterAndRender();
    });

    document.getElementById('btnResetSearch')?.addEventListener('click', () => {
        CommonFav.resetUI({
            searchInputId: 'searchInput',
            favBtnId: 'btnFavFilter',
            groupIds: ['gameVersionButtons', 'categoryButtons', 'rareButtons']
        });

        currentGameVersion = 'ALL';
        currentCategoryFilter = 'ALL';
        currentRareFilter = 'ALL';
        currentSearchText = '';
        showOnlyFav = false;
        currentPage = 1;

        filterAndRender();
    });

    document.getElementById('btnFavFilter')?.addEventListener('click', (e) => {
        showOnlyFav = !showOnlyFav;
        e.currentTarget.classList.toggle('active', showOnlyFav);
        currentPage = 1;
        filterAndRender();
    });

    bindButtonGroup('gameVersionButtons', 'data-ver', val => currentGameVersion = val);
    bindButtonGroup('speciesButtons', 'data-species', val => currentCategoryFilter = val);
    bindButtonGroup('rareButtons', 'data-rare', val => currentRareFilter = val);
});

// ==========================================
// 6. 按鈕綁定 Helper 工具函式
// ==========================================

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