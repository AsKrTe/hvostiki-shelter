let allArticles = [];
let currentCategory = '';

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

async function fetchArticles() {
    try {
        const response = await fetch('/api/articles');
        if (!response.ok) throw new Error("Server error");
        allArticles = await response.json();
    } catch (e) {
        allArticles = safeJSONParse(localStorage.getItem('shelterArticles'), []);
    }

    // Если статьи есть, активируем первую категорию по умолчанию
    if (allArticles.length > 0 && !currentCategory) {
        currentCategory = allArticles[0].category;
    }

    renderCategoryButtons();
    renderCurrentArticle();
}

// Рендер кнопок видов животных (1 статья = 1 кнопка)
// Рендер кнопок видов животных (1 статья = 1 кнопка)
// Рендер кнопок видов животных (без смайликов)
function renderCategoryButtons() {
    const container = document.getElementById('articleCategoriesBar');
    if (!container) return;
    container.innerHTML = '';

    if (allArticles.length === 0) {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');

    allArticles.forEach(article => {
        const rawCat = (article.category || '').trim();
        const cat = rawCat.toLowerCase();
        
        let label = '';
        if (cat === 'cat' || cat === 'кот' || cat === 'кошка') {
            label = 'Для кошек и котят';
        } else if (cat === 'dog' || cat === 'собака') {
            label = 'Для собак и щенков';
        } else if (cat === 'all' || cat === 'все' || cat === 'общие' || cat === 'общие советы') {
            label = 'Общие советы';
        } else {
            label = `Для ${rawCat.charAt(0).toUpperCase() + rawCat.slice(1)}`;
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = (currentCategory || '').toLowerCase() === cat
            ? "bg-[#F2A900] text-[#291D17] font-black text-xs px-5 py-2.5 rounded-full shadow-md transition border-2 border-[#F2A900]"
            : "bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-2.5 rounded-full transition border border-white/20";
        btn.innerText = label;
        btn.onclick = () => filterArticles(rawCat);
        container.appendChild(btn);
    });
}

function filterArticles(category) {
    currentCategory = category;
    renderCategoryButtons();
    renderCurrentArticle();
}

// Отображение выбранной статьи
// Отрисовка статьи с пропорциональными крупными шрифтами
// Отрисовка статьи в журнальном стиле (с нумерацией глав 01, 02 вместо смайликов)
function renderCurrentArticle() {
    const noArticlesBox = document.getElementById('noArticlesMessage');
    const articleWrapper = document.getElementById('articleDisplayWrapper');

    if (allArticles.length === 0) {
        if (noArticlesBox) noArticlesBox.classList.remove('hidden');
        if (articleWrapper) articleWrapper.classList.add('hidden');
        return;
    }

    const article = allArticles.find(a => (a.category || '').toLowerCase() === (currentCategory || '').toLowerCase()) || allArticles[0];

    if (!article) {
        if (noArticlesBox) noArticlesBox.classList.remove('hidden');
        if (articleWrapper) articleWrapper.classList.add('hidden');
        return;
    }

    if (noArticlesBox) noArticlesBox.classList.add('hidden');
    if (articleWrapper) articleWrapper.classList.remove('hidden');

    document.getElementById('articleAnnotation').innerText = article.annotation || '';
    document.getElementById('articleMainTitle').innerText = article.title || '';
    document.getElementById('articleMainContent').innerText = article.content || '';
    
    const photoEl = document.getElementById('articlePhoto');
    const photoWrap = document.getElementById('articlePhotoWrapper');
    if (article.photo) {
        photoEl.src = article.photo;
        photoWrap.classList.remove('hidden');
    } else {
        photoWrap.classList.add('hidden');
    }

    // 1. Оглавление с аккуратной нумерацией
    const tocContainer = document.getElementById('tableOfContentsList');
    tocContainer.innerHTML = '';

    const chapters = article.chapters || [];

    const mainToc = document.createElement('a');
    mainToc.href = "#articleMainTitle";
    mainToc.className = "py-3 flex justify-between items-center hover:text-[#F2A900] transition group text-sm sm:text-base";
    mainToc.innerHTML = `
        <span class="flex items-center gap-3">
            <span class="text-xs font-mono font-black text-[#F2A900] bg-amber-50 px-2 py-0.5 rounded">00</span>
            <span class="group-hover:translate-x-1 transition-transform">Введение</span>
        </span>
        <span class="text-gray-300 font-bold group-hover:text-[#F2A900]">&rarr;</span>
    `;
    tocContainer.appendChild(mainToc);

    chapters.forEach((ch, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        const item = document.createElement('a');
        item.href = `#chapter-${idx}`;
        item.className = "py-3 flex justify-between items-center hover:text-[#F2A900] transition group text-sm sm:text-base";
        item.innerHTML = `
            <span class="flex items-center gap-3">
                <span class="text-xs font-mono font-black text-[#F2A900] bg-amber-50 px-2 py-0.5 rounded">${num}</span>
                <span class="group-hover:translate-x-1 transition-transform">${escapeHTML(ch.title)}</span>
            </span>
            <span class="text-gray-300 font-bold group-hover:text-[#F2A900]">&rarr;</span>
        `;
        tocContainer.appendChild(item);
    });

    // 2. Главы статьи с бейджами разделов
    const chaptersContainer = document.getElementById('articleChaptersContainer');
    chaptersContainer.innerHTML = '';

    chapters.forEach((ch, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        const block = document.createElement('div');
        block.id = `chapter-${idx}`;
        block.className = "space-y-4 pt-8 border-t border-gray-100 scroll-mt-24";
        
        block.innerHTML = `
            <div>
                <span class="text-[10px] font-black uppercase tracking-wider text-[#291D17] bg-[#F2A900]/20 px-2.5 py-1 rounded-md inline-block mb-2 font-mono">
                    РАЗДЕЛ ${num}
                </span>
                <h4 class="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">${escapeHTML(ch.title)}</h4>
            </div>
            <p class="text-base sm:text-lg text-gray-700 leading-relaxed font-normal">${escapeHTML(ch.text)}</p>
            ${ch.photo ? `
                <div class="rounded-2xl overflow-hidden bg-gray-100 shadow-sm border border-gray-200 h-64 sm:h-80 w-full mt-4">
                    <img src="${ch.photo}" alt="${escapeHTML(ch.title)}" loading="lazy" class="w-full h-full object-cover">
                </div>
            ` : ''}
        `;
        chaptersContainer.appendChild(block);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    fetchArticles();
});