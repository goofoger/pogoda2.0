document.addEventListener('DOMContentLoaded', () => {
    // ЗАМІНІТЬ 'YOUR_API_KEY' НА ВАШ РЕАЛЬНИЙ КЛЮЧ WEATHERAPI.COM
    const apiKey = '0df5ba23984c4c2d92595257252906'; // ЦЕЙ КЛЮЧ БУВ НАДАНИЙ У ВАШОМУ ФАЙЛІ!
    const apiUrlBase = 'https://api.weatherapi.com/v1/forecast.json';

    // Елементи DOM для оновлення погоди (залишаємо, як є)
    const locationSearchInput = document.getElementById('location-search');
    const currentLocationElem = document.getElementById('current-location');
    const currentTimeElem = document.getElementById('current-time');
    const currentTempElem = document.getElementById('current-temp');
    const currentWeatherIcon = document.getElementById('current-weather-icon');
    const currentConditionElem = document.getElementById('current-condition');
    const currentFeelsLikeElem = document.getElementById('current-feels-like');
    const currentPressureElem = document.getElementById('current-pressure');
    const currentWindElem = document.getElementById('current-wind');
    const currentVisibilityElem = document.getElementById('current-visibility');
    const currentDewPointElem = document.getElementById('current-dew-point');
    const currentHumidityElem = document.getElementById('current-humidity');
    const forecastCardsContainer = document.getElementById('forecast-cards-container');
    const dateInfoElem = document.querySelector('.date-info h2'); // This is a querySelector
    
    // ДОДАНО ПЕРЕВІРКУ НА ІСНУВАННЯ ЕЛЕМЕНТІВ АБО ВОНИ БУЛИ ВІДСУТНІ В HTML
    const currentDayNameElem = document.getElementById('current-day-name'); 
    const currentDayDateElem = document.getElementById('current-day-date'); 
    const forecastLocationElem = document.getElementById('forecast-location'); 
    // Кнопка видалення локації та кнопка пошуку також відсутні в HTML, але перевірка вже була
    const savedLocationButton = document.getElementById('save-location-btn');
    const removeLocationButton = document.getElementById('remove-location-btn'); 
    const searchButton = document.getElementById('search-button'); 

    // Елементи DOM для навігації
    const dashboardNavLink = document.getElementById('dashboard-nav-link');
    const mapNavLink = document.getElementById('map-nav-link');
    const savedLocationsNavLink = document.getElementById('saved-locations-nav-link');
    const mapSection = document.getElementById('map-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const savedLocationsSection = document.getElementById('saved-locations-section');

    // Елементи DOM для автентифікації
    const authButtons = document.getElementById('auth-buttons');
    const profileInfo = document.getElementById('profile-info');
    const logoutBtn = document.getElementById('logout-btn');
    const usernameDisplay = document.getElementById('username-display');

    // ------------- Початок логіки теми (оновлено) -------------

    // Отримання елементів перемикача теми
    const themeToggleMoon = document.getElementById('theme-toggle-moon');
    const themeToggleSun = document.getElementById('theme-toggle-sun');

    // Функція для застосування теми (світла/темна)
    function applyTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            if (themeToggleMoon) themeToggleMoon.style.display = 'none';
            if (themeToggleSun) themeToggleSun.style.display = 'inline';
        } else {
            document.body.classList.remove('dark-theme');
            if (themeToggleMoon) themeToggleMoon.style.display = 'inline';
            if (themeToggleSun) themeToggleSun.style.display = 'none';
        }
    }

    // Обробники перемикання теми
    // Додаємо перевірку на існування елементів перед додаванням слухачів подій
    if (themeToggleMoon) {
        themeToggleMoon.addEventListener('click', () => {
            localStorage.setItem('theme', 'dark');
            applyTheme();
        });
    }

    if (themeToggleSun) {
        themeToggleSun.addEventListener('click', () => {
            localStorage.setItem('theme', 'light');
            applyTheme();
        });
    }

    // Застосовуємо тему негайно при завантаженні сторінки
    // Це викликається після того, як DOM вже завантажений
    applyTheme();

    // ------------- Кінець логіки теми (оновлено) -------------


    // Функція для перевірки статусу автентифікації та оновлення UI
    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/check-auth');
            const data = await response.json();

            if (data.isAuthenticated) {
                authButtons.style.display = 'none';
                profileInfo.style.display = 'flex';
                usernameDisplay.textContent = data.username;
            } else {
                authButtons.style.display = 'flex';
                profileInfo.style.display = 'none';
            }
        } catch (error) {
            console.error('Помилка перевірки статусу автентифікації:', error);
            authButtons.style.display = 'flex';
            profileInfo.style.display = 'none';
        }
    }

    // Обробник виходу з системи
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/logout', { method: 'POST' });
                const data = await response.json();
                if (response.ok) {
                    alert(data.message);
                    window.location.href = '/login.html'; // Перенаправлення на сторінку входу
                } else {
                    alert(data.message || 'Помилка виходу');
                }
            } catch (error) {
                console.error('Помилка мережі:', error);
                alert('Помилка з\'єднання з сервером. Спробуйте пізніше.');
            }
        });
    }

    // Функції для завантаження та відображення даних про погоду
    async function loadWeatherData(location, days = 3) {
        const url = `${apiUrlBase}?key=${apiKey}&q=${location}&days=${days}&aqi=no&alerts=no`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'Помилка завантаження даних про погоду');
            }
            const data = await response.json();
            updateWeatherUI(data);
            localStorage.setItem('lastLocation', location); // Зберігаємо останню локацію
        } catch (error) {
            console.error('Помилка завантаження даних про погоду:', error);
            alert('Не вдалося завантажити дані про погоду: ' + error.message);
        }
    }

    function updateWeatherUI(data) {
        const { location, current, forecast } = data;

        if (currentLocationElem) currentLocationElem.textContent = location.name;
        if (currentTimeElem) currentTimeElem.textContent = new Date(current.last_updated).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
        if (currentTempElem) currentTempElem.innerHTML = `${current.temp_c}<span class="celsius">°C</span>`;
        if (currentWeatherIcon) currentWeatherIcon.src = current.condition.icon;
        if (currentConditionElem) currentConditionElem.textContent = current.condition.text;
        if (currentFeelsLikeElem) currentFeelsLikeElem.innerHTML = `Відчувається як: ${current.feelslike_c}°C`;
        if (currentPressureElem) currentPressureElem.textContent = `Тиск: ${current.pressure_mb} мб`;
        if (currentWindElem) currentWindElem.textContent = `Вітер: ${current.wind_kph} км/год (${current.wind_dir})`;
        if (currentVisibilityElem) currentVisibilityElem.textContent = `Видимість: ${current.vis_km} км`;
        if (currentDewPointElem) currentDewPointElem.textContent = `Точка роси: ${current.dewpoint_c}°C`;
        if (currentHumidityElem) currentHumidityElem.textContent = `Вологість: ${current.humidity}%`;

        // Оновлення інформації про поточний день (ДОДАНО ПЕРЕВІРКИ)
        const currentDate = new Date(location.localtime);
        if (currentDayNameElem) currentDayNameElem.textContent = currentDate.toLocaleDateString('uk-UA', { weekday: 'long' });
        if (currentDayDateElem) currentDayDateElem.textContent = currentDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
        if (forecastLocationElem) forecastLocationElem.textContent = location.name;


        // Прогноз погоди
        if (forecastCardsContainer) forecastCardsContainer.innerHTML = '';
        if (forecast && forecast.forecastday) { // Додано перевірку на forecast.forecastday
            forecast.forecastday.forEach(day => {
                const forecastCard = document.createElement('div');
                forecastCard.classList.add('forecast-card');

                const date = new Date(day.date);
                const dayName = date.toLocaleDateString('uk-UA', { weekday: 'short' });
                const avgTemp = day.day.avgtemp_c;
                const conditionIcon = day.day.condition.icon;
                const conditionText = day.day.condition.text;

                forecastCard.innerHTML = `
                    <p class="day-name">${dayName}</p>
                    <img src="${conditionIcon}" alt="${conditionText}">
                    <p class="avg-temp">${avgTemp}°C</p>
                    <p class="condition-text">${conditionText}</p>
                `;
                if (forecastCardsContainer) forecastCardsContainer.appendChild(forecastCard);
            });
        }

        // Оновлення погодинного прогнозу
        const hourlyForecastContainer = document.getElementById('forecast-hourly-container'); // Виправлено ID тут
        if (hourlyForecastContainer) { // Перевірка, чи існує контейнер для погодинного прогнозу
            hourlyForecastContainer.innerHTML = '';
            // Перевіряємо, чи існує forecast.forecastday[0] та forecast.forecastday[0].hour
            if (forecast && forecast.forecastday && forecast.forecastday[0] && forecast.forecastday[0].hour) {
                const hoursInDay = forecast.forecastday[0].hour; // Беремо погодинний прогноз для поточного дня
                const now = new Date();
                const currentHour = now.getHours();

                hoursInDay.forEach(hourData => {
                    const hour = new Date(hourData.time).getHours();
                    // Показуємо прогноз, починаючи з поточної години
                    if (hour >= currentHour) {
                        const hourlyItem = document.createElement('div');
                        hourlyItem.classList.add('hourly-item');
                        hourlyItem.innerHTML = `
                            <p class="hourly-time">${hour}:00</p>
                            <img src="${hourData.condition.icon}" alt="${hourData.condition.text}">
                            <p class="hourly-temp">${hourData.temp_c}°C</p>
                        `;
                        hourlyForecastContainer.appendChild(hourlyItem);
                    }
                });
            }
        }
    }


    // Обробник пошуку локації
    if (searchButton) { // Додано перевірку
        searchButton.addEventListener('click', () => {
            const location = locationSearchInput.value.trim();
            if (location) {
                loadWeatherData(location);
            } else {
                alert('Будь ласка, введіть назву міста.');
            }
        });
    }

    if (locationSearchInput) { // Додано перевірку
        locationSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const location = locationSearchInput.value.trim();
                if (location) {
                    loadWeatherData(location);
                } else {
                    alert('Будь ласка, введіть назву міста.');
                }
            }
        });
    }

    // Функції для збереження/видалення локацій
    async function saveLocation(locationName) {
        try {
            const response = await fetch('/api/saved-locations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: locationName }),
            });
            const data = await response.json();
            if (response.ok) {
                alert(data.message);
                loadSavedLocations(); // Оновити список збережених локацій
            } else {
                alert(data.message || 'Помилка збереження локації.');
            }
        } catch (error) {
            console.error('Помилка мережі:', error);
            alert('Помилка з\'єднання з сервером. Спробуйте пізніше.');
        }
    }

    async function removeLocation(locationId) {
        try {
            const response = await fetch(`/api/saved-locations/${locationId}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (response.ok) {
                alert(data.message);
                loadSavedLocations(); // Оновити список збережених локацій
            } else {
                alert(data.message || 'Помилка видалення локації.');
            }
        } catch (error) {
            console.error('Помилка мережі:', error);
            alert('Помилка з\'єднання з сервером. Спробуйте пізніше.');
        }
    }

    async function loadSavedLocations() {
        const savedLocationsList = document.getElementById('saved-locations-list');
        if (!savedLocationsList) return; // Перевірка, якщо елемент не існує

        try {
            const response = await fetch('/api/saved-locations');
            const data = await response.json();

            if (response.ok && data.locations) {
                savedLocationsList.innerHTML = ''; // Очищаємо список
                if (data.locations.length === 0) {
                    savedLocationsList.innerHTML = '<li style="color: var(--text-color);">У вас немає збережених локацій.</li>';
                    return;
                }
                data.locations.forEach(location => {
                    const li = document.createElement('li');
                    li.classList.add('saved-location-item');
                    li.innerHTML = `
                        <span class="location-name" data-location-name="${location.name}">${location.name}</span>
                        <button class="remove-location-btn" data-location-id="${location.id}">Видалити</button>
                    `;
                    savedLocationsList.appendChild(li);
                });

                // Додаємо обробники подій для нових кнопок "Видалити" та кліків на назвах локацій
                document.querySelectorAll('.remove-location-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const locationId = e.target.dataset.locationId;
                        if (confirm('Ви впевнені, що хочете видалити цю локацію?')) {
                            removeLocation(locationId);
                        }
                    });
                });

                document.querySelectorAll('.saved-location-item .location-name').forEach(nameSpan => {
                    nameSpan.addEventListener('click', (e) => {
                        const locationName = e.target.dataset.locationName;
                        showSection('dashboard'); // Перехід на Dashboard
                        loadWeatherData(locationName); // Завантаження даних погоди для обраної локації
                    });
                });

            } else {
                console.error('Помилка завантаження збережених локацій:', data.message);
                savedLocationsList.innerHTML = `<li style="color: var(--text-color);">Помилка завантаження: ${data.message || 'Невідома помилка'}</li>`;
            }
        } catch (error) {
            console.error('Помилка мережі при завантаженні збережених локацій:', error);
            savedLocationsList.innerHTML = '<li style="color: var(--text-color);">Помилка з\'єднання з сервером.</li>';
        }
    }


    if (savedLocationButton) {
        savedLocationButton.addEventListener('click', () => {
            const currentLocation = currentLocationElem.textContent; // Отримуємо поточне місто
            if (currentLocation) {
                saveLocation(currentLocation);
            } else {
                alert('Немає поточної локації для збереження.');
            }
        });
    }

    if (removeLocationButton) {
        removeLocationButton.addEventListener('click', async () => {
            const currentLocation = currentLocationElem.textContent;
            if (!currentLocation) {
                alert('Немає поточної локації для видалення.');
                return;
            }

            try {
                // Отримати ID локації для видалення
                const response = await fetch('/api/saved-locations');
                const data = await response.json();
                if (response.ok && data.locations) {
                    const locationToRemove = data.locations.find(loc => loc.name === currentLocation);
                    if (locationToRemove) {
                        if (confirm(`Ви впевнені, що хочете видалити "${currentLocation}" зі збережених локацій?`)) {
                            removeLocation(locationToRemove.id);
                        }
                    } else {
                        alert('Ця локація не збережена.');
                    }
                } else {
                    alert('Помилка отримання збережених локацій для видалення.');
                }
            } catch (error) {
                console.error('Помилка мережі при видаленні локації:', error);
                alert('Помилка з\'єднання з сервером. Спробуйте пізніше.');
            }
        });
    }

    // Функція для навігації між секціями
    function showSection(sectionId) {
        // Приховуємо всі секції
        if (dashboardSection) dashboardSection.style.display = 'none';
        if (mapSection) mapSection.style.display = 'none';
        if (savedLocationsSection) savedLocationsSection.style.display = 'none';

        // Показуємо потрібну секцію
        const targetSection = document.getElementById(`${sectionId}-section`);
        if (targetSection) targetSection.style.display = 'block';

        // Оновлюємо активний стан у навігації
        document.querySelectorAll('.sidebar .navigation ul li').forEach(item => {
            item.classList.remove('active');
        });
        const navLink = document.querySelector(`.sidebar .navigation a[data-section="${sectionId}"]`);
        if (navLink && navLink.parentElement) {
            navLink.parentElement.classList.add('active');
        }

        // Якщо перейшли на збережені локації, оновлюємо список
        if (sectionId === 'saved-locations') {
            loadSavedLocations();
        }
    }

    // Обробники кліків для навігаційних посилань
    if (dashboardNavLink) {
        dashboardNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('dashboard');
        });
    }
    if (mapNavLink) {
        mapNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('map');
        });
    }
    if (savedLocationsNavLink) { // Обробник для посилання "Saved Location"
        savedLocationsNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('saved-locations');
        });
    }

    // Початкові дії при завантаженні сторінки
    checkAuthStatus(); // Викликаємо цю функцію, щоб оновити стан кнопок
    // applyTheme() тут викликається на початку DOMContentLoaded

    // Завантажуємо погоду для останньої збереженої локації або для поточної за IP
    const lastLocation = localStorage.getItem('lastLocation');
    if (lastLocation) {
        loadWeatherData(lastLocation);
    } else {
        // Якщо немає останньої локації, спробувати отримати поточну за IP
        fetch('https://ipapi.co/json/')
            .then(response => response.json())
            .then(data => {
                if (data.city) {
                    loadWeatherData(data.city);
                } else {
                    loadWeatherData('Kyiv'); // Локація за замовчуванням, якщо IP-геолокація не вдалася
                }
            })
            .catch(error => {
                console.error('Помилка отримання локації за IP:', error);
                loadWeatherData('Kyiv'); // Локація за замовчуванням у разі помилки
            });
    }
});