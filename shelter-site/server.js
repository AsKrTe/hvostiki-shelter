const express = require('express');
const compression = require('compression');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = "123";

// Включаем Gzip/Deflate сжатие ответов (ускоряет отдачу JSON и ассетов в 3-5 раз)
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Разрешение CORS + поддержка туннелей (Localtunnel / Ngrok / Cloudflare)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, bypass-tunnel-reminder, x-requested-with');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Кэширование картинок на 1 день (картинки скачиваются один раз и сохраняются в браузере)
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Раздача файлов из корня проекта (HTML, js, logo.png) без кэширования HTML
app.use(express.static(__dirname, {
    maxAge: 0
}));

// Проверяем и создаем папки
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync('./public/uploads')) fs.mkdirSync('./public/uploads', { recursive: true });

// Умный поиск файлов: если файл лежит в корне, берем его и переносим в ./data/
function resolveDataFile(fileName, defaultContent = []) {
    const dataPath = path.join(DATA_DIR, fileName);
    const rootPath = path.join(__dirname, fileName);

    if (!fs.existsSync(dataPath) && fs.existsSync(rootPath)) {
        try {
            fs.copyFileSync(rootPath, dataPath);
        } catch (e) {
            console.error(`Не удалось скопировать ${fileName} в папку data:`, e);
        }
    }
    return dataPath;
}

const petsFilePath = resolveDataFile('pets.json');
const appsFilePath = resolveDataFile('apps.json');
const categoriesFilePath = resolveDataFile('categories.json');
const needsFilePath = resolveDataFile('needs.json');
const itemAppsFilePath = resolveDataFile('item_applications.json');
const reqFilePath = resolveDataFile('requisites.json');
const articlesFilePath = resolveDataFile('articles.json');
const artCatFilePath = resolveDataFile('article_categories.json', []);
// Чтение и запись файлов
function readData(filePath, defaultData = []) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
        return defaultData;
    }
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return defaultData;
    }
}

function writeData(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Настройка Multer
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function (req, file, cb) {
        cb(null, 'pet-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- API ЭНДПОИНТЫ ---

// 1. Авторизация
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: "secure-session-token-abc123" });
    } else {
        res.status(401).json({ success: false, message: "Неверный пароль" });
    }
});

// 2. Питомцы
app.get('/api/pets', (req, res) => {
    const pets = readData(petsFilePath, []);
    const convertedPets = pets.map(pet => {
        if (pet.type === 'dog') pet.type = 'собака';
        if (pet.type === 'cat') pet.type = 'кот';
        return pet;
    });
    res.json(convertedPets);
});

app.post('/api/pets', (req, res) => {
    const pets = readData(petsFilePath, []);
    const newPet = { id: Date.now(), ...req.body };
    pets.push(newPet);
    writeData(petsFilePath, pets);
    res.json({ success: true, pet: newPet });
});

app.put('/api/pets/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let pets = readData(petsFilePath, []);
    const index = pets.findIndex(p => p.id === id);
    if (index !== -1) {
        pets[index] = { id, ...req.body };
        writeData(petsFilePath, pets);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: "Питомец не найден" });
    }
});

app.delete('/api/pets/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let pets = readData(petsFilePath, []);
    pets = pets.filter(p => p.id !== id);
    writeData(petsFilePath, pets);
    res.json({ success: true });
});

// 3. Загрузка фото
app.post('/api/upload', upload.single('photo'), (req, res) => {
    if (req.file) {
        res.json({ success: true, filePath: '/uploads/' + req.file.filename });
    } else {
        res.status(400).json({ success: false, message: "Ошибка при загрузке файла" });
    }
});

// 4. Заявки на питомцев
app.get('/api/applications', (req, res) => {
    res.json(readData(appsFilePath, []));
});

app.post('/api/applications', (req, res) => {
    const apps = readData(appsFilePath, []);
    const newApp = { id: Date.now(), ...req.body };
    apps.push(newApp);
    writeData(appsFilePath, apps);
    res.json({ success: true });
});

app.delete('/api/applications/:id', (req, res) => {
    const targetId = String(req.params.id);
    let apps = readData(appsFilePath, []);
    apps = apps.filter(a => String(a.id) !== targetId);
    writeData(appsFilePath, apps);
    res.json({ success: true });
});

// 5. Категории видов животных
app.get('/api/categories', (req, res) => {
    res.json(readData(categoriesFilePath, { types: [{ name: "собака", emoji: "🐕" }, { name: "кот", emoji: "🐈" }] }));
});

app.post('/api/categories/types', (req, res) => {
    const { newType, newEmoji } = req.body;
    if (!newType || !newEmoji) {
        return res.status(400).json({ success: false, message: "Название вида и смайлик обязательны" });
    }
    const categories = readData(categoriesFilePath, { types: [] });
    const exists = categories.types.some(t => (t.name || t).toLowerCase() === newType.toLowerCase());
    if (!exists) {
        categories.types.push({ name: newType.toLowerCase(), emoji: newEmoji });
        writeData(categoriesFilePath, categories);
    }
    res.json({ success: true, categories });
});

app.delete('/api/categories/types', (req, res) => {
    const { typeToDelete } = req.body;
    if (!typeToDelete) {
        return res.status(400).json({ success: false, message: "Не указан вид для удаления" });
    }
    const categories = readData(categoriesFilePath, { types: [] });
    categories.types = categories.types.filter(t => (t.name || t) !== typeToDelete);
    writeData(categoriesFilePath, categories);
    res.json({ success: true, categories });
});

// 6. Сборы и нужды
app.get('/api/needs', (req, res) => {
    res.json(readData(needsFilePath, []));
});

app.post('/api/needs', (req, res) => {
    const needs = readData(needsFilePath, []);
    const newNeed = { id: Date.now(), ...req.body };
    needs.push(newNeed);
    writeData(needsFilePath, needs);
    res.json({ success: true, need: newNeed });
});

app.put('/api/needs/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let needs = readData(needsFilePath, []);
    const index = needs.findIndex(n => n.id === id);
    if (index !== -1) {
        needs[index] = { id, ...req.body };
        writeData(needsFilePath, needs);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

app.delete('/api/needs/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let needs = readData(needsFilePath, []);
    needs = needs.filter(n => n.id !== id);
    writeData(needsFilePath, needs);
    res.json({ success: true });
});

app.post('/api/needs/donate/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { amount } = req.body;
    let needs = readData(needsFilePath, []);
    const need = needs.find(n => n.id === id);
    if (need) {
        need.collected += parseFloat(amount);
        writeData(needsFilePath, needs);
        res.json({ success: true, need });
    } else {
        res.status(404).json({ success: false });
    }
});

// 7. Доставка вещей
app.get('/api/needs/deliveries', (req, res) => {
    res.json(readData(itemAppsFilePath, []));
});

app.post('/api/needs/deliveries', (req, res) => {
    const apps = readData(itemAppsFilePath, []);
    const newApp = { id: Date.now(), status: 'pending', date: new Date().toLocaleDateString('ru-RU'), ...req.body };
    apps.push(newApp);
    writeData(itemAppsFilePath, apps);
    res.json({ success: true });
});

app.put('/api/needs/deliveries/:id/confirm', (req, res) => {
    const id = parseInt(req.params.id);
    let apps = readData(itemAppsFilePath, []);
    const appItem = apps.find(a => a.id === id);
    
    if (appItem && appItem.status !== 'confirmed') {
        appItem.status = 'confirmed';
        writeData(itemAppsFilePath, apps);

        let needs = readData(needsFilePath, []);
        const need = needs.find(n => n.id === parseInt(appItem.needId));
        if (need) {
            need.collected += parseFloat(appItem.quantity);
            writeData(needsFilePath, needs);
        }
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false });
    }
});

app.delete('/api/needs/deliveries/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let apps = readData(itemAppsFilePath, []);
    apps = apps.filter(a => a.id !== id);
    writeData(itemAppsFilePath, apps);
    res.json({ success: true });
});

// 8. Реквизиты
app.get('/api/requisites', (req, res) => {
    res.json(readData(reqFilePath, {
        card: "4276 3800 1234 5678",
        phone: "+7 (999) 000-00-00",
        qrImage: ""
    }));
});

app.put('/api/requisites', (req, res) => {
    const data = req.body;
    writeData(reqFilePath, data);
    res.json({ success: true, data });
});

// 9. Статьи и категории статей
app.get('/api/articles', (req, res) => {
    res.json(readData(articlesFilePath, []));
});

// Запрет создавать дубликаты статей
app.post('/api/articles', (req, res) => {
    const articles = readData(articlesFilePath, []);
    const { title, category } = req.body;

    const titleDup = articles.find(a => (a.title || '').toLowerCase().trim() === (title || '').toLowerCase().trim());
    if (titleDup) {
        return res.status(400).json({ success: false, message: "Статья с таким названием уже существует!" });
    }

    const catDup = articles.find(a => (a.category || '').toLowerCase().trim() === (category || '').toLowerCase().trim());
    if (catDup) {
        return res.status(400).json({ success: false, message: "Статья для этого вида животного уже существует! В приюте действует правило: 1 статья на 1 вид." });
    }

    const newArticle = { id: Date.now(), date: new Date().toLocaleDateString('ru-RU'), ...req.body };
    articles.push(newArticle);
    writeData(articlesFilePath, articles);
    res.json({ success: true, article: newArticle });
});

app.put('/api/articles/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let articles = readData(articlesFilePath, []);
    const index = articles.findIndex(a => a.id === id);
    if (index === -1) {
        return res.status(404).json({ success: false, message: "Статья не найдена" });
    }

    const { title, category } = req.body;
    const titleDup = articles.find(a => a.id !== id && (a.title || '').toLowerCase().trim() === (title || '').toLowerCase().trim());
    if (titleDup) {
        return res.status(400).json({ success: false, message: "Другая статья с таким названием уже существует!" });
    }

    const catDup = articles.find(a => a.id !== id && (a.category || '').toLowerCase().trim() === (category || '').toLowerCase().trim());
    if (catDup) {
        return res.status(400).json({ success: false, message: "Статья для этого вида животного уже существует!" });
    }

    articles[index] = { id, date: new Date().toLocaleDateString('ru-RU'), ...req.body };
    writeData(articlesFilePath, articles);
    res.json({ success: true });
});

app.delete('/api/articles/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let articles = readData(articlesFilePath, []);
    articles = articles.filter(a => a.id !== id);
    writeData(articlesFilePath, articles);
    res.json({ success: true });
});

// Синхронизация категорий статей для всех компьютеров
app.get('/api/article-categories', (req, res) => {
    res.json(readData(artCatFilePath, []));
});

app.post('/api/article-categories', (req, res) => {
    const { category } = req.body;
    if (!category) return res.status(400).json({ success: false });
    const cats = readData(artCatFilePath, []);
    const cleanCat = category.trim().toLowerCase();
    if (!cats.includes(cleanCat)) {
        cats.push(cleanCat);
        writeData(artCatFilePath, cats);
    }
    res.json({ success: true, categories: cats });
});

app.delete('/api/article-categories/:name', (req, res) => {
    const catToDelete = req.params.name.trim().toLowerCase();
    let cats = readData(artCatFilePath, []);
    cats = cats.filter(c => c.toLowerCase() !== catToDelete);
    writeData(artCatFilePath, cats);
    res.json({ success: true, categories: cats });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});