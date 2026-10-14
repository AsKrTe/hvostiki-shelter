let needs = [];
let currentNeed = null;
let currentMode = 'money';

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

async function fetchNeeds() {
    try {
        const response = await fetch('/api/needs');
        if (!response.ok) throw new Error("Server error");
        needs = await response.json();
    } catch (err) {
        needs = safeJSONParse(localStorage.getItem('shelterNeeds'), [
            {
                id: 2,
                title: "Срочная операция на лапку щенку Бруно",
                category: "money",
                unit: "₽",
                itemPrice: 0,
                collected: 24500,
                target: 25000,
                description: "Малыш Бруно поступил с переломом сустава. Операция уже назначена, осталось закрыть финальный счет!",
                isUrgentPet: true,
                petPhoto: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=70&w=600"
            },
            {
                id: 1,
                title: "Сухой корм Dog Chow для собак",
                category: "items",
                unit: "кг",
                itemPrice: 250,
                collected: 35,
                target: 100,
                description: "Базовый сухой рацион для 25 собак средних и крупных пород.",
                isUrgentPet: false,
                petPhoto: ""
            }
        ]);
    }
    renderNeeds();
}

function renderNeeds() {
    const urgentSection = document.getElementById('urgentPetSection');
    const urgentContainer = document.getElementById('urgentPetNeedsContainer');
    const regularContainer = document.getElementById('regularNeedsContainer');
    const completedContainer = document.getElementById('completedNeedsContainer');
    
    const teaserEl = document.getElementById('completedTeaser');
    const teaserCount = document.getElementById('completedCountTeaser');
    const spoilerBtnCount = document.getElementById('completedCountBtn');
    const trophySection = document.getElementById('trophySection');

    if (!regularContainer) return;
    if (urgentContainer) urgentContainer.innerHTML = '';
    regularContainer.innerHTML = '';
    if (completedContainer) completedContainer.innerHTML = '';

    const completedNeeds = needs.filter(n => n.collected >= n.target);
    const activeNeeds = needs.filter(n => n.collected < n.target);

    const urgentPetNeeds = activeNeeds.filter(n => n.isUrgentPet === true);
    const regularNeeds = activeNeeds.filter(n => !n.isUrgentPet);

    if (teaserCount) teaserCount.innerText = completedNeeds.length;
    if (spoilerBtnCount) spoilerBtnCount.innerText = completedNeeds.length;

    if (completedNeeds.length > 0) {
        if (teaserEl) teaserEl.classList.remove('hidden');
        if (trophySection) trophySection.classList.remove('hidden');
        startTrophyToastRotation(completedNeeds);
    } else {
        if (teaserEl) teaserEl.classList.add('hidden');
        if (trophySection) trophySection.classList.add('hidden');
    }

    if (urgentPetNeeds.length > 0) {
        if (urgentSection) urgentSection.classList.remove('hidden');
        urgentPetNeeds.forEach(need => {
            const displayCollected = Math.min(need.target, need.collected);
            const percent = Math.min(100, parseFloat(((displayCollected / need.target) * 100).toFixed(2)));
            const remaining = Math.max(0, parseFloat((need.target - displayCollected).toFixed(2)));

            const card = document.createElement('div');
            card.className = "bg-white rounded-3xl p-6 md:p-8 border-2 border-rose-300 shadow-xl relative overflow-hidden flex flex-col md:flex-row gap-6 items-center cursor-pointer transform hover:scale-[1.01] transition duration-200";
            card.onclick = () => openDonateModal(need);

            card.innerHTML = `
                <div class="absolute top-0 right-0 bg-rose-600 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-bl-2xl tracking-wider animate-pulse">
                    Экстренный сбор
                </div>
				${need.petPhoto ? `
                <!-- Фотография подопечного (показывается только если загружена) -->
                <div class="w-full md:w-56 h-56 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-amber-200 shadow-md">
                    <img src="${escapeHTML(need.petPhoto)}" alt="${escapeHTML(need.title)}" loading="lazy" class="w-full h-full object-cover">
                </div>
                ` : ''}
                <div class="flex-1 w-full space-y-4">
                    <div>
                        <div class="flex justify-between items-start mb-1 pr-24">
                            <h4 class="text-xl md:text-2xl font-black text-gray-900 leading-tight">${escapeHTML(need.title)}</h4>
                        </div>
                        <p class="text-xs text-gray-600 leading-relaxed">${escapeHTML(need.description)}</p>
                    </div>

                    <div>
                        <div class="flex justify-between text-xs font-black mb-1.5">
                            <span class="text-gray-900">Собрано: ${displayCollected} из ${need.target} ${need.unit}</span>
                            <span class="text-rose-600 animate-pulse">Осталось: всего ${remaining} ${need.unit}!</span>
                        </div>
                        <div class="w-full bg-gray-100 h-4 rounded-full overflow-hidden p-0.5 border border-rose-200 shadow-inner">
                            <div class="h-full rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-emerald-400 animate-pulse transition-all duration-700 shadow-[0_0_12px_rgba(52,211,153,0.9)]" style="width: ${percent}%"></div>
                        </div>
                    </div>

                    <div class="pt-1 flex justify-between items-center">
                        <span class="text-xs font-bold text-gray-400">Нажмите, чтобы помочь</span>
                        <button class="bg-[#F2A900] hover:bg-[#291D17] hover:text-white text-[#291D17] font-black text-xs px-6 py-2.5 rounded-full transition shadow-md">
                            Помочь хвостику
                        </button>
                    </div>
                </div>
            `;
            urgentContainer.appendChild(card);
        });
    } else {
        if (urgentSection) urgentSection.classList.add('hidden');
    }

    if (regularNeeds.length === 0 && urgentPetNeeds.length === 0) {
        regularContainer.innerHTML = `<p class="col-span-full text-center text-gray-500 py-12 font-bold bg-white rounded-3xl border border-dashed border-gray-200">Все текущие сборы успешно закрыты! Спасибо каждому помощнику!</p>`;
    } else {
        regularNeeds.forEach(need => {
            const displayCollected = Math.min(need.target, need.collected);
            const percent = Math.min(100, parseFloat(((displayCollected / need.target) * 100).toFixed(2)));
            const remaining = Math.max(0, parseFloat((need.target - displayCollected).toFixed(2)));

            let barClass = "bg-gray-300";
            let badgeClass = "bg-gray-100 text-gray-500";
            let cardBorderClass = "border-gray-100";
            let statusText = `До цели: ${remaining} ${need.unit}`;

            if (percent === 0) {
                barClass = "bg-gray-300";
                statusText = `Сбор открыт • До цели: ${remaining} ${need.unit}`;
            } else if (percent < 50) {
                barClass = "bg-amber-400";
                badgeClass = "bg-amber-50 text-amber-700";
                statusText = `Собрано: ${displayCollected} • Осталось: ${remaining} ${need.unit}`;
            } else if (percent < 90) {
                barClass = "bg-orange-500";
                badgeClass = "bg-orange-50 text-orange-700";
                statusText = `Экватор пройден! Осталось: ${remaining} ${need.unit}`;
            } else {
                barClass = "bg-gradient-to-r from-orange-500 to-rose-600 animate-pulse";
                badgeClass = "bg-rose-100 text-rose-700 font-bold animate-pulse";
                cardBorderClass = "border-rose-300 shadow-md";
                statusText = `Финиш близко! Осталось: ${remaining} ${need.unit}!`;
            }

            const card = document.createElement('div');
            card.className = `bg-white p-6 rounded-3xl shadow-sm border ${cardBorderClass} flex flex-col justify-between hover:shadow-md transition cursor-pointer transform hover:scale-[1.01] duration-200`;
            card.onclick = () => openDonateModal(need);

			card.innerHTML = `
                <div class="flex gap-4 items-start mb-4">
                    ${need.petPhoto ? `
                        <img src="${escapeHTML(need.petPhoto)}" alt="${escapeHTML(need.title)}" loading="lazy" class="w-16 h-16 rounded-2xl object-cover shrink-0 border border-gray-200 shadow-sm bg-gray-50">
                    ` : ''}
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start mb-1 gap-2">
                            <h4 class="font-bold text-gray-900 text-base flex-1">${escapeHTML(need.title)}</h4>
                            <span class="text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${badgeClass}">${percent}%</span>
                        </div>
                        <p class="text-xs text-gray-500">${escapeHTML(need.description)}</p>
                    </div>
                </div>
                <div>
                    <div class="w-full bg-gray-100 h-3.5 rounded-full overflow-hidden mb-2 p-0.5 shadow-inner">
                        <div class="h-full rounded-full transition-all duration-700 ${barClass}" style="width: ${percent}%"></div>
                    </div>
                    <div class="flex justify-between text-xs font-bold">
                        <span class="text-gray-500">${displayCollected} из ${need.target} ${need.unit}</span>
                        <span class="${percent >= 90 ? 'text-rose-600' : 'text-gray-600'}">${statusText}</span>
                    </div>
                </div>
            `;
            regularContainer.appendChild(card);
        });
    }

    if (completedContainer && completedNeeds.length > 0) {
        completedNeeds.forEach(need => {
            const trophyCard = document.createElement('div');
            trophyCard.className = "bg-white p-5 rounded-2xl border border-amber-200 shadow-sm opacity-85 hover:opacity-100 transition duration-300 flex flex-col justify-between relative overflow-hidden";
            
            trophyCard.innerHTML = `
                <div class="absolute top-0 right-0 bg-[#F2A900] text-[#291D17] text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                    Цель закрыта
                </div>
                <div class="mb-3 pr-20">
                    <h5 class="font-bold text-gray-900 text-sm">${escapeHTML(need.title)}</h5>
                    <p class="text-[11px] text-gray-500 line-clamp-1 mt-0.5">${escapeHTML(need.description)}</p>
                </div>
                <div>
                    <div class="w-full bg-emerald-100 h-2.5 rounded-full overflow-hidden mb-2">
                        <div class="bg-emerald-500 h-full rounded-full" style="width: 100%"></div>
                    </div>
                    <div class="flex justify-between items-center text-[11px] font-bold text-emerald-800">
                        <span>Собрано: ${need.target} из ${need.target} ${need.unit}</span>
                        <span class="text-amber-800 font-extrabold">Цель достигнута благодаря сообществу!</span>
                    </div>
                </div>
            `;
            completedContainer.appendChild(trophyCard);
        });
    }
}

// Оптимизированные слайды шапки (900px)
const needsHeroImages = [
    "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&q=75&w=900",
    "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&q=75&w=900",
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&q=75&w=900",
    "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?auto=format&fit=crop&q=75&w=900"
];
let currentNeedsHeroIndex = 0;

function startNeedsHeroSlideshow() {
    const slide1 = document.getElementById('needsHeroSlide1');
    const slide2 = document.getElementById('needsHeroSlide2');
    if (!slide1 || !slide2) return;

    let activeSlide = 1;

    setInterval(() => {
        currentNeedsHeroIndex = (currentNeedsHeroIndex + 1) % needsHeroImages.length;
        const nextUrl = needsHeroImages[currentNeedsHeroIndex];

        if (activeSlide === 1) {
            slide2.src = nextUrl;
            slide2.classList.remove('opacity-0');
            slide2.classList.add('opacity-100');
            slide1.classList.remove('opacity-100');
            slide1.classList.add('opacity-0');
            activeSlide = 2;
        } else {
            slide1.src = nextUrl;
            slide1.classList.remove('opacity-0');
            slide1.classList.add('opacity-100');
            slide2.classList.remove('opacity-100');
            slide2.classList.add('opacity-0');
            activeSlide = 1;
        }
    }, 5000);
}

function openDonateModal(need) {
    currentNeed = need;
    document.getElementById('modalNeedTitle').innerText = need.title;
    document.getElementById('modalNeedDesc').innerText = need.description;

    const actionSelector = document.getElementById('actionTypeSelector');
    const priceHint = document.getElementById('pricePerUnitHint');
    const unitLabel = document.getElementById('donationUnitLabel');

    if (need.category === 'items') {
        actionSelector.classList.remove('hidden');
        priceHint.classList.remove('hidden');
        priceHint.innerText = `Стоимость закупки: 1 ${need.unit} = ${need.itemPrice} ₽`;
        unitLabel.innerText = "₽";
        document.getElementById('delivUnitText').innerText = need.unit;
    } else {
        actionSelector.classList.add('hidden');
        priceHint.classList.add('hidden');
        unitLabel.innerText = need.unit;
    }

    switchDonationMode('money');
    document.getElementById('donationAmountInput').value = '';
    document.getElementById('donateModal').classList.remove('hidden');
}

function closeDonateModal() {
    document.getElementById('donateModal').classList.add('hidden');
}

function switchDonationMode(mode) {
    currentMode = mode;
    const moneyBlock = document.getElementById('moneyDonationBlock');
    const delivBlock = document.getElementById('deliveryDonationBlock');
    const modeMoneyBtn = document.getElementById('modeMoneyBtn');
    const modeDeliveryBtn = document.getElementById('modeDeliveryBtn');

    if (mode === 'money') {
        moneyBlock.classList.remove('hidden');
        delivBlock.classList.add('hidden');
        modeMoneyBtn.className = "flex-1 py-2 rounded-xl bg-white shadow-sm text-brandBrown font-bold";
        modeDeliveryBtn.className = "flex-1 py-2 rounded-xl text-gray-500 hover:text-brandBrown";
    } else {
        moneyBlock.classList.add('hidden');
        delivBlock.classList.remove('hidden');
        modeDeliveryBtn.className = "flex-1 py-2 rounded-xl bg-white shadow-sm text-brandBrown font-bold";
        modeMoneyBtn.className = "flex-1 py-2 rounded-xl text-gray-500 hover:text-brandBrown";
    }
}

function fillToHundredPercent() {
    if (!currentNeed) return;
    const remainingUnits = Math.max(0, currentNeed.target - currentNeed.collected);

    if (currentNeed.category === 'items') {
        const remainingMoney = remainingUnits * currentNeed.itemPrice;
        document.getElementById('donationAmountInput').value = remainingMoney;
    } else {
        document.getElementById('donationAmountInput').value = remainingUnits;
    }
}

async function confirmMoneyDonation() {
    const inputVal = parseFloat(document.getElementById('donationAmountInput').value);
    
    if (isNaN(inputVal) || inputVal <= 0) {
        alert("Пожалуйста, укажите сумму перевода больше нуля!");
        return;
    }

    let addedUnits = inputVal;
    if (currentNeed.category === 'items') {
        addedUnits = parseFloat((inputVal / currentNeed.itemPrice).toFixed(2));
    }

    try {
        const response = await fetch(`/api/needs/donate/${currentNeed.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: addedUnits })
        });
        if (!response.ok) throw new Error("Server error");
        closeDonateModal();
        openSuccessDonateModal(
            "Перевод зафиксирован!", 
            "Огромное спасибо за ваше доброе сердце и поддержку подопечных приюта! Шкала сбора успешно пополнена."
        );
        fetchNeeds();
    } catch (e) {
        currentNeed.collected += addedUnits;
        localStorage.setItem('shelterNeeds', JSON.stringify(needs));
        closeDonateModal();
        openSuccessDonateModal(
            "Перевод зафиксирован!", 
            "Огромное спасибо за помощь! Данные сохранены."
        );
        renderNeeds();
    }
}

async function submitDeliveryApp(event) {
    event.preventDefault();

    const quantity = parseFloat(document.getElementById('delivQuantity').value);
    if (isNaN(quantity) || quantity <= 0) {
        alert("Количество вещей должно быть строго больше нуля!");
        return;
    }

    const appData = {
        needId: currentNeed.id,
        needTitle: currentNeed.title,
        userName: document.getElementById('delivUserName').value.trim(),
        userPhone: document.getElementById('delivUserPhone').value.trim(),
        quantity: quantity,
        unit: currentNeed.unit,
        dateTime: document.getElementById('delivDateTime').value.trim(),
        note: document.getElementById('delivNote').value.trim() || "Без примечания"
    };

    try {
        const response = await fetch('/api/needs/deliveries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appData)
        });
        if (!response.ok) throw new Error("Server error");
        closeDonateModal();
        openSuccessDonateModal(
            "Заявка на привоз принята!", 
            "Спасибо за помощь! Волонтеры приюта будут ждать вас в указанное время. Спасибо, что заботитесь о хвостиках!"
        );
    } catch (e) {
        let localDelivs = safeJSONParse(localStorage.getItem('shelterItemApplications'), []);
        localDelivs.push({ id: Date.now(), status: 'pending', date: new Date().toLocaleDateString('ru-RU'), ...appData });
        localStorage.setItem('shelterItemApplications', JSON.stringify(localDelivs));
        closeDonateModal();
        openSuccessDonateModal(
            "Заявка на привоз принята!", 
            "Спасибо за помощь! Заявка сохранена, волонтеры свяжутся с вами при необходимости."
        );
    }
}

function toggleCompletedTrophies() {
    const wrapper = document.getElementById('trophyBackgroundWrapper');
    const icon = document.getElementById('trophySpoilerIcon');
    if (!wrapper) return;

    const isHidden = wrapper.classList.contains('hidden');
    if (isHidden) {
        wrapper.classList.remove('hidden');
        if (icon) icon.innerText = '👆';
    } else {
        wrapper.classList.add('hidden');
        if (icon) icon.innerText = '👇';
    }
}

function scrollToAndOpenTrophies() {
    const wrapper = document.getElementById('trophyBackgroundWrapper');
    const icon = document.getElementById('trophySpoilerIcon');
    
    if (wrapper) wrapper.classList.remove('hidden');
    if (icon) icon.innerText = '👆';

    const section = document.getElementById('trophySection');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
}

let trophyToastInterval = null;

function startTrophyToastRotation(completedNeeds) {
    if (!completedNeeds || completedNeeds.length === 0) return;
    if (trophyToastInterval) clearInterval(trophyToastInterval);

    setTimeout(() => {
        showRandomTrophyToast(completedNeeds);
    }, 4000);

    trophyToastInterval = setInterval(() => {
        showRandomTrophyToast(completedNeeds);
    }, 16000);
}

function showRandomTrophyToast(completedNeeds) {
    const toast = document.getElementById('trophyToast');
    const titleEl = document.getElementById('toastTrophyTitle');
    const descEl = document.getElementById('toastTrophyDesc');
    if (!toast || !titleEl || completedNeeds.length === 0) return;

    const randomNeed = completedNeeds[Math.floor(Math.random() * completedNeeds.length)];

    titleEl.innerText = randomNeed.title;
    descEl.innerText = `Собрано ${randomNeed.target} ${randomNeed.unit}. Цель успешно достигнута!`;

    toast.classList.remove('-translate-x-full', 'opacity-0', 'pointer-events-none');

    setTimeout(() => {
        closeTrophyToast();
    }, 6000);
}

function closeTrophyToast() {
    const toast = document.getElementById('trophyToast');
    if (toast) toast.classList.add('-translate-x-full', 'opacity-0', 'pointer-events-none');
}

async function loadPublicRequisites() {
    try {
        const response = await fetch('/api/requisites');
        if (!response.ok) throw new Error("Server error");
        const data = await response.json();
        applyPublicRequisites(data);
    } catch (e) {
        const localData = safeJSONParse(localStorage.getItem('shelterRequisites'), {
            card: "4276 3800 1234 5678",
            phone: "+7 (999) 000-00-00",
            qrImage: ""
        });
        applyPublicRequisites(localData);
    }
}

function applyPublicRequisites(data) {
    const cardEl = document.getElementById('displayReqCard');
    const phoneEl = document.getElementById('displayReqPhone');
    const qrContainer = document.getElementById('displayReqQrContainer');

    const modalCardEl = document.getElementById('modalReqCard');
    const modalPhoneEl = document.getElementById('modalReqPhone');
    const modalQrContainer = document.getElementById('modalReqQrContainer');

    const cardVal = data.card || "4276 3800 1234 5678";
    const phoneVal = data.phone || "+7 (999) 000-00-00";

    if (cardEl) cardEl.innerText = cardVal;
    if (phoneEl) phoneEl.innerText = phoneVal;
    if (modalCardEl) modalCardEl.innerText = cardVal;
    if (modalPhoneEl) modalPhoneEl.innerText = phoneVal;

    const qrHtml = data.qrImage 
        ? `<img src="${data.qrImage}" alt="QR код" class="w-full h-full object-contain" loading="lazy">`
        : `QR`;

    if (qrContainer) qrContainer.innerHTML = qrHtml;
    if (modalQrContainer) modalQrContainer.innerHTML = qrHtml;
}

function copyRequisite(elementId, btnElement) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    const textToCopy = el.innerText.trim();
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = btnElement.innerText;
        btnElement.innerText = "Скопировано!";
        btnElement.classList.add('bg-white', 'text-brandBrown');

        setTimeout(() => {
            btnElement.innerText = originalText;
            btnElement.classList.remove('bg-white', 'text-brandBrown');
        }, 2000);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    fetchNeeds();
	   loadPublicRequisites();
    startNeedsHeroSlideshow();
});

function openSuccessDonateModal(title, message) {
    const modal = document.getElementById('successDonateModal');
    const titleEl = document.getElementById('successDonateTitle');
    const textEl = document.getElementById('successDonateText');
    if (titleEl) titleEl.innerText = title;
    if (textEl) textEl.innerText = message;
    if (modal) modal.classList.remove('hidden');
}

function closeSuccessDonateModal() {
    const modal = document.getElementById('successDonateModal');
    if (modal) modal.classList.add('hidden');
}