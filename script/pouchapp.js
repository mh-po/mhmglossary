// ==========================================
// 1. 全域變數與常數設定
// ==========================================
const MAX_INVENTORY_SLOTS = 25; 
let CURRENT_LANG = localStorage.getItem('mh_pouch_lang') || 'zh_TW';
const CART_STORAGE_KEY = 'mh_pouch_cart'; 
const PREF_STORAGE_KEY = 'mh_pouch_prefs'; 

let gameData = { items: [], recipes: [], presets: {}, locales: {} };
let currentCategory = 'POTION';
let searchKeyword = ''; 

let cart = {};           
let preferredRecipes = {}; 
let finalInventory = {}; 
let missingMaterials = {}; 
let usedSlots = 0;         

const CATEGORY_MAP = {
    'ALL': { label: '全部', kinds: [] },
    'POTION': { label: '🧪 體力回復', kinds: ['potion'] },
    'CURATIVE': { label: '🩹 治療', kinds: ['curative'] },
    'DRUG': { label: '💉 藥劑', kinds: ['drug'] },
    'RATION': { label: '🍖 食糧', kinds: ['ration'] },
    'SEED_MUSHROOM': { label: '🍄 種子/菇類', kinds: ['seed_mushroom'] },
    'RAW_MATERIAL': { label: '🌿 素材類', kinds: ['raw_material'] },
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
        const [itemsRes, recipesRes, presetsRes, localesRes] = await Promise.all([
            fetch('data/recipeitems.json'),
            fetch('data/recipes.json'),
            fetch('data/presets.json'),
            fetch('data/locales.json')
        ]);
        gameData.items = await itemsRes.json();
        gameData.recipes = await recipesRes.json();
        gameData.presets = await presetsRes.json();
        gameData.locales = await localesRes.json();
        
        loadCart();
        setupUI();
    } catch (error) {
        document.getElementById('item-list').innerHTML = `<p style="color: red;">資料載入失敗</p>`;
    }
}

function loadCart() {
    try {
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (savedCart) cart = JSON.parse(savedCart);
        
        const savedPrefs = localStorage.getItem(PREF_STORAGE_KEY);
        if (savedPrefs) preferredRecipes = JSON.parse(savedPrefs);
    } catch (e) { console.warn("讀取存檔失敗", e); }
}

function saveCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(preferredRecipes));
}

// ==========================================
// 3. 介面渲染函數
// ==========================================
function setupUI() {
    document.getElementById('max-slots').innerText = MAX_INVENTORY_SLOTS;
    renderControls(); 
    renderCatalog();  
    renderPresets(); 
    
    calculateInventory();
    renderCartAndInventory();
}

function renderControls() {
    const catalogSection = document.getElementById('catalog-section');
    const itemList = document.getElementById('item-list');
    
    const existingControls = catalogSection.querySelector('.filter-section');
    if (existingControls) existingControls.remove();

    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'filter-section';
    controlsDiv.style.marginBottom = '15px';

    const topControlsDiv = document.createElement('div');
    topControlsDiv.style.display = 'flex';
    topControlsDiv.style.justifyContent = 'space-between';
    topControlsDiv.style.gap = '10px';
    topControlsDiv.style.marginBottom = '10px';
    topControlsDiv.style.flexWrap = 'wrap';

    // 搜尋框
    const searchDiv = document.createElement('div');
    searchDiv.className = 'search-box';
    searchDiv.style.flex = '1';
    searchDiv.style.minWidth = '200px';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'item-search-input'; 
    searchInput.name = 'item_search';
    searchInput.placeholder = '🔍 搜尋物品名稱...';
    searchInput.addEventListener('input', (e) => {
        searchKeyword = e.target.value.trim().toLowerCase();
        renderCatalog();
    });
    searchDiv.appendChild(searchInput);

    // 語言選擇器
    const langDiv = document.createElement('div');
    langDiv.innerHTML = `
        <select onchange="changeLanguage(this.value)" style="height: 100%; padding: 8px 12px; background: var(--input-bg); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; outline: none;">
            <option value="zh_TW" ${CURRENT_LANG === 'zh_TW' ? 'selected' : ''}>繁體中文</option>
            <option value="ja" ${CURRENT_LANG === 'ja' ? 'selected' : ''}>日本語</option>
            <option value="en" ${CURRENT_LANG === 'en' ? 'selected' : ''}>English</option>
        </select>
    `;

    topControlsDiv.appendChild(searchDiv);
    topControlsDiv.appendChild(langDiv);
  
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
            renderCatalog();  
            const newSearchInput = catalogSection.querySelector('input');
            if (newSearchInput) {
                newSearchInput.value = searchKeyword;
                // 💡 [修正重點] 已經將 newSearchInput.focus(); 移除
                // 這樣在手機上點擊分類時，就不會強制喚醒鍵盤了！
            }
        };
        filterContainer.appendChild(btn);
    });

    controlsDiv.appendChild(topControlsDiv);
    controlsDiv.appendChild(filterContainer);
    catalogSection.insertBefore(controlsDiv, itemList);
}

function renderCatalog() {
    const itemList = document.getElementById('item-list');
    itemList.innerHTML = ''; 

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))'; 
    grid.style.gap = '10px';
    
    const filteredItems = gameData.items.filter(item => {
        const translatedName = gameData.locales[CURRENT_LANG][item.item_id] || item.item_id;
        let passCategory = currentCategory === 'ALL' ? true : CATEGORY_MAP[currentCategory].kinds.includes(item.kind);
        const passSearch = translatedName.toLowerCase().includes(searchKeyword) || item.item_id.toLowerCase().includes(searchKeyword);
        return passCategory && passSearch;
    });

    filteredItems.forEach(item => {
        const translatedName = gameData.locales[CURRENT_LANG][item.item_id] || item.item_id;
        const card = document.createElement('div');
        card.className = 'data-card'; 
        card.style.padding = '10px';
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';

        card.innerHTML = `
            <div style="flex: 1; text-align: left; padding-right: 8px;">
                <div style="font-weight: bold; font-size: 0.95rem;">${translatedName}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                    上限: ${item.limit === 9999 ? '無' : item.limit} ${item.take_slot ? '' : '(不佔格)'}
                </div>
            </div>
            <div style="display: flex; gap: 4px;">
                <button class="btn-filter" onclick="removeFromCart('${item.item_id}')" style="padding: 4px 8px; font-size: 1rem; border-color: var(--border-color);">-</button>
                <button class="btn-filter active" onclick="addToCart('${item.item_id}')" style="padding: 4px 8px; font-size: 1rem;">+</button>
                <button class="btn-filter" onclick="addMaxToCart('${item.item_id}')" style="padding: 4px 6px; font-size: 0.8rem; font-weight: bold; color: var(--accent-color);">MAX</button>
            </div>
        `;
        grid.appendChild(card);
    });

    if (filteredItems.length === 0) {
        itemList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">找不到符合的物品</p>';
    } else {
        itemList.appendChild(grid);
    }
}

function renderPresets() {
    const cartContainer = document.getElementById('cart-container');
    const cartList = document.getElementById('cart-list');
    
    const existingPresets = document.getElementById('preset-buttons-container');
    if (existingPresets) existingPresets.remove();

    if (!gameData.presets || !gameData.presets.presets) return;

    const presetDiv = document.createElement('div');
    presetDiv.id = 'preset-buttons-container';
    presetDiv.style.marginBottom = '12px';
    presetDiv.style.display = 'flex';
    presetDiv.style.flexWrap = 'wrap';
    presetDiv.style.gap = '8px';

    for (let [presetKey, presetData] of Object.entries(gameData.presets.presets)) {
        const btn = document.createElement('button');
        btn.className = 'btn-filter';
        btn.style.background = 'rgba(16, 185, 129, 0.1)';
        btn.style.borderColor = '#10b981';
        btn.style.color = '#10b981';
        
        const translatedName = gameData.locales[CURRENT_LANG][presetData.name_key] || presetData.name_key;
        btn.innerHTML = `${presetData.icon || '📦'} ${translatedName}`;
        
        btn.onclick = () => applyPreset(presetKey);
        presetDiv.appendChild(btn);
    }

    cartContainer.insertBefore(presetDiv, cartList);
}

// ==========================================
// 4. 點擊與套裝邏輯
// ==========================================
window.applyPreset = function(presetKey) {
    const presetData = gameData.presets.presets[presetKey];
    if (!presetData) return;

    if (Object.keys(cart).length > 0) {
        if (!confirm("載入預設套裝將會清空你目前的購物車，確定要繼續嗎？")) {
            return;
        }
    }

    cart = {};
    preferredRecipes = {};

    const items = presetData.items || {};
    for (let [key, value] of Object.entries(items)) {
        let itemId = key;
        let targetQty = value;

        if (key.endsWith('_max') && value === true) {
            itemId = key.replace('_max', '');
            let itemData = gameData.items.find(i => i.item_id === itemId);
            targetQty = itemData ? parseInt(itemData.limit) : 1;
        }

        if (targetQty > 0) {
            cart[itemId] = targetQty;
        }
    }

    calculateInventory();
    saveCart();
    renderCartAndInventory();

    const translatedName = gameData.locales[CURRENT_LANG][presetData.name_key] || presetData.name_key;
    if (typeof showToast === 'function') showToast(`📦 已成功載入：${translatedName}`);
}

window.addToCart = function(itemId) {
    let oldQty = cart[itemId] || 0;
    
    let currentRecipeId = preferredRecipes[itemId];
    let recipe = currentRecipeId 
        ? gameData.recipes.find(r => r.recipe_id === currentRecipeId)
        : gameData.recipes.find(r => r.result_item === itemId);
        
    let itemData = gameData.items.find(i => i.item_id === itemId);
    let addAmount = (recipe && itemData && itemData.kind === 'ammo') ? (parseInt(recipe.yield) || 1) : 1;
    
    cart[itemId] = oldQty + addAmount;
    calculateInventory();
    
    let isOverSlot = usedSlots > MAX_INVENTORY_SLOTS;
    let isMissingMat = Object.keys(missingMaterials).length > 0;

    if (isOverSlot || isMissingMat) {
        if (oldQty === 0) delete cart[itemId];
        else cart[itemId] = oldQty;
        
        calculateInventory();
        let translatedName = gameData.locales[CURRENT_LANG][itemId] || itemId;
        let reason = isOverSlot ? "25格空間已滿" : "合成素材已達攜帶極限";
        if (typeof showToast === 'function') showToast(`⚠️ 無法再增加 ${translatedName}：${reason}`);
    } else {
        saveCart(); 
        renderCartAndInventory();
    }
}

window.addMaxToCart = function(itemId) {
    let oldQty = cart[itemId] || 0;
    let currentRecipeId = preferredRecipes[itemId];
    let recipe = currentRecipeId 
        ? gameData.recipes.find(r => r.recipe_id === currentRecipeId)
        : gameData.recipes.find(r => r.result_item === itemId);
        
    let itemData = gameData.items.find(i => i.item_id === itemId);
    let addAmount = (recipe && itemData && itemData.kind === 'ammo') ? (parseInt(recipe.yield) || 1) : 1;
    
    let currentQty = oldQty;
    let maxSafety = 1000; 
    let reachedLimit = false;
    
    while(maxSafety-- > 0) {
        cart[itemId] = currentQty + addAmount;
        calculateInventory();
        
        if (usedSlots > MAX_INVENTORY_SLOTS || Object.keys(missingMaterials).length > 0) {
            if (currentQty === 0) delete cart[itemId];
            else cart[itemId] = currentQty;
            calculateInventory();
            reachedLimit = true;
            break;
        }
        currentQty += addAmount;
    }
    
    saveCart();
    renderCartAndInventory();
    
    let translatedName = gameData.locales[CURRENT_LANG][itemId] || itemId;
    if (typeof showToast === 'function') {
        if (reachedLimit && currentQty === oldQty) showToast(`⚠️ ${translatedName} 已無法再增加！`);
        else showToast(`⚡ ${translatedName} 已達極限配置！`);
    }
}

window.removeFromCart = function(itemId) {
    if (!cart[itemId]) return;
    
    let currentRecipeId = preferredRecipes[itemId];
    let recipe = currentRecipeId 
        ? gameData.recipes.find(r => r.recipe_id === currentRecipeId)
        : gameData.recipes.find(r => r.result_item === itemId);
        
    let itemData = gameData.items.find(i => i.item_id === itemId);
    let removeAmount = (recipe && itemData && itemData.kind === 'ammo') ? (parseInt(recipe.yield) || 1) : 1;

    cart[itemId] -= removeAmount;
    if (cart[itemId] <= 0) {
        delete cart[itemId];
        delete preferredRecipes[itemId];
    }
    
    calculateInventory(); 
    saveCart();
    renderCartAndInventory();
}

window.deleteFromCart = function(itemId) {
    delete cart[itemId];
    if (preferredRecipes[itemId]) delete preferredRecipes[itemId];
    
    calculateInventory();
    saveCart();
    renderCartAndInventory();
    
    let translatedName = gameData.locales[CURRENT_LANG][itemId] || itemId;
    if (typeof showToast === 'function') showToast(`🗑️ 已移除 ${translatedName}`);
}

window.clearCart = function() {
    cart = {};
    preferredRecipes = {};
    calculateInventory();
    saveCart();
    renderCartAndInventory();
    if (typeof showToast === 'function') showToast(`🗑️ 背包已清空`);
}

window.changeRecipe = function(itemId, newRecipeId) {
    preferredRecipes[itemId] = newRecipeId;
    calculateInventory();
    
    let wasAdjusted = false;
    while ((usedSlots > MAX_INVENTORY_SLOTS || Object.keys(missingMaterials).length > 0) && cart[itemId] > 0) {
        let recipe = gameData.recipes.find(r => r.recipe_id === newRecipeId);
        let itemData = gameData.items.find(i => i.item_id === itemId);
        let removeAmount = (recipe && itemData && itemData.kind === 'ammo') ? (parseInt(recipe.yield) || 1) : 1;

        cart[itemId] -= removeAmount;
        if (cart[itemId] <= 0) delete cart[itemId];
        calculateInventory(); 
        wasAdjusted = true;
    }

    saveCart();
    renderCartAndInventory();
    
    if (wasAdjusted) {
        let translatedName = gameData.locales[CURRENT_LANG][itemId] || itemId;
        if (typeof showToast === 'function') showToast(`⚠️ 新配方素材上限較低，已自動調降 ${translatedName} 數量！`);
    } else {
        if (typeof showToast === 'function') showToast(`🔄 已切換合成配方`);
    }
}

// ==========================================
// 5. 核心精算演算法
// ==========================================
function calculateInventory() {
    finalInventory = {}; 
    missingMaterials = {}; 
    usedSlots = 0;

    function tryAdd(id, amount) {
        if (!finalInventory[id]) finalInventory[id] = 0;
        let itemData = gameData.items.find(i => i.item_id === id);
        let limit = itemData ? parseInt(itemData.limit) : 9999;
        let current = finalInventory[id];
        let spaceLeft = limit - current;
        
        if (amount <= spaceLeft) {
            finalInventory[id] += amount;
            return 0; 
        } else {
            finalInventory[id] += spaceLeft;
            return amount - spaceLeft; 
        }
    }

    function decompose(id, amountNeeded) {
        let recipe;
        if (preferredRecipes[id]) {
            recipe = gameData.recipes.find(r => r.recipe_id === preferredRecipes[id]);
        }
        if (!recipe) {
            recipe = gameData.recipes.find(r => r.result_item === id);
        }

        if (!recipe) {
            missingMaterials[id] = (missingMaterials[id] || 0) + amountNeeded;
            return;
        }
        let yieldPerCraft = parseInt(recipe.yield) || 1;
        let craftsNeeded = Math.ceil(amountNeeded / yieldPerCraft);

        for (let [matId, matQty] of Object.entries(recipe.materials)) {
            let totalMatNeeded = matQty * craftsNeeded;
            let unfulfilledMat = tryAdd(matId, totalMatNeeded);
            
            if (unfulfilledMat > 0) {
                decompose(matId, unfulfilledMat);
            }
        }
    }

    for (let [targetId, targetAmount] of Object.entries(cart)) {
        let unfulfilled = tryAdd(targetId, targetAmount);
        if (unfulfilled > 0) decompose(targetId, unfulfilled);
    }

    for (let [id, qty] of Object.entries(finalInventory)) {
        if (qty <= 0) continue;
        let itemData = gameData.items.find(i => i.item_id === id);
        if (itemData && itemData.take_slot === true) {
            usedSlots++;
        }
    }
}

function getRecipeDepth(itemId, visited = new Set()) {
    if (visited.has(itemId)) return 0;
    visited.add(itemId);

    let recipeId = preferredRecipes[itemId];
    let recipe = recipeId 
        ? gameData.recipes.find(r => r.recipe_id === recipeId)
        : gameData.recipes.find(r => r.result_item === itemId);
        
    if (!recipe) return 0; 
    
    let maxMatDepth = 0;
    for (let matId of Object.keys(recipe.materials)) {
        let d = getRecipeDepth(matId, new Set(visited));
        if (d > maxMatDepth) maxMatDepth = d;
    }
    return maxMatDepth + 1;
}

// ==========================================
// 6. 更新右側 UI (購物車與結算清單)
// ==========================================
function renderCartAndInventory() {
    const cartList = document.getElementById('cart-list');
    const inventoryList = document.getElementById('inventory-list');
    const inventoryContainer = document.getElementById('inventory-container');
    
    cartList.innerHTML = '';
    if (Object.keys(cart).length === 0) {
        cartList.innerHTML = '<li style="color: var(--text-muted); text-align: center; padding: 10px;">請從左側/上方點擊加入物品</li>';
    }
    
    let multiStepItems = []; 

    for (let [id, qty] of Object.entries(cart)) {
        let name = gameData.locales[CURRENT_LANG][id] || id;
        
        if (getRecipeDepth(id) >= 2) {
            multiStepItems.push(name);
        }
        
        let availableRecipes = gameData.recipes.filter(r => r.result_item === id);
        let recipeSelectorHTML = '';
        
        if (availableRecipes.length > 1) {
            let optionsHTML = availableRecipes.map(r => {
                let matNames = Object.keys(r.materials).map(mat => gameData.locales[CURRENT_LANG][mat] || mat).join(' + ');
                let isSelected = (preferredRecipes[id] === r.recipe_id) || (!preferredRecipes[id] && availableRecipes[0].recipe_id === r.recipe_id);
                return `<option value="${r.recipe_id}" ${isSelected ? 'selected' : ''}>用料: ${matNames}</option>`;
            }).join('');
            
            recipeSelectorHTML = `
                <div style="margin-top: 4px; font-size: 0.75rem;">
                    <select onchange="changeRecipe('${id}', this.value)" style="background: var(--bg-color); color: var(--text-muted); border: 1px solid var(--border-color); border-radius: 4px; padding: 2px; max-width: 140px;">
                        ${optionsHTML}
                    </select>
                </div>
            `;
        }

        let li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.marginBottom = '8px';
        li.style.padding = '8px 12px';
        li.style.background = 'var(--input-bg)';
        li.style.borderRadius = '6px';
        
        li.innerHTML = `
            <div style="flex: 1; margin-right: 10px;">
                <div style="font-weight: 500;">${name}</div>
                ${recipeSelectorHTML}
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button class="btn-filter" onclick="deleteFromCart('${id}')" style="padding: 2px 6px; border-color: rgba(239, 68, 68, 0.4); color: #ef4444;" title="全部刪除">🗑️</button>
                <button class="btn-filter" onclick="removeFromCart('${id}')" style="padding: 2px 8px; border-color: var(--border-color);">-</button>
                <span style="display:inline-block; width: 30px; text-align: center; font-weight: bold;">${qty}</span>
                <button class="btn-filter active" onclick="addToCart('${id}')" style="padding: 2px 8px;">+</button>
            </div>
        `;
        cartList.appendChild(li);
    }

    inventoryList.innerHTML = '';
    for (let [id, qty] of Object.entries(finalInventory)) {
        if (qty <= 0) continue; 
        
        let itemData = gameData.items.find(i => i.item_id === id);
        let name = gameData.locales[CURRENT_LANG][id] || id;
        let isTakesSlot = itemData && itemData.take_slot === true;
        let limit = itemData ? parseInt(itemData.limit) : 9999;
        
        let isMaxed = qty >= limit;
        let nameStyle = isMaxed ? 'color: #ef4444; font-weight: bold;' : '';
        let maxLabel = isMaxed ? '<span style="color: #ef4444; font-size: 0.75rem; margin-left: 4px;">(MAX)</span>' : '';

        let li = document.createElement('li');
        li.style.padding = '6px 0';
        li.style.borderBottom = '1px solid var(--border-color-subtle)';
        li.innerHTML = `
            <span class="tag ${isTakesSlot ? 'tag-type' : 'tag-dust'}" style="margin-right: 8px;">
                ${isTakesSlot ? '📦 1 格' : '✨ 無'}
            </span>
            <span style="display: inline-block; min-width: 120px;">
                <strong style="${nameStyle}">${name}</strong>${maxLabel}
            </span> 
            <span style="color: var(--text-muted);">x ${qty}</span>
        `;
        inventoryList.appendChild(li);
    }

    const usedSlotsEl = document.getElementById('used-slots');
    usedSlotsEl.innerText = usedSlots;
    usedSlotsEl.style.color = (usedSlots > MAX_INVENTORY_SLOTS) ? '#ef4444' : '';

    const oldWarning = document.getElementById('multi-step-warning');
    if (oldWarning) oldWarning.remove();

    if (multiStepItems.length > 0) {
        let warningDiv = document.createElement('div');
        warningDiv.id = 'multi-step-warning';
        warningDiv.style.marginTop = '15px';
        warningDiv.style.padding = '12px';
        warningDiv.style.background = 'rgba(245, 158, 11, 0.1)'; 
        warningDiv.style.borderLeft = '4px solid #f59e0b';
        warningDiv.style.borderRadius = '4px';
        warningDiv.style.fontSize = '0.85rem';
        warningDiv.innerHTML = `
            <strong style="color: #f59e0b; display: block; margin-bottom: 6px;">⚠️ 二次調合提醒</strong>
            <span style="color: var(--text-muted); line-height: 1.5;">
                您的清單中 <strong>${multiStepItems.join('、')}</strong> 包含了多層調合。<br>
                💡 遊戲不會自動合成前置素材，請確保將它們的<strong>中間材料（例如增強劑、回復藥、大木桶等）也設定到捷徑清單中</strong>！
            </span>
        `;
        inventoryContainer.appendChild(warningDiv);
    }
}
// ==========================================
// 7. 切換語言功能
// ==========================================
window.changeLanguage = function(langCode) {
    CURRENT_LANG = langCode;
    localStorage.setItem('mh_pouch_lang', langCode);
    
    renderControls(); 
    renderPresets();
    renderCatalog();
    renderCartAndInventory();
    
    if (typeof showToast === 'function') {
        showToast(`🌐 語言已切換 / Language Switched`);
    }
}
window.addEventListener('DOMContentLoaded', init);