/ Configurazione dell'applicazione
const CONFIG = {
    // Google Authentication
    GOOGLE_CLIENT_ID: '471471145002-9a1ingg3fjlo1u3drhgm4jm4r0vgsktv.apps.googleusercontent.com',
    
    // Google Sheets Database
    GOOGLE_SHEETS_ID: '1OFPd5iPJL7prqCJw52pfXGYZ3aHGcjX2McxSeA8cSjI',
    GOOGLE_API_KEY: 'AIzaSyBlZupQt8FYXqXyEBuOFGzPWNVZnKmCurQ',
    
    // URL degli endpoint delle Google Sheets API
    SHEETS_API_BASE: 'https://sheets.googleapis.com/v4/spreadsheets',
    
    // Nomi dei fogli (tabs) nel Google Sheets
    SHEETS: {
        EVENTS: 'Eventi',
        USERS: 'Utenti'
    },
    
    // Range delle celle per leggere i dati
    RANGES: {
        EVENTS: 'Eventi!A:M',
        USERS: 'Utenti!A:F'
    },
    
    // Struttura delle colonne nel foglio Eventi
    EVENT_COLUMNS: {
        ID: 0,           // A - ID univoco evento
        TITLE: 1,        // B - Titolo evento
        CATEGORY: 2,     // C - Categoria
        DATE: 3,         // D - Data evento
        TIME: 4,         // E - Ora evento
        LOCATION: 5,     // F - Luogo
        LATITUDE: 6,     // G - Latitudine
        LONGITUDE: 7,    // H - Longitudine
        DESCRIPTION: 8,  // I - Descrizione
        PRICE: 9,        // J - Prezzo
        CONTACT: 10,     // K - Contatto
        CREATOR: 11,     // L - Email creatore
        CREATED_AT: 12   // M - Data creazione
    },
    
    // Struttura delle colonne nel foglio Utenti
    USER_COLUMNS: {
        EMAIL: 0,        // A - Email
        NAME: 1,         // B - Nome
        PHOTO: 2,        // C - URL foto
        FIRST_LOGIN: 3,  // D - Prima connessione
        LAST_LOGIN: 4,   // E - Ultima connessione
        ACTIVE: 5        // F - Attivo (true/false)
    },
    
    // Categorie eventi disponibili
    CATEGORIES: {
        'festa-paese': { name: 'Festa di paese', color: '#ef4444', icon: 'fas fa-flag' },
        'street-food': { name: 'Street Food', color: '#f59e0b', icon: 'fas fa-utensils' },
        'festa-birra': { name: 'Festa della birra', color: '#eab308', icon: 'fas fa-beer' },
        'concerto': { name: 'Concerti', color: '#8b5cf6', icon: 'fas fa-music' },
        'bambini': { name: 'Eventi per bambini', color: '#06b6d4', icon: 'fas fa-child' },
        'cultura': { name: 'Cultura e libri', color: '#10b981', icon: 'fas fa-book' },
        'sport': { name: 'Sport', color: '#f97316', icon: 'fas fa-running' },
        'altro': { name: 'Altro', color: '#6b7280', icon: 'fas fa-calendar' }
    },
    
    // Configurazione mappa
    MAP: {
        DEFAULT_CENTER: [45.4642, 9.1900], // Milano come centro predefinito
        DEFAULT_ZOOM: 10,
        MAX_ZOOM: 18,
        MIN_ZOOM: 6,
        // Tile layer OpenStreetMap
        TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ATTRIBUTION: '© OpenStreetMap contributors'
    },
    
    // Configurazione geocoding (per convertire indirizzi in coordinate)
    GEOCODING: {
        API_URL: 'https://nominatim.openstreetmap.org/search',
        FORMAT: 'json',
        LIMIT: 1,
        COUNTRYCODES: 'it' // Limitiamo la ricerca all'Italia
    },
    
    // Limiti e validazioni
    LIMITS: {
        MAX_EVENTS_PER_PAGE: 50,
        MAX_DISTANCE_KM: 100,
        MIN_TITLE_LENGTH: 3,
        MAX_TITLE_LENGTH: 100,
        MAX_DESCRIPTION_LENGTH: 500
    },
    
    // Configurazione visualizzazione eventi
    EVENT_DISPLAY: {
        SHOW_PAST_EVENTS: true,           // Mostra eventi passati
        PAST_EVENTS_LIMIT_DAYS: 30,       // Giorni nel passato da mostrare (0 = tutti)
        SORT_ORDER: 'mixed'               // 'future_first', 'past_first', 'mixed'
    },
    
    // Messaggi di errore
    MESSAGES: {
        ERRORS: {
            NETWORK: 'Errore di connessione. Controlla la tua connessione internet.',
            AUTH_REQUIRED: 'Devi effettuare il login per aggiungere eventi.',
            INVALID_DATA: 'I dati inseriti non sono validi.',
            LOCATION_NOT_FOUND: 'Impossibile trovare la posizione specificata.',
            GEOLOCATION_DENIED: 'Geolocalizzazione non consentita.',
            SHEETS_ERROR: 'Errore nel caricamento dei dati. Riprova più tardi.'
        },
        SUCCESS: {
            EVENT_ADDED: 'Evento aggiunto con successo!',
            LOCATION_FOUND: 'Posizione trovata!',
            DATA_LOADED: 'Dati caricati correttamente.'
        }
    },
    
    // Debug mode (impostare a false in produzione)
    DEBUG: true
};
