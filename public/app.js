class NailBookingApp {
    constructor() {
        this.currentUser = null;
        this.selectedMaster = null;
        this.selectedService = null;
        this.selectedDate = null;
        this.selectedTime = null;
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.masters = [];
        this.services = [];
        
        this.init();
    }

    async init() {
        await this.checkAuth();
        await this.loadMasters();
        await this.loadServices();
        this.setupEventListeners();
        this.renderCalendar();
    }

    async checkAuth() {
        const profileId = this.getCookie('user_profile');
        if (profileId) {
            this.currentUser = { profile_id: profileId };
            this.showMainApp();
        } else {
            this.showLoginModal();
        }
    }

    async loadMasters() {
        try {
            const response = await fetch('/api/masters');
            this.masters = await response.json();
            this.renderMasters();
        } catch (error) {
            console.error('Error loading masters:', error);
        }
    }

    async loadServices() {
        try {
            const response = await fetch('/api/services');
            this.services = await response.json();
        } catch (error) {
            console.error('Error loading services:', error);
        }
    }

    renderMasters() {
        const slider = document.getElementById('mastersSlider');
        const dots = document.getElementById('masterDots');
        
        slider.innerHTML = '';
        dots.innerHTML = '';
        
        this.masters.forEach((master, index) => {
            const masterSlide = document.createElement('div');
            masterSlide.className = 'min-w-full px-2';
            masterSlide.innerHTML = `
                <div class="cursor-pointer rounded-lg overflow-hidden transition-all border-4 border-transparent hover:border-gold/30 master-card" data-master-id="${master.user_profile_id}">
                    <div class="aspect-[4/3] bg-secondary relative overflow-hidden">
                        <img src="${master.image || '/images/professional-nail-technician-woman-in-elegant-salo.jpg'}" alt="${master.name}" class="w-full h-full object-cover">
                    </div>
                    <div class="p-4 text-center transition-colors bg-card">
                        <h3 class="text-xl font-semibold mb-1">${master.name}</h3>
                        <p class="text-sm text-muted-foreground">Опыт ${master.experience || '5'} лет</p>
                    </div>
                </div>
            `;
            slider.appendChild(masterSlide);

            const dot = document.createElement('button');
            dot.className = `h-2 rounded-full transition-all w-2 ${index === 0 ? 'bg-gold w-6' : 'bg-border'}`;
            dot.style.backgroundColor = index === 0 ? 'var(--gold)' : '';
            dot.setAttribute('aria-label', `Перейти к ${master.name}`);
            dot.addEventListener('click', () => this.showMasterSlide(index));
            dots.appendChild(dot);
        });

        // Add click listeners to master cards
        document.querySelectorAll('.master-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const masterId = e.currentTarget.getAttribute('data-master-id');
                this.selectMaster(masterId);
            });
        });
    }

    showMasterSlide(index) {
        const slider = document.getElementById('mastersSlider');
        slider.style.transform = `translateX(-${index * 100}%)`;
        
        // Update dots
        document.querySelectorAll('#masterDots button').forEach((dot, i) => {
            dot.className = `h-2 rounded-full transition-all w-2 ${i === index ? 'bg-gold w-6' : 'bg-border'}`;
            dot.style.backgroundColor = i === index ? 'var(--gold)' : '';
        });
    }

    selectMaster(masterId) {
        this.selectedMaster = this.masters.find(m => m.user_profile_id === masterId);
        document.getElementById('servicesSection').style.display = 'block';
        this.renderServices();
    }

    renderServices() {
        if (!this.selectedMaster) return;
        
        const servicesList = document.getElementById('servicesList');
        servicesList.innerHTML = '';
        
        const masterServices = this.selectedMaster.services || [];
        
        masterServices.forEach(serviceType => {
            const service = this.services.find(s => s.service_type === serviceType);
            if (service) {
                const serviceElement = document.createElement('div');
                serviceElement.className = 'service-item';
                serviceElement.innerHTML = `
                    <h3 class="font-semibold">${service.service_type}</h3>
                    <p class="text-muted-foreground">${service.service_time} • ${service.service_price}</p>
                `;
                serviceElement.addEventListener('click', () => this.selectService(service));
                servicesList.appendChild(serviceElement);
            }
        });
    }

    selectService(service) {
        this.selectedService = service;
        document.querySelectorAll('.service-item').forEach(item => item.classList.remove('selected'));
        event.currentTarget.classList.add('selected');
    }

    renderCalendar() {
        const monthNames = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];

        document.getElementById('currentMonth').textContent = 
            `${monthNames[this.currentMonth]} ${this.currentYear}`;

        const calendarGrid = document.getElementById('calendarGrid');
        calendarGrid.innerHTML = '';

        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const startingDay = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        // Adjust starting day for Monday first
        const adjustedStart = startingDay === 0 ? 6 : startingDay - 1;

        // Create empty cells for days before the first day of month
        let calendarHTML = '<div class="grid grid-cols-7 gap-2">';
        for (let i = 0; i < adjustedStart; i++) {
            calendarHTML += '<div><div class="w-full h-12"></div></div>';
        }

        // Create cells for each day of the month
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentYear, this.currentMonth, day);
            const isPast = date < today;
            const isSelected = this.selectedDate && 
                date.toDateString() === this.selectedDate.toDateString();

            calendarHTML += `
                <div>
                    <button class="calendar-day ${isPast ? 'disabled' : ''} ${isSelected ? 'selected' : ''}"
                            ${isPast ? 'disabled' : ''}
                            onclick="app.selectDate(${day})">
                        ${day}
                    </button>
                </div>
            `;

            // Start new row after Sunday
            if ((adjustedStart + day) % 7 === 0 && day !== daysInMonth) {
                calendarHTML += '</div><div class="grid grid-cols-7 gap-2">';
            }
        }

        calendarHTML += '</div>';
        calendarGrid.innerHTML = calendarHTML;
    }

    selectDate(day) {
        this.selectedDate = new Date(this.currentYear, this.currentMonth, day);
        this.renderCalendar();
        this.showTimeSlots();
    }

    showTimeSlots() {
        document.getElementById('timeSection').style.display = 'block';
        const timeSlots = document.getElementById('timeSlots');
        timeSlots.innerHTML = '';

        // Generate time slots from 9:00 to 19:00
        for (let hour = 9; hour <= 19; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const timeElement = document.createElement('div');
                timeElement.className = 'time-slot';
                timeElement.textContent = timeString;
                timeElement.addEventListener('click', () => this.selectTime(timeString));
                timeSlots.appendChild(timeElement);
            }
        }
    }

    selectTime(time) {
        this.selectedTime = time;
        document.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('selected'));
        event.currentTarget.classList.add('selected');
        this.showBookingSummary();
    }

    showBookingSummary() {
        const summary = document.getElementById('bookingSummary');
        const content = document.getElementById('summaryContent');
        
        content.innerHTML = `
            <div class="space-y-2">
                <p><strong>Мастер:</strong> ${this.selectedMaster.name}</p>
                <p><strong>Услуга:</strong> ${this.selectedService.service_type}</p>
                <p><strong>Дата:</strong> ${this.selectedDate.toLocaleDateString('ru-RU')}</p>
                <p><strong>Время:</strong> ${this.selectedTime}</p>
                <p><strong>Стоимость:</strong> ${this.selectedService.service_price}</p>
                <p><strong>Длительность:</strong> ${this.selectedService.service_time}</p>
            </div>
        `;
        
        summary.style.display = 'block';
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Master navigation
        document.getElementById('prevMaster').addEventListener('click', () => {
            const currentIndex = this.getCurrentMasterIndex();
            this.showMasterSlide(currentIndex > 0 ? currentIndex - 1 : this.masters.length - 1);
        });

        document.getElementById('nextMaster').addEventListener('click', () => {
            const currentIndex = this.getCurrentMasterIndex();
            this.showMasterSlide(currentIndex < this.masters.length - 1 ? currentIndex + 1 : 0);
        });

        // Calendar navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentMonth--;
            if (this.currentMonth < 0) {
                this.currentMonth = 11;
                this.currentYear--;
            }
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentMonth++;
            if (this.currentMonth > 11) {
                this.currentMonth = 0;
                this.currentYear++;
            }
            this.renderCalendar();
        });

        // Booking confirmation
        document.getElementById('confirmBooking').addEventListener('click', () => {
            this.confirmBooking();
        });
    }

    getCurrentMasterIndex() {
        const transform = document.getElementById('mastersSlider').style.transform;
        const match = transform.match(/translateX\(-(\d+)%/);
        return match ? parseInt(match[1]) / 100 : 0;
    }

    async handleLogin() {
        const name = document.getElementById('userName').value;
        const phone = document.getElementById('userPhone').value;
        
        if (!name || !phone) {
            alert('Пожалуйста, заполните все поля');
            return;
        }

        const profileId = `${phone}_${name}`.replace(/\s+/g, '_');
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, phone, profile_id: profileId })
            });

            if (response.ok) {
                this.setCookie('user_profile', profileId, 365);
                this.currentUser = { profile_id: profileId, name, phone };
                this.showMainApp();
                
                // Notify Telegram about new sign-up
                await fetch('/api/notify-telegram', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name,
                        phone,
                        profile_id: profileId
                    })
                });
            } else {
                alert('Ошибка при входе. Попробуйте снова.');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Ошибка при входе. Попробуйте снова.');
        }
    }

    async confirmBooking() {
        if (!this.selectedMaster || !this.selectedService || !this.selectedDate || !this.selectedTime) {
            alert('Пожалуйста, заполните все данные');
            return;
        }

        const requestData = {
            user_profile_id: this.currentUser.profile_id,
            service_type: this.selectedService.service_type,
            master_id: this.selectedMaster.user_profile_id,
            request_time: new Date(this.selectedDate).toISOString().split('T')[0] + 'T' + this.selectedTime + ':00'
        };

        try {
            const response = await fetch('/api/booking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (response.ok) {
                alert('Запись успешно создана!');
                this.resetSelection();
            } else {
                alert('Ошибка при создании записи. Попробуйте снова.');
            }
        } catch (error) {
            console.error('Booking error:', error);
            alert('Ошибка при создании записи. Попробуйте снова.');
        }
    }

    resetSelection() {
        this.selectedMaster = null;
        this.selectedService = null;
        this.selectedDate = null;
        this.selectedTime = null;
        
        document.getElementById('servicesSection').style.display = 'none';
        document.getElementById('timeSection').style.display = 'none';
        document.getElementById('bookingSummary').style.display = 'none';
        
        this.renderCalendar();
    }

    showLoginModal() {
        document.getElementById('loginModal').style.display = 'flex';
        document.getElementById('mainApp').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('mainApp').classList.remove('hidden');
    }

    setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NailBookingApp();
});