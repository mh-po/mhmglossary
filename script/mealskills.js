/**
 * MH Database - Meal Skills Search Logic & Favorites
 */

// 全局狀態
let rawMealSkills = [];

// 篩選條件狀態
let currentGameVersion = 'ALL';
let currentSearchText = '';
let showOnlyFav = false;

// 分頁設定
let currentPage = 1;
const itemsPerPage = 20;

const FAV_STORAGE_KEY = 'mh_fav_mealskills';

// ==========================================
// 1. 資料載入
// ==========================================

async function loadData() {
    const container = document.getElementById('cardsContainer');
    try {
        const res = await fetch('data/mealskills.json');
        if (!res.ok) throw new Error(`HTTP 錯誤！狀態：${res.status}`);

        rawMealSkills = await res.json();
        filterAndRender();
    } catch (error) {
        console.error('載入貓飯技能資料失敗：', error);
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; color: #ef4444; padding: 40px;">
                    載入貓飯技能資料失敗！<br>
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

    const filtered = rawMealSkills.filter(skill => {
        const skillIdStr = String(skill.id || skill.iD || '');

        // A. 我的最愛
        const matchesFav = !showOnlyFav || favorites.includes(skillIdStr);

        // B. 全文搜尋 (中/日/英名稱 + 技能詳細說明)
        const matchesSearch = !currentSearchText || 
            (skill.mealSkillZh && skill.mealSkillZh.toLowerCase().includes(currentSearchText)) ||
            (skill.mealSkillJa && skill.mealSkillJa.toLowerCase().includes(currentSearchText)) ||
            (skill.mealSkillEn && skill.mealSkillEn.toLowerCase().includes(currentSearchText)) ||
            (skill.mealSkillDes && skill.mealSkillDes.toLowerCase().includes(currentSearchText));

        // C. 遊戲版本 (支援 "MHWilds, DLC" 等多版本包含比對)
        const matchesVersion = currentGameVersion === 'ALL' || 
            (skill.gameVersion && skill.gameVersion.includes(currentGameVersion));

        return matchesFav && matchesSearch && matchesVersion;
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
        stats.innerHTML = `共 <strong>${totalItems}</strong> 個貓飯技能 (第 ${currentPage} / ${totalPages} 頁)`;
    }

    if (totalItems === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted, #94a3b8);">
                沒有找到符合條件的貓飯技能 🍖
            </div>`;
        if (pagination) pagination.innerHTML = '';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageItems = items.slice(startIndex, startIndex + itemsPerPage);

    container.innerHTML = pageItems.map(skill => {
        const skillIdStr = String(skill.id || skill.iD || '');
        const isFav = favorites.includes(skillIdStr);

        const nameZh = skill.mealSkillZh || '未命名技能';
        const nameJa = skill.mealSkillJa || '';
        const nameEn = skill.mealSkillEn || '';
        const description = skill.mealSkillDes || '無詳細說明資料。';

        return `
            <div class="data-card">
                <div class="card-header">
                    <div>
                        <!-- 中文名 + 複製鈕 -->
                        <div class="card-title" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span>${nameZh}</span>
                            ${nameZh ? `
                            <button class="btn-copy" title="複製中文名" onclick="copyToClipboard('${escapeQuotes(nameZh)}', this)">
                                <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                            </button>` : ''}
                        </div>

                        <!-- 日英名 + 複製鈕 -->
                        <div class="card-subtitle" style="margin-top: 4px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                            <span>日：${nameJa || '無'}</span>
                            ${nameJa ? `
                            <button class="btn-copy" title="複製日文" onclick="copyToClipboard('${escapeQuotes(nameJa)}', this)">
                                <span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span>
                            </button>` : ''}
                            <span style="margin: 0 4px;">|</span>
                            <span>En: ${nameEn || '無'}</span>
                            ${nameEn ? `
                            <button class="btn-copy" title="複製英文" onclick="copyToClipboard('${escapeQuotes(nameEn)}', this)">
                                <span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span>
                            </button>` : ''}
                        </div>

                        <!-- 版本 -->
                        <div class="card-subtitle" style="margin-top: 4px;">
                            版本：${skill.gameVersion || '未標示'}
                        </div>
                    </div>

                    <!-- 右側收藏按鈕 -->
                    <div style="display: flex; align-items: center;">
                        <button class="btn-fav" onclick="handleToggleFav('${skillIdStr}', this)" style="background: none; border: none; cursor: pointer; padding: 2px; display: inline-flex;" title="${isFav ? '取消收藏' : '加入收藏'}">
                            <span class="material-symbols-outlined" style="font-size: 22px; color: ${isFav ? '#ef4444' : '#9ca3af'}; font-variation-settings: 'FILL' ${isFav ? 1 : 0};">
                                favorite
                            </span>
                        </button>
                    </div>
                </div>

                <div class="card-body">
                    <!-- 技能效果說明區塊 -->
                    <div style="background: var(--input-bg, #f8fafc); padding: 12px; border-radius: 6px; margin-top: 8px; font-size: 0.88rem; line-height: 1.6; color: var(--text-color, #334155);">
                        <strong style="color: var(--primary-color, #10b981); display: block; margin-bottom: 4px;">💡 技能效果說明：</strong>
                        ${description}
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

function copyToClipboard(text, btnElement) {
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
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
    }).catch(err => {
        console.error('複製失敗：', err);
    });
}

function escapeQuotes(str) {
    return String(str).replace(/'/g, "\\'");
}

// ==========================================
// 5. DOM 初始化與事件綁定
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    loadData();

    // 搜尋框
    const searchInput = document.getElementById('searchInput');
    searchInput?.addEventListener('input', (e) => {
        currentSearchText = e.target.value.toLowerCase().trim();
        currentPage = 1;
        filterAndRender();
    });

    // 重置按鈕
    document.getElementById('btnResetSearch')?.addEventListener('click', () => {
        CommonFav.resetUI({
            searchInputId: 'searchInput',
            favBtnId: 'btnFavFilter',
            groupIds: ['gameVersionButtons']
        });

        currentGameVersion = 'ALL';
        currentSearchText = '';
        showOnlyFav = false;
        currentPage = 1;

        filterAndRender();
    });

    // 我的最愛按鈕
    document.getElementById('btnFavFilter')?.addEventListener('click', (e) => {
        showOnlyFav = !showOnlyFav;
        e.currentTarget.classList.toggle('active', showOnlyFav);
        currentPage = 1;
        filterAndRender();
    });

    // 版本按鈕綁定
    bindButtonGroup('gameVersionButtons', 'data-ver', val => currentGameVersion = val);
});

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