// Gestione del database tramite Google Sheets
class DatabaseManager {
    constructor() {
        this.sheetsUrl = `${CONFIG.SHEETS_API_BASE}/${CONFIG.GOOGLE_SHEETS_ID}/values`;
        this.cache = {
            events: [],
            users: [],
            lastUpdate: null
        };
        this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
    }

    // Carica tutti gli eventi
    async loadEvents() {
        try {
            if (this.isCacheValid('events')) {
                return this.cache.events;
            }

            const url = `${this.sheetsUrl}/${CONFIG.RANGES.EVENTS}?key=${CONFIG.GOOGLE_API_KEY}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.values || data.values.length === 0) {
                this.cache.events = [];
                return [];
            }

            // Salta la prima riga (header) e converte i dati
            const events = data.values.slice(1).map(row => this.parseEventRow(row));
            
            // Filtra eventi validi e futuri
            const validEvents = events.filter(event => 
                event && event.title && event.date && new Date(event.date) >= new Date()
            );

            this.cache.events = validEvents;
            this.cache.lastUpdate = Date.now();
            
            if (CONFIG.DEBUG) {
                console.log(`Caricati ${validEvents.length} eventi`);
            }
            
            return validEvents;

        } catch (error) {
            console.error('Errore caricamento eventi:', error);
            throw new Error(CONFIG.MESSAGES.ERRORS.SHEETS_ERROR);
        }
    }

    // Converte una riga del foglio in un oggetto evento
    parseEventRow(row) {
        try {
            return {
                id: row[CONFIG.EVENT_COLUMNS.ID] || '',
                title: row[CONFIG.EVENT_COLUMNS.TITLE] || '',
                category: row[CONFIG.EVENT_COLUMNS.CATEGORY] || 'altro',
                date: row[CONFIG.EVENT_COLUMNS.DATE] || '',
                time: row[CONFIG.EVENT_COLUMNS.TIME] || '',
                location: row[CONFIG.EVENT_COLUMNS.LOCATION] || '',
                latitude: parseFloat(row[CONFIG.EVENT_COLUMNS.LATITUDE]) || null,
                longitude: parseFloat(row[CONFIG.EVENT_COLUMNS.LONGITUDE]) || null,
                description: row[CONFIG.EVENT_COLUMNS.DESCRIPTION] || '',
                price: row[CONFIG.EVENT_COLUMNS.PRICE] || '',
                contact: row[CONFIG.EVENT_COLUMNS.CONTACT] || '',
                creator: row[CONFIG.EVENT_COLUMNS.CREATOR] || '',
                createdAt: row[CONFIG.EVENT_COLUMNS.CREATED_AT] || ''
            };
        } catch (error) {
            console.error('Errore parsing evento:', error);
            return null;
        }
    }

    // Aggiunge un nuovo evento
    async addEvent(eventData) {
        try {
            if (!window.authManager.isAuthenticated()) {
                throw new Error(CONFIG.MESSAGES.ERRORS.AUTH_REQUIRED);
            }

            // Valida i dati
            this.validateEventData(eventData);

            // Geocodifica l'indirizzo se necessario
            const coordinates = await this.geocodeAddress(eventData.location);
            
            // Genera ID univoco
            const eventId = this.generateEventId();
            
            // Prepara i dati per il foglio
            const rowData = [
                eventId,
                eventData.title,
                eventData.category,
                eventData.date,
                eventData.time || '',
                eventData.location,
                coordinates.lat || '',
                coordinates.lng || '',
                eventData.description || '',
                eventData.price || '',
                eventData.contact || '',
                window.authManager.getCurrentUser().email,
                new Date().toISOString()
            ];

            // Aggiunge la riga al foglio
            await this.appendToSheet(CONFIG.SHEETS.EVENTS, [rowData]);
            
            // Invalida la cache
            this.invalidateCache('events');
            
            if (CONFIG.DEBUG) {
                console.log('Evento aggiunto:', eventId);
            }
            
            return eventId;

        } catch (error) {
            console.error('Errore aggiunta evento:', error);
            throw error;
        }
    }

    // Valida i dati dell'evento
    validateEventData(data) {
        if (!data.title || data.title.length < CONFIG.LIMITS.MIN_TITLE_LENGTH) {
            throw new Error('Il titolo è obbligatorio e deve essere di almeno 3 caratteri');
        }
        
        if (data.title.length > CONFIG.LIMITS.MAX_TITLE_LENGTH) {
            throw new Error(`Il titolo non può superare ${CONFIG.LIMITS.MAX_TITLE_LENGTH} caratteri`);
        }
        
        if (!data.category || !CONFIG.CATEGORIES[data.category]) {
            throw new Error('Categoria non valida');
        }
        
        if (!data.date) {
            throw new Error('La data è obbligatoria');
        }
        
        const eventDate = new Date(data.date);
        if (eventDate <= new Date()) {
            throw new Error('La data deve essere futura');
        }
        
        if (!data.location || data.location.length < 3) {
            throw new Error('Il luogo è obbligatorio');
        }
        
        if (data.description && data.description.length > CONFIG.LIMITS.MAX_DESCRIPTION_LENGTH) {
            throw new Error(`La descrizione non può superare ${CONFIG.LIMITS.MAX_DESCRIPTION_LENGTH} caratteri`);
        }
    }

    // Geocodifica un indirizzo
    async geocodeAddress(address) {
        try {
            const encodedAddress = encodeURIComponent(address + ', Italia');
            const url = `${CONFIG.GEOCODING.API_URL}?format=${CONFIG.GEOCODING.FORMAT}&q=${encodedAddress}&limit=${CONFIG.GEOCODING.LIMIT}&countrycodes=${CONFIG.GEOCODING.COUNTRYCODES}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
            
            throw new Error(CONFIG.MESSAGES.ERRORS.LOCATION_NOT_FOUND);
            
        } catch (error) {
            console.warn('Geocoding fallito per:', address, error);
            // Restituisce coordinate nulle se il geocoding fallisce
            return { lat: null, lng: null };
        }
    }

    // Aggiunge righe a un foglio
    async appendToSheet(sheetName, rows) {
        try {
            const url = `${this.sheetsUrl}/${sheetName}!A:Z:append?valueInputOption=USER_ENTERED&key=${CONFIG.GOOGLE_API_KEY}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    values: rows
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();

        } catch (error) {
            console.error('Errore aggiunta dati al foglio:', error);
            throw new Error('Impossibile salvare i dati');
        }
    }

    // Salva i dati utente
    async saveUser(userData) {
        try {
            // Controlla se l'utente esiste già
            const existingUsers = await this.loadUsers();
            const existingUser = existingUsers.find(user => user.email === userData[0]);
            
            if (!existingUser) {
                // Nuovo utente
                await this.appendToSheet(CONFIG.SHEETS.USERS, [userData]);
            } else {
                // Aggiorna last_login (implementazione semplificata)
                // In un'implementazione completa, useresti l'API di update
                if (CONFIG.DEBUG) {
                    console.log('Utente esistente, login aggiornato');
                }
            }
            
        } catch (error) {
            console.error('Errore salvataggio utente:', error);
        }
    }

    // Carica gli utenti
    async loadUsers() {
        try {
            if (this.isCacheValid('users')) {
                return this.cache.users;
            }

            const url = `${this.sheetsUrl}/${CONFIG.RANGES.USERS}?key=${CONFIG.GOOGLE_API_KEY}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                return []; // Non è critico se gli utenti non si caricano
            }
            
            const data = await response.json();
            
            if (!data.values || data.values.length === 0) {
                this.cache.users = [];
                return [];
            }

            const users = data.values.slice(1).map(row => ({
                email: row[CONFIG.USER_COLUMNS.EMAIL] || '',
                name: row[CONFIG.USER_COLUMNS.NAME] || '',
                photo: row[CONFIG.USER_COLUMNS.PHOTO] || '',
                firstLogin: row[CONFIG.USER_COLUMNS.FIRST_LOGIN] || '',
                lastLogin: row[CONFIG.USER_COLUMNS.LAST_LOGIN] || '',
                active: row[CONFIG.USER_COLUMNS.ACTIVE] === 'true'
            }));

            this.cache.users = users;
            return users;

        } catch (error) {
            console.error('Errore caricamento utenti:', error);
            return [];
        }
    }

    // Genera un ID univoco per l'evento
    generateEventId() {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `evt_${timestamp}_${randomStr}`;
    }

    // Controlla se la cache è valida
    isCacheValid(type) {
        if (!this.cache.lastUpdate) return false;
        return (Date.now() - this.cache.lastUpdate) < this.cacheTimeout;
    }

    // Invalida la cache
    invalidateCache(type) {
        if (type === 'events') {
            this.cache.events = [];
        } else if (type === 'users') {
            this.cache.users = [];
        } else {
            this.cache = { events: [], users: [], lastUpdate: null };
        }
    }

    // Forza il reload dei dati
    async forceReload() {
        this.invalidateCache();
        return await this.loadEvents();
    }

    // Filtra eventi per categoria
    filterByCategory(events, category) {
        if (!category || category === '') return events;
        return events.filter(event => event.category === category);
    }

    // Filtra eventi per data
    filterByDate(events, dateFilter) {
        if (!dateFilter || dateFilter === '') return events;
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return events.filter(event => {
            const eventDate = new Date(event.date);
            
            switch (dateFilter) {
                case 'today':
                    return eventDate.toDateString() === today.toDateString();
                
                case 'weekend':
                    const nextSaturday = new Date(today);
                    nextSaturday.setDate(today.getDate() + (6 - today.getDay()));
                    const nextSunday = new Date(nextSaturday);
                    nextSunday.setDate(nextSaturday.getDate() + 1);
                    return eventDate >= nextSaturday && eventDate <= nextSunday;
                
                case 'week':
                    const nextWeek = new Date(today);
                    nextWeek.setDate(today.getDate() + 7);
                    return eventDate >= today && eventDate <= nextWeek;
                
                case 'month':
                    const nextMonth = new Date(today);
                    nextMonth.setMonth(today.getMonth() + 1);
                    return eventDate >= today && eventDate <= nextMonth;
                
                default:
                    return true;
            }
        });
    }

    // Filtra eventi per distanza (richiede posizione utente)
    filterByDistance(events, maxDistance, userPosition) {
        if (!maxDistance || !userPosition) return events;
        
        return events.filter(event => {
            if (!event.latitude || !event.longitude) return false;
            
            const distance = this.calculateDistance(
                userPosition.lat, userPosition.lng,
                event.latitude, event.longitude
            );
            
            return distance <= maxDistance;
        });
    }

    // Calcola la distanza tra due punti (formula di Haversine)
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Raggio della Terra in km
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Converte gradi in radianti
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
}

// Inizializza il database manager
window.dbManager = new DatabaseManager();