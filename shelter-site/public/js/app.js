const defaultPets = [
    {
        id: 1,
        name: "Рекс",
        type: "собака",
        gender: "male",
        ageValue: "2",
        ageUnit: "г.",
        weight: "18",
        friendliness: "Очень высокая",
        character: "Обожает активные игры на свежем воздухе, прекрасно ладит с детьми. Полностью приучен к поводку.",
        vaccinated: "yes",
        photo: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=70&w=400",
        emoji: "🐕"
    },
    {
        id: 2,
        name: "Оливия",
        type: "кот",
        gender: "female",
        ageValue: "1",
        ageUnit: "г.",
        weight: "3.5",
        friendliness: "Спокойная и ласковая",
        character: "Тихая мурлыка, которая любит спать на коленях. Чистоплотна, приучена к лотку и когтеточке.",
        vaccinated: "yes",
        photo: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=70&w=400",
        emoji: "🐈"
    }
];

let pets = [];
let currentCategories = { types: [{ name: "собака", emoji: "🐕" }, { name: "кот", emoji: "🐈" }] };
let mainActiveFilter = 'all';

function safeJSONParse(str, fallback = []) {
    try {
        if (!str) return fallback;
        const parsed = JSON.parse(str);
        return Array.isArray(parsed) ? parsed : fallback;
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

// Загрузка питомцев
async function fetchPets() {
    try {
        const response = await fetch('/api/pets');
        if (!response.ok) throw new Error("Server error");
        pets = await response.json();
    } catch (err) {
        const isInitialized = localStorage.getItem('shelterPetsInitialized');
        if (!isInitialized) {
            localStorage.setItem('shelterPets', JSON.stringify(defaultPets));
            localStorage.setItem('shelterPetsInitialized', 'true');
            pets = defaultPets;
        } else {
            pets = safeJSONParse(localStorage.getItem('shelterPets'));
        }
    }

    pets = pets.map(pet => {
        if (pet.type === 'dog') pet.type = 'собака';
        if (pet.type === 'cat') pet.type = 'кот';
        return pet;
    });

    renderPets();
    setupRandomPopup();
    loadCategories();
}

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error("Server error");
        currentCategories = await response.json();
    } catch (e) {
        currentCategories = safeJSONParse(localStorage.getItem('shelterCategories'), { types: [{ name: "собака", emoji: "🐕" }, { name: "кот", emoji: "🐈" }] });
    }
    renderQuickFilterButtons();
}

function renderQuickFilterButtons() {
    const container = document.getElementById('quickFilters');
    if (!container) return;
    container.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.id = 'qf-all';
    allBtn.className = mainActiveFilter === 'all' 
        ? "bg-[#F2A900] text-[#291D17] font-black py-2 px-5 rounded-full shadow-md hover:bg-white transition text-xs flex items-center gap-1.5 transform hover:scale-105 duration-200 border-2 border-[#F2A900]"
        : "bg-white border-2 border-gray-200 text-[#291D17] hover:border-[#F2A900] font-bold py-2 px-5 rounded-full shadow-sm transition text-xs flex items-center gap-1.5 transform hover:scale-105 duration-200";
    allBtn.innerHTML = `🐾 Все хвостики`;
    allBtn.onclick = () => filterMainPage('all');
    container.appendChild(allBtn);

    currentCategories.types.forEach(type => {
        const capitalizedName = type.name.charAt(0).toUpperCase() + type.name.slice(1);
        const button = document.createElement('button');
        button.id = 'qf-' + type.name;
        button.className = mainActiveFilter === type.name
            ? "bg-[#F2A900] text-[#291D17] font-black py-2 px-5 rounded-full shadow-md hover:bg-white transition text-xs flex items-center gap-1.5 transform hover:scale-105 duration-200 border-2 border-[#F2A900]"
            : "bg-white border-2 border-gray-200 text-[#291D17] hover:border-[#F2A900] font-bold py-2 px-5 rounded-full shadow-sm transition text-xs flex items-center gap-1.5 transform hover:scale-105 duration-200";
        button.innerHTML = `${type.emoji || '🐾'} ${capitalizedName}`;
        button.onclick = () => filterMainPage(type.name);
        container.appendChild(button);
    });
}

function renderPets() {
    const container = document.getElementById('petsContainer');
    if (!container) return;
    container.innerHTML = '';

    let filteredPets = pets.filter(pet => pet && pet.name && pet.photo && pet.status !== 'adopted');

    if (mainActiveFilter !== 'all') {
        filteredPets = filteredPets.filter(pet => {
            const t = pet.type ? pet.type.toLowerCase().trim() : '';
            return t === mainActiveFilter.toLowerCase().trim();
        });
    }

    if (filteredPets.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-gray-400 py-12 font-medium">В этой категории временно нет питомцев.</p>`;
        return;
    }

    filteredPets.forEach(pet => {
        const card = document.createElement('div');
        card.className = "bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col justify-between cursor-pointer min-w-0 w-full animate-fade-in";
        card.onclick = () => openDetailsModal(pet);
        
        card.innerHTML = `
            <div class="min-w-0">
                <div class="relative h-56 bg-gray-100 flex items-center justify-center">
                    <img src="${escapeHTML(pet.photo)}" alt="${escapeHTML(pet.name)}" loading="lazy" class="w-full h-full object-contain">
                    <span class="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
                        ${escapeHTML(pet.ageValue)} ${escapeHTML(pet.ageUnit)}
                    </span>
                </div>
                <div class="p-5 min-w-0">
                    <div class="flex justify-between items-center mb-2 gap-2 min-w-0">
                        <h4 class="text-xl font-bold text-gray-900 truncate flex-1 break-all">
                            ${escapeHTML(pet.name)} ${escapeHTML(pet.emoji || '')}
                        </h4>
                        <span class="text-xs font-semibold text-gray-400 shrink-0">
                            ${pet.gender === 'male' ? 'Мальчик ♂' : 'Девочка ♀'} • ${escapeHTML(pet.weight)} кг
                        </span>
                    </div>
                    <p class="text-gray-500 text-xs line-clamp-2 break-words">${escapeHTML(pet.character)}</p>
                </div>
            </div>
            <div class="p-5 pt-0">
                <button class="w-full bg-[#F2A900] hover:bg-[#291D17] hover:text-white text-[#291D17] py-3 rounded-xl font-black text-xs transition shadow-sm">
                    Подробнее / Познакомиться
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterMainPage(category) {
    mainActiveFilter = category;
    renderQuickFilterButtons();
    renderPets();
}

// Облегченные фоновые фото Unsplash (разрешение 900px вместо 1600px снижает трафик на 85%)
const heroImages = [
    "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=75&w=900",
    "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=75&w=900",
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=75&w=900",
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=75&w=900"
];
let currentHeroIndex = 0;

function startHeroSlideshow() {
    const slide1 = document.getElementById('heroSlide1');
    const slide2 = document.getElementById('heroSlide2');
    if (!slide1 || !slide2) return;

    let activeSlide = 1;

    setInterval(() => {
        currentHeroIndex = (currentHeroIndex + 1) % heroImages.length;
        const nextUrl = heroImages[currentHeroIndex];

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

function setupRandomPopup() {
    const validPets = pets.filter(pet => pet && pet.name && pet.photo);
    if (validPets.length === 0) return;

    const randomPet = validPets[Math.floor(Math.random() * validPets.length)];

    const photoEl = document.getElementById('popupPetPhoto');
    const nameEl = document.getElementById('popupPetName');
    const descEl = document.getElementById('popupPetDesc');
    const applyBtn = document.getElementById('popupApplyBtn');

    if (photoEl) photoEl.src = randomPet.photo;
    if (nameEl) nameEl.innerText = `${randomPet.name}, ${randomPet.ageValue} ${randomPet.ageUnit}`;
    if (descEl) descEl.innerText = randomPet.character;

    if (applyBtn) {
        applyBtn.onclick = (e) => {
            e.stopPropagation();
            closePopup();
            openApplyModal(randomPet.name);
        };
    }
}

window.addEventListener('DOMContentLoaded', () => {
    fetchPets();
    startHeroSlideshow();

    const isPopupShown = sessionStorage.getItem('popupShown');
    if (!isPopupShown) {
        setTimeout(() => {
            const popup = document.getElementById('urgentPopup');
            const validPets = pets.filter(pet => pet && pet.name && pet.photo);
            if (popup && validPets.length > 0) {
                popup.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');
            }
        }, 1500);
    }
});

function closePopup() {
    const popup = document.getElementById('urgentPopup');
    if (popup) popup.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
    sessionStorage.setItem('popupShown', 'true');
}

function openDetailsModal(pet) {
    document.getElementById('detailPhoto').src = pet.photo;
    document.getElementById('detailName').innerText = pet.name;
    document.getElementById('detailGender').innerText = pet.gender === 'male' ? 'Мальчик ♂' : 'Девочка ♀';
    document.getElementById('detailAge').innerText = `${pet.ageValue} ${pet.ageUnit}`;
    document.getElementById('detailWeight').innerText = `${pet.weight} кг`;
    document.getElementById('detailVaccinated').innerText = pet.vaccinated === 'yes' ? 'Да' : 'Нет';
    document.getElementById('detailFriendliness').innerText = pet.friendliness;
    document.getElementById('detailCharacter').innerText = pet.character;

    const applyBtn = document.getElementById('applyFromDetailsBtn');
    applyBtn.onclick = (e) => {
        e.stopPropagation();
        closeDetailsModal();
        openApplyModal(pet.name);
    };

    document.getElementById('detailsModal').classList.remove('hidden');
}

function closeDetailsModal() {
    document.getElementById('detailsModal').classList.add('hidden');
}

function openApplyModal(petName) {
    document.getElementById('applyTargetPet').innerText = petName;
    document.getElementById('applyPetName').value = petName;
    document.getElementById('applyModal').classList.remove('hidden');
}

function closeApplyModal() {
    document.getElementById('applyModal').classList.add('hidden');
}

async function handleApplySubmit(event) {
    event.preventDefault();
    const appData = {
        id: Date.now(),
        petName: document.getElementById('applyPetName').value,
        userName: document.getElementById('applyUserName').value.trim(),
        userPhone: document.getElementById('applyUserPhone').value.trim(),
        housing: document.getElementById('applyHousing').value,
        safety: document.getElementById('applySafety').value,
        experience: document.getElementById('applyExperience').value,
        message: document.getElementById('applyUserMsg').value || "Без сообщения",
        date: new Date().toLocaleDateString('ru-RU')
    };

    if (!appData.housing || !appData.safety || !appData.experience) {
        alert("Пожалуйста, ответьте на все вопросы анкеты усыновителя!");
        return;
    }

    if (appData.userName.length > 50) {
        alert("Ошибка: Имя слишком длинное!");
        return;
    }

    if (appData.userPhone.length > 20) {
        alert("Ошибка: Телефон слишком длинный!");
        return;
    }

    try {
        const response = await fetch('/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appData)
        });
        const result = await response.json();
        if (result.success) {
            closeApplyModal();
            resetApplyForm();
            openSuccessAppModal();
        }
    } catch (err) {
        let localApps = JSON.parse(localStorage.getItem('shelterApplications')) || [];
        localApps.push(appData);
        localStorage.setItem('shelterApplications', JSON.stringify(localApps));
        
        closeApplyModal();
        resetApplyForm();
        openSuccessAppModal();
    }
}

function openSuccessAppModal() {
    const modal = document.getElementById('successAppModal');
    if (modal) modal.classList.remove('hidden');
}

function closeSuccessAppModal() {
    const modal = document.getElementById('successAppModal');
    if (modal) modal.classList.add('hidden');
}

function resetApplyForm() {
    document.getElementById('applyUserName').value = '';
    document.getElementById('applyUserPhone').value = '';
    document.getElementById('applyUserMsg').value = '';
    
    document.getElementById('applyHousing').value = '';
    document.getElementById('applySafety').value = '';
    document.getElementById('applyExperience').value = '';

    const housingL = document.getElementById('housingLabel');
    if (housingL) {
        housingL.innerText = 'Выберите вариант...';
        housingL.className = 'text-gray-500';
    }
    const safetyL = document.getElementById('safetyLabel');
    if (safetyL) {
        safetyL.innerText = 'Есть ли сетки?';
        safetyL.className = 'text-gray-500';
    }
    const expL = document.getElementById('experienceLabel');
    if (expL) {
        expL.innerText = 'Были ли раньше питомцы?';
        expL.className = 'text-gray-500';
    }
}

function toggleApplyDropdown(id) {
    const dropdown = document.getElementById(id);
    const wasHidden = dropdown.classList.contains('hidden');
    
    ['housingDropdown', 'safetyDropdown', 'experienceDropdown'].forEach(dId => {
        const el = document.getElementById(dId);
        if (el) el.classList.add('hidden');
    });

    if (wasHidden && dropdown) {
        dropdown.classList.remove('hidden');
    }
}

function selectApplyOption(hiddenInputId, value, text, dropdownId) {
    document.getElementById(hiddenInputId).value = value;
    
    const label = document.getElementById(hiddenInputId.replace('apply', '').toLowerCase() + 'Label');
    if (label) {
        label.innerText = text;
        label.classList.remove('text-gray-500');
        label.classList.add('text-gray-900', 'font-medium');
    }

    const dropdown = document.getElementById(dropdownId);
    if (dropdown) dropdown.classList.add('hidden');
}