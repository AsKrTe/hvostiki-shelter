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
        type: "cat",
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
let currentCategories = { types: ["собака", "кот"] };

let activeFilters = {
    type: 'all',
    gender: 'all',
    age: 'all',
    weight: 'all',
    vaccinated: 'all'
};

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

function toggleApplyDropdown(id) {
    const dropdown = document.getElementById(id);
    const wasHidden = dropdown.classList.contains('hidden');
    
    ['typeDropdown', 'genderDropdown', 'ageDropdown', 'weightDropdown', 'vaccinatedDropdown', 'housingDropdown', 'safetyDropdown', 'experienceDropdown'].forEach(dId => {
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

window.addEventListener('click', function(e) {
    const dropdowns = ['typeDropdown', 'genderDropdown', 'ageDropdown', 'weightDropdown', 'vaccinatedDropdown', 'housingDropdown', 'safetyDropdown', 'experienceDropdown'];
    dropdowns.forEach(id => {
        const dropdown = document.getElementById(id);
        const btn = document.getElementById(id.replace('Dropdown', 'Btn'));
        if (dropdown && btn && !btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
});

function toggleFilterDropdown(id) {
    const dropdown = document.getElementById(id);
    const wasHidden = dropdown.classList.contains('hidden');
    
    ['typeDropdown', 'genderDropdown', 'ageDropdown', 'weightDropdown', 'vaccinatedDropdown'].forEach(dId => {
        const el = document.getElementById(dId);
        if (el) el.classList.add('hidden');
    });

    if (wasHidden && dropdown) {
        dropdown.classList.remove('hidden');
    }
}

function selectFilterOption(category, value, text, dropdownId) {
    activeFilters[category] = value;
    
    const label = document.getElementById(category + 'Label');
    if (label) label.innerText = text;

    const dropdown = document.getElementById(dropdownId);
    if (dropdown) dropdown.classList.add('hidden');

    renderPets();
}

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error("Server error");
        currentCategories = await response.json();
    } catch (e) {
        currentCategories = safeJSONParse(localStorage.getItem('shelterCategories'), { types: ["собака", "кот"] });
    }
    renderFilterTypeDropdown();
}

function renderFilterTypeDropdown() {
    const container = document.getElementById('typeDropdown');
    if (!container) return;
    container.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = "w-full text-left px-4 py-2.5 hover:bg-gray-50 transition text-sm font-semibold text-gray-700";
    allBtn.innerText = "Все хвостики";
    allBtn.onclick = () => selectFilterOption('type', 'all', 'Все хвостики', 'typeDropdown');
    container.appendChild(allBtn);

    currentCategories.types.forEach(type => {
        const name = type.name || type;
        const emoji = type.emoji || '🐾';
        const capitalizedType = name.charAt(0).toUpperCase() + name.slice(1);
        
        const button = document.createElement('button');
        button.type = 'button';
        button.className = "w-full text-left px-4 py-2.5 hover:bg-gray-50 transition text-sm capitalize text-gray-700 font-semibold";
        button.innerText = `${emoji} ${capitalizedType}`;
        button.onclick = () => selectFilterOption('type', name, capitalizedType, 'typeDropdown');
        container.appendChild(button);
    });
}

async function fetchPets() {
    try {
        const response = await fetch('/api/pets');
        if (!response.ok) throw new Error("Server error");
        pets = await response.json();
    } catch (err) {
        pets = safeJSONParse(localStorage.getItem('shelterPets'), []);
    }
    renderPets();
}

let catalogMode = 'looking';

function switchCatalogTab(mode) {
    catalogMode = mode;
    const lookingBtn = document.getElementById('tabLookingBtn');
    const adoptedBtn = document.getElementById('tabAdoptedBtn');

    if (mode === 'looking') {
        lookingBtn.className = "bg-brandYellow text-white font-bold py-2.5 px-6 rounded-full shadow-md transition text-xs flex items-center gap-2 transform hover:scale-105 duration-200";
        adoptedBtn.className = "bg-white border border-gray-200 text-gray-700 font-bold py-2.5 px-6 rounded-full shadow-sm hover:border-emerald-500 hover:text-emerald-600 transition text-xs flex items-center gap-2 transform hover:scale-105 duration-200";
    } else {
        adoptedBtn.className = "bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-full shadow-md transition text-xs flex items-center gap-2 transform hover:scale-105 duration-200";
        lookingBtn.className = "bg-white border border-gray-200 text-gray-700 font-bold py-2.5 px-6 rounded-full shadow-sm hover:border-brandYellow hover:text-brandYellow transition text-xs flex items-center gap-2 transform hover:scale-105 duration-200";
    }

    renderPets();
}

function renderPets() {
    const container = document.getElementById('petsContainer');
    const countLookingEl = document.getElementById('countLooking');
    const countAdoptedEl = document.getElementById('countAdopted');
    if (!container) return;
    container.innerHTML = '';

    const validPets = pets.filter(pet => pet && pet.name && pet.photo);

    const totalLooking = validPets.filter(p => p.status !== 'adopted').length;
    const totalAdopted = validPets.filter(p => p.status === 'adopted').length;
    if (countLookingEl) countLookingEl.innerText = totalLooking;
    if (countAdoptedEl) countAdoptedEl.innerText = totalAdopted;

    let filteredPets = validPets.filter(p => {
        if (catalogMode === 'adopted') {
            return p.status === 'adopted';
        } else {
            return p.status !== 'adopted';
        }
    });

    if (activeFilters.type !== 'all') {
        filteredPets = filteredPets.filter(pet => pet.type && pet.type.toLowerCase().trim() === activeFilters.type.toLowerCase().trim());
    }
    if (activeFilters.gender !== 'all') {
        filteredPets = filteredPets.filter(pet => pet.gender && pet.gender.toLowerCase().trim() === activeFilters.gender.toLowerCase().trim());
    }
    if (activeFilters.vaccinated !== 'all') {
        filteredPets = filteredPets.filter(pet => pet.vaccinated && pet.vaccinated.toLowerCase().trim() === activeFilters.vaccinated.toLowerCase().trim());
    }
    if (activeFilters.age !== 'all') {
        filteredPets = filteredPets.filter(pet => {
            const ageVal = parseInt(pet.ageValue);
            let ageInMonths = (pet.ageUnit === 'г.' || pet.ageUnit === 'лет') ? ageVal * 12 : ageVal;
            if (activeFilters.age === 'baby') return ageInMonths <= 12;
            if (activeFilters.age === 'young') return ageInMonths > 12 && ageInMonths <= 36;
            if (activeFilters.age === 'adult') return ageInMonths > 36;
            return true;
        });
    }
    if (activeFilters.weight !== 'all') {
        filteredPets = filteredPets.filter(pet => {
            const w = parseFloat(pet.weight);
            if (activeFilters.weight === 'small') return w <= 5;
            if (activeFilters.weight === 'medium') return w > 5 && w <= 15;
            if (activeFilters.weight === 'large') return w > 15;
            return true;
        });
    }

    if (filteredPets.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-gray-400 py-12 font-medium">${catalogMode === 'adopted' ? 'В счастливых историях пока нет питомцев. Но скоро они появятся!' : 'Питомцы с такими параметрами не найдены.'}</p>`;
        return;
    }

    filteredPets.forEach(pet => {
        const isAdopted = pet.status === 'adopted';
        const card = document.createElement('div');
        card.className = `bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition border ${isAdopted ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-100'} flex flex-col justify-between cursor-pointer min-w-0 w-full animate-fade-in relative`;
        card.onclick = () => openDetailsModal(pet);
        
        card.innerHTML = `
            ${isAdopted ? '<div class="absolute top-3 right-3 z-10 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md"> Я ДОМА!</div>' : ''}
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
                ${isAdopted ? `
                    <div class="w-full bg-emerald-100 text-emerald-800 text-center py-2.5 rounded-xl font-bold text-xs">
                         Спит на мягком диване!
                    </div>
                ` : `
                    <button class="w-full bg-brandYellow hover:bg-brandBrown text-white py-2.5 rounded-xl font-bold text-xs transition shadow-sm">
                        Подробнее / Познакомиться
                    </button>
                `}
            </div>
        `;
        container.appendChild(card);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    fetchPets();
    loadCategories();
});

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