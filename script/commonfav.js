/**
 * commonfav.js - 通用收藏管理與UI重置工具
 */

const CommonFav = {
    // 1. 取得指定 key 的收藏清單
    get(storageKey) {
        try {
            return JSON.parse(localStorage.getItem(storageKey)) || [];
        } catch (e) {
            console.error('讀取收藏失敗：', e);
            return [];
        }
    },

    // 2. 切換收藏狀態並即時更新 UI
    toggle(storageKey, id, btnElement, onStateChange) {
        let favs = this.get(storageKey);
        const strId = String(id);
        const index = favs.indexOf(strId);

        if (index > -1) {
            favs.splice(index, 1);
        } else {
            favs.push(strId);
        }

        localStorage.setItem(storageKey, JSON.stringify(favs));
        const isFav = favs.includes(strId);

        // 更新愛心 UI
        if (btnElement) {
            btnElement.title = isFav ? '取消收藏' : '加入收藏';
            const icon = btnElement.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.style.color = isFav ? '#ef4444' : '#9ca3af';
                icon.style.fontVariationSettings = `'FILL' ${isFav ? 1 : 0}`;
            }
        }

        if (typeof onStateChange === 'function') {
            onStateChange(isFav);
        }
    },

    // 3. 通用重置 UI 工具
    resetUI({ searchInputId, favBtnId, groupIds = [] }) {
        // 清空搜尋文字框
        if (searchInputId) {
            const input = document.getElementById(searchInputId);
            if (input) input.value = '';
        }

        // 取消最愛按鈕高亮
        if (favBtnId) {
            const favBtn = document.getElementById(favBtnId);
            if (favBtn) favBtn.classList.remove('active');
        }

        // 所有按鈕群組歸位至 ALL
        groupIds.forEach(id => {
            const group = document.getElementById(id);
            if (group) {
                group.querySelectorAll('.btn-filter, button').forEach(btn => {
                    // 只要 data- 屬性值為 ALL 就亮起，其餘移除 active
                    const isAll = Array.from(btn.attributes).some(attr => attr.value === 'ALL');
                    btn.classList.toggle('active', isAll);
                });
            }
        });
    }
};