/**
 * MH Database - Common Engine (script/common.js)
 * 包含：主題切換、Header/Footer 載入、通用資料搜尋、篩選與每頁 20 筆分頁邏輯
 */

// ==========================================
// 1. 全域主題管理器 (Dark/Light Theme)
// ==========================================
const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('mh-theme') || 'dark';
        this.applyTheme(savedTheme);
    },
    toggle() {
        const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    },
    applyTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem('mh-theme', theme);
        
        // 更新切換按鈕圖示 (Google Material Symbols)
        // 淺色模式下顯示 dark_mode (月亮)，點擊後切至深色；深色模式下顯示 light_mode (太陽)
        const iconEl = document.getElementById('theme-toggle-icon');
        if (iconEl) {
            iconEl.textContent = theme === 'light' ? 'dark_mode' : 'light_mode';
        }
    }
};

// ==========================================
// 2. 自動動態載入 Nav 與 Footer 組件
// ==========================================
async function loadComponent(elementId, filepath, callback) {
    const target = document.getElementById(elementId);
    if (!target) return;
    try {
        const res = await fetch(filepath);
        if (res.ok) {
            target.innerHTML = await res.text();
            
            // 關鍵點：載入 Nav 後，取得當前 theme 並重新套用一次圖示與狀態
            const currentTheme = localStorage.getItem('mh-theme') || 'dark';
            ThemeManager.applyTheme(currentTheme);
            
            if (typeof callback === 'function') callback();
        }
    } catch (e) {
        console.warn(`[Component Manager] Failed to load ${filepath}:`, e);
    }
}

// 初始化選單相關事件 (Mobile Drawer Toggle & 主選單高亮)
function initNavEvents() {
    // 處理漢堡按鈕與遮罩點擊
    document.addEventListener('click', (e) => {
        const drawer = document.getElementById('nav-drawer');
        const overlay = document.getElementById('sidebar-overlay');
        const toggleBtn = e.target.closest('#nav-toggle');

        if (!drawer || !overlay) return;

        // 點擊漢堡按鈕：切換選單
        if (toggleBtn) {
            drawer.classList.toggle('active');
            overlay.classList.toggle('active');
        } 
        // 點擊遮罩區或連結：關閉選單 (針對手機版)
        else if (e.target.closest('#sidebar-overlay') || e.target.closest('.drawer-item')) {
            drawer.classList.remove('active');
            overlay.classList.remove('active');
        }
    });

    // 高亮當前頁面連結
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.drawer-item').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// 頁面初始化載入
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    loadComponent('nav-placeholder', 'nav.html', initNavEvents);
    loadComponent('footer-placeholder', 'footer.html');
});

// ==========================================
// 3. 通用資料處理與分頁類別 (MhDataManager)
// ==========================================
class MhDataManager {
    constructor(config) {
        this.jsonUrls = config.jsonUrls;           // JSON 檔案路徑陣列
        this.containerId = config.containerId;     // 卡片渲染容器 ID
        this.statsId = config.statsId;             // 統計資訊容器 ID
        this.paginationId = config.paginationId;   // 分頁容器 ID
        this.renderCard = config.renderCard;       // 頁面自訂的卡片 HTML 生成函式
        
        this.itemsPerPage = 21;                    // 固定的每頁顯示數量
        this.currentPage = 1;
        this.rawData = [];                         // 原始未過濾資料
        this.filteredData = [];                    // 篩選後資料
        this.activeFilters = {};                   // 當前啟動的按鈕篩選條件
        this.searchKeyword = '';                   // 當前關鍵字
    }

    // 初始化與載入資料
    async init() {
        try {
            const fetches = this.jsonUrls.map(url => fetch(url).then(r => r.json()));
            const results = await Promise.all(fetches);
            
            // 合併所有 JSON 資料
            this.rawData = results.flat();
            
            // 預設按 Rarity (降序) 排序（如果資料有 rare/rarity 欄位）
            this.rawData.sort((a, b) => (b.rarity || b.rare || 0) - (a.rarity || a.rare || 0));
            
            this.filteredData = [...this.rawData];
            this.render();
        } catch (error) {
            console.error('[MhDataManager] Data load error:', error);
            const container = document.getElementById(this.containerId);
            if (container) container.innerHTML = '<p style="color:red;">資料載入失敗，請檢查網路或檔名。</p>';
        }
    }

    // 設定關鍵字搜尋
    setSearchKeyword(keyword) {
        this.searchKeyword = keyword.trim().toLowerCase();
        this.currentPage = 1;
        this.applyFilters();
    }

    // 設定/切換按鈕篩選條件
    toggleFilter(groupKey, value) {
        if (!this.activeFilters[groupKey]) {
            this.activeFilters[groupKey] = new Set();
        }
        
        const filterSet = this.activeFilters[groupKey];
        if (filterSet.has(value)) {
            filterSet.delete(value);
        } else {
            filterSet.add(value);
        }

        if (filterSet.size === 0) {
            delete this.activeFilters[groupKey];
        }

        this.currentPage = 1;
        this.applyFilters();
    }

    // 核心資料過濾邏輯
    applyFilters() {
        this.filteredData = this.rawData.filter(item => {
            // 1. 關鍵字比對 (全文搜尋 key/value)
            if (this.searchKeyword) {
                const matchString = JSON.stringify(item).toLowerCase();
                if (!matchString.includes(this.searchKeyword)) return false;
            }

            // 2. 按鈕篩選比對
            for (const [groupKey, selectedSet] of Object.entries(this.activeFilters)) {
                const itemValue = item[groupKey];
                if (Array.isArray(itemValue)) {
                    // 若資料本身是陣列 (如旋律或技能清單)，需交集比對
                    if (!itemValue.some(val => selectedSet.has(String(val)))) return false;
                } else {
                    if (!selectedSet.has(String(itemValue))) return false;
                }
            }

            return true;
        });

        this.render();
    }

    // 渲染卡片與分頁
    render() {
        const container = document.getElementById(this.containerId);
        const stats = document.getElementById(this.statsId);
        if (!container) return;

        // 計算分頁
        const totalItems = this.filteredData.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
        
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        if (this.currentPage < 1) this.currentPage = 1;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const pageItems = this.filteredData.slice(startIndex, startIndex + this.itemsPerPage);

        // 渲染統計文字
        if (stats) {
            stats.innerHTML = `共 <strong>${totalItems}</strong> 筆結果 (第 ${this.currentPage} / ${totalPages} 頁)`;
        }

        // 渲染卡片 HTML
        if (pageItems.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">沒有符合條件的資料</div>';
        } else {
            container.innerHTML = pageItems.map(item => this.renderCard(item)).join('');
        }

        // 渲染分頁按鈕
        this.renderPagination(totalPages);
    }

    // 渲染分頁 UI
    renderPagination(totalPages) {
        const paginationContainer = document.getElementById(this.paginationId);
        if (!paginationContainer) return;

        paginationContainer.innerHTML = `
            <button class="btn-page" id="btn-prev" ${this.currentPage === 1 ? 'disabled' : ''}>上一頁</button>
            <span class="page-info">${this.currentPage} / ${totalPages}</span>
            <button class="btn-page" id="btn-next" ${this.currentPage === totalPages ? 'disabled' : ''}>下一頁</button>
        `;

        document.getElementById('btn-prev')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.render();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });

        document.getElementById('btn-next')?.addEventListener('click', () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.render();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
}

// ==========================================
// 4. 通用文字複製函式 (支援手機 Fallback)
// ==========================================
async function copyToClipboard(text, btnElement) {
    if (!text) return;

    // 定義成功後的 UI 反饋
    const showSuccessUI = () => {
        if (btnElement) {
            const originalHTML = btnElement.innerHTML;
            btnElement.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1rem;">check</span>';
            btnElement.classList.add('copied');
            
            setTimeout(() => {
                btnElement.innerHTML = originalHTML;
                btnElement.classList.remove('copied');
            }, 1200);
        }
        showToast(`已複製: ${text}`);
    };

    // 定義舊版備用複製方法 (適用於手機 Safari、App 內建瀏覽器或 HTTP 環境)
    const fallbackCopyTextToClipboard = () => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // 將元素隱藏，防止手機畫面跳動或跳出虛擬鍵盤
        textArea.style.position = "fixed";
        textArea.style.top = "-9999px";
        textArea.style.left = "-9999px";
        textArea.setAttribute("readonly", "");
        
        document.body.appendChild(textArea);
        
        // 針對 iOS Safari 的特殊選取處理
        if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
            const range = document.createRange();
            range.selectNodeContents(textArea);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            textArea.setSelectionRange(0, 999999);
        } else {
            textArea.select();
        }

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showSuccessUI();
            } else {
                showToast("複製失敗，請手動複製");
            }
        } catch (err) {
            console.error('Fallback 複製失敗：', err);
            showToast("複製失敗，請手動複製");
        }

        document.body.removeChild(textArea);
    };

    // 優先使用現代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            showSuccessUI();
        } catch (err) {
            console.warn("Clipboard API 失敗，啟用備用方案", err);
            fallbackCopyTextToClipboard();
        }
    } else {
        // 環境不支援時直接使用備用方案
        fallbackCopyTextToClipboard();
    }
}

// ==========================================
// 5. Toast 提示訊息
// ==========================================
function showToast(message) {
    let toast = document.getElementById('toast-message');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-message';
        toast.className = 'toast-toast'; // 需確保 CSS 中有此類別
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 1500);
}

// ==========================================
// 6. 站內「我的最愛 (Bookmark)」模組 (localStorage) 
// 已改使用commonfav.js
// ==========================================


// ==========================================
// 7. FAB scroll button
// ==========================================
// 滾動到網頁最頂端
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth' // 加入平滑滾動效果
  });
}

// 滾動到網頁最底端
function scrollToBottom() {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: 'smooth'
  });
}

// ==========================================
// 9. IMG Enlargement and management
// ==========================================
// Get modal elements
const modal = document.getElementById("myModal");
const modalImg = document.getElementById("imgLarge");
const closeBtn = document.querySelector(".close");

// Attach click event to ALL images inside .gallery
// querySelectorAll 找不到東西時會回傳空陣列，forEach 不會報錯，但我們還是要在點擊時確認 modal 存在
document.querySelectorAll(".gallery img").forEach(img => {
  img.onclick = function() {
    if (modal && modalImg) { // 防呆：確保 modal 元素存在才執行
      modal.style.display = "block";
      modalImg.src = this.src;   // show the clicked image
      modalImg.alt = this.alt;   // optional: copy alt text
    }
  }
});

// Close modal when clicking the X
if (closeBtn && modal) { // 防呆：確保有關閉按鈕和 modal 才綁定事件
  closeBtn.onclick = function() {
    modal.style.display = "none";
  }
}

// Close modal when clicking outside the image
if (modal) { // 防呆：確保 modal 存在才綁定點擊背景關閉事件
  modal.onclick = function(e) {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  }
}