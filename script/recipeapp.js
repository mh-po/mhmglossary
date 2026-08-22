// ==========================================
// 1. 全域變數設定
// ==========================================
let CURRENT_LANG = localStorage.getItem('mh_pouch_lang') || 'zh_TW';

let gameData = {
    items: [],
    recipes: [],
    locales: {},
    itemDict: {} // 方便快速查詢物品屬性的字典
};

let currentCategory = 'ALL';
let searchKeyword = '';

// 分類對應表 (沿用背包的分類設定)
const CATEGORY_MAP = {
    'ALL': { label: '全部配方', kinds: [] },
    'POTION': { label: '🧪 體力回復', kinds: ['potion'] },
    'CURATIVE': { label: '🩹 治療', kinds: ['curative'] },
    'DRUG': { label: '💉 藥劑', kinds: ['drug'] },
    'RATION': { label: '🍖 食糧', kinds: ['ration'] },
    'TRAP_BOMB': { label: '💣 陷阱/爆彈', kinds: ['trap_bomb'] },
    'SLINGER': { label: '🪃 投射器', kinds: ['slinger'] },
    'AMMO': { label: '🔫 彈藥', kinds: ['ammo'] },
    'ITEM': { label: '🎒 護符/其他', kinds: ['item'] }
};

// ==========================================
// 2. 初始化與資料讀取
// ==========================================
async function init() {
    try {
        const [itemsRes, recipesRes, localesRes] = await Promise.all([
            fetch('data/recipeitems.json'),
            fetch('data/recipes.json'),
            fetch('data/locales.json')
        ]);
        
        gameData.items = await itemsRes.json();
        gameData.recipes = await recipesRes.json();
        gameData.locales = await localesRes.json();
        
        // 建立 Item 字典，方便我們用 item_id 快速查到它的 kind 分類
        gameData.items.forEach(item => {
            gameData.itemDict[item.item_id] = item;
        });

        setupUI();
    } catch (error) {
        console.error("資料載入失敗", error);
        document.getElementById('recipe-list').innerHTML = `<p style="color: red;">資料載入失敗</p>`;
    }
}

// ==========================================
// 3. 介面渲染函數
// ==========================================
function setupUI() {
    renderControls();
    renderRecipes();
}

function renderControls() {
    const controlsSection = document.getElementById('controls-section');
    controlsSection.innerHTML = ''; // 清空重建

    // 1. 頂部：搜尋框 + 重設按鈕
    const topDiv = document.createElement('div');
    topDiv.style.display = 'flex';
    topDiv.style.gap = '10px';
    topDiv.style.marginBottom = '12px';
    topDiv.style.flexWrap = 'wrap';

    // 搜尋框
    const searchDiv = document.createElement('div');
    searchDiv.className = 'search-box';
    searchDiv.style.flex = '1';
    searchDiv.style.minWidth = '200px';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'recipe-search-input';
    searchInput.name = 'recipe_search';
    searchInput.placeholder = '🔍 搜尋配方或素材名稱...';
    searchInput.value = searchKeyword; // 保持搜尋字
    searchInput.addEventListener('input', (e) => {
        searchKeyword = e.target.value.trim().toLowerCase();
        renderRecipes();
    });
    searchDiv.appendChild(searchInput);

    // 重設按鈕
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn-filter';
    resetBtn.style.padding = '8px 16px';
    resetBtn.style.background = 'rgba(239, 68, 68, 0.1)';
    resetBtn.style.borderColor = '#ef4444';
    resetBtn.style.color = '#ef4444';
    resetBtn.innerHTML = '🔄 重設篩選';
    resetBtn.onclick = () => {
        searchKeyword = '';
        currentCategory = 'ALL';
        renderControls();
        renderRecipes();
        if(typeof showToast === 'function') showToast('已重設過濾條件');
    };

    topDiv.appendChild(searchDiv);
    topDiv.appendChild(resetBtn);

    // 2. 底部：分類按鈕
    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-buttons';

    Object.keys(CATEGORY_MAP).forEach(catKey => {
        const btn = document.createElement('button');
        btn.className = `btn-filter ${currentCategory === catKey ? 'active' : ''}`;
        if(catKey === 'ALL') btn.setAttribute('data-value', 'ALL');

        btn.innerText = CATEGORY_MAP[catKey].label;
        btn.onclick = () => {
            currentCategory = catKey;
            renderControls(); 
            renderRecipes();  
        };
        filterContainer.appendChild(btn);
    });

    controlsSection.appendChild(topDiv);
    controlsSection.appendChild(filterContainer);
}

function renderRecipes() {
    const recipeList = document.getElementById('recipe-list');
    recipeList.innerHTML = ''; 
    
    // 過濾配方邏輯
    const filteredRecipes = gameData.recipes.filter(recipe => {
        const resultItemId = recipe.result_item;
        const resultItemData = gameData.itemDict[resultItemId];
        const resultTranslated = gameData.locales[CURRENT_LANG][resultItemId] || resultItemId;
        
        // --- 檢查分類 ---
        let passCategory = false;
        if (currentCategory === 'ALL') {
            passCategory = true;
        } else if (resultItemData) {
            passCategory = CATEGORY_MAP[currentCategory].kinds.includes(resultItemData.kind);
        }

        // --- 檢查關鍵字 ---
        let passSearch = false;
        // 1. 找成品名稱
        if (resultTranslated.toLowerCase().includes(searchKeyword)) passSearch = true;
        
        // 2. 找素材名稱 (只要配方裡有任何一個素材符合搜尋字，就顯示該配方)
        Object.keys(recipe.materials).forEach(matId => {
            const matTranslated = gameData.locales[CURRENT_LANG][matId] || matId;
            if (matTranslated.toLowerCase().includes(searchKeyword)) {
                passSearch = true;
            }
        });

        return passCategory && passSearch;
    });

    // 渲染卡片
    filteredRecipes.forEach(recipe => {
        const resultItemId = recipe.result_item;
        const resultTranslated = gameData.locales[CURRENT_LANG][resultItemId] || resultItemId;
        const yieldQty = recipe.yield || 1;

        const card = document.createElement('div');
        card.className = 'data-card'; 
        
        // 卡片上半部：成品與產出數量
        let html = `
            <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: bold; font-size: 1.1rem; color: var(--primary-color);">
                    ${resultTranslated}
                </div>
                <div class="tag tag-dust" style="margin: 0;">
                    產出 x ${yieldQty}
                </div>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 6px;">所需調合素材：</div>
            <ul style="margin: 0; padding-left: 0; list-style: none;">
        `;

        // 卡片下半部：所需材料清單
        for (let [matId, matQty] of Object.entries(recipe.materials)) {
            const matTranslated = gameData.locales[CURRENT_LANG][matId] || matId;
            html += `
                <li style="display: flex; justify-content: space-between; padding: 4px 8px; background: var(--input-bg); border-radius: 4px; margin-bottom: 4px; border: none;">
                    <span>➕ ${matTranslated}</span>
                    <span style="font-weight: bold;">x ${matQty}</span>
                </li>
            `;
        }

        html += `</ul>`;
        card.innerHTML = html;
        recipeList.appendChild(card);
    });

    if (filteredRecipes.length === 0) {
        recipeList.style.display = 'block';
        recipeList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">找不到符合條件的配方</p>';
    } else {
        recipeList.style.display = ''; // 恢復 grid 顯示
    }
}

window.addEventListener('DOMContentLoaded', init);