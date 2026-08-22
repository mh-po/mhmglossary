  const CROWN_STORAGE_KEY = 'mh_crown_progress';
        let monstersData = [];
        let crownData = JSON.parse(localStorage.getItem(CROWN_STORAGE_KEY)) || {};
        let currentFilter = 'all';
        let currentVersion = 'ALL';

        async function loadMonsters() {
            try {
                const res = await fetch('data/monsters.json');
                if (res.ok) {
                    const rawData = await res.json();
                    monstersData = rawData.filter(m => 
                        (m.category === '大型魔物' || m.type === '大型魔物' || m.dataType === 'monster' || !m.category) &&
                        m.crown !== 'null' && m.crown !== 'no'
                    );
                } else { throw new Error("Network error"); }
            } catch (e) {
                console.warn("使用備用測試資料");
                monstersData = [
                    { id: "001", monsterZh: "滅盡龍", gameVersion: "MHWilds", crown: "yes" },
                    { id: "002", monsterZh: "火龍", gameVersion: "MHWilds", crown: "yes" },
                    { id: "004", monsterZh: "影蜘蛛", gameVersion: "Ascendance", crown: "yes" }
                ];
            }
            renderMonsters();
        }

        // 單一按鈕切換
        function toggleStatus(id, type, subType) {
            initData(id);
            const key = `${type}_${subType}`;
            crownData[id][key] = !crownData[id][key];
            saveAndRender();
        }

        // --- 新功能 A: 雙金一鍵全選 ---
        function toggleBoth(id, type) {
            initData(id);
            const keyMini = `${type}_mini`;
            const keyGiant = `${type}_giant`;
            
            // 判斷是否兩者都已經勾選
            const isBothChecked = crownData[id][keyMini] && crownData[id][keyGiant];
            
            // 如果兩者都勾了，就全部取消；否則全部勾選
            crownData[id][keyMini] = !isBothChecked;
            crownData[id][keyGiant] = !isBothChecked;
            saveAndRender();
        }

        function initData(id) {
            if (!crownData[id]) {
                crownData[id] = { mine_mini: false, mine_giant: false, need_mini: false, need_giant: false, share_mini: false, share_giant: false };
            }
        }

        function saveAndRender() {
            localStorage.setItem(CROWN_STORAGE_KEY, JSON.stringify(crownData));
            renderMonsters();
        }

        function renderMonsters() {
            const container = document.getElementById('crownContainer');
            const searchKeyword = document.getElementById('searchInput').value.toLowerCase();
            let html = '';
            
            let totalInVersion = 0;
            let completedInVersion = 0;

            const filteredMonsters = monstersData.filter(m => {
                const id = m.iD || m.id || m.ID;
                const name = m.monsterZh || m.name || m.nameZh || '未命名';
                const d = crownData[id] || {};
                const ver = m.gameVersion || 'MHWilds';

                // 1. 版本過濾
                if (currentVersion !== 'ALL' && ver !== currentVersion) return false;
                
                // --- 計算成就感進度 (只計算當前版本的魔物) ---
                totalInVersion++;
                if (d.mine_mini && d.mine_giant) {
                    completedInVersion++;
                }

                // 2. 關鍵字過濾
                if (searchKeyword && !name.toLowerCase().includes(searchKeyword)) return false;
                
                // 3. 狀態過濾 (加入 C: 只顯示我缺漏的)
                if (currentFilter === 'missing') {
                    if (d.mine_mini && d.mine_giant) return false; // 兩者都有就不顯示
                }
                if (currentFilter === 'need' && !d.need_mini && !d.need_giant) return false;
                if (currentFilter === 'share' && !d.share_mini && !d.share_giant) return false;
                
                return true;
            });

            updateProgressText(totalInVersion, completedInVersion);

            if (filteredMonsters.length === 0) {
                container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding: 40px; color: var(--text-muted);">沒有符合條件的魔物</div>`;
                return;
            }

            filteredMonsters.forEach(m => {
                const id = m.iD || m.id || m.ID;
                const name = m.monsterZh || m.name || m.nameZh || '未命名魔物';
                const d = crownData[id] || {};
                const verBadge = m.gameVersion === 'Ascendance' ? `<span class="badge" style="background:#8b5cf6;color:#fff;">Ascendance</span>` : `<span class="badge" style="background:#10b981;color:#fff;">MHWilds</span>`;

                const renderBtn = (type, subType, icon, label, className) => {
                    const isActive = d[`${type}_${subType}`] ? 'active' : '';
                    return `<button class="btn-crown-toggle ${className} ${isActive}" onclick="toggleStatus('${id}', '${type}', '${subType}')">
                                <span class="material-symbols-outlined">${icon}</span> ${label}
                            </button>`;
                };

                html += `
                    <div class="data-card">
                        <div class="card-header" style="margin-bottom: 0;">
                            <div>
                                <div class="card-title"><span>°✧ </span> ${name}</div>
                                <div class="card-subtitle" style="margin-top:4px;">${verBadge} ${m.mSpecies || ''}</div>
                            </div>
                        </div>
                        
                        <div class="tracker-section">
                            <div class="tracker-row">
                                <span class="tracker-label">✅已完成</span>
                                <div class="tracker-toggles">
                                    ${renderBtn('mine', 'mini', 'crown', '小金', 'mini')}
                                    ${renderBtn('mine', 'giant', 'chess_queen', '大金', 'giant')}
                                </div>
                                <button class="btn-toggle-both" onclick="toggleBoth('${id}', 'mine')"><span class="material-symbols-outlined">checklist_rtl</span></button>
                            </div>
                            
                            <div class="tracker-row">
                                <span class="tracker-label" style="color: #f59e0b;">🙏 求助</span>
                                <div class="tracker-toggles">
                                    ${renderBtn('need', 'mini', 'crown', '小金', 'mini')}
                                    ${renderBtn('need', 'giant', 'chess_queen', '大金', 'giant')}
                                </div>
                                <button class="btn-toggle-both" onclick="toggleBoth('${id}', 'need')"><span class="material-symbols-outlined">checklist_rtl</span></button>
                            </div>

                            <div class="tracker-row">
                                <span class="tracker-label" style="color: #10b981;">📣 可分享</span>
                                <div class="tracker-toggles">
                                    ${renderBtn('share', 'mini', 'crown', '小金', 'mini')}
                                    ${renderBtn('share', 'giant', 'chess_queen', '大金', 'giant')}
                                </div>
                                <button class="btn-toggle-both" onclick="toggleBoth('${id}', 'share')"><span class="material-symbols-outlined">checklist_rtl</span></button>
                            </div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        }

        // --- 新功能 D: 更新成就感文字 ---
        function updateProgressText(total, completed) {
            const progressEl = document.getElementById('progressStats');
            if (total === 0) {
                progressEl.innerHTML = `<span>尚無魔物資料</span>`;
                progressEl.className = 'progress-stats-bar';
                return;
            }

            const missing = total - completed;
            let textHtml = '';

           if (missing === 0) {
                // 判斷現在是看全部還是看單一版本
                const verText = currentVersion === 'ALL' ? '所有' : '本';
                textHtml = `🎉 恭喜你！${verText}版本的 ${total} 隻魔物大小金已經全部集齊了！你就是傳說中的大小金獵人！`;
                progressEl.className = 'progress-stats-bar completed';
            } else {
                textHtml = `🎯 進度：已集齊 <strong>${completed}</strong> 隻，尚欠 <strong style="color:#ef4444;">${missing}</strong> 隻魔物。`;
                if (missing === 1) {
                    textHtml += `<span style="color:#f59e0b; margin-left: 8px;">🔥 只差一隻了，很快就畢業了！</span>`;
                }
                progressEl.className = 'progress-stats-bar';
            }
            progressEl.innerHTML = textHtml;
        }

        // 重設所有記錄
        function resetAllRecords() {
            if (confirm(`確定要清空所有紀錄嗎？(不會區分版本，會全部清空)`)) {
                crownData = {};
                saveAndRender();
                if(typeof showToast === 'function') showToast('已清除所有記錄');
            }
        }

        // --- 更新版 B: 總缺漏清單排版 ---
        function showMissingList() {
            let missingList = [];
            let missingCount = 0;
            
            monstersData.forEach(m => {
                const id = m.iD || m.id || m.ID;
                const ver = m.gameVersion || 'MHWilds';
                // 只統計當前選定版本的缺漏
                if (currentVersion !== 'ALL' && ver !== currentVersion) return;

                const name = m.monsterZh || m.name || m.nameZh || '未命名魔物';
                const d = crownData[id] || {};
                
                let missing = [];
                if (!d.mine_mini) missing.push('小金');
                if (!d.mine_giant) missing.push('大金');

                if (missing.length > 0) {
                    missingList.push(`- ${name} (缺：${missing.join('、')})`);
                    missingCount++;
                }
            });

            const textEl = document.getElementById('missingListText');
            if (missingList.length === 0) {
                textEl.textContent = "太厲害了！你又集齊了一套大小金。";
            } else {
                const verText = currentVersion === 'ALL' ? '全部版本' : currentVersion;
                textEl.textContent = `【目前尚缺大小金進度】\n共缺 ${missingCount} 隻魔物未畢業：\n\n` + missingList.join('\n');
            }

            document.getElementById('missingListModal').style.display = 'flex';
        }

        function closeMissingList() { document.getElementById('missingListModal').style.display = 'none'; }

        function copyMissingText() {
            const textToCopy = document.getElementById('missingListText').textContent;
            if (typeof copyToClipboard === 'function') {
                copyToClipboard(textToCopy, event.currentTarget);
            } else {
                navigator.clipboard.writeText(textToCopy);
                alert("已複製到剪貼簿！");
            }
        }

        function generateText(mode) {
            let list = [];
            monstersData.forEach(m => {
                const id = m.iD || m.id || m.ID;
                const ver = m.gameVersion || 'MHWilds';
                if (currentVersion !== 'ALL' && ver !== currentVersion) return;

                const name = m.monsterZh || m.name || m.nameZh || '未命名魔物';
                const d = crownData[id] || {};
                
                let types = [];
                if (mode === 'need') {
                    if (d.need_mini) types.push('小金');
                    if (d.need_giant) types.push('大金');
                } else if (mode === 'share') {
                    if (d.share_mini) types.push('小金');
                    if (d.share_giant) types.push('大金');
                }

                if (types.length > 0) {
                    list.push(`- ${name} (${types.join('、')})`);
                }
            });

            if (list.length === 0) {
                if (typeof showToast === 'function') showToast('目前該版本沒有標記任何魔物');
                return;
            }

            const header = mode === 'need' ? '【求助】缺以下魔物大小金，求好心人分享任務，謝謝：\n' : '【能開任】手邊有以下大小金任務可分享：\n';
            const textToCopy = header + list.join('\n');
            
            if (typeof copyToClipboard === 'function') copyToClipboard(textToCopy, event.currentTarget);
            else { navigator.clipboard.writeText(textToCopy); alert("已複製到剪貼簿！"); }
        }

        // 綁定過濾器與版本切換事件
        document.getElementById('quickFilters').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                document.querySelectorAll('#quickFilters .btn-filter').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = e.target.getAttribute('data-filter');
                renderMonsters();
            }
        });

        document.getElementById('versionTabs').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                document.querySelectorAll('#versionTabs .btn-filter').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                currentVersion = e.target.getAttribute('data-ver');
                renderMonsters();
            }
        });

        document.addEventListener('DOMContentLoaded', () => { loadMonsters(); });

        