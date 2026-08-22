/**
 * MH Database - Centralized Card Templates
 * 全站共用卡片渲染庫 (包含所有資料類型的完整版)
 */

const CardTemplates = {
    // ==========================================
    // 助手函式庫 (供內部使用)
    // ==========================================
    _parseLvDescription: function(str) {
        if (!str) return [];
        return str.split(/(?=Lv\d+:)/)
                  .map(s => s.trim().replace(/,$/, ''))
                  .filter(Boolean);
    },

    _createLangRow: function(label, text) {
        if (!text || text === 'null') return '';
        return `
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="min-width: 24px; font-weight: bold; color: var(--text-main);">${label}</span>
                <span>${text}</span>
                <button class="btn-icon-copy" onclick="handleCardCopy('${text}', this, event)" title="複製">
                    <span class="material-symbols-outlined" style="font-size: 15px;">content_copy</span>
                </button>
            </div>
        `;
    },

    // ==========================================
    // 1. 綜合速查卡片 (General)
    // ==========================================
    createGeneralCard: function(data, isFav, toggleFavFn = 'toggleGeneralFavorite') {
        const id = String(data.id || data.iD || data.siteId || '').trim();
        return `
            <div class="data-card" id="general-card-${id}">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div style="flex: 1; min-width: 0;">
                        <div class="card-title" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span style="color: #38bdf8; font-weight: bold; font-size: 1.1rem;">${data.generalZh || '未命名項目'}</span>
                            <button class="btn-icon-copy" onclick="handleCardCopy('${data.generalZh || ''}', this, event)">
                                <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                            </button>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        <span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3);">
                            ${data.typeSub || '分類'}
                        </span>
                        <button class="btn-fav ${isFav ? 'active' : ''}" onclick="${toggleFavFn}('${id}', event)" style="background: none; border: none; cursor: pointer; padding: 2px;">
                            <span class="material-symbols-outlined" style="font-size: 22px; color: ${isFav ? '#ef4444' : 'var(--text-muted)'}; font-variation-settings: 'FILL' ${isFav ? 1 : 0};">favorite</span>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.9rem; color: var(--text-muted); margin-bottom: 12px;">
                        ${this._createLangRow('日', data.generalJa)}
                        ${this._createLangRow('英', data.generalEn)}
                    </div>
                    ${data.genNote ? `
                        <div style="background: rgba(0,0,0,0.15); border-left: 3px solid var(--info-color); padding: 8px 10px; border-radius: 4px; font-size: 0.85rem; color: var(--text-main); margin-bottom: 10px; line-height: 1.4;">
                            ${data.genNote}
                        </div>
                    ` : ''}
                    <div style="display: flex; justify-content: flex-end; align-items: center;">
                        <span class="tag" style="font-size: 0.75rem;">${data.gameVersion || ''}</span>
                    </div>
                </div>
            </div>
        `;
    },

    // ==========================================
    // 2. 飾品珠卡片 (Jewels)
    // ==========================================
    createJewelCard: function(jewel, isFav, toggleFavFn = 'toggleJewelFavorite') {
        const id = String(jewel.id || jewel.iD || jewel.siteId || '').trim();
        let skillRowHTML = '';
        if (jewel.refId && jewel.jewelSkillZh) {
            skillRowHTML = `
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border-color);">
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px;">裝備技能 (點擊詳情)：</div>
                    <button class="btn-skill-ref" onclick="showSkillDetail('${jewel.refId}')">
                        <div style="display: flex; flex-direction: column; align-items: flex-start;">
                            <span style="font-weight: bold; font-size: 0.95rem; color: var(--text-main);">${jewel.jewelSkillZh}</span>
                            <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                                ${jewel.jewelSkillJa || ''} ${jewel.jewelSkillJa && jewel.jewelSkillEn ? '|' : ''} ${jewel.jewelSkillEn || ''}
                            </span>
                        </div>
                        <span class="material-symbols-outlined" style="color: var(--primary-color);">open_in_new</span>
                    </button>
                </div>
            `;
        }

        return `
            <div class="data-card" id="jewel-card-${id}">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div style="flex: 1; min-width: 0;">
                        <div class="card-title" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span style="color: #38bdf8; font-weight: bold; font-size: 1.1rem;">${jewel.jewelZh || '未命名飾品珠'}</span>
                            <button class="btn-icon-copy" onclick="handleCardCopy('${jewel.jewelZh || ''}', this, event)">
                                <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                            </button>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);">
                            ${jewel.jewelType || '飾品珠'}
                        </span>
                        <button class="btn-fav ${isFav ? 'active' : ''}" onclick="${toggleFavFn}('${id}', event)" style="background: none; border: none; cursor: pointer; padding: 2px;">
                            <span class="material-symbols-outlined" style="font-size: 22px; color: ${isFav ? '#ef4444' : 'var(--text-muted)'}; font-variation-settings: 'FILL' ${isFav ? 1 : 0};">favorite</span>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.88rem; color: var(--text-muted); margin-bottom: 8px;">
                        ${this._createLangRow('日', jewel.jewelJa)}
                        ${this._createLangRow('英', jewel.jewelEn)}
                    </div>
                    <div style="display: flex; justify-content: flex-end; align-items: center; font-size: 0.8rem;">
                        <span class="tag" style="font-size: 0.75rem;">${jewel.gameVersion || ''}</span>
                    </div>
                    ${skillRowHTML}
                </div>
            </div>
        `;
    },

    // ==========================================
    // 3. 技能卡片 (Skills)
    // ==========================================
    createSkillCard: function(skill, isFav, toggleFavFn = 'toggleSkillFavorite') {
        const id = String(skill.id || skill.iD || skill.skillId || '').trim();
        const lvList = this._parseLvDescription(skill.lvDescription);
        const altTextCombined = [skill.alternativeZh, skill.alternativeZhS, skill.alternativeJa, skill.alternativeEn].filter(Boolean).join(' | ');

        return `
            <div class="data-card" id="skill-card-${id}">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div style="flex: 1; min-width: 0;">
                        <div class="card-title" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span style="color: #f59e0b; font-weight: bold; font-size: 1.1rem;">${skill.skillZh || '未命名技能'}</span>
                            <button class="btn-icon-copy" onclick="handleCardCopy('${skill.skillZh || ''}', this, event)">
                                <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                            </button>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        <span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);">
                            ${skill.skillSource || '技能'}
                        </span>
                        <button class="btn-fav ${isFav ? 'active' : ''}" onclick="${toggleFavFn}('${id}', event)" style="background: none; border: none; cursor: pointer; padding: 2px;">
                            <span class="material-symbols-outlined" style="font-size: 22px; color: ${isFav ? '#ef4444' : 'var(--text-muted)'}; font-variation-settings: 'FILL' ${isFav ? 1 : 0};">favorite</span>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="card-subtitle" style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 8px;">
                        ${skill.skillZhS ? `<span style="display: inline-flex; align-items: center; gap: 2px;">${skill.skillZhS} <button class="btn-icon-copy" onclick="handleCardCopy('${skill.skillZhS}', this, event)"><span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span></button></span> |` : ''}
                        ${skill.skillEn ? `<span style="display: inline-flex; align-items: center; gap: 2px;">${skill.skillEn} <button class="btn-icon-copy" onclick="handleCardCopy('${skill.skillEn}', this, event)"><span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span></button></span> |` : ''}
                        ${skill.skillJa ? `<span style="display: inline-flex; align-items: center; gap: 2px;">${skill.skillJa} <button class="btn-icon-copy" onclick="handleCardCopy('${skill.skillJa}', this, event)"><span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span></button></span>` : ''}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px; font-size: 0.88rem; color: var(--text-main);">
                        <div style="flex: 1;">${skill.skillDescription || '無說明'}</div>
                        <span class="badge" style="background: rgba(255,255,255,0.08); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); flex-shrink: 0;">
                            Max Lv.${skill.maxSkillLv || 1}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <span class="material-symbols-outlined" style="font-size: 15px;">label</span>
                            <span>${skill.skillTag || '無標籤'}</span>
                        </div>
                        <span class="tag" style="font-size: 0.75rem;">${skill.gameVersion || ''}</span>
                    </div>
                    ${altTextCombined ? `
                        <div style="padding: 6px 10px; background: rgba(245, 158, 11, 0.08); border-radius: 4px; border: 1px dashed rgba(245, 158, 11, 0.3); margin-bottom: 10px; font-size: 0.82rem; color: #fbbf24;">
                            <strong>其他名稱/套裝：</strong> ${altTextCombined}
                        </div>
                    ` : ''}
                    <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-color);">
                        <div style="font-weight: bold; font-size: 0.82rem; color: var(--primary-color); margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">format_list_bulleted</span> 各等級效果：
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px; background: rgba(0,0,0,0.15); padding: 8px; border-radius: 6px;">
                            ${lvList.length > 0 ? lvList.map(lv => `<div style="font-size: 0.82rem; color: var(--text-main); line-height: 1.4; padding: 2px 0; border-bottom: 1px dotted rgba(255,255,255,0.05);">${lv}</div>`).join('') : '<div style="font-size: 0.8rem; color: var(--text-muted);">無等級詳細數據</div>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ==========================================
    // 4. 貓飯技能卡片 (Meal Skills)
    // ==========================================
    createMealSkillCard: function(data, isFav, toggleFavFn = 'toggleMealSkillFavorite') {
        const id = String(data.id || data.iD || data.siteId || '').trim();
        return `
            <div class="data-card" id="mealskill-card-${id}">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div style="flex: 1; min-width: 0;">
                        <div class="card-title" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span style="color: #fb923c; font-weight: bold; font-size: 1.1rem;">${data.mealSkillZh || '未命名餐點'}</span>
                            <button class="btn-icon-copy" onclick="handleCardCopy('${data.mealSkillZh || ''}', this, event)">
                                <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                            </button>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        <span class="badge" style="background: rgba(251, 146, 60, 0.15); color: #fdba74; border: 1px solid rgba(251, 146, 60, 0.3);">
                            貓飯技能
                        </span>
                        <button class="btn-fav ${isFav ? 'active' : ''}" onclick="${toggleFavFn}('${id}', event)" style="background: none; border: none; cursor: pointer; padding: 2px;">
                            <span class="material-symbols-outlined" style="font-size: 22px; color: ${isFav ? '#ef4444' : 'var(--text-muted)'}; font-variation-settings: 'FILL' ${isFav ? 1 : 0};">favorite</span>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.88rem; color: var(--text-muted); margin-bottom: 8px;">
                        ${this._createLangRow('日', data.mealSkillJa)}
                        ${this._createLangRow('英', data.mealSkillEn)}
                    </div>
                    <div style="font-size: 0.88rem; color: var(--text-main); margin-bottom: 12px; line-height: 1.5;">
                        ${data.mealSkillDes || '無說明'}
                    </div>
                    <div style="display: flex; justify-content: flex-end; align-items: center;">
                        <span class="tag" style="font-size: 0.75rem;">${data.gameVersion || ''}</span>
                    </div>
                </div>
            </div>
        `;
    },

    // ==========================================
    // 5. 魔物卡片 (Monsters)
    // ==========================================
    createMonsterCard: function(data, isFav, toggleFavFn = 'toggleMonsterFavorite') {
        const id = String(data.id || data.iD || data.siteId || '').trim();
        const armorInfo = (data.armorPrefixJa || data.armorPrefixEn) && (data.armorPrefixJa !== 'null') 
            ? `${data.armorPrefixJa || ''} / ${data.armorPrefixEn || ''}` : '';

        return `
            <div class="data-card" id="monster-card-${id}">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div style="flex: 1; min-width: 0;">
                        <div class="card-title" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span style="color: #ef4444; font-weight: bold; font-size: 1.1rem;">${data.monsterZh || '未命名魔物'}</span>
                            <button class="btn-icon-copy" onclick="handleCardCopy('${data.monsterZh || ''}', this, event)">
                                <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                            </button>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        <span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.3);">
                            ${data.mSpecies || '魔物'}
                        </span>
                        <button class="btn-fav ${isFav ? 'active' : ''}" onclick="${toggleFavFn}('${id}', event)" style="background: none; border: none; cursor: pointer; padding: 2px;">
                            <span class="material-symbols-outlined" style="font-size: 22px; color: ${isFav ? '#ef4444' : 'var(--text-muted)'}; font-variation-settings: 'FILL' ${isFav ? 1 : 0};">favorite</span>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.88rem; color: var(--text-muted); margin-bottom: 8px;">
                        ${this._createLangRow('日', data.monsterNameJa)}
                        ${this._createLangRow('英', data.monsterNameEn)}
                    </div>
                    
                    ${armorInfo ? `
                        <div style="padding: 6px 10px; background: rgba(0,0,0,0.15); border-radius: 4px; margin-bottom: 10px; font-size: 0.82rem; color: var(--text-main); display: flex; align-items: center; justify-content: space-between;">
                            <div><strong>防具字首：</strong> <span style="color: var(--text-muted);">${armorInfo.replace(/^\/|\/$/g, '')}</span></div>
                            ${data.armorRare && data.armorRare !== 'null' ? `<span class="badge" style="background: var(--card-bg); border-color: var(--border-color);">Rare ${data.armorRare}</span>` : ''}
                        </div>
                    ` : ''}

                    <div style="display: flex; justify-content: flex-end; align-items: center;">
                        <span class="tag" style="font-size: 0.75rem;">${data.gameVersion || ''}</span>
                    </div>
                </div>
            </div>
        `;
    },

    // ==========================================
    // 6. 護石卡片 (Charms)
    // ==========================================
    createCharmCard: function(data, isFav, toggleFavFn = 'toggleCharmFavorite') {
        const id = String(data.id || data.iD || data.siteId || '').trim();
        return `
            <div class="data-card" id="charm-card-${id}">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div style="flex: 1; min-width: 0;">
                        <div class="card-title" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span style="color: #a855f7; font-weight: bold; font-size: 1.1rem;">${data.charmZh || '未命名護石'}</span>
                            <button class="btn-icon-copy" onclick="handleCardCopy('${data.charmZh || ''}', this, event)">
                                <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                            </button>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        ${data.rare && data.rare !== 'null' ? `<span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.3);">${data.rare}</span>` : ''}
                        <button class="btn-fav ${isFav ? 'active' : ''}" onclick="${toggleFavFn}('${id}', event)" style="background: none; border: none; cursor: pointer; padding: 2px;">
                            <span class="material-symbols-outlined" style="font-size: 22px; color: ${isFav ? '#ef4444' : 'var(--text-muted)'}; font-variation-settings: 'FILL' ${isFav ? 1 : 0};">favorite</span>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.88rem; color: var(--text-muted); margin-bottom: 8px;">
                        ${this._createLangRow('日', data.charmJa)}
                        ${this._createLangRow('英', data.charmEn)}
                    </div>

                    ${data.charmSkill ? `
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border-color);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined" style="font-size: 16px; color: #10b981;">stars</span>
                                    <span style="font-weight: bold; font-size: 0.9rem; color: var(--text-main);">${data.charmSkill}</span>
                                </div>
                                ${data.maxUpgrade && data.maxUpgrade !== 'null' ? `<span class="badge" style="background: rgba(255,255,255,0.08); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);">Max Lv.${data.maxUpgrade}</span>` : ''}
                            </div>
                        </div>
                    ` : ''}

                    <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 12px;">
                        <span class="tag" style="font-size: 0.75rem;">${data.gameVersion || ''}</span>
                    </div>
                </div>
            </div>
        `;
    },

    // ==========================================
    // 7. 狩獵笛 (Hunting Horn) - 輕量引導版
    // ==========================================
    createHuntingHornCard: function(data, isFav, toggleFavFn = 'toggleHuntingHornFavorite') {
        const id = String(data.id || data.iD || data.siteId || '').trim();
        return `
            <div class="data-card" id="horn-card-${id}">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div style="flex: 1; min-width: 0;">
                        <div class="card-title" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span style="color: #10b981; font-weight: bold; font-size: 1.1rem;">${data.hornZh || '未命名狩獵笛'}</span>
                            <button class="btn-icon-copy" onclick="handleCardCopy('${data.hornZh || ''}', this, event)">
                                <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                            </button>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);">狩獵笛</span>
                        <button class="btn-fav ${isFav ? 'active' : ''}" onclick="${toggleFavFn}('${id}', event)" style="background: none; border: none; cursor: pointer; padding: 2px;">
                            <span class="material-symbols-outlined" style="font-size: 22px; color: ${isFav ? '#ef4444' : 'var(--text-muted)'}; font-variation-settings: 'FILL' ${isFav ? 1 : 0};">favorite</span>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.88rem; color: var(--text-muted); margin-bottom: 8px;">
                        ${this._createLangRow('日', data.hornJa)}
                        ${this._createLangRow('英', data.hornEn)}
                    </div>

                    ${data.hornDev && data.hornDev !== 'null' ? `
                        <div style="padding: 4px 0; font-size: 0.85rem; color: var(--text-main);">
                            <strong>派生：</strong> <span style="color: var(--text-muted);">${data.hornDev}</span>
                        </div>
                    ` : ''}

                    <div style="margin-top: 10px; padding: 10px; background: rgba(59, 130, 246, 0.1); border: 1px dashed rgba(59, 130, 246, 0.4); border-radius: 6px; display: flex; gap: 8px; align-items: flex-start;">
                        <span class="material-symbols-outlined" style="font-size: 18px; color: #60a5fa; margin-top: 2px;">info</span>
                        <div style="font-size: 0.82rem; color: #93c5fd; line-height: 1.4;">
                            此為摘要預覽。要查看詳細的<strong>旋律譜面與響玉機制</strong>，請前往<a href="huntinghorns.html" style="color: #60a5fa; text-decoration: underline;">狩獵笛專區</a>。
                        </div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 10px;">
                        <span class="tag" style="font-size: 0.75rem;">${data.gameVersion || ''}</span>
                    </div>
                </div>
            </div>
        `;
    },

    // ==========================================
    // 8. 獵蟲 (Kinsects) - 輕量引導版
    // ==========================================
    createKinsectCard: function(data, isFav, toggleFavFn = 'toggleKinsectFavorite') {
        const id = String(data.id || data.iD || data.siteId || '').trim();
        return `
            <div class="data-card" id="kinsect-card-${id}">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div style="flex: 1; min-width: 0;">
                        <div class="card-title" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span style="color: #84cc16; font-weight: bold; font-size: 1.1rem;">${data.kinSect || '未命名獵蟲'}</span>
                            <button class="btn-icon-copy" onclick="handleCardCopy('${data.kinSect || ''}', this, event)">
                                <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                            </button>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        <span class="badge" style="background: rgba(132, 204, 22, 0.15); color: #a3e635; border: 1px solid rgba(132, 204, 22, 0.3);">獵蟲 · ${data.kinTyp || ''}</span>
                        <button class="btn-fav ${isFav ? 'active' : ''}" onclick="${toggleFavFn}('${id}', event)" style="background: none; border: none; cursor: pointer; padding: 2px;">
                            <span class="material-symbols-outlined" style="font-size: 22px; color: ${isFav ? '#ef4444' : 'var(--text-muted)'}; font-variation-settings: 'FILL' ${isFav ? 1 : 0};">favorite</span>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.88rem; color: var(--text-muted); margin-bottom: 8px;">
                        ${this._createLangRow('日', data.kinSectJa)}
                        ${this._createLangRow('英', data.kinSectEn)}
                    </div>

                    ${data.kinEvo && data.kinEvo !== 'null' ? `
                        <div style="padding: 4px 0; font-size: 0.85rem; color: var(--text-main);">
                            <strong>派生/進化：</strong> <span style="color: var(--text-muted);">${data.kinEvo}</span>
                        </div>
                    ` : ''}

                    <div style="margin-top: 10px; padding: 10px; background: rgba(59, 130, 246, 0.1); border: 1px dashed rgba(59, 130, 246, 0.4); border-radius: 6px; display: flex; gap: 8px; align-items: flex-start;">
                        <span class="material-symbols-outlined" style="font-size: 18px; color: #60a5fa; margin-top: 2px;">info</span>
                        <div style="font-size: 0.82rem; color: #93c5fd; line-height: 1.4;">
                            此為摘要預覽。要查看詳細的<strong>能力數值表與獵蟲技能</strong>，請前往<a href="kinsects.html" style="color: #60a5fa; text-decoration: underline;">獵蟲專區</a>。
                        </div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 10px;">
                        <span class="tag" style="font-size: 0.75rem;">${data.gameVersion || ''}</span>
                    </div>
                </div>
            </div>
        `;
    },

    // ==========================================
    // 9. 武器卡片 (Weapons) - 預留擴充位
    // ==========================================
    createWeaponCard: function(weapon, isFav, toggleFavFn = 'toggleWeaponFavorite') {
        return `
            <div class="data-card">
                <p>武器名稱: ${weapon.nameZh}</p>
                <!-- 預留樂高式積木組裝區 -->
            </div>
        `;
    }
};