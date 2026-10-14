/**
 * Панель управления приютом «Хвостики»
 * Исправленная версия с поддержкой Localtunnel, мобильных устройств и защитой от падений API
 */

// Вспомогательные функции
function safeJSONParse(str, fallback = []) {
    try {
        if (!str) return fallback;
        const parsed = JSON.parse(str);
        return parsed !== null ? parsed : fallback;
    } catch (e) {
        return fallback;
    }
}

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    const safeStr = String(str);
    return safeStr.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

/**
 * Защищенный метод запросов к API, автоматически обходящий экраны-заглушки Localtunnel
 */
async function apiFetch(url, options = {}) {
    const headers = options.headers ? { ...options.headers } : {};
    
    // Обязательные заголовки для обхода защиты Localtunnel
    headers['bypass-tunnel-reminder'] = 'true';
    headers['x-requested-with'] = 'XMLHttpRequest';

    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        // Если Localtunnel вернул HTML-страницу заглушки вместо JSON
        throw new Error('Localtunnel returned non-JSON response');
    }

    return await response.json();
}

// Глобальное состояние
var customArticleCategories = safeJSONParse(localStorage.getItem('shelterArticleCategories'), []);
let currentPets = [];
let currentApps = [];
let currentNeeds = [];
let currentDeliveries = [];
let currentArticles = [];
let currentCategories = { types: [{ name: "собака", emoji: "🐕" }, { name: "кот", emoji: "🐈" }] };
let currentViewedApp = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
        showDashboard();
    }

    // Закрытие выпадающих списков при клике вне их области
    document.addEventListener('click', function(e) {
        const dropdowns = [
            'typeDropdown', 'genderDropdown', 'ageUnitDropdown', 'vaccinatedDropdown', 
            'appPetDropdown', 'appHousingDropdown', 'appSafetyDropdown', 'appExperienceDropdown', 
            'needCategoryDropdown', 'artCategoryDropdown'
        ];
        dropdowns.forEach(id => {
            const dropdown = document.getElementById(id);
            const btn = document.getElementById(id.replace('Dropdown', 'Btn'));
            if (dropdown && btn && !btn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    });
});

// Управление выпадающими списками
function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    if (!dropdown) return;
    const wasHidden = dropdown.classList.contains('hidden');
    
    const dropdowns = [
        'typeDropdown', 'genderDropdown', 'ageUnitDropdown', 'vaccinatedDropdown', 
        'appPetDropdown', 'appHousingDropdown', 'appSafetyDropdown', 'appExperienceDropdown', 
        'needCategoryDropdown', 'artCategoryDropdown'
    ];
    dropdowns.forEach(dId => {
        const el = document.getElementById(dId);
        if (el) el.classList.add('hidden');
    });

    if (wasHidden) {
        dropdown.classList.remove('hidden');
    }
}

function selectOption(hiddenInputId, value, text, dropdownId) {
    const input = document.getElementById(hiddenInputId);
    if (input) input.value = value;
    
    const labelId = hiddenInputId.replace('filter', '').replace('apply', '');
    const formattedId = labelId.charAt(0).toLowerCase() + labelId.slice(1);
    const label = document.getElementById(formattedId.replace('App', 'app') + 'Label') || document.getElementById(hiddenInputId + 'Label');
    if (label) label.innerText = text;

    const dropdown = document.getElementById(dropdownId);
    if (dropdown) dropdown.classList.add('hidden');
}

function selectPetTypeOption(value, text, emoji) {
    const pType = document.getElementById('petType');
    const pLabel = document.getElementById('petTypeLabel');
    const emojiInput = document.getElementById('petEmoji');

    if (pType) pType.value = value;
    if (pLabel) pLabel.innerText = text;
    if (emojiInput) emojiInput.value = emoji;

    const dropdown = document.getElementById('typeDropdown');
    if (dropdown) dropdown.classList.add('hidden');
}

function selectNeedCategory(val, text) {
    const needCat = document.getElementById('needCategory');
    const needLabel = document.getElementById('needCategoryLabel');
    if (needCat) needCat.value = val;
    if (needLabel) needLabel.innerText = text;

    const unitInput = document.getElementById('needUnit');
    if (unitInput) {
        if (val === 'money') {
            unitInput.value = '₽';
        } else if (unitInput.value === '₽') {
            unitInput.value = 'кг';
        }
    }

    const dropdown = document.getElementById('needCategoryDropdown');
    if (dropdown) dropdown.classList.add('hidden');
    toggleNeedCategoryFields();
}

function updateCustomSelect(id, value, labelText) {
    const input = document.getElementById(id);
    const label = document.getElementById(id + 'Label');
    if (input) input.value = value;
    if (label) label.innerText = labelText;
}

// АВТОРИЗАЦИЯ
function doLogin() {
    const passInput = document.getElementById('adminPass');
    const password = passInput ? passInput.value.trim() : '';

    if (password === "123" || password === "") {
        try { localStorage.setItem('adminToken', 'admin-session-token'); } catch(e){}
        showDashboard();
    } else {
        alert("Неверный пароль администратора! Введите: 123");
    }
}

function doGoogleLogin() {
    try { localStorage.setItem('adminToken', 'google-secure-token-123'); } catch(e){}
    showDashboard();
}

function logout() {
    try { localStorage.removeItem('adminToken'); } catch(e){}
    location.reload();
}

function showDashboard() {
    const loginSec = document.getElementById('loginSection');
    const dashSec = document.getElementById('dashboardSection');
    
    if (loginSec) {
        loginSec.classList.add('hidden');
        loginSec.style.display = 'none';
    }
    if (dashSec) {
        dashSec.classList.remove('hidden');
        dashSec.style.display = 'flex';
    }

    loadPets();
    loadApplications();
    loadCategories();
    loadNeeds();
    loadDeliveries();
    loadRequisites();
    loadAdminArticles();

    const chaptersBox = document.getElementById('chaptersContainer');
    if (chaptersBox && chaptersBox.children.length === 0) {
        addArticleChapterRow();
    }
}

// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
function switchTab(tabId) {
    const tabs = ['appsTab', 'needsTab', 'petsTab', 'formTab', 'settingsTab', 'articlesTab'];
    
    tabs.forEach(t => {
        const tabEl = document.getElementById(t);
        const btnEl = document.getElementById('btn-' + t);
        if (tabEl) tabEl.classList.add('hidden');
        if (btnEl) btnEl.className = "flex-1 min-w-[130px] py-4 text-center border-b-2 border-transparent text-gray-500 hover:text-brandBrown font-medium";
    });

    const activeTab = document.getElementById(tabId);
    const activeBtn = document.getElementById('btn-' + tabId);
    if (activeTab) activeTab.classList.remove('hidden');
    if (activeBtn) activeBtn.className = "flex-1 min-w-[130px] py-4 text-center border-b-2 border-brandYellow text-brandYellow font-medium";
}

// --- УПРАВЛЕНИЕ СБОРАМИ И НУЖДАМИ ---

function switchNeedsSubTab(subTabId) {
    const subTabs = ['subTab-needsList', 'subTab-needsDeliveries', 'subTab-needsRequisites'];
    subTabs.forEach(t => {
        const el = document.getElementById(t);
        const btn = document.getElementById('btn-' + t.replace('subTab-', 'sub-'));
        if (el) el.classList.add('hidden');
        if (btn) btn.className = "bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-5 rounded-xl transition flex items-center gap-1.5";
    });

    const activeEl = document.getElementById(subTabId);
    const activeBtn = document.getElementById('btn-' + subTabId.replace('subTab-', 'sub-'));
    if (activeEl) activeEl.classList.remove('hidden');
    if (activeBtn) activeBtn.className = "bg-[#F2A900] text-[#291D17] font-black py-2.5 px-5 rounded-xl shadow-sm transition flex items-center gap-1.5";
}

function toggleNeedForm(forceOpen) {
    const formBox = document.getElementById('needFormContainer');
    if (!formBox) return;

    if (forceOpen === true) {
        formBox.classList.remove('hidden');
    } else if (forceOpen === false) {
        formBox.classList.add('hidden');
    } else {
        formBox.classList.toggle('hidden');
    }
}

function toggleNeedCategoryFields() {
    const catEl = document.getElementById('needCategory');
    const priceBlock = document.getElementById('itemPriceFieldBlock');
    if (!catEl || !priceBlock) return;
    if (catEl.value === 'items') {
        priceBlock.classList.remove('hidden');
    } else {
        priceBlock.classList.add('hidden');
    }
}

function toggleUrgentPetField() {
    const isUrgent = document.getElementById('needIsUrgentPet').checked;
    const photoBlock = document.getElementById('urgentPetPhotoBlock');
    if (photoBlock) {
        if (isUrgent) {
            photoBlock.classList.remove('hidden');
        } else {
            photoBlock.classList.add('hidden');
        }
    }
}

async function loadNeeds() {
    try {
        currentNeeds = await apiFetch('/api/needs');
    } catch (e) {
        console.warn("API /api/needs unavailable, using storage");
        currentNeeds = safeJSONParse(localStorage.getItem('shelterNeeds'), []);
    }
    renderAdminNeeds();
}

function renderAdminNeeds() {
    const container = document.getElementById('adminNeedsList');
    if (!container) return;
    container.innerHTML = '';

    currentNeeds.forEach(need => {
        const displayCollected = Math.min(need.target, need.collected);
        const percent = Math.min(100, parseFloat(((displayCollected / need.target) * 100).toFixed(2)));

        const item = document.createElement('div');
        item.className = "p-4 border bg-gray-50 rounded-2xl flex flex-col justify-between";
        item.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-1">
                    <h5 class="font-bold text-gray-900">${escapeHTML(need.title)}</h5>
                    <div class="flex gap-1">
                        ${need.isUrgentPet ? '<span class="text-[9px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded">Экстренный</span>' : ''}
                        <span class="text-xs font-bold bg-brandYellow/10 text-brandYellow px-2 py-0.5 rounded">${percent}%</span>
                    </div>
                </div>
                <p class="text-[11px] text-gray-500 mb-2">${escapeHTML(need.description)}</p>
                <p class="text-xs font-semibold text-gray-700">Собрано: ${displayCollected} из ${need.target} ${need.unit} ${need.category === 'items' ? `(Цена: ${need.itemPrice} ₽)` : ''}</p>
            </div>
            <div class="flex gap-2 justify-end mt-4">
                <button type="button" onclick="editNeed('${need.id}')" class="text-xs bg-brandYellow/10 text-brandYellow font-bold px-3 py-1.5 rounded-lg hover:bg-brandYellow hover:text-white transition">Изм.</button>
                <button type="button" onclick="deleteNeed('${need.id}')" class="text-xs bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition">Удал.</button>
            </div>
        `;
        container.appendChild(item);
    });
}

async function handleNeedSubmit(event) {
    if (event) event.preventDefault();

    const editingId = document.getElementById('editingNeedId').value;
    const category = document.getElementById('needCategory').value;
    const itemPrice = category === 'items' ? parseFloat(document.getElementById('needItemPrice').value || 0) : 0;
    const collected = parseFloat(document.getElementById('needCollected').value || 0);
    const target = parseFloat(document.getElementById('needTarget').value || 0);
    const isUrgentPet = document.getElementById('needIsUrgentPet').checked;

    if (category === 'items' && itemPrice < 0) {
        alert("Ошибка: Стоимость 1 единицы не может быть отрицательной!");
        return;
    }
    if (collected < 0) {
        alert("Ошибка: Собранное количество не может быть отрицательным!");
        return;
    }
    if (isNaN(target) || target <= 0) {
        alert("Ошибка: Цель сбора должна быть строго больше нуля!");
        return;
    }

    const photoFileInput = document.getElementById('needPetPhotoFile');
    let petPhotoUrl = document.getElementById('needPetPhotoUrl').value;

    if (isUrgentPet && photoFileInput && photoFileInput.files.length > 0) {
        const file = photoFileInput.files[0];
        try {
            const formData = new FormData();
            formData.append('photo', file);
            const uploadResult = await apiFetch('/api/upload', { method: 'POST', body: formData });
            if (uploadResult.success) petPhotoUrl = uploadResult.filePath;
        } catch (err) {
            try {
                petPhotoUrl = await compressImage(file);
            } catch (readErr) {
                alert("Ошибка обработки фото.");
                return;
            }
        }
    }

    const needData = {
        title: document.getElementById('needTitle').value.trim(),
        category: category,
        unit: document.getElementById('needUnit').value.trim(),
        itemPrice: itemPrice,
        collected: collected,
        target: target,
        description: document.getElementById('needDesc').value.trim(),
        isUrgentPet: isUrgentPet,
        petPhoto: petPhotoUrl
    };

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/needs/${editingId}` : '/api/needs';

    try {
        await apiFetch(url, {
            method: method,
            body: JSON.stringify(needData)
        });
        alert("Сбор успешно сохранен!");
    } catch (e) {
        if (editingId) {
            const index = currentNeeds.findIndex(n => String(n.id) === String(editingId));
            if (index !== -1) currentNeeds[index] = { id: parseInt(editingId), ...needData };
        } else {
            currentNeeds.push({ id: Date.now(), ...needData });
        }
        localStorage.setItem('shelterNeeds', JSON.stringify(currentNeeds));
        alert("Сбор сохранен локально!");
    }
    resetNeedForm();
    loadNeeds();
}

function editNeed(id) {
    const need = currentNeeds.find(n => String(n.id) === String(id));
    if (!need) return;

    switchNeedsSubTab('subTab-needsList');
    toggleNeedForm(true);

    document.getElementById('editingNeedId').value = need.id;
    document.getElementById('needTitle').value = need.title;
    document.getElementById('needCategory').value = need.category;
    document.getElementById('needCategoryLabel').innerText = need.category === 'items' ? 'Сбор вещей / корма' : 'Денежный сбор (на карту)';
    document.getElementById('needUnit').value = need.unit;
    document.getElementById('needItemPrice').value = need.itemPrice || 0;
    document.getElementById('needCollected').value = need.collected;
    document.getElementById('needTarget').value = need.target;
    document.getElementById('needDesc').value = need.description;

    const urgentCheckbox = document.getElementById('needIsUrgentPet');
    if (urgentCheckbox) urgentCheckbox.checked = !!need.isUrgentPet;
    document.getElementById('needPetPhotoUrl').value = need.petPhoto || '';
    toggleUrgentPetField();

    toggleNeedCategoryFields();
    document.getElementById('needFormTitle').innerText = "Редактировать сбор";
    document.getElementById('needFormContainer').scrollIntoView({ behavior: 'smooth' });
}

function resetNeedForm() {
    document.getElementById('editingNeedId').value = '';
    document.getElementById('needTitle').value = '';
    document.getElementById('needCategory').value = 'items';
    document.getElementById('needCategoryLabel').innerText = 'Сбор вещей / корма';
    document.getElementById('needItemPrice').value = '';
    document.getElementById('needCollected').value = '';
    document.getElementById('needTarget').value = '';
    document.getElementById('needDesc').value = '';
    document.getElementById('needFormTitle').innerText = "Добавить новый сбор";
    
    const urgentCheckbox = document.getElementById('needIsUrgentPet');
    if (urgentCheckbox) urgentCheckbox.checked = false;
    document.getElementById('needPetPhotoUrl').value = '';
    const photoFileInput = document.getElementById('needPetPhotoFile');
    if (photoFileInput) photoFileInput.value = '';
    toggleUrgentPetField();

    toggleNeedCategoryFields();
}

async function deleteNeed(id) {
    if (!confirm("Удалить этот сбор?")) return;
    try {
        await apiFetch(`/api/needs/${id}`, { method: 'DELETE' });
    } catch (e) {
        currentNeeds = currentNeeds.filter(n => String(n.id) !== String(id));
        localStorage.setItem('shelterNeeds', JSON.stringify(currentNeeds));
    }
    loadNeeds();
}

// --- РЕКВИЗИТЫ ---

async function loadRequisites() {
    try {
        const data = await apiFetch('/api/requisites');
        populateRequisitesInputs(data);
    } catch (e) {
        const localData = safeJSONParse(localStorage.getItem('shelterRequisites'), {
            card: "4276 3800 1234 5678",
            phone: "+7 (999) 000-00-00",
            qrImage: ""
        });
        populateRequisitesInputs(localData);
    }
}

function populateRequisitesInputs(data) {
    if (!data) return;
    const cardEl = document.getElementById('reqCardInput');
    const phoneEl = document.getElementById('reqPhoneInput');
    const pathEl = document.getElementById('reqQrPath');
    const hintEl = document.getElementById('reqQrCurrentHint');

    if (cardEl) cardEl.value = data.card || '';
    if (phoneEl) phoneEl.value = data.phone || '';
    if (pathEl) pathEl.value = data.qrImage || '';
    if (hintEl && data.qrImage) {
        hintEl.innerHTML = `<span class="text-green-600 font-bold">QR-код загружен.</span> Выберите новый файл для замены.`;
    }
}

async function handleRequisitesSubmit(event) {
    if (event) event.preventDefault();

    const qrFileInput = document.getElementById('reqQrFileInput');
    let qrPath = document.getElementById('reqQrPath').value;

    if (qrFileInput && qrFileInput.files.length > 0) {
        const file = qrFileInput.files[0];
        try {
            const formData = new FormData();
            formData.append('photo', file);
            const uploadResult = await apiFetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            if (uploadResult.success) {
                qrPath = uploadResult.filePath;
            }
        } catch (err) {
            try {
                qrPath = await compressImage(file, 400, 0.9);
            } catch (readErr) {
                alert("Ошибка обработки QR-кода.");
                return;
            }
        }
    }

    const reqData = {
        card: document.getElementById('reqCardInput').value.trim(),
        phone: document.getElementById('reqPhoneInput').value.trim(),
        qrImage: qrPath
    };

    try {
        await apiFetch('/api/requisites', {
            method: 'PUT',
            body: JSON.stringify(reqData)
        });
        alert("Реквизиты успешно сохранены на сервере!");
    } catch (e) {
        localStorage.setItem('shelterRequisites', JSON.stringify(reqData));
        alert("Реквизиты сохранены локально!");
    }

    document.getElementById('reqQrPath').value = qrPath;
}

// --- ДОСТАВКИ ВЕЩЕЙ ---

async function loadDeliveries() {
    try {
        currentDeliveries = await apiFetch('/api/needs/deliveries');
    } catch (e) {
        currentDeliveries = safeJSONParse(localStorage.getItem('shelterItemApplications'), []);
    }
    renderAdminDeliveries();
}

function renderAdminDeliveries() {
    const body = document.getElementById('adminDeliveriesTableBody');
    const badge = document.getElementById('adminPendingDelivBadge');
    if (!body) return;
    body.innerHTML = '';

    const pendingCount = currentDeliveries.filter(d => d.status !== 'confirmed').length;
    if (badge) badge.innerText = pendingCount;

    if (currentDeliveries.length === 0) {
        body.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-gray-400">Нет заявок на доставку вещей.</td></tr>`;
        return;
    }

    currentDeliveries.slice().reverse().forEach(deliv => {
        const isConfirmed = deliv.status === 'confirmed';
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-100 hover:bg-gray-50 transition";
        tr.innerHTML = `
            <td class="p-3 text-gray-500 whitespace-nowrap">${escapeHTML(deliv.date)}</td>
            <td class="p-3 font-bold text-gray-900 max-w-[120px] truncate" title="${escapeHTML(deliv.needTitle)}">${escapeHTML(deliv.needTitle)}</td>
            <td class="p-3 font-semibold max-w-[100px] truncate" title="${escapeHTML(deliv.userName)}">${escapeHTML(deliv.userName)}</td>
            <td class="p-3 text-gray-700 whitespace-nowrap">${escapeHTML(deliv.userPhone)}</td>
            <td class="p-3 font-bold text-brandYellow whitespace-nowrap">${deliv.quantity} ${escapeHTML(deliv.unit)}</td>
            <td class="p-3 font-medium text-gray-600 max-w-[110px] truncate" title="${escapeHTML(deliv.dateTime)}">${escapeHTML(deliv.dateTime)}</td>
            <td class="p-3 text-gray-500 max-w-[120px] truncate" title="${escapeHTML(deliv.note || '')}">
                ${escapeHTML(deliv.note || '—')}
            </td>
            <td class="p-3 whitespace-nowrap">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isConfirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                    ${isConfirmed ? 'Привезено' : 'Ожидается'}
                </span>
            </td>
            <td class="p-3 whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                    <button type="button" onclick="viewDeliveryDetails('${deliv.id}')" class="bg-brandYellow/10 text-brandYellow hover:bg-brandYellow hover:text-white px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm">
                        Открыть
                    </button>
                    ${!isConfirmed ? `
                        <button type="button" onclick="confirmDelivery('${deliv.id}')" class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-sm transition">
                            Принять
                        </button>
                    ` : ''}
                    <button type="button" onclick="deleteDelivery('${deliv.id}')" class="text-red-500 hover:text-red-700 font-bold text-xs p-1">
                        ✕
                    </button>
                </div>
            </td>
        `;
        body.appendChild(tr);
    });
}

function viewDeliveryDetails(id) {
    const deliv = currentDeliveries.find(d => String(d.id) === String(id));
    if (!deliv) return;

    document.getElementById('delivModalDate').innerText = deliv.date || '';
    document.getElementById('delivModalNeedTitle').innerText = deliv.needTitle || '';
    document.getElementById('delivModalUserName').innerText = deliv.userName || '';
    document.getElementById('delivModalUserPhone').innerText = deliv.userPhone || '';
    document.getElementById('delivModalQuantity').innerText = `${deliv.quantity} ${deliv.unit}`;
    document.getElementById('delivModalDateTime').innerText = deliv.dateTime || '';
    document.getElementById('delivModalNote').innerText = deliv.note || 'Примечание не указано';

    const modal = document.getElementById('deliveryDetailsModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

function closeDeliveryDetailsModal() {
    const modal = document.getElementById('deliveryDetailsModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

async function confirmDelivery(id) {
    if (!confirm("Подтвердить получение вещей? Шкала сбора будет пополнена.")) return;

    try {
        await apiFetch(`/api/needs/deliveries/${id}/confirm`, { method: 'PUT' });
        alert("Привоз подтвержден! Шкала сбора пополнена.");
    } catch (e) {
        const item = currentDeliveries.find(d => String(d.id) === String(id));
        if (item && item.status !== 'confirmed') {
            item.status = 'confirmed';
            localStorage.setItem('shelterItemApplications', JSON.stringify(currentDeliveries));

            const need = currentNeeds.find(n => String(n.id) === String(item.needId));
            if (need) {
                need.collected += parseFloat(item.quantity);
                localStorage.setItem('shelterNeeds', JSON.stringify(currentNeeds));
            }
        }
        alert("Привоз подтвержден локально!");
    }
    loadDeliveries();
    loadNeeds();
}

async function deleteDelivery(id) {
    if (!confirm("Удалить эту заявку?")) return;
    try {
        await apiFetch(`/api/needs/deliveries/${id}`, { method: 'DELETE' });
    } catch (e) {
        currentDeliveries = currentDeliveries.filter(d => String(d.id) !== String(id));
        localStorage.setItem('shelterItemApplications', JSON.stringify(currentDeliveries));
    }
    loadDeliveries();
}

// --- УПРАВЛЕНИЕ КАТЕГОРИЯМИ ---

function populateArticleCategoriesSelect() {
    const container = document.getElementById('artCategoryDropdown');
    const tagsContainer = document.getElementById('customArtCategoriesTags');

    if (container) {
        container.innerHTML = '';

        const defaultCats = [
            { id: 'cat', name: 'Для кошек и котят' },
            { id: 'dog', name: 'Для собак и щенков' },
            { id: 'all', name: 'Все виды / Общие советы' }
        ];

        defaultCats.forEach(c => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = "w-full text-left px-4 py-2 hover:bg-gray-50 transition text-xs font-semibold text-gray-700";
            btn.innerText = c.name;
            btn.onclick = () => selectOption('artCategory', c.id, c.name, 'artCategoryDropdown');
            container.appendChild(btn);
        });

        customArticleCategories.forEach(catName => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = "w-full text-left px-4 py-2 hover:bg-gray-50 transition text-xs font-semibold text-gray-700 capitalize";
            btn.innerText = `Для ${catName}`;
            btn.onclick = () => selectOption('artCategory', catName, `Для ${catName}`, 'artCategoryDropdown');
            container.appendChild(btn);
        });
    }

    if (tagsContainer) {
        tagsContainer.innerHTML = '';
        customArticleCategories.forEach(catName => {
            const tag = document.createElement('span');
            tag.className = "inline-flex items-center gap-1.5 bg-amber-100/90 text-brandBrown border border-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-lg capitalize shadow-sm";
            tag.innerHTML = `
                <span>Для ${escapeHTML(catName)}</span>
                <button type="button" onclick="deleteArticleCategory('${escapeHTML(catName)}')" class="text-red-500 hover:text-red-700 font-black hover:scale-125 transition ml-0.5" title="Удалить этот вид статьи">✕</button>
            `;
            tagsContainer.appendChild(tag);
        });
    }
}

async function loadCategories() {
    try {
        currentCategories = await apiFetch('/api/categories');
    } catch (e) {
        currentCategories = safeJSONParse(localStorage.getItem('shelterCategories'), { types: [{ name: "собака", emoji: "🐕" }, { name: "кот", emoji: "🐈" }] });
    }
    renderCategoryManagement();
    renderPetFormDropdowns();
    populateArticleCategoriesSelect();
}

function renderCategoryManagement() {
    const container = document.getElementById('categoryList');
    if (!container) return;
    container.innerHTML = '';

    currentCategories.types.forEach(type => {
        const item = document.createElement('div');
        item.className = "flex items-center justify-between p-3 border bg-gray-50 rounded-xl text-sm";
        item.innerHTML = `
            <span class="font-semibold text-gray-700 capitalize">${type.emoji || '🐾'} ${escapeHTML(type.name)}</span>
            <button type="button" onclick="handleDeleteCategory('${escapeHTML(type.name)}')" class="bg-red-100 text-red-600 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">
                Удалить
            </button>
        `;
        container.appendChild(item);
    });
}

function renderPetFormDropdowns() {
    const container = document.getElementById('typeDropdown');
    if (!container) return;
    container.innerHTML = '';
    
    currentCategories.types.forEach(type => {
        const capitalizedType = type.name.charAt(0).toUpperCase() + type.name.slice(1);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = "w-full text-left px-4 py-2.5 hover:bg-gray-50 transition text-sm capitalize font-semibold text-gray-700";
        button.innerText = `${type.emoji || '🐾'} ${capitalizedType}`;
        button.onclick = () => selectPetTypeOption(type.name, capitalizedType, type.emoji || '🐾');
        container.appendChild(button);
    });
}

async function handleAddCategory() {
    const input = document.getElementById('newCategoryInput');
    const emojiInput = document.getElementById('newCategoryEmojiInput');
    const newType = input.value.trim().toLowerCase();
    const newEmoji = emojiInput.value.trim() || '🐾';

    if (!newType) {
        alert("Название вида обязательно!");
        return;
    }

    try {
        const result = await apiFetch('/api/categories/types', {
            method: 'POST',
            body: JSON.stringify({ newType, newEmoji })
        });
        currentCategories = result.categories;
        alert(`Вид "${newType}" успешно добавлен!`);
    } catch (e) {
        const exists = currentCategories.types.some(t => t.name === newType);
        if (!exists) {
            currentCategories.types.push({ name: newType, emoji: newEmoji });
            localStorage.setItem('shelterCategories', JSON.stringify(currentCategories));
            alert(`Вид "${newType}" успешно добавлен локально!`);
        } else {
            alert("Этот вид уже есть в системе!");
        }
    }
    renderCategoryManagement();
    renderPetFormDropdowns();
    populateArticleCategoriesSelect();
    input.value = '';
    emojiInput.value = '';
}

async function handleDeleteCategory(typeToDelete) {
    if (!confirm(`Вы уверены, что хотите удалить вид "${typeToDelete}"?`)) return;

    try {
        const result = await apiFetch('/api/categories/types', {
            method: 'DELETE',
            body: JSON.stringify({ typeToDelete })
        });
        currentCategories = result.categories;
        alert(`Вид "${typeToDelete}" удален.`);
    } catch (e) {
        // Корректная фильтрация по свойству .name
        currentCategories.types = currentCategories.types.filter(t => (t.name || t) !== typeToDelete);
        localStorage.setItem('shelterCategories', JSON.stringify(currentCategories));
        alert(`Вид "${typeToDelete}" удален локально.`);
    }
    renderCategoryManagement();
    renderPetFormDropdowns();
    populateArticleCategoriesSelect();
}

function addNewArticleCategory() {
    const input = document.getElementById('newArtCatInput');
    if (!input) return;
    const val = input.value.trim().toLowerCase();

    if (!val) {
        alert("Пожалуйста, введите название вида животного!");
        return;
    }

    const isDuplicate = customArticleCategories.some(c => c.toLowerCase() === val) || 
                        ['cat', 'dog', 'all', 'кошка', 'собака', 'кошки', 'собаки', 'кот'].includes(val);

    if (isDuplicate) {
        alert("Такой вид статьи уже существует в списке!");
        return;
    }

    customArticleCategories.push(val);
    localStorage.setItem('shelterArticleCategories', JSON.stringify(customArticleCategories));
    
    populateArticleCategoriesSelect();
    selectOption('artCategory', val, `Для ${val}`, 'artCategoryDropdown');
    input.value = '';
    alert(`Вид статьи "Для ${val}" успешно добавлен!`);
}

function deleteArticleCategory(catName) {
    if (!confirm(`Удалить вид статьи "Для ${catName}" из списка выбора?`)) return;

    customArticleCategories = customArticleCategories.filter(c => c.toLowerCase() !== catName.toLowerCase());
    localStorage.setItem('shelterArticleCategories', JSON.stringify(customArticleCategories));

    const currentSelected = document.getElementById('artCategory')?.value;
    if (currentSelected === catName) {
        selectOption('artCategory', 'cat', 'Для кошек и котят', 'artCategoryDropdown');
    }

    populateArticleCategoriesSelect();
}

// --- ПИТОМЦЫ ---

async function loadPets() {
    try {
        currentPets = await apiFetch('/api/pets');
    } catch (err) {
        currentPets = safeJSONParse(localStorage.getItem('shelterPets'), []);
    }

    currentPets = currentPets.map(pet => {
        if (pet.type === 'dog') pet.type = 'собака';
        if (pet.type === 'cat') pet.type = 'кот';
        return pet;
    });

    renderPets();
    populateAppPetFilter();
}

function renderPets() {
    const container = document.getElementById('petsList');
    if (!container) return;
    container.innerHTML = '';

    const validPets = currentPets.filter(pet => pet && pet.name);

    if (validPets.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-xs py-4 col-span-2 text-center">Питомцев в базе пока нет.</p>`;
        return;
    }

    validPets.forEach(pet => {
        const isAdopted = pet.status === 'adopted';
        const item = document.createElement('div');
        item.className = `flex items-center justify-between p-3 border rounded-xl min-w-0 gap-4 ${isAdopted ? 'bg-emerald-50/50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`;
        
        item.innerHTML = `
            <div class="flex items-center gap-3 min-w-0 flex-1">
                <img src="${pet.photo || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=200'}" alt="Фото" class="w-12 h-12 rounded-lg object-cover bg-gray-200 shrink-0">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <h5 class="font-bold text-gray-900 truncate break-all">${escapeHTML(pet.name)} ${escapeHTML(pet.emoji || '')}</h5>
                        ${isAdopted ? '<span class="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">ДОМА!</span>' : ''}
                    </div>
                    <p class="text-[10px] text-gray-400 truncate">${escapeHTML(pet.ageValue)} ${escapeHTML(pet.ageUnit)} • ${pet.gender === 'male' ? 'Мальчик' : 'Девочка'}</p>
                </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
                <button type="button" onclick="togglePetHomeStatus('${pet.id}')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1 ${isAdopted ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-emerald-600 text-white hover:bg-emerald-700'}" title="${isAdopted ? 'Вернуть в поиск семьи' : 'Питомец усыновлен!'}">
                    <span>🏠</span> ${isAdopted ? 'В поиск' : 'Домой!'}
                </button>
                <button type="button" onclick="editPet('${pet.id}')" class="bg-brandYellow/10 text-brandYellow px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-brandYellow hover:text-white transition">Изм.</button>
                <button type="button" onclick="deletePet('${pet.id}')" class="bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-500 hover:text-white transition">✕</button>
            </div>
        `;
        container.appendChild(item);
    });
}

async function togglePetHomeStatus(id) {
    const pet = currentPets.find(p => String(p.id) === String(id));
    if (!pet) return;

    const newStatus = pet.status === 'adopted' ? 'looking' : 'adopted';
    pet.status = newStatus;

    try {
        await apiFetch(`/api/pets/${pet.id}`, {
            method: 'PUT',
            body: JSON.stringify(pet)
        });
    } catch (e) {
        localStorage.setItem('shelterPets', JSON.stringify(currentPets));
    }

    renderPets();
}

// --- АНКЕТЫ ---

async function loadApplications() {
    try {
        currentApps = await apiFetch('/api/applications');
    } catch (err) {
        currentApps = safeJSONParse(localStorage.getItem('shelterApplications'), []);
    }
    renderApplications();
}

function renderApplications() {
    const body = document.getElementById('appsTableBody');
    if (!body) return;
    body.innerHTML = '';

    const petFilter = document.getElementById('filterAppPet')?.value || 'all';
    const housingFilter = document.getElementById('filterAppHousing')?.value || 'all';
    const safetyFilter = document.getElementById('filterAppSafety')?.value || 'all';
    const experienceFilter = document.getElementById('filterAppExperience')?.value || 'all';

    let filteredApps = currentApps;

    if (petFilter !== 'all') filteredApps = filteredApps.filter(app => app.petName === petFilter);
    if (housingFilter !== 'all') filteredApps = filteredApps.filter(app => app.housing === housingFilter);
    if (safetyFilter !== 'all') filteredApps = filteredApps.filter(app => app.safety === safetyFilter);
    if (experienceFilter !== 'all') filteredApps = filteredApps.filter(app => app.experience === experienceFilter);

    if (filteredApps.length === 0) {
        body.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-400 font-medium">Заявок с такими параметрами не найдено.</td></tr>`;
        return;
    }

    filteredApps.slice().reverse().forEach(app => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-100 hover:bg-gray-50 transition";
        tr.innerHTML = `
            <td class="p-3 text-gray-500 font-medium">${escapeHTML(app.date)}</td>
            <td class="p-3 font-bold text-brandYellow">${escapeHTML(app.petName)}</td>
            <td class="p-3 font-semibold text-gray-900 max-w-[150px] truncate">${escapeHTML(app.userName)}</td>
            <td class="p-3 text-gray-700">${escapeHTML(app.userPhone)}</td>
            <td class="p-3 text-gray-500 max-w-xs truncate">${escapeHTML(app.message)}</td>
            <td class="p-3">
                <div class="flex items-center gap-2">
                    <button type="button" onclick="viewFullMessage('${app.id}')" class="bg-brandYellow/10 text-brandYellow hover:bg-brandYellow hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm">
                        Открыть
                    </button>
                    <button type="button" onclick="deleteApp('${app.id}')" class="bg-red-100 hover:bg-red-500 text-red-600 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition">
                        Удалить
                    </button>
                </div>
            </td>
        `;
        body.appendChild(tr);
    });
}

function updateAppFilters() {
    renderApplications();
}

function populateAppPetFilter() {
    const container = document.getElementById('appPetDropdown');
    if (!container) return;
    container.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = "w-full text-left px-4 py-2 hover:bg-gray-50 transition text-gray-700 font-semibold text-xs";
    allBtn.innerText = "Все питомцы";
    allBtn.onclick = () => {
        selectOption('filterAppPet', 'all', 'Все питомцы', 'appPetDropdown');
        updateAppFilters();
    };
    container.appendChild(allBtn);

    const petNames = [...new Set(currentPets.map(p => p.name))];
    petNames.sort((a, b) => a.localeCompare(b, 'ru'));

    petNames.forEach(name => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = "w-full text-left px-4 py-2 hover:bg-gray-50 transition text-gray-700 font-semibold text-xs";
        button.innerText = name;
        button.onclick = () => {
            selectOption('filterAppPet', name, name, 'appPetDropdown');
            updateAppFilters();
        };
        container.appendChild(button);
    });
}

function viewFullMessage(id) {
    const app = currentApps.find(a => String(a.id) === String(id));
    if (!app) return;
    currentViewedApp = app;

    document.getElementById('viewAppDate').innerText = app.date || '';
    document.getElementById('viewAppPet').innerText = app.petName || '';
    document.getElementById('viewAppName').innerText = app.userName || '';
    document.getElementById('viewAppPhone').innerText = app.userPhone || '';
    
    document.getElementById('viewAppHousing').innerText = app.housing || "Не указано";
    document.getElementById('viewAppSafety').innerText = app.safety || "Не указано";
    document.getElementById('viewAppExperience').innerText = app.experience || "Не указано";
    document.getElementById('viewAppMessage').innerText = app.message || '';

    const modal = document.getElementById('appDetailsModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

function closeAppDetailsModal() {
    const modal = document.getElementById('appDetailsModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

async function approveAdoptionFromModal() {
    if (!currentViewedApp) return;
    const targetPet = currentPets.find(p => p.name.toLowerCase().trim() === currentViewedApp.petName.toLowerCase().trim());
    
    if (!targetPet) {
        alert(`Питомец с кличкой "${currentViewedApp.petName}" не найден.`);
        return;
    }
    if (targetPet.status === 'adopted') {
        alert(`Этот питомец уже отмечен как нашедший дом!`);
        return;
    }
    if (!confirm(`Одобрить усыновление для заявителя ${currentViewedApp.userName}?`)) return;

    targetPet.status = 'adopted';

    try {
        await apiFetch(`/api/pets/${targetPet.id}`, {
            method: 'PUT',
            body: JSON.stringify(targetPet)
        });
    } catch (e) {
        localStorage.setItem('shelterPets', JSON.stringify(currentPets));
    }

    renderPets();
    closeAppDetailsModal();
    alert(`Поздравляем! Питомец "${targetPet.name}" успешно усыновлен!`);
}

async function deleteApp(id) {
    if (!confirm("Удалить эту анкету усыновителя?")) return;
    
    try {
        await apiFetch(`/api/applications/${id}`, { method: 'DELETE' });
        await loadApplications();
    } catch (err) {
        currentApps = currentApps.filter(app => String(app.id) !== String(id));
        localStorage.setItem('shelterApplications', JSON.stringify(currentApps));
        renderApplications();
    }
}

async function deletePet(id) {
    if (!confirm("Вы уверены, что хотите удалить питомца?")) return;
    try {
        await apiFetch(`/api/pets/${id}`, { method: 'DELETE' });
    } catch (err) {
        currentPets = currentPets.filter(p => String(p.id) !== String(id));
        localStorage.setItem('shelterPets', JSON.stringify(currentPets));
    }
    loadPets();
}

function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = err => reject(err);
        };
        reader.onerror = err => reject(err);
    });
}

async function handlePetSubmit(event) {
    if (event) event.preventDefault();

    const ageValue = parseInt(document.getElementById('petAgeValue').value);
    const weight = parseFloat(document.getElementById('petWeight').value);

    if (isNaN(ageValue) || ageValue <= 0) {
        alert("Ошибка: Возраст должен быть больше нуля!");
        return;
    }
    if (isNaN(weight) || weight <= 0) {
        alert("Ошибка: Вес должен быть больше нуля!");
        return;
    }

    const photoFileInput = document.getElementById('petPhotoFile');
    let photoUrl = document.getElementById('petPhotoUrl').value;

    if (photoFileInput && photoFileInput.files && photoFileInput.files.length > 0) {
        const file = photoFileInput.files[0];
        try {
            const formData = new FormData();
            formData.append('photo', file);
            const uploadResult = await apiFetch('/api/upload', { method: 'POST', body: formData });
            if (uploadResult.success) photoUrl = uploadResult.filePath;
        } catch (err) {
            try {
                photoUrl = await compressImage(file);
            } catch (readErr) {
                alert("Ошибка при оптимизации файла.");
                return;
            }
        }
    }

    if (!photoUrl) {
        alert("Пожалуйста, загрузите фотографию для питомца");
        return;
    }

    const editingId = document.getElementById('editingId').value;
    const petTypeVal = document.getElementById('petType').value || 'собака';

    const petData = {
        name: document.getElementById('petName').value.trim(),
        type: petTypeVal,
        gender: document.getElementById('petGender').value,
        ageValue: ageValue,
        ageUnit: document.getElementById('petAgeUnit').value,
        weight: weight,
        vaccinated: document.getElementById('petVaccinated').value,
        friendliness: document.getElementById('petFriendliness').value.trim(),
        character: document.getElementById('petCharacter').value.trim(),
        photo: photoUrl,
        emoji: document.getElementById('petEmoji').value.trim() || '🐾'
    };

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/pets/${editingId}` : '/api/pets';

    try {
        await apiFetch(url, {
            method: method,
            body: JSON.stringify(petData)
        });
        alert("Данные сохранены на сервере!");
    } catch (serverErr) {
        let localPets = safeJSONParse(localStorage.getItem('shelterPets'), []);
        if (editingId) {
            const index = localPets.findIndex(p => String(p.id) === String(editingId));
            if (index !== -1) localPets[index] = { id: parseInt(editingId), ...petData };
        } else {
            localPets.push({ id: Date.now(), ...petData });
        }
        localStorage.setItem('shelterPets', JSON.stringify(localPets));
        alert("Сохранено локально в память браузера!");
    }
    resetForm();
    loadPets();
    switchTab('petsTab');
}

function editPet(id) {
    const pet = currentPets.find(p => String(p.id) === String(id));
    if (!pet) return;

    document.getElementById('editingId').value = pet.id;
    document.getElementById('petName').value = pet.name;
    document.getElementById('petAgeValue').value = pet.ageValue;
    document.getElementById('petWeight').value = pet.weight;
    document.getElementById('petFriendliness').value = pet.friendliness;
    document.getElementById('petCharacter').value = pet.character;
    document.getElementById('petPhotoUrl').value = pet.photo;
    document.getElementById('petEmoji').value = pet.emoji || '';

    const petTypeName = pet.type ? pet.type.toLowerCase().trim() : '';
    const foundCategory = currentCategories.types.find(t => t.name.toLowerCase().trim() === petTypeName);
    const typeLabel = foundCategory 
        ? (foundCategory.name.charAt(0).toUpperCase() + foundCategory.name.slice(1))
        : (petTypeName ? (petTypeName.charAt(0).toUpperCase() + petTypeName.slice(1)) : 'Выберите вид...');

    updateCustomSelect('petType', pet.type, typeLabel);
    updateCustomSelect('petGender', pet.gender, pet.gender === 'male' ? 'Мальчик' : 'Девочка');
    updateCustomSelect('petAgeUnit', pet.ageUnit, pet.ageUnit);
    updateCustomSelect('petVaccinated', pet.vaccinated, pet.vaccinated === 'yes' ? 'Да' : 'Нет');

    document.getElementById('formTitle').innerText = "Изменение карточки питомца";
    switchTab('formTab');
}

function resetForm() {
    document.getElementById('editingId').value = '';
    document.getElementById('formTitle').innerText = "Добавить нового питомца";
    document.getElementById('petName').value = '';
    document.getElementById('petAgeValue').value = '';
    document.getElementById('petWeight').value = '';
    document.getElementById('petFriendliness').value = '';
    document.getElementById('petCharacter').value = '';
    document.getElementById('petPhotoFile').value = '';
    document.getElementById('petPhotoUrl').value = '';
    document.getElementById('petEmoji').value = '';

    updateCustomSelect('petType', 'собака', 'Собака');
    updateCustomSelect('petGender', 'male', 'Мальчик');
    updateCustomSelect('petAgeUnit', 'мес.', 'мес.');
    updateCustomSelect('petVaccinated', 'yes', 'Да');
}

// --- УПРАВЛЕНИЕ СТАТЬЯМИ В АДМИНКЕ ---

async function loadAdminArticles() {
    try {
        currentArticles = await apiFetch('/api/articles');
    } catch (e) {
        currentArticles = safeJSONParse(localStorage.getItem('shelterArticles'), []);
    }
    renderAdminArticles();
    populateArticleCategoriesSelect();
}

function renderAdminArticles() {
    const container = document.getElementById('adminArticlesList');
    if (!container) return;
    container.innerHTML = '';

    if (currentArticles.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-xs text-center py-4">Опубликованных статей пока нет.</p>`;
        return;
    }

    currentArticles.forEach(art => {
        const item = document.createElement('div');
        item.className = "flex items-center justify-between p-3 border bg-gray-50 rounded-xl text-xs";
        item.innerHTML = `
            <div class="flex items-center gap-3 min-w-0 flex-1">
                <img src="${art.photo || 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=200'}" class="w-12 h-12 rounded-lg object-cover shrink-0">
                <div class="min-w-0 flex-1">
                    <h5 class="font-bold text-gray-900 truncate">${escapeHTML(art.title)}</h5>
                    <span class="text-gray-400 text-[10px]">Глав: ${art.chapters ? art.chapters.length : 0} • Вид: ${escapeHTML(art.category)}</span>
                </div>
            </div>
            <div class="flex items-center gap-1.5 ml-2">
                <button type="button" onclick="editArticle('${art.id}')" class="bg-[#F2A900]/15 hover:bg-[#F2A900] text-[#291D17] px-2.5 py-1 rounded-lg font-black transition">
                    Изм.
                </button>
                <button type="button" onclick="deleteArticle('${art.id}')" class="text-red-500 font-bold hover:text-red-700 px-2 py-1">
                    ✕
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

function addArticleChapterRow(title = '', text = '', photoUrl = '') {
    const container = document.getElementById('chaptersContainer');
    if (!container) return;

    const rowId = 'chRow_' + Date.now() + Math.random().toString(36).substr(2, 4);
    const div = document.createElement('div');
    div.id = rowId;
    div.className = "p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2 relative";
    
    div.innerHTML = `
        <div class="flex justify-between items-center mb-1">
            <span class="font-bold text-gray-700 text-xs">Раздел статьи</span>
            <button type="button" onclick="removeArticleChapterRow('${rowId}')" class="text-red-500 hover:text-red-700 text-xs font-bold">
                Удалить раздел ✕
            </button>
        </div>
        <input type="text" class="ch-title w-full border border-gray-300 p-2.5 rounded-xl outline-none font-bold text-xs" placeholder="Заголовок раздела (напр: Спальное место)" value="${escapeHTML(title)}">
        <textarea rows="3" class="ch-text w-full border border-gray-300 p-2.5 rounded-xl outline-none text-xs" placeholder="Подробный текст рекомендаций для этого раздела...">${escapeHTML(text)}</textarea>
        <div>
            <label class="block text-[10px] font-bold uppercase text-gray-400 mb-1">Фотография для этого раздела (необязательно)</label>
            <input type="file" accept="image/*" class="ch-file block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#F2A900] file:text-[#291D17]">
            <input type="hidden" class="ch-photo-url" value="${photoUrl}">
        </div>
    `;
    container.appendChild(div);
}

function removeArticleChapterRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
}

function editArticle(id) {
    const art = currentArticles.find(a => String(a.id) === String(id));
    if (!art) return;

    document.getElementById('editingArticleId').value = art.id;
    document.getElementById('artTitle').value = art.title;
    document.getElementById('artAnnotation').value = art.annotation;
    document.getElementById('artContent').value = art.content || '';
    document.getElementById('artCurrentPhotoUrl').value = art.photo || '';

    const catInput = document.getElementById('artCategory');
    const catLabel = document.getElementById('artCategoryLabel');
    if (catInput) catInput.value = art.category;
    if (catLabel) {
        if (art.category === 'cat') catLabel.innerText = 'Для кошек и котят';
        else if (art.category === 'dog') catLabel.innerText = 'Для собак и щенков';
        else catLabel.innerText = `Для ${art.category}`;
    }

    const container = document.getElementById('chaptersContainer');
    if (container) {
        container.innerHTML = '';
        if (art.chapters && art.chapters.length > 0) {
            art.chapters.forEach(ch => {
                addArticleChapterRow(ch.title, ch.text, ch.photo || '');
            });
        } else {
            addArticleChapterRow();
        }
    }

    document.getElementById('articleFormHeader').innerText = `Редактирование статьи: ${art.title}`;
    document.getElementById('articleSubmitBtn').innerText = "Сохранить изменения";
    document.getElementById('cancelArticleEditBtn').classList.remove('hidden');

    document.getElementById('articlePublishForm').scrollIntoView({ behavior: 'smooth' });
}

function resetArticleForm() {
    document.getElementById('editingArticleId').value = '';
    document.getElementById('artTitle').value = '';
    document.getElementById('artAnnotation').value = '';
    document.getElementById('artContent').value = '';
    document.getElementById('artCurrentPhotoUrl').value = '';
    
    document.getElementById('artCategory').value = 'cat';
    document.getElementById('artCategoryLabel').innerText = 'Для кошек и котят';

    document.getElementById('chaptersContainer').innerHTML = '';
    addArticleChapterRow();

    document.getElementById('articleFormHeader').innerText = `Конструктор полезной статьи`;
    document.getElementById('articleSubmitBtn').innerText = "Опубликовать статью";
    document.getElementById('cancelArticleEditBtn').classList.add('hidden');
}

async function handleArticleSubmit(event) {
    if (event) event.preventDefault();

    const editingId = document.getElementById('editingArticleId').value;
    const titleEl = document.getElementById('artTitle');
    const annotEl = document.getElementById('artAnnotation');
    const contentEl = document.getElementById('artContent');
    const photoFileInput = document.getElementById('artPhotoFile');
    const catInput = document.getElementById('artCategory');

    if (!titleEl || !annotEl || !titleEl.value.trim() || !annotEl.value.trim()) {
        alert("Пожалуйста, заполните заголовок и аннотацию статьи!");
        return false;
    }

    const selectedCategory = catInput ? catInput.value : 'cat';

    const duplicate = currentArticles.find(a => 
        a.category.toLowerCase().trim() === selectedCategory.toLowerCase().trim() && 
        String(a.id) !== String(editingId)
    );

    if (duplicate) {
        alert(`Ошибка: Статья для этого вида животного уже существует! В приюте действует правило: 1 статья на 1 вид.`);
        return false;
    }

    let mainPhotoUrl = document.getElementById('artCurrentPhotoUrl').value || "https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=800";

    if (photoFileInput && photoFileInput.files && photoFileInput.files.length > 0) {
        try {
            mainPhotoUrl = await compressImage(photoFileInput.files[0], 800, 0.8);
        } catch (e) {}
    }

    const chapterRows = document.querySelectorAll('#chaptersContainer > div');
    const chapters = [];

    for (let row of chapterRows) {
        const titleInput = row.querySelector('.ch-title');
        const textInput = row.querySelector('.ch-text');
        const fileInput = row.querySelector('.ch-file');
        const urlInput = row.querySelector('.ch-photo-url');

        const title = titleInput ? titleInput.value.trim() : '';
        const text = textInput ? textInput.value.trim() : '';
        let photo = urlInput ? urlInput.value : '';

        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            try {
                photo = await compressImage(fileInput.files[0], 800, 0.8);
            } catch (err) {}
        }

        if (title || text) {
            chapters.push({ title, text, photo });
        }
    }

    const articleData = {
        title: titleEl.value.trim(),
        category: selectedCategory,
        annotation: annotEl.value.trim(),
        content: contentEl ? contentEl.value.trim() : '',
        photo: mainPhotoUrl,
        chapters: chapters
    };

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/articles/${editingId}` : '/api/articles';

    try {
        await apiFetch(url, {
            method: method,
            body: JSON.stringify(articleData)
        });
        alert(editingId ? "Статья успешно обновлена!" : "Статья успешно опубликована!");
    } catch (e) {
        if (editingId) {
            const index = currentArticles.findIndex(a => String(a.id) === String(editingId));
            if (index !== -1) currentArticles[index] = { id: parseInt(editingId), date: new Date().toLocaleDateString('ru-RU'), ...articleData };
        } else {
            currentArticles.push({ id: Date.now(), date: new Date().toLocaleDateString('ru-RU'), ...articleData });
        }
        localStorage.setItem('shelterArticles', JSON.stringify(currentArticles));
        alert("Статья сохранена локально!");
    }

    resetArticleForm();
    loadAdminArticles();
    return false;
}

async function deleteArticle(id) {
    if (!confirm("Удалить эту статью из базы знаний?")) return;
    try {
        await apiFetch(`/api/articles/${id}`, { method: 'DELETE' });
    } catch (e) {
        currentArticles = currentArticles.filter(a => String(a.id) !== String(id));
        localStorage.setItem('shelterArticles', JSON.stringify(currentArticles));
    }
    loadAdminArticles();
}