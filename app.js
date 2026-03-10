// CardsApp Logic

const STORAGE_KEY = 'cards_app_data';
const CUSTOM_COLORS_KEY = 'cards_app_custom_colors';

let state = {
    cards: [],
    customColors: [], // saved hex custom colors
    currentView: 'home',
    currentCardId: null,
    editingType: 'payment',
    editingColor: { type: 'preset', value: 'from-primary to-blue-400' },
    stackIndex: 0,
};

const COLOR_PRESETS = [
    'from-primary to-blue-400',
    'from-slate-800 to-slate-950',
    'from-emerald-500 to-teal-700',
    'from-indigo-500 to-purple-600',
    'from-orange-400 to-red-500',
];

// --- Storage ---
function loadCards() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        state.cards = data ? JSON.parse(data) : [];
    } catch (e) {
        state.cards = [];
    }
    try {
        const cc = localStorage.getItem(CUSTOM_COLORS_KEY);
        state.customColors = cc ? JSON.parse(cc) : [];
    } catch(e) {
        state.customColors = [];
    }
}

function saveCards() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cards));
}

function saveCustomColors() {
    localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(state.customColors));
}

function generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// --- Navigation ---
function navigate(view, params = {}) {
    document.querySelectorAll('.view-container').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('flex');
    });

    state.currentView = view;

    const targetEl = document.getElementById(`view-${view}`);
    if (targetEl) {
        targetEl.classList.remove('hidden');
        if (targetEl.dataset.display === 'flex') {
            targetEl.classList.add('flex');
        }
    }

    if (view === 'home') {
        renderHomeView();
    } else if (view === 'manage') {
        renderManageView();
    } else if (view === 'details') {
        state.currentCardId = params.id;
        renderDetailsView(params.id);
    } else if (view === 'edit') {
        state.currentCardId = params.id || 'new';
        renderEditView(state.currentCardId);
    }
}

function init() {
    loadCards();
    setupStackSwiping();
    navigate('home');
}
document.addEventListener('DOMContentLoaded', init);

// --- Helpers ---
function parseNetwork(numberStr) {
    if (!numberStr) return null;
    const clean = numberStr.replace(/\D/g, '');
    if (clean.startsWith('4')) return {
        name: 'VISA',
        logo: `<span style="font-family:Arial,sans-serif;font-style:italic;font-weight:900;font-size:18px;letter-spacing:-1px;opacity:0.95">VISA</span>`
    };
    if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return {
        name: 'MasterCard',
        logo: `<svg viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:34px;height:auto"><circle cx="11" cy="10" r="9" fill="#EB001B" opacity="0.88"/><circle cx="21" cy="10" r="9" fill="#F79E1B" opacity="0.88"/><path d="M16 3.8C17.9 5.3 19.2 7.5 19.2 10C19.2 12.5 17.9 14.7 16 16.2C14.1 14.7 12.8 12.5 12.8 10C12.8 7.5 14.1 5.3 16 3.8Z" fill="#FF5F00" opacity="0.95"/></svg>`
    };
    if (/^3[47]/.test(clean)) return { name: 'AMEX', logo: `<span style="font-family:Arial;font-weight:900;font-size:11px;letter-spacing:1px;opacity:0.9">AMEX</span>` };
    if (/^6(?:011|5)/.test(clean)) return { name: 'Discover', logo: `<span style="font-style:italic;font-weight:700;font-size:11px;opacity:0.9">Discover</span>` };
    return null;
}

function formatCardNumber(val) {
    const clean = val.replace(/\D/g, '').substring(0, 16);
    const parts = clean.match(/.{1,4}/g);
    return parts ? parts.join(' ') : clean;
}

function formatExpiry(val) {
    const clean = val.replace(/\D/g, '').substring(0, 4);
    if (clean.length >= 3) return clean.substring(0, 2) + '/' + clean.substring(2);
    return clean;
}

function adjustColor(hex, amount) {
    return '#' + hex.replace(/^#/, '').replace(/../g, c =>
        ('0' + Math.min(255, Math.max(0, parseInt(c, 16) + amount)).toString(16)).slice(-2)
    );
}

// --- Card HTML Generator ---
// context: 'stack' | 'list' | 'details' | 'edit-preview'
function generateCardHTML(card, context = 'stack') {
    const colorConfig = typeof card.colorClass === 'object'
        ? card.colorClass
        : { type: 'preset', value: card.colorClass || COLOR_PRESETS[0] };
    const gradient = colorConfig.type === 'preset' ? colorConfig.value : '';
    const inlineStyle = colorConfig.type === 'custom'
        ? `background: linear-gradient(135deg, ${colorConfig.value} 0%, ${adjustColor(colorConfig.value, -45)} 100%);`
        : '';

    if (card.type === 'payment') {
        const last4 = card.number ? card.number.replace(/\s+/g, '').slice(-4) : '••••';
        const net = parseNetwork(card.number);
        const netLogo = net
            ? `<div style="height:24px;display:flex;align-items:center;">${net.logo}</div>`
            : `<span class="material-symbols-outlined" style="font-size:28px;opacity:0.8">contactless</span>`;
        const nameDisplay = card.holderName || 'CARD HOLDER';

        // Show full number on details/edit-preview, masked on stack/list
        const numberDisplay = (context === 'details' || context === 'edit-preview')
            ? (card.number || '•••• •••• •••• ••••')
            : `•••• •••• •••• ${last4}`;

        return `
            <div class="w-full aspect-[1.58/1] rounded-xl bg-gradient-to-br ${gradient} p-5 shadow-xl flex flex-col justify-between relative overflow-hidden text-white select-none" style="${inlineStyle}box-shadow:0 20px 40px -14px rgba(0,0,0,0.35)">
                <div class="absolute inset-0 pointer-events-none" style="background:radial-gradient(ellipse at 80% 10%,rgba(255,255,255,0.15) 0%,transparent 60%)"></div>
                <div class="flex justify-between items-start z-10 relative">
                    <div class="flex flex-col overflow-hidden pr-2 flex-1">
                        <span style="font-size:9px;letter-spacing:0.15em;opacity:0.65;font-weight:700;text-transform:uppercase">Payment</span>
                        <span class="text-base font-bold truncate mt-0.5">${card.name || 'My Card'}</span>
                    </div>
                    ${netLogo}
                </div>
                <div class="flex flex-col gap-1 z-10 relative">
                    <p class="font-mono text-base font-semibold tracking-widest">${numberDisplay}</p>
                    <div class="flex justify-between items-end mt-1">
                        <p class="text-xs font-semibold uppercase truncate max-w-[65%] opacity-80">${nameDisplay}</p>
                        <p class="text-xs font-bold opacity-60">${card.expiry || ''}</p>
                    </div>
                </div>
            </div>`;
    } else {
        // ID / Image card
        return `
            <div class="w-full aspect-[1.58/1] rounded-xl bg-gradient-to-br ${gradient} p-5 shadow-xl flex flex-col justify-between relative overflow-hidden text-white select-none" style="${inlineStyle}box-shadow:0 20px 40px -14px rgba(0,0,0,0.35)">
                <div class="absolute inset-0 pointer-events-none" style="background:radial-gradient(ellipse at 80% 10%,rgba(255,255,255,0.15) 0%,transparent 60%)"></div>
                ${card.imageDataUrlFront ? `<img src="${card.imageDataUrlFront}" class="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-90" />` : ''}
                <div class="flex items-center gap-3 z-10 relative self-start bg-black/20 px-3 py-2 rounded-xl backdrop-blur-sm">
                    <span class="material-symbols-outlined" style="font-size:22px">badge</span>
                    <div class="flex flex-col leading-tight">
                        <span style="font-size:9px;letter-spacing:0.15em;opacity:0.65;font-weight:700;text-transform:uppercase">Document</span>
                        <span class="text-sm font-bold">${card.name || 'My Document'}</span>
                    </div>
                </div>
                <div class="flex justify-between items-center z-10 relative">
                    ${card.holderName ? `<span class="text-xs font-bold bg-black/25 px-3 py-1 rounded-full backdrop-blur-sm truncate max-w-[80%]">${card.holderName}</span>` : '<span></span>'}
                    <span class="material-symbols-outlined bg-black/20 p-1 rounded-full backdrop-blur-sm" style="font-size:18px;opacity:0.8">verified_user</span>
                </div>
            </div>`;
    }
}

// --- STACK LOGIC ---
function renderHomeView() {
    const stackContainer = document.getElementById('home-card-stack');
    document.getElementById('home-card-count').innerText = state.cards.length;

    if (state.cards.length === 0) {
        stackContainer.innerHTML = `
            <div onclick="navigate('edit',{id:'new'})" class="w-[90%] aspect-[1.58/1] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-4 text-slate-400 cursor-pointer hover:border-primary hover:text-primary transition-colors mt-8">
                <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <span class="material-symbols-outlined text-3xl">add_card</span>
                </div>
                <span class="text-sm font-bold tracking-wide">Add New Card</span>
            </div>`;
        return;
    }

    stackContainer.innerHTML = '';
    state.cards.forEach((card, k) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'card-stack-item pointer-events-none';
        wrapper.id = `stack-card-${k}`;
        wrapper.innerHTML = generateCardHTML(card, 'stack');
        stackContainer.appendChild(wrapper);
    });

    applyStackStyles(false);
}

function getCardTransform(diff, total) {
    if (diff === 0) return { y: 0, scale: 1, z: 30, opacity: 1, interactive: true };
    if (diff === 1) return { y: 44, scale: 0.9, z: 20, opacity: 0.92 };
    if (diff === 2) return { y: 88, scale: 0.8, z: 10, opacity: 0.82 };
    if (diff === total - 1 && total > 2) return { y: -100, scale: 1.06, z: 40, opacity: 0 }; // ready-to-come-in position
    return { y: 140, scale: 0.7, z: 0, opacity: 0 };
}

function applyStackStyles(skipTransition = false) {
    const total = state.cards.length;
    if (total === 0) return;
    state.stackIndex = ((state.stackIndex % total) + total) % total;

    state.cards.forEach((card, k) => {
        const wrapper = document.getElementById(`stack-card-${k}`);
        if (!wrapper) return;

        const diff = (k - state.stackIndex + total) % total;
        const t = getCardTransform(diff, total);

        wrapper.classList.remove('interactive', 'cursor-pointer', 'pointer-events-none');
        wrapper.onclick = null;

        if (!skipTransition) {
            wrapper.style.transition = 'transform 0.42s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease, z-index 0s';
        } else {
            wrapper.style.transition = 'none';
        }

        wrapper.style.transform = `translateY(${t.y}px) scale(${t.scale})`;
        wrapper.style.zIndex = `${t.z}`;
        wrapper.style.opacity = `${t.opacity}`;

        if (t.interactive) {
            wrapper.classList.add('interactive', 'cursor-pointer');
            wrapper.onclick = () => navigate('details', { id: card.id });
        } else {
            wrapper.classList.add('pointer-events-none');
        }
    });
}

function rotateStack(direction) {
    if (state.cards.length <= 1) return;
    state.stackIndex += direction;
    applyStackStyles(false);
}

function setupStackSwiping() {
    const stackArea = document.getElementById('home-card-stack');
    let startY = 0;
    let currentDeltaY = 0;
    let isDragging = false;

    stackArea.addEventListener('touchstart', e => {
        if (state.cards.length <= 1) return;
        startY = e.touches[0].clientY;
        currentDeltaY = 0;
        isDragging = true;

        // Disable transitions during drag
        state.cards.forEach((_, k) => {
            const w = document.getElementById(`stack-card-${k}`);
            if (w) w.style.transition = 'none';
        });
    }, { passive: true });

    stackArea.addEventListener('touchmove', e => {
        if (!isDragging || state.cards.length <= 1) return;
        e.preventDefault(); // block iOS rubber-band bounce
        currentDeltaY = e.touches[0].clientY - startY;
        const total = state.cards.length;

        state.cards.forEach((_, k) => {
            const diff = (k - state.stackIndex + total) % total;
            const base = getCardTransform(diff, total);
            const wrapper = document.getElementById(`stack-card-${k}`);
            if (!wrapper) return;

            // top card follows finger, others shift slightly in parallel
            let extraY = 0;
            if (diff === 0) {
                extraY = currentDeltaY * 0.85;
            } else if (diff === 1) {
                extraY = currentDeltaY > 0 ? 0 : Math.min(0, currentDeltaY * 0.4); // pulls card 1 up when swiping up
            } else if (diff === total - 1 && total > 2) {
                extraY = currentDeltaY < 0 ? 0 : Math.min(0, -currentDeltaY * 0.4); // pulls last card in when swiping down
            }

            wrapper.style.transform = `translateY(${base.y + extraY}px) scale(${base.scale})`;
            wrapper.style.opacity = `${base.opacity}`;
        });
    }, { passive: true });

    stackArea.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;

        if (Math.abs(currentDeltaY) > 55) {
            rotateStack(currentDeltaY > 0 ? -1 : 1);
        } else {
            applyStackStyles(false); // snap back
        }
    }, { passive: true });
}

// --- MANAGE VIEW ---
function renderManageView() {
    const listContainer = document.getElementById('manage-card-list');
    listContainer.innerHTML = '';

    if (state.cards.length === 0) {
        listContainer.innerHTML = `<div class="text-center text-slate-500 py-10">No cards stored yet.</div>`;
        return;
    }

    state.cards.forEach(card => {
        const wrapper = document.createElement('div');
        wrapper.className = 'cursor-pointer transition-transform hover:-translate-y-1 mb-6';
        wrapper.onclick = () => navigate('details', { id: card.id });
        wrapper.innerHTML = generateCardHTML(card, 'list');
        listContainer.appendChild(wrapper);
    });
}

// --- DETAILS VIEW ---
function renderDetailsView(id) {
    const card = state.cards.find(c => c.id === id);
    if (!card) { navigate('home'); return; }

    const container = document.getElementById('details-content');
    container.innerHTML = '';

    if (card.type === 'payment') {
        // Show full card with real number
        container.innerHTML = `<div class="mb-6">${generateCardHTML(card, 'details')}</div>`;

        const net = parseNetwork(card.number);
        // Build rows for copy actions — icon is either a material symbol name (string) or 'text:...' for plain text
        const rows = [];
        const netBadge = net ? net.name.substring(0,2).toUpperCase() : '#';
        if (card.number) rows.push({ label: 'Card Number', value: card.number, copyVal: card.number.replace(/\s/g, ''), iconType: 'text', icon: netBadge });
        if (card.expiry) rows.push({ label: 'Expiry', value: card.expiry, copyVal: card.expiry, iconType: 'symbol', icon: 'event' });
        if (card.cvv) rows.push({ label: 'CVV', value: '\u2022'.repeat(card.cvv.length), copyVal: card.cvv, iconType: 'symbol', icon: 'lock' });
        if (card.holderName) rows.push({ label: 'Card Holder', value: card.holderName, copyVal: card.holderName, iconType: 'symbol', icon: 'person' });

        if (rows.length > 0) {
            container.innerHTML += `<div class="space-y-3">
                <h3 class="text-slate-900 dark:text-slate-100 text-xs font-bold uppercase tracking-wider px-1 opacity-60">Tap to Copy</h3>
                ${rows.map(row => `
                    <div class="flex items-center gap-4 bg-white dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer active:scale-[0.98] transition-transform" onclick="copyToClipboard('${row.copyVal}','${row.label}')">
                        <div class="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 w-11 h-11 font-bold text-sm">
                            ${row.iconType === 'symbol'
                                ? `<span class="material-symbols-outlined text-xl">${row.icon}</span>`
                                : `<span style="font-size:11px;letter-spacing:-0.5px">${row.icon}</span>`
                            }
                        </div>
                        <div class="flex flex-col flex-1 min-w-0">
                            <p class="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase">${row.label}</p>
                            <p class="text-slate-900 dark:text-slate-100 font-bold truncate">${row.value}</p>
                        </div>
                        <span class="material-symbols-outlined text-slate-400 text-lg shrink-0">content_copy</span>
                    </div>`).join('')}
            </div>`;
        }
    } else {
        // ID: just show title + images, no card preview
        container.innerHTML = `
            <div class="space-y-4 pt-2">
                <h3 class="text-slate-900 dark:text-slate-100 text-lg font-bold text-center mb-6">${card.name}</h3>
                ${card.holderName ? `<p class="text-xs text-center text-slate-500 -mt-4 mb-4">${card.holderName}</p>` : ''}
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">Attached Images</h4>
                ${card.imageDataUrlFront ? `
                    <div class="rounded-xl overflow-hidden shadow-md relative">
                        <span class="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg backdrop-blur z-10 font-bold">Front</span>
                        <img src="${card.imageDataUrlFront}" class="w-full h-auto block" />
                    </div>
                    <button type="button" onclick="copyImage('front')" class="w-full h-11 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-base">content_copy</span> Copy Front Image
                    </button>` : `<p class="text-sm text-slate-400 text-center py-4">No front image uploaded.</p>`}
                ${card.imageDataUrlBack ? `
                    <div class="rounded-xl overflow-hidden shadow-md relative mt-4">
                        <span class="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg backdrop-blur z-10 font-bold">Back</span>
                        <img src="${card.imageDataUrlBack}" class="w-full h-auto block" />
                    </div>
                    <button type="button" onclick="copyImage('back')" class="w-full h-11 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-base">content_copy</span> Copy Back Image
                    </button>` : ''}
            </div>`;
    }

    container.innerHTML += `
        <div class="pt-6 space-y-3 mt-6 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onclick="navigate('edit',{id:'${card.id}'})" class="w-full h-12 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold">
                <span class="material-symbols-outlined text-xl">edit</span> Edit
            </button>
            <button type="button" onclick="promptDelete('${card.id}')" class="w-full h-12 flex items-center justify-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl font-bold">
                <span class="material-symbols-outlined text-xl">delete</span> Delete
            </button>
        </div>`;
}

// --- LONG PRESS utility ---
function addLongPress(el, onLongPress, ms = 650) {
    let timer = null;
    let overlay = null;

    // Apply permanent selection block to this element
    el.style.userSelect = 'none';
    el.style.webkitUserSelect = 'none';
    el.style.webkitTouchCallout = 'none';

    function cleanup() {
        if (timer) { clearTimeout(timer); timer = null; }
        if (overlay) { overlay.remove(); overlay = null; }
    }

    function start(e) {
        cleanup();
        // Semi-transparent overlay + centered spinner
        overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:absolute', 'inset:0', 'border-radius:inherit',
            'background:rgba(0,0,0,0.25)', 'display:flex',
            'align-items:center', 'justify-content:center',
            'pointer-events:none', 'z-index:99'
        ].join(';');

        // Small spinner circle
        const spin = document.createElement('div');
        spin.style.cssText = [
            'width:32px', 'height:32px', 'border-radius:50%',
            'border:3px solid rgba(255,255,255,0.3)',
            'border-top-color:#ef4444',
            `animation:lp-spin ${ms}ms linear forwards`
        ].join(';');
        overlay.appendChild(spin);

        if (getComputedStyle(el).position === 'static') {
            el.style.position = 'relative';
        }
        el.appendChild(overlay);

        timer = setTimeout(() => {
            cleanup();
            onLongPress(e);
        }, ms);
    }

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', cleanup, { passive: true });
    el.addEventListener('touchmove', cleanup, { passive: true });
    el.addEventListener('contextmenu', e => { e.preventDefault(); onLongPress(e); });
}

// --- EDIT VIEW ---
function renderEditView(id) {
    const isNew = id === 'new';
    document.getElementById('edit-view-title').innerText = isNew ? 'New Card' : 'Edit Card';
    let card = state.cards.find(c => c.id === id);

    if (!card && !isNew) { navigate('home'); return; }

    if (isNew) {
        state.editingType = 'payment';
        state.editingColor = { type: 'preset', value: COLOR_PRESETS[0] };
        card = { name: '', number: '', expiry: '', holderName: '', cvv: '' };
    } else {
        state.editingType = card.type || 'payment';
        state.editingColor = typeof card.colorClass === 'object'
            ? card.colorClass
            : { type: 'preset', value: card.colorClass || COLOR_PRESETS[0] };
    }

    // Lock type toggle when editing existing card
    const typeToggle = document.getElementById('type-toggle-container');
    if (typeToggle) {
        if (!isNew) {
            typeToggle.style.opacity = '0.4';
            typeToggle.style.pointerEvents = 'none';
        } else {
            typeToggle.style.opacity = '1';
            typeToggle.style.pointerEvents = 'auto';
        }
    }

    setCardType(state.editingType, card);
}

function updatePreview() {
    const previewContainer = document.getElementById('live-preview-container');
    if (!previewContainer) return;

    const tempCard = {
        type: state.editingType,
        colorClass: state.editingColor,
        name: document.getElementById('edit-name')?.value || (state.editingType === 'payment' ? 'My Card' : 'My Document'),
        holderName: document.getElementById('edit-holder')?.value || 'JOHN DOE',
    };

    if (state.editingType === 'payment') {
        tempCard.number = document.getElementById('edit-number')?.value || '';
        tempCard.expiry = document.getElementById('edit-expiry')?.value || '';
    } else {
        tempCard.imageDataUrlFront = document.getElementById('edit-image-front-data')?.value || null;
    }

    previewContainer.innerHTML = `<div style="width:85%;margin:0 auto">${generateCardHTML(tempCard, 'edit-preview')}</div>`;
}

function buildColorPicker() {
    let html = '';

    // Preset swatches
    COLOR_PRESETS.forEach(preset => {
        const isSelected = state.editingColor.type === 'preset' && state.editingColor.value === preset;
        html += `<button type="button" onclick="selectColor('preset','${preset}')" class="relative size-10 shrink-0 rounded-full hover:scale-110 transition-transform focus:outline-none ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}">
            <div class="w-full h-full rounded-full bg-gradient-to-br ${preset}"></div>
        </button>`;
    });

    // Saved custom colors with long-press to delete
    state.customColors.forEach((hex, i) => {
        const isSelected = state.editingColor.type === 'custom' && state.editingColor.value === hex;
        html += `<button type="button" id="custom-color-${i}" onclick="selectColor('custom','${hex}')" class="relative size-10 shrink-0 rounded-full hover:scale-110 transition-transform focus:outline-none ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}" style="background:linear-gradient(135deg,${hex},${adjustColor(hex,-45)})">
        </button>`;
    });

    // + custom color picker button
    html += `<label class="relative size-10 shrink-0 rounded-full cursor-pointer hover:scale-110 transition-transform flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-500 overflow-hidden">
        <span class="material-symbols-outlined absolute pointer-events-none" style="font-size:20px">add</span>
        <input type="color" value="#6366f1" class="w-20 h-20 opacity-0 cursor-pointer relative z-10" onchange="addCustomColor(this.value)" />
    </label>`;

    return html;
}

function setCardType(type, existingCardData = {}) {
    state.editingType = type;
    const btnPayment = document.getElementById('type-btn-payment');
    const btnId = document.getElementById('type-btn-id');
    const activeClass = 'flex-1 py-1.5 text-sm font-bold bg-white dark:bg-slate-700 shadow-sm rounded-lg transition-all text-primary dark:text-white';
    const inactiveClass = 'flex-1 py-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 rounded-lg transition-all';

    if (type === 'payment') {
        btnPayment.className = activeClass;
        btnId.className = inactiveClass;
    } else {
        btnId.className = activeClass;
        btnPayment.className = inactiveClass;
    }

    const formArea = document.getElementById('edit-form-content');
    const imgFront = existingCardData.imageDataUrlFront || '';
    const imgBack = existingCardData.imageDataUrlBack || '';

    let html = `
        <div class="overflow-x-auto pb-2 -mx-1 px-1">
            <div class="flex gap-3 items-center" id="color-picker-container">${buildColorPicker()}</div>
        </div>
        <div class="space-y-4">
            <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-500 uppercase">Title / Alias</label>
                <input id="edit-name" type="text" value="${existingCardData.name || ''}" placeholder="e.g. Travel Rewards" autocomplete="off" class="w-full px-4 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all" oninput="updatePreview()" />
            </div>
            <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-500 uppercase">Card Holder Name</label>
                <input id="edit-holder" type="text" value="${existingCardData.holderName || ''}" placeholder="e.g. JOHN DOE" autocomplete="off" class="w-full px-4 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none uppercase transition-all" oninput="updatePreview()" />
            </div>`;

    if (type === 'payment') {
        html += `
            <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-500 uppercase">Card Number</label>
                <input id="edit-number" type="text" inputmode="numeric" value="${existingCardData.number || ''}" placeholder="0000 0000 0000 0000" autocomplete="off" class="w-full px-4 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none font-mono transition-all" oninput="this.value=formatCardNumber(this.value);updatePreview()" />
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-bold text-slate-500 uppercase">Expiry</label>
                    <input id="edit-expiry" type="text" inputmode="numeric" value="${existingCardData.expiry || ''}" placeholder="MM/YY" autocomplete="off" class="w-full px-4 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all" oninput="this.value=formatExpiry(this.value);updatePreview()" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-bold text-slate-500 uppercase">CVV <span class="opacity-50 normal-case font-normal">(opt)</span></label>
                    <input id="edit-cvv" type="password" inputmode="numeric" value="${existingCardData.cvv || ''}" placeholder="•••" autocomplete="off" class="w-full px-4 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all" maxlength="4" />
                </div>
            </div>`;
    } else {
        html += `
            <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-bold text-slate-500 uppercase">Front</label>
                    <div class="relative w-full aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                        <input type="file" accept="image/*" onchange="handleImg(event,'front')" class="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <div id="prev-front" class="absolute inset-0">${imgFront ? `<img src="${imgFront}" class="w-full h-full object-cover"/>` : '<div class="flex h-full items-center justify-center text-slate-400"><span class="material-symbols-outlined">add_photo_alternate</span></div>'}</div>
                    </div>
                    <input type="hidden" id="edit-image-front-data" value="${imgFront}" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-bold text-slate-500 uppercase">Back <span class="opacity-50 normal-case font-normal">(opt)</span></label>
                    <div class="relative w-full aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                        <input type="file" accept="image/*" onchange="handleImg(event,'back')" class="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <div id="prev-back" class="absolute inset-0">${imgBack ? `<img src="${imgBack}" class="w-full h-full object-cover"/>` : '<div class="flex h-full items-center justify-center text-slate-400"><span class="material-symbols-outlined">add_photo_alternate</span></div>'}</div>
                    </div>
                    <input type="hidden" id="edit-image-back-data" value="${imgBack}" />
                </div>
            </div>`;
    }

    html += `</div>`;
    formArea.innerHTML = html;
    updatePreview();

    // Attach long-press to delete images in ID form
    if (type !== 'payment') {
        const frontWrap = document.querySelector('#prev-front')?.parentElement;
        const backWrap = document.querySelector('#prev-back')?.parentElement;
        if (frontWrap) {
            addLongPress(frontWrap, () => {
                const hasFront = !!document.getElementById('edit-image-front-data')?.value;
                if (!hasFront) return;
                openConfirmModal('Remove Front Image?', 'The front image will be deleted. If a back image exists it will become the front.', 'Remove', () => {
                    // Move back to front if exists
                    const backData = document.getElementById('edit-image-back-data')?.value;
                    if (backData) {
                        document.getElementById('edit-image-front-data').value = backData;
                        document.getElementById('edit-image-back-data').value = '';
                        document.getElementById('prev-front').innerHTML = `<img src="${backData}" class="w-full h-full object-cover"/>`;
                        document.getElementById('prev-back').innerHTML = '<div class="flex h-full items-center justify-center text-slate-400"><span class="material-symbols-outlined">add_photo_alternate</span></div>';
                    } else {
                        document.getElementById('edit-image-front-data').value = '';
                        document.getElementById('prev-front').innerHTML = '<div class="flex h-full items-center justify-center text-slate-400"><span class="material-symbols-outlined">add_photo_alternate</span></div>';
                    }
                    updatePreview();
                });
            });
        }
        if (backWrap) {
            addLongPress(backWrap, () => {
                const hasBack = !!document.getElementById('edit-image-back-data')?.value;
                if (!hasBack) return;
                openConfirmModal('Remove Back Image?', 'The back image will be permanently deleted from this card.', 'Remove', () => {
                    document.getElementById('edit-image-back-data').value = '';
                    document.getElementById('prev-back').innerHTML = '<div class="flex h-full items-center justify-center text-slate-400"><span class="material-symbols-outlined">add_photo_alternate</span></div>';
                });
            });
        }
    }
}

function selectColor(type, value) {
    state.editingColor = { type, value };
    refreshColorPicker();
    updatePreview();
}

function addCustomColor(hex) {
    // Add to saved custom colors if not already there
    if (!state.customColors.includes(hex)) {
        state.customColors.push(hex);
        if (state.customColors.length > 8) state.customColors.shift(); // keep max 8
        saveCustomColors();
    }
    selectColor('custom', hex);
}

function refreshColorPicker() {
    const container = document.getElementById('color-picker-container');
    if (!container) return;
    container.innerHTML = buildColorPicker();
    // Attach long-press listeners to custom color buttons
    state.customColors.forEach((hex, i) => {
        const btn = document.getElementById(`custom-color-${i}`);
        if (!btn) return;
        addLongPress(btn, () => {
            openConfirmModal(
                'Remove Color?',
                'This will remove the custom color from your palette.',
                'Remove',
                () => deleteCustomColor(hex)
            );
        });
    });
}

function deleteCustomColor(hex) {
    state.customColors = state.customColors.filter(c => c !== hex);
    if (state.editingColor.type === 'custom' && state.editingColor.value === hex) {
        state.editingColor = { type: 'preset', value: COLOR_PRESETS[0] };
    }
    saveCustomColors();
    refreshColorPicker();
    updatePreview();
}

function handleImg(e, side) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        document.getElementById(`edit-image-${side}-data`).value = ev.target.result;
        document.getElementById(`prev-${side}`).innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-cover" />`;
        if (side === 'front') updatePreview();
    };
    reader.readAsDataURL(file);
}

// --- SAVE ---
function saveCurrentCard() {
    const nameEl = document.getElementById('edit-name');
    if (!nameEl || !nameEl.value.trim()) {
        showToast('Please enter a title');
        return;
    }

    const payload = {
        id: state.currentCardId === 'new' ? generateId() : state.currentCardId,
        name: nameEl.value.trim(),
        holderName: (document.getElementById('edit-holder')?.value || '').trim(),
        type: state.editingType,
        colorClass: state.editingColor,
    };

    if (state.editingType === 'payment') {
        payload.number = (document.getElementById('edit-number')?.value || '').trim();
        payload.expiry = (document.getElementById('edit-expiry')?.value || '').trim();
        payload.cvv = (document.getElementById('edit-cvv')?.value || '').trim();
    } else {
        payload.imageDataUrlFront = document.getElementById('edit-image-front-data')?.value || '';
        payload.imageDataUrlBack = document.getElementById('edit-image-back-data')?.value || '';
    }

    if (state.currentCardId === 'new') {
        state.cards.unshift(payload);
        state.stackIndex = 0;
    } else {
        const idx = state.cards.findIndex(c => c.id === state.currentCardId);
        if (idx !== -1) state.cards[idx] = payload;
        else state.cards.unshift(payload);
    }

    saveCards();
    showToast('Saved ✓');
    navigate('home');
}

// --- MODAL ---
let deleteTargetId = null;

function promptDelete(id) {
    deleteTargetId = id;
    const modal = document.getElementById('delete-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
    deleteTargetId = null;
}

document.getElementById('confirm-delete-btn').onclick = () => {
    if (deleteTargetId) {
        state.cards = state.cards.filter(c => c.id !== deleteTargetId);
        saveCards();
        state.stackIndex = 0;
        closeDeleteModal();
        showToast('Card Deleted');
        navigate('home');
    }
};

// --- UTILITIES ---
function copyToClipboard(txt, title) {
    if (!txt) return;
    navigator.clipboard.writeText(txt).then(() => showToast(`${title} copied`));
}

// --- GENERIC CONFIRM MODAL ---
let confirmAction = null;

function openConfirmModal(title, msg, btn, onConfirm) {
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-msg').textContent = msg;
    document.getElementById('confirm-action-btn').textContent = btn || 'Remove';
    confirmAction = onConfirm;
    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
    confirmAction = null;
}

document.getElementById('confirm-action-btn').onclick = () => {
    if (confirmAction) confirmAction();
    closeConfirmModal();
};

// --- COPY IMAGE: lightbox fallback (no popups needed) ---
function copyImage(side) {
    const card = state.cards.find(c => c.id === state.currentCardId);
    if (!card) { showToast('Card not found'); return; }
    const str = side === 'front' ? card.imageDataUrlFront : card.imageDataUrlBack;
    if (!str) { showToast('No image'); return; }

    // Try native Clipboard API first (works in some browsers)
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        fetch(str)
            .then(r => r.blob())
            .then(blob => {
                const item = new ClipboardItem({ [blob.type]: blob });
                return navigator.clipboard.write([item]);
            })
            .then(() => showToast('Image copied \u2713'))
            .catch(() => openImageLightbox(str));
    } else {
        openImageLightbox(str);
    }
}

function openImageLightbox(src) {
    // Full-screen overlay so user can long-press → Save to Photos on iOS
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px';
    overlay.innerHTML = `
        <p style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">Long-press image to save</p>
        <img src="${src}" style="max-width:92vw;max-height:75vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.5)" />
        <button style="margin-top:8px;padding:12px 32px;background:rgba(255,255,255,0.15);color:white;border:none;border-radius:12px;font-size:14px;font-weight:700;letter-spacing:0.02em" onclick="this.parentElement.remove()">Close</button>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    showToast('Long-press image \u2192 Save to Photos');
}

function showToast(msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'w-full bg-slate-900 text-white rounded-xl px-4 py-3 shadow-xl transform transition-all duration-300 -translate-y-2 opacity-0 text-sm font-bold';
    toast.textContent = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.remove('-translate-y-2', 'opacity-0');
        });
    });
    setTimeout(() => {
        toast.classList.add('-translate-y-2', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 2200);
}

// --- GLOBAL EXPORTS ---
window.navigate = navigate;
window.setCardType = setCardType;
window.selectColor = selectColor;
window.addCustomColor = addCustomColor;
window.handleImg = handleImg;
window.updatePreview = updatePreview;
window.saveCurrentCard = saveCurrentCard;
window.promptDelete = promptDelete;
window.closeDeleteModal = closeDeleteModal;
window.closeConfirmModal = closeConfirmModal;
window.openConfirmModal = openConfirmModal;
window.deleteCustomColor = deleteCustomColor;
window.copyToClipboard = copyToClipboard;
window.copyImage = copyImage;
window.rotateStack = rotateStack;
window.formatCardNumber = formatCardNumber;
window.formatExpiry = formatExpiry;
