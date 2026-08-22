/**
 * MH Database - Hunting Horns Search Logic & Favorites
 */

// 全局狀態
let rawHorns = [];
let melodyMap = new Map();

// 篩選條件狀態
let currentGameVersion = 'ALL';
let currentElement = 'ALL';
let currentRareFilter = 'ALL';
let currentMelodyFilter = []; // 多選 (AND filter)
let currentEchoFilter = 'ALL';
let currentSpecialFilter = 'ALL';
let currentSearchText = '';
let showOnlyFav = false;

// 分頁設定
let currentPage = 1;
const itemsPerPage = 20;

const FAV_STORAGE_KEY = 'mh_fav_huntinghorns';

// 特殊演奏備用對照表
const waveFallbackMap = {
    'WAV_0001': '連消帶打之曲',
    'WAV_0002': '響鳴之曲',
    'WAV_0003': '生命之曲'
};

// ==========================================
// 1. 資料與字典載入
// ==========================================

async function loadMelodyMap() {
    try {
        const res = await fetch('data/melody.json');
        if (res.ok) {
            const melodies = await res.json();
            melodies.forEach(m => {
                const id = m.iD || m.id;
                if (id) melodyMap.set(String(id).trim(), m);
            });
        }
    } catch (e) {
        console.warn('melody.json 載入失敗', e);
    }
}

async function loadData() {
    const container = document.getElementById('cardsContainer');
    try {
        await loadMelodyMap();

        const res = await fetch('data/huntinghorns.json');
        if (!res.ok) throw new Error(`HTTP 錯誤！狀態：${res.status}`);

        rawHorns = await res.json();
        // 預設按 Rarity (rare) 降序排序 (安全轉換為數字)
        rawHorns.sort((a, b) => (parseInt(b.rare, 10) || 0) - (parseInt(a.rare, 10) || 0));

        filterAndRender();
    } catch (error) {
        console.error('載入狩獵笛資料失敗：', error);
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; color: #ef4444; padding: 40px;">
                    載入狩獵笛資料失敗！<br>
                    <small style="color: #64748b; font-family: monospace;">原因：${error.message}</small>
                </div>`;
        }
    }
}

// ==========================================
// 2. Helper 解析函式
// ==========================================

function getMelodyZhOnly(id) {
    if (!id) return '';
    const item = melodyMap.get(String(id).trim());
    return item ? (item.melodyZh || '') : '';
}

function getMelodyText(id) {
    if (!id) return '';
    const cleanId = String(id).trim();
    const item = melodyMap.get(cleanId);
    if (item) {
        return item.effectZh ? `${item.melodyZh} (${item.effectZh})` : item.melodyZh;
    }
    return cleanId;
}

function getWaveZhName(waveId) {
    if (!waveId) return '';
    const cleanId = String(waveId).trim();

    const item = melodyMap.get(cleanId);
    const fromMap = item ? (item.melodyZh || '') : '';
    const fromFallback = waveFallbackMap[cleanId] || '';

    return `${fromMap} ${fromFallback} ${cleanId}`.trim();
}

// ==========================================
// 3. 核心過濾邏輯
// ==========================================

function filterAndRender() {
    const favorites = CommonFav.get(FAV_STORAGE_KEY);

    const filtered = rawHorns.filter(horn => {
        const hornIdStr = String(horn.id || horn.iD);
        const melodyIds = horn.melodyId ? String(horn.melodyId).split(/,\s*/) : [];
        const melodyZhNames = melodyIds.map(id => getMelodyZhOnly(id)).join(' ');
        const echoZhName = getMelodyZhOnly(horn.echoId) || String(horn.echoId || '');
        const waveZhName = getWaveZhName(horn.waveId);

        // A. 我的最愛
        const matchesFav = !showOnlyFav || favorites.includes(hornIdStr);

        // B. 全文搜尋 (包含中/日/英名稱、衍生、旋律、響玉、特殊演奏)
        const matchesSearch = !currentSearchText || 
            (horn.hornZh && horn.hornZh.toLowerCase().includes(currentSearchText)) ||
            (horn.hornJa && horn.hornJa.toLowerCase().includes(currentSearchText)) ||
            (horn.hornEn && horn.hornEn.toLowerCase().includes(currentSearchText)) ||
            (horn.hornDev && horn.hornDev.toLowerCase().includes(currentSearchText)) ||
            melodyZhNames.toLowerCase().includes(currentSearchText) ||
            echoZhName.toLowerCase().includes(currentSearchText) ||
            waveZhName.toLowerCase().includes(currentSearchText);

        // C. 遊戲版本
        const matchesVersion = currentGameVersion === 'ALL' || 
            (horn.gameVersion && String(horn.gameVersion) === currentGameVersion);

        // D. 屬性
        const matchesElement = currentElement === 'ALL' || horn.elmType === currentElement;

        // E. 稀有度 (Rare) - 進行安全轉型與去除空格比對
        const hornRareStr = horn.rare !== undefined && horn.rare !== null ? String(horn.rare).trim() : '';
        const matchesRare = currentRareFilter === 'ALL' || hornRareStr === String(currentRareFilter).trim();

        // F. 旋律多選 (AND 邏輯)
        const matchesMelody = currentMelodyFilter.length === 0 || 
            currentMelodyFilter.every(selectedMelody => melodyZhNames.includes(selectedMelody));

        // G. 響玉
        const matchesEcho = currentEchoFilter === 'ALL' || echoZhName.includes(currentEchoFilter);

        // H. 特殊演奏
        const matchesSpecial = currentSpecialFilter === 'ALL' || waveZhName.includes(currentSpecialFilter);

        return matchesFav && matchesSearch && matchesVersion && matchesElement && matchesRare && matchesMelody && matchesEcho && matchesSpecial;
    });

    renderCardsWithPagination(filtered);
}

// ==========================================
// 4. 渲染卡片與分頁
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
        stats.innerHTML = `共 <strong>${totalItems}</strong> 把狩獵笛 (第 ${currentPage} / ${totalPages} 頁)`;
    }

    if (totalItems === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted, #94a3b8);">
                沒有找到符合條件的狩獵笛 🎼
            </div>`;
        if (pagination) pagination.innerHTML = '';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageItems = items.slice(startIndex, startIndex + itemsPerPage);

    container.innerHTML = pageItems.map(horn => {
        const hornIdStr = String(horn.id || horn.iD);
        const isFav = favorites.includes(hornIdStr);
        const rareVal = horn.rare !== undefined && horn.rare !== null ? String(horn.rare).trim() : '1';

        const nameZh = horn.hornZh || '未命名狩獵笛';
        const nameJa = horn.hornJa || '';
        const nameEn = horn.hornEn || '';

        const melodyIds = horn.melodyId ? String(horn.melodyId).split(/,\s*/) : [];
        const displayWave = waveFallbackMap[horn.waveId] || getMelodyZhOnly(horn.waveId) || horn.waveId || '無';

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
                        </div>

                        <!-- 日英名 + 各自獨立複製鈕 -->
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

                        <!-- 衍生與版本 -->
                        <div class="card-subtitle" style="margin-top: 4px;">
                            衍生自：${horn.hornDev ? horn.hornDev + '笛' : '無'} | 版本：${horn.gameVersion || '未標示'}
                        </div>
                    </div>

                    <!-- 右側控制區：favorite 圖示我的最愛 + Rare 標籤 -->
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <button class="btn-fav" onclick="handleToggleFav('${hornIdStr}', this)" style="background: none; border: none; cursor: pointer; padding: 2px; display: inline-flex;" title="${isFav ? '取消收藏' : '加入收藏'}">
                            <span class="material-symbols-outlined" style="font-size: 22px; color: ${isFav ? '#ef4444' : '#9ca3af'}; font-variation-settings: 'FILL' ${isFav ? 1 : 0};">
                                favorite
                            </span>
                        </button>
                        <span class="badge badge-rare-${rareVal}">R${rareVal}</span>
                    </div>
                </div>

                <div class="card-body">
                    <!-- 數值面板 -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; background: var(--input-bg, #f8fafc); padding: 8px; border-radius: 6px; margin: 8px 0; font-size: 0.85rem; text-align: center;">
                        <div>攻擊 <div style="font-weight:bold; color:var(--primary-color, #10b981);">${horn.atk || 0}</div></div>
                        <div>屬性 <div style="font-weight:bold;">${horn.elmType || '無'} ${horn.elmAtt > 0 ? horn.elmAtt : ''}</div></div>
                        <div>會心 <div style="font-weight:bold;">${horn.aff || 0}%</div></div>
                    </div>

                    <!-- 技能與響玉 -->
                    <div style="font-size: 0.85rem; margin-bottom: 6px; line-height: 1.5;">
                        <div><strong>特殊演奏：</strong>${displayWave}</div>    
                        <div><strong>響玉效果：</strong>${getMelodyText(horn.echoId) || '無'}</div>
                        <div><strong>鑲嵌槽：</strong>[${horn.slot || '無'}]</div>
                    </div>

                    <!-- 演奏旋律清單 -->
                    <div style="margin-top: 8px; border-top: 1px dashed var(--card-border, #e2e8f0); padding-top: 6px;">
                        <div style="font-weight: bold; font-size: 0.85rem; color: var(--primary-color, #10b981); margin-bottom: 4px;">🎶 演奏旋律：</div>
                        <div style="font-size: 0.85rem; margin-bottom: 6px; line-height: 1.1;">  ${melodyIds.map(id => `<li style="list-style-position: inside"> ${getMelodyText(id)}</li>`).join('') || '無旋律資料'}</div>
                        
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
// 5. 事件處理：收藏與複製
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
// 6. DOM 事件初始化
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    loadData();

    // 1. 搜尋框
    const searchInput = document.getElementById('searchInput');
    searchInput?.addEventListener('input', (e) => {
        currentSearchText = e.target.value.toLowerCase().trim();
        currentPage = 1;
        filterAndRender();
    });

    // 2. 重置按鈕 (#btnResetSearch)
    document.getElementById('btnResetSearch')?.addEventListener('click', () => {
        CommonFav.resetUI({
            searchInputId: 'searchInput',
            favBtnId: 'btnFavFilter',
            groupIds: ['gameVersionButtons', 'elementButtons', 'rareButtons', 'echoButtons', 'specialButtons']
        });

        // 重置旋律多選按鈕組 UI
        const melodyGroup = document.getElementById('melodyButtons');
        if (melodyGroup) {
            melodyGroup.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            melodyGroup.querySelector('[data-melody="ALL"]')?.classList.add('active');
        }

        currentGameVersion = 'ALL';
        currentElement = 'ALL';
        currentRareFilter = 'ALL';
        currentMelodyFilter = [];
        currentEchoFilter = 'ALL';
        currentSpecialFilter = 'ALL';
        currentSearchText = '';
        showOnlyFav = false;
        currentPage = 1;

        filterAndRender();
    });

    // 3. 我的最愛篩選開關 (#btnFavFilter)
    document.getElementById('btnFavFilter')?.addEventListener('click', (e) => {
        showOnlyFav = !showOnlyFav;
        e.currentTarget.classList.toggle('active', showOnlyFav);
        currentPage = 1;
        filterAndRender();
    });

    // 4. 各類別篩選按鈕綁定
    bindButtonGroup('gameVersionButtons', 'data-ver', val => currentGameVersion = val);
    bindButtonGroup('elementButtons', 'data-elm', val => currentElement = val);
    bindButtonGroup('rareButtons', 'data-rare', val => currentRareFilter = val);
    bindMultiSelectGroup('melodyButtons', 'data-melody', valArray => currentMelodyFilter = valArray);
    bindButtonGroup('echoButtons', 'data-echo', val => currentEchoFilter = val);
    bindButtonGroup('specialButtons', 'data-special', val => currentSpecialFilter = val);
});

// ==========================================
// 7. 按鈕綁定 Helper 工具函式
// ==========================================

// 單選按鈕組
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

// 多選按鈕組 (AND Filter)
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

                const activeBtns = Array.from(group.querySelectorAll('.btn-filter.active'))
                                       .map(b => b.getAttribute(dataAttr))
                                       .filter(v => v !== 'ALL');

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