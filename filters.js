// Gestione dei filtri e ricerca eventi
class FiltersManager {
    constructor() {
        this.currentFilters = {
            category: '',
            date: '',
            distance: '',
            userPosition: null
        };
        this.allEvents = [];
        this.filteredEvents = [];
    }

    // Inizializza i filtri
    init() {
        this.bindEventListeners();
        
        // Imposta la data minima per il filtro data personalizzato
        const dateInputs = document.querySelectorAll('input[type="date"]');
        const today = new Date().toISOString().split('T')[0];
        dateInputs.forEach(input => {
            input.min = today;
        });

        if (CONFIG.DEBUG) {
            console.log('FiltersManager inizializzato');
        }
    }

    // Associa gli event listener
    bindEventListeners() {
        // Filtri
        const categoryFilter = document.getElementById('categoryFilter');
        const dateFilter = document.getElementById('dateFilter');
        const locationFilter = document.getElementById('locationFilter');

        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.applyFilters();
            });
        }

        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.currentFilters.date = e.target.value;
                this.applyFilters();
            });
        }

        if (locationFilter) {
            locationFilter.addEventListener('change', (e) => {
                this.currentFilters.distance = e.target.value;
                this.applyFilters();
            });
        }

        // Pulsanti
        const searchBtn = document.getElementById('searchBtn');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        const getLocationBtn = document.getElementById('getLocationBtn');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.performSearch();
            });
        }

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        if (getLocationBtn) {
            getLocationBtn.addEventListener('click', () => {
                this.getUserLocation();
            });
        }
    }

    // Imposta gli eventi da filtrare
    setEvents(events) {
        this.allEvents = events;
        this.filteredEvents = [...events];
        this.updateResultsCount();
    }

    // Applica i filtri correnti
    applyFilters() {
        let filtered = [...this.allEvents];

        // Filtro per categoria
        if (this.currentFilters.category) {
            filtered = window.dbManager.filterByCategory(filtered, this.currentFilters.category);
        }

        // Filtro per data
        if (this.currentFilters.date) {
            filtered = window.dbManager.filterByDate(filtered, this.currentFilters.date);
        }

        // Filtro per distanza
        if (this.currentFilters.distance && this.currentFilters.userPosition) {
            filtered = window.dbManager.filterByDistance(
                filtered, 
                parseInt(this.currentFilters.distance), 
                this.currentFilters.userPosition
            );
        }

        // Ordina per data
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

        this.filteredEvents = filtered;
        this.updateResultsCount();

        // Notifica i componenti interessati
        this.notifyFiltersChanged();
    }

    // Esegue la ricerca
    async performSearch() {
        const searchBtn = document.getElementById('searchBtn');
        const loadingSection = document.getElementById('loadingSection');

        try {
            // Mostra loading
            this.setSearchLoading(true);
            if (loadingSection) loadingSection.style.display = 'block';

            // Carica gli eventi
            const events = await window.dbManager.loadEvents();
            this.setEvents(events);

            // Applica i filtri
            this.applyFilters();

            if (CONFIG.DEBUG) {
                console.log(`Ricerca completata: ${this.filteredEvents.length} eventi trovati`);
            }

        } catch (error) {
            console.error('Errore durante la ricerca:', error);
            this.showError(error.message);
        } finally {
            // Nascondi loading
            this.setSearchLoading(false);
            if (loadingSection) loadingSection.style.display = 'none';
        }
    }

    // Pulisce tutti i filtri
    clearFilters() {
        // Reset dei valori
        this.currentFilters = {
            category: '',
            date: '',
            distance: '',
            userPosition: this.currentFilters.userPosition // Mantiene la posizione utente
        };

        // Reset dell'interfaccia
        const categoryFilter = document.getElementById('categoryFilter');
        const dateFilter = document.getElementById('dateFilter');
        const locationFilter = document.getElementById('locationFilter');

        if (categoryFilter) categoryFilter.value = '';
        if (dateFilter) dateFilter.value = '';
        if (locationFilter) locationFilter.value = '';

        // Riapplica i filtri
        this.applyFilters();

        if (CONFIG.DEBUG) {
            console.log('Filtri puliti');
        }
    }

    // Ottiene la posizione dell'utente
    async getUserLocation() {
        const getLocationBtn = document.getElementById('getLocationBtn');
        const originalText = getLocationBtn ? getLocationBtn.innerHTML : '';

        try {
            // Aggiorna il pulsante
            if (getLocationBtn) {
                getLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ricerca...';
                getLocationBtn.disabled = true;
            }

            // Ottiene la posizione
            const position = await window.mapManager.getUserLocation();
            this.currentFilters.userPosition = position;

            // Aggiorna il pulsante
            if (getLocationBtn) {
                getLocationBtn.innerHTML = '<i class="fas fa-check"></i> Posizione trovata';
                getLocationBtn.classList.remove('btn-location');
                getLocationBtn.classList.add('btn-success');
            }

            // Mostra messaggio di successo
            this.showSuccess(CONFIG.MESSAGES.SUCCESS.LOCATION_FOUND);

            // Riapplica i filtri se il filtro distanza è attivo
            if (this.currentFilters.distance) {
                this.applyFilters();
            }

            // Ripristina il pulsante dopo 3 secondi
            setTimeout(() => {
                if (getLocationBtn) {
                    getLocationBtn.innerHTML = originalText;
                    getLocationBtn.disabled = false;
                    getLocationBtn.classList.remove('btn-success');
                    getLocationBtn.classList.add('btn-location');
                }
            }, 3000);

        } catch (error) {
            console.error('Errore geolocalizzazione:', error);
            
            // Ripristina il pulsante
            if (getLocationBtn) {
                getLocationBtn.innerHTML = originalText;
                getLocationBtn.disabled = false;
            }

            this.showError(error.message);
        }
    }

    // Imposta lo stato di loading per la ricerca
    setSearchLoading(loading) {
        const searchBtn = document.getElementById('searchBtn');
        if (!searchBtn) return;

        if (loading) {
            searchBtn.disabled = true;
            searchBtn.classList.add('loading');
            searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ricerca...';
        } else {
            searchBtn.disabled = false;
            searchBtn.classList.remove('loading');
            searchBtn.innerHTML = '<i class="fas fa-search"></i> Cerca Eventi';
        }
    }

    // Aggiorna il contatore dei risultati
    updateResultsCount() {
        const resultsCount = document.getElementById('resultsCount');
        const eventCount = document.getElementById('eventCount');

        if (resultsCount && eventCount) {
            eventCount.textContent = this.filteredEvents.length;
            resultsCount.style.display = 'block';
        }
    }

    // Notifica che i filtri sono cambiati
    notifyFiltersChanged() {
        // Aggiorna la lista eventi
        if (window.eventsManager) {
            window.eventsManager.displayEvents(this.filteredEvents);
        }

        // Aggiorna la mappa
        if (window.mapManager) {
            window.mapManager.showEvents(this.filteredEvents);
        }
    }

    // Ottiene gli eventi filtrati
    getFilteredEvents() {
        return this.filteredEvents;
    }

    // Ottiene i filtri correnti
    getCurrentFilters() {
        return { ...this.currentFilters };
    }

    // Imposta un filtro specifico
    setFilter(filterName, value) {
        if (this.currentFilters.hasOwnProperty(filterName)) {
            this.currentFilters[filterName] = value;
            
            // Aggiorna l'interfaccia
            const filterElement = document.getElementById(filterName + 'Filter');
            if (filterElement) {
                filterElement.value = value;
            }
            
            this.applyFilters();
        }
    }

    // Verifica se ci sono filtri attivi
    hasActiveFilters() {
        return this.currentFilters.category !== '' ||
               this.currentFilters.date !== '' ||
               (this.currentFilters.distance !== '' && this.currentFilters.userPosition);
    }

    // Mostra un messaggio di errore
    showError(message) {
        // Implementazione semplice con alert
        // In un'implementazione più avanzata si potrebbe usare un toast o modal
        alert('Errore: ' + message);
    }

    // Mostra un messaggio di successo
    showSuccess(message) {
        // Implementazione semplice con console
        // In un'implementazione più avanzata si potrebbe usare un toast
        console.log('Successo: ' + message);
        
        // Mostra brevemente un messaggio nella UI
        const messageDiv = document.createElement('div');
        messageDiv.className = 'success-message';
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 1001;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(messageDiv);
        
        // Rimuove il messaggio dopo 3 secondi
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    // Calcola statistiche sui filtri
    getFilterStats() {
        const stats = {
            total: this.allEvents.length,
            filtered: this.filteredEvents.length,
            categories: {},
            upcomingDays: {}
        };

        // Conta eventi per categoria
        this.filteredEvents.forEach(event => {
            stats.categories[event.category] = (stats.categories[event.category] || 0) + 1;
        });

        // Conta eventi per prossimi giorni
        const now = new Date();
        this.filteredEvents.forEach(event => {
            const eventDate = new Date(event.date);
            const diffDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0 && diffDays <= 30) {
                const key = diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : `${diffDays} days`;
                stats.upcomingDays[key] = (stats.upcomingDays[key] || 0) + 1;
            }
        });

        return stats;
    }

    // Esporta i risultati della ricerca
    exportResults(format = 'json') {
        const data = {
            timestamp: new Date().toISOString(),
            filters: this.getCurrentFilters(),
            events: this.filteredEvents,
            stats: this.getFilterStats()
        };

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `eventi_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }
}

// Aggiunge gli stili per i messaggi
const messageStyles = document.createElement('style');
messageStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .btn-success {
        background: #10b981 !important;
        border-color: #10b981 !important;
    }
    
    .btn-success:hover {
        background: #059669 !important;
        border-color: #059669 !important;
    }
`;
document.head.appendChild(messageStyles);

// Inizializza il gestore dei filtri
window.filtersManager = new FiltersManager();