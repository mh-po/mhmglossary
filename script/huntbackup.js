/**
 * MH Database - Hunting Horns Search Logic
 */

// 全域變數
let rawHorns = [];
let melodyMap = new Map();

// 篩選條件狀態
let currentGameVersion = 'ALL';
let currentElement = 'ALL';
let currentMelodyFilter = 'ALL';
let currentEchoFilter = 'ALL';
let currentSpecialFilter = 'ALL';
let currentSearchText = '';

// 分頁設定
let currentPage = 1;
const itemsPerPage = 20;

// 特殊演奏備用對照表
const waveFallbackMap = {
    'WAV_0001': '連消帶打之曲',
    'WAV_0002': '響鳴之曲',
    'WAV_0003': '生命之曲'
};

// 載入旋律字典
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

// 取得普通旋律中文
function getMelodyZhOnly(id) {
    if (!id) return '';
    const item = melodyMap.get(String(id).trim());
    return item ? (item.melodyZh || '') : '';
}

// 取得完整旋律顯示文字
function getMelodyText(id) {
    if (!id) return '';
    const cleanId = String(id).trim();
    const item = melodyMap.get(cleanId);
    if (item) {
        return item.effectZh ? `${item.melodyZh} (${item.effectZh})` : item.melodyZh;
    }
    return cleanId;
}

// 💡 特殊演奏解析：回傳「ID 查到的中文 + 備用中文 + 原始文字」組合，確保過濾 100% 成功
function getWaveZhName(waveId) {
    if (!waveId) return '';
    const cleanId = String(waveId).trim();

    const item = melodyMap.get(cleanId);
    const fromMap = item ? (item.melodyZh || '') : '';
    const fromFallback = waveFallbackMap[cleanId] || '';

    // 組合所有可能的中文名稱（例如："連消帶打之曲 WAV_0001"）
    return `${fromMap} ${fromFallback} ${cleanId}`.trim();
}

// 載入狩獵笛主資料
async function loadData() {
    const container = document.getElementById('cardsContainer');
    try {
        // 先等 MelodyMap 完全載入
        await loadMelodyMap();

        const res = await fetch('data/huntinghorns.json');
        if (!res.ok) throw new Error(`HTTP 錯誤！狀態：${res.status}`);

        rawHorns = await res.json();
        rawHorns.sort((a, b) => parseInt(b.rare || 0) - parseInt(a.rare || 0));

        filterAndRender();
    } catch (error) {
        console.error('資料載入失敗：', error);
        if (container) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color: #ef4444; padding: 20px;">資料載入失敗，請檢查檔案路徑。</div>`;
        }
    }
}

// 核心過濾邏輯
function filterAndRender() {
    const filtered = rawHorns.filter(horn => {
        const melodyIds = horn.melodyId ? String(horn.melodyId).split(/,\s*/) : [];
        const melodyZhNames = melodyIds.map(id => getMelodyZhOnly(id)).join(' ');
        const echoZhName = getMelodyZhOnly(horn.echoId) || String(horn.echoId || '');
        const waveZhName = getWaveZhName(horn.waveId);

        // A. 關鍵字搜尋
        const matchesSearch = !currentSearchText || 
            (horn.hornZh && horn.hornZh.toLowerCase().includes(currentSearchText)) ||
            (horn.hornJa && horn.hornJa.toLowerCase().includes(currentSearchText)) ||
            (horn.hornEn && horn.hornEn.toLowerCase().includes(currentSearchText)) ||
            (horn.hornDev && horn.hornDev.toLowerCase().includes(currentSearchText)) ||
            melodyZhNames.toLowerCase().includes(currentSearchText) ||
            echoZhName.toLowerCase().includes(currentSearchText) ||
            waveZhName.toLowerCase().includes(currentSearchText);

        // B. 遊戲版本
        const matchesVersion = currentGameVersion === 'ALL' || 
            (horn.gameVersion && horn.gameVersion.toString() === currentGameVersion);

        // C. 屬性
        const matchesElement = currentElement === 'ALL' || horn.elmType === currentElement;

        // D. 旋律
        const matchesMelody = currentMelodyFilter === 'ALL' || melodyZhNames.includes(currentMelodyFilter);

        // E. 響玉
        const matchesEcho = currentEchoFilter === 'ALL' || echoZhName.includes(currentEchoFilter);

        // F. 特殊演奏（檢查按鈕的文字是否包含在 waveZhName 中）
        const matchesSpecial = currentSpecialFilter === 'ALL' || waveZhName.includes(currentSpecialFilter);

        return matchesSearch && matchesVersion && matchesElement && matchesMelody && matchesEcho && matchesSpecial;
    });

    renderCardsWithPagination(filtered);
}

// 渲染卡片與分頁
function renderCardsWithPagination(items) {
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
        container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">沒有找到符合條件的狩獵笛</div>`;
        if (pagination) pagination.innerHTML = '';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageItems = items.slice(startIndex, startIndex + itemsPerPage);

    container.innerHTML = pageItems.map(horn => {
        const rareVal = horn.rare || '1';
        const melodyIds = horn.melodyId ? String(horn.melodyId).split(/,\s*/) : [];
        
        // 顯示卡片上的特殊演奏名稱
        const displayWave = waveFallbackMap[horn.waveId] || getMelodyZhOnly(horn.waveId) || horn.waveId || '無';

        return `
            <div class="data-card">
                <div class="card-header">
                    <div>
                        <div class="card-title">${horn.hornZh || '未命名狩獵笛'}</div>
                        <div class="card-subtitle">${horn.hornJa || ''} | ${horn.hornEn || ''}</div>
                        <div class="card-subtitle" style="margin-top: 2px;">版本：${horn.gameVersion || ''} | 衍生：${horn.hornDev || '無'}</div>
                    </div>
                    <span class="badge badge-rare-${rareVal}">R${rareVal}</span>
                </div>

                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; background: var(--input-bg); padding: 8px; border-radius: 6px; margin: 8px 0; font-size: 0.85rem; text-align: center;">
                        <div>攻擊 <div style="font-weight:bold; color:var(--primary-color);">${horn.atk || 0}</div></div>
                        <div>屬性 <div style="font-weight:bold;">${horn.elmType || '無'} ${horn.elmAtt > 0 ? horn.elmAtt : ''}</div></div>
                        <div>會心 <div style="font-weight:bold;">${horn.aff || 0}%</div></div>
                    </div>

                    <div style="font-size: 0.85rem; margin-bottom: 6px; line-height: 1.5;">
                        <div><strong>特殊演奏：</strong>${displayWave}</div>    
                        <div><strong>響玉效果：</strong>${getMelodyText(horn.echoId) || '無'}</div>
                        <div><strong>鑲嵌槽：</strong>[${horn.slot || '無'}]</div>
                    </div>

                    <div style="margin-top: 8px; border-top: 1px dashed var(--card-border); padding-top: 6px;">
                        <div style="font-weight: bold; font-size: 0.85rem; color: var(--primary-color); margin-bottom: 4px;">🎶 演奏旋律：</div>
                        <ul style="font-size: 0.82rem; padding-left: 18px; line-height: 1.4;">
                            ${melodyIds.map(id => `<li>${getMelodyText(id)}</li>`).join('') || '<li>無旋律資料</li>'}
                        </ul>
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

// 初始化綁定
document.addEventListener('DOMContentLoaded', () => {
    loadData();

    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        currentSearchText = e.target.value.toLowerCase().trim();
        currentPage = 1;
        filterAndRender();
    });

    bindButtonGroup('gameVersionButtons', 'data-ver', val => currentGameVersion = val);
    bindButtonGroup('elementButtons', 'data-elm', val => currentElement = val);
    bindButtonGroup('melodyButtons', 'data-melody', val => currentMelodyFilter = val);
    bindButtonGroup('echoButtons', 'data-echo', val => currentEchoFilter = val);
    bindButtonGroup('specialButtons', 'data-special', val => currentSpecialFilter = val);
});

function bindButtonGroup(groupId, dataAttr, updateStateCallback) {
    const group = document.getElementById(groupId);
    if (!group) return;

    group.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            group.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            const val = e.target.getAttribute(dataAttr);
            updateStateCallback(val);
            currentPage = 1;
            filterAndRender();
        }
    });
}