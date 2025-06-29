const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const WEATHER_API_KEY = '0df5ba23984c4c2d92595257252906';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Налаштування сесій
app.use(session({
    secret: 'your_secret_key_very_secret_and_long', // !!! Змініть на довший і складніший ключ
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Встановіть true, якщо використовуєте HTTPS
}));

// Підключення до бази даних SQLite
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Помилка підключення до бази даних:', err.message);
    } else {
        console.log('Підключено до бази даних SQLite.');
        // Створення таблиці users, якщо вона не існує
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password TEXT
        )`, (err) => {
            if (err) {
                console.error('Помилка створення таблиці users:', err.message);
            } else {
                console.log('Таблиця users готова.');
            }
        });

        // Створення таблиці saved_locations, якщо вона не існує
        db.run(`CREATE TABLE IF NOT EXISTS saved_locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            name TEXT NOT NULL,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`, (err) => {
            if (err) {
                console.error('Помилка створення таблиці saved_locations:', err.message);
            } else {
                console.log('Таблиця saved_locations готова.');
            }
        });
    }
});

// Middleware для перевірки авторизації
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ message: 'Не авторизовано.' });
    }
}

// *** Маршрути авторизації ***

// Маршрут для реєстрації
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Будь ласка, заповніть усі поля.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ message: 'Користувач з таким ім\'ям або електронною поштою вже існує.' });
                }
                console.error('Помилка при реєстрації:', err.message);
                return res.status(500).json({ message: 'Помилка реєстрації користувача.' });
            }
            res.status(201).json({ message: 'Реєстрація успішна! Тепер ви можете увійти.' });
        });
    } catch (error) {
        console.error('Помилка хешування пароля:', error);
        res.status(500).json({ message: 'Помилка на сервері.' });
    }
});

// Маршрут для входу
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('Помилка при вході:', err.message);
            return res.status(500).json({ message: 'Помилка сервера.' });
        }
        if (!user) {
            return res.status(400).json({ message: 'Неправильне ім\'я користувача або пароль.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Неправильне ім\'я користувача або пароль.' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        res.status(200).json({ message: 'Вхід успішний!', username: user.username });
    });
});

// Маршрут для виходу
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Не вдалося вийти з системи.' });
        }
        res.clearCookie('connect.sid'); // Очистити cookie сесії
        res.status(200).json({ message: 'Вихід успішний.' });
    });
});

// Маршрут для перевірки статусу авторизації
app.get('/api/check-auth', (req, res) => {
    if (req.session.userId) {
        res.status(200).json({ isAuthenticated: true, username: req.session.username });
    } else {
        res.status(200).json({ isAuthenticated: false });
    }
});

// *** Маршрут проксі для WeatherAPI (поточна погода та прогноз) ***
app.get('/api/weather', async (req, res) => {
    const location = req.query.location;
    if (!location) {
        return res.status(400).json({ message: 'Будь ласка, надайте локацію.' });
    }

    try {
        // Запит прогнозу на 3 дні, включаючи поточний день
        const response = await axios.get(`http://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&days=3&aqi=no&alerts=no`);
        res.json(response.data);
    } catch (error) {
        console.error('Помилка запиту до WeatherAPI:', error.message);
        if (error.response) {
            console.error('WeatherAPI response status:', error.response.status);
            console.error('WeatherAPI response data:', error.response.data);
            res.status(error.response.status).json({ message: error.response.data.error.message || 'Помилка отримання даних про погоду від зовнішнього API' });
        } else {
            res.status(500).json({ message: 'Помилка сервера при отриманні даних про погоду.' });
        }
    }
});

// *** Маршрути для збережених локацій ***

// Маршрут для додавання збереженої локації (POST)
app.post('/api/saved-locations', isAuthenticated, (req, res) => {
    const { name } = req.body;
    const userId = req.session.userId;

    if (!name) {
        return res.status(400).json({ message: 'Ім\'я локації не може бути порожнім.' });
    }

    // Перевірка, чи локація вже збережена для цього користувача
    db.get('SELECT * FROM saved_locations WHERE userId = ? AND name = ?', [userId, name], (err, row) => {
        if (err) {
            console.error('Помилка при перевірці збереженої локації:', err.message);
            return res.status(500).json({ message: 'Помилка при збереженні локації.' });
        }
        if (row) {
            return res.status(409).json({ message: 'Ця локація вже збережена.' });
        }

        db.run('INSERT INTO saved_locations (userId, name) VALUES (?, ?)', [userId, name], function (err) {
            if (err) {
                console.error('Помилка при збереженні локації:', err.message);
                return res.status(500).json({ message: 'Помилка при збереженні локації.' });
            }
            res.status(201).json({ message: 'Локація успішно збережена!', id: this.lastID });
        });
    });
});

// Маршрут для отримання збережених локацій користувача (GET)
app.get('/api/saved-locations', isAuthenticated, (req, res) => {
    const userId = req.session.userId;

    db.all('SELECT id, name FROM saved_locations WHERE userId = ?', [userId], (err, rows) => {
        if (err) {
            console.error('Помилка при отриманні збережених локацій:', err.message);
            return res.status(500).json({ message: 'Помилка при отриманні збережених локацій.' });
        }
        res.status(200).json({ locations: rows });
    });
});

// Маршрут для видалення збереженої локації (DELETE)
app.delete('/api/saved-locations/:id', isAuthenticated, (req, res) => {
    const locationId = req.params.id;
    const userId = req.session.userId;

    db.run('DELETE FROM saved_locations WHERE id = ? AND userId = ?', [locationId, userId], function (err) {
        if (err) {
            console.error('Помилка при видаленні локації:', err.message);
            return res.status(500).json({ message: 'Помилка при видаленні локації.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Локація не знайдена або у вас немає прав на її видалення.' });
        }
        res.status(200).json({ message: 'Локація успішно видалена.' });
    });
});


// Статичні файли (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '')));

// Обробка неіснуючих маршрутів (для SPA або помилок 404)
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html')); // Можете створити 404.html
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
});