// Gestione degli eventi e dell'interfaccia utente
class EventsManager {
    constructor() {
        this.currentView = 'list'; // 'list' o 'map'
        this.events = [];
        this.isModalOpen = false;
    }

    // Inizializza il gestore eventi
    init() {
        this.bindEventListeners();
        this.initModal();
        
        if (CONFIG.DEBUG) {
            console.log('EventsManager inizializzato');
        }
    }

    // Associa gli event listener
    bindEventListeners() {
        // Toggle view buttons
        const listViewBtn = document.getElementById('listViewBtn');
        const mapViewBtn = document.getElementById('mapViewBtn');

        if (listViewBtn) {
            listViewBtn.addEventListener('click', () => {
                this.switchView('list');
            });
        }

        if (mapViewBtn) {
            mapViewBtn.addEventListener('click', () => {
                this.switchView('map');
            });
        }

        // Add event button
        const addEventBtn = document.getElementById('addEventBtn');
        if (addEventBtn) {
            addEventBtn.addEventListener('click', () => {
                this.showAddEventModal();
            });
        }
    }

    // Inizializza il modal per aggiungere eventi
    initModal() {
        const modal = document.getElementById('addEventModal');
        const closeBtn = modal?.querySelector('.modal-close');
        const cancelBtn = modal?.querySelector('.btn-cancel');
        const form = document.getElementById('addEventForm');

        // Chiudi modal
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideAddEventModal();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideAddEventModal();
            });
        }

        // Chiudi modal cliccando fuori
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAddEventModal();
                }
            });
        }

        // Gestisci submit form
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddEvent();
            });
        }

        // Previeni chiusura accidentale con Esc
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen) {
                this.hideAddEventModal();
            }
        });
    }

    // Cambia vista tra lista e mappa
    switchView(view) {
        this.currentView = view;

        const listViewBtn = document.getElementById('listViewBtn');
        const mapViewBtn = document.getElementById('mapViewBtn');
        const eventsListSection = document.getElementById('eventsListSection');
        const eventsMapSection = document.getElementById('eventsMapSection');

        // Aggiorna i pulsanti
        if (listViewBtn && mapViewBtn) {
            listViewBtn.classList.toggle('active', view === 'list');
            mapViewBtn.classList.toggle('active', view === 'map');
        }

        // Mostra/nascondi sezioni
        if (eventsListSection) {
            eventsListSection.style.display = view === 'list' ? 'block' : 'none';
        }

        if (eventsMapSection) {
            eventsMapSection.style.display = view === 'map' ? 'block' : 'none';
        }

        // Inizializza la mappa se necessario
        if (view === 'map') {
            if (!window.mapManager.isInitialized) {
                window.mapManager.initMap();
            }
            window.mapManager.toggleVisibility(true);
            // Mostra gli eventi correnti sulla mappa
            if (this.events.length > 0) {
                window.mapManager.showEvents(this.events);
            }
        } else {
            window.mapManager.toggleVisibility(false);
        }

        if (CONFIG.DEBUG) {
            console.log('Vista cambiata a:', view);
        }
    }

    // Mostra gli eventi nella lista
    displayEvents(events) {
        this.events = events;
        
        if (this.currentView === 'list') {
            this.renderEventsList(events);
        } else {
            // Se siamo in vista mappa, aggiorna anche quella
            window.mapManager.showEvents(events);
        }
    }

    // Renderizza la lista degli eventi
    renderEventsList(events) {
        const eventsList = document.getElementById('eventsList');
        if (!eventsList) return;

        // Pulisce la lista esistente
        eventsList.innerHTML = '';

        if (events.length === 0) {
            eventsList.innerHTML = this.getEmptyStateHTML();
            return;
        }

        // Renderizza ogni evento
        events.forEach((event, index) => {
            const eventCard = this.createEventCard(event, index);
            eventsList.appendChild(eventCard);
        });
    }

    // Crea una card per un evento
    createEventCard(event, index) {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.style.animationDelay = `${index * 0.1}s`;

        const categoryInfo = CONFIG.CATEGORIES[event.category] || CONFIG.CATEGORIES['altro'];
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Calcola distanza se disponibile
        let distanceHTML = '';
        if (window.filtersManager.currentFilters.userPosition && event.latitude && event.longitude) {
            const distance = window.dbManager.calculateDistance(
                window.filtersManager.currentFilters.userPosition.lat,
                window.filtersManager.currentFilters.userPosition.lng,
                event.latitude,
                event.longitude
            );
            distanceHTML = `<div class="event-detail">
                <i class="fas fa-map-marker-alt"></i>
                <span class="event-distance">${distance.toFixed(1)} km da te</span>
            </div>`;
        }

        card.innerHTML = `
            <div class="event-header">
                <div>
                    <h3 class="event-title">${this.escapeHtml(event.title)}</h3>
                </div>
                <div class="event-category" style="background-color: ${categoryInfo.color};">
                    ${categoryInfo.name}
                </div>
            </div>
            
            <div class="event-info">
                <div class="event-detail">
                    <i class="fas fa-calendar"></i>
                    <span>${formattedDate}</span>
                </div>
                
                ${event.time ? `<div class="event-detail">
                    <i class="fas fa-clock"></i>
                    <span>${event.time}</span>
                </div>` : ''}
                
                <div class="event-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${this.escapeHtml(event.location)}</span>
                </div>
                
                ${event.price ? `<div class="event-detail">
                    <i class="fas fa-euro-sign"></i>
                    <span>${this.escapeHtml(event.price)}</span>
                </div>` : ''}
                
                ${event.contact ? `<div class="event-detail">
                    <i class="fas fa-user"></i>
                    <span>${this.escapeHtml(event.contact)}</span>
                </div>` : ''}
                
                ${distanceHTML}
            </div>
            
            ${event.description ? `<div class="event-description">
                ${this.escapeHtml(event.description)}
            </div>` : ''}
        `;

        // Aggiunge click listener per mostrare sulla mappa
        card.addEventListener('click', () => {
            this.showEventOnMap(event);
        });

        return card;
    }

    // HTML per stato vuoto
    getEmptyStateHTML() {
        return `
            <div style="text-align: center; padding: 3rem; color: #6b7280;">
                <i class="fas fa-calendar-times" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3 style="margin-bottom: 0.5rem;">Nessun evento trovato</h3>
                <p>Prova a modificare i filtri di ricerca o aggiungi un nuovo evento.</p>
                <button onclick="window.filtersManager.clearFilters()" 
                        style="margin-top: 1rem; padding: 0.5rem 1rem; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-filter"></i> Pulisci filtri
                </button>
            </div>
        `;
    }

    // Mostra un evento sulla mappa
    showEventOnMap(event) {
        if (!event.latitude || !event.longitude) {
            alert('Posizione non disponibile per questo evento');
            return;
        }

        // Cambia alla vista mappa
        this.switchView('map');
        
        // Aspetta che la mappa sia inizializzata
        setTimeout(() => {
            if (window.mapManager.isInitialized) {
                // Centra la mappa sull'evento
                window.mapManager.map.setView([event.latitude, event.longitude], 15);
                
                // Trova e apri il popup dell'evento
                const markers = window.mapManager.markers;
                const eventMarker = markers.find(marker => {
                    const pos = marker.getLatLng();
                    return Math.abs(pos.lat - event.latitude) < 0.0001 && 
                           Math.abs(pos.lng - event.longitude) < 0.0001;
                });
                
                if (eventMarker) {
                    eventMarker.openPopup();
                }
            }
        }, 200);
    }

    // Mostra il modal per aggiungere evento
    showAddEventModal() {
        if (!window.authManager.requireAuth()) {
            return;
        }

        const modal = document.getElementById('addEventModal');
        if (modal) {
            modal.style.display = 'flex';
            this.isModalOpen = true;
            
            // Focus sul primo campo
            const firstInput = modal.querySelector('input[type="text"]');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    // Nasconde il modal per aggiungere evento
    hideAddEventModal() {
        const modal = document.getElementById('addEventModal');
        const form = document.getElementById('addEventForm');
        
        if (modal) {
            modal.style.display = 'none';
            this.isModalOpen = false;
        }
        
        // Reset del form
        if (form) {
            form.reset();
        }
    }

    // Gestisce l'aggiunta di un nuovo evento
    async handleAddEvent() {
        const form = document.getElementById('addEventForm');
        if (!form) return;

        const submitBtn = form.querySelector('.btn-submit');
        const originalText = submitBtn?.innerHTML || '';

        try {
            // Mostra loading
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aggiunta...';
                submitBtn.disabled = true;
            }

            // Raccoglie i dati dal form
            const formData = new FormData(form);
            const eventData = {
                title: formData.get('title').trim(),
                category: formData.get('category'),
                date: formData.get('date'),
                time: formData.get('time'),
                location: formData.get('location').trim(),
                description: formData.get('description').trim(),
                price: formData.get('price').trim(),
                contact: formData.get('contact').trim()
            };

            // Valida i dati
            this.validateEventForm(eventData);

            // Aggiunge l'evento
            const eventId = await window.dbManager.addEvent(eventData);

            // Mostra successo
            alert(CONFIG.MESSAGES.SUCCESS.EVENT_ADDED);

            // Chiude il modal
            this.hideAddEventModal();

            // Ricarica gli eventi
            await window.filtersManager.performSearch();

            if (CONFIG.DEBUG) {
                console.log('Evento aggiunto:', eventId);
            }

        } catch (error) {
            console.error('Errore aggiunta evento:', error);
            alert('Errore: ' + error.message);
        } finally {
            // Ripristina il pulsante
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    // Valida il form di aggiunta evento
    validateEventForm(data) {
        const errors = [];

        if (!data.title) {
            errors.push('Il titolo è obbligatorio');
        } else if (data.title.length < CONFIG.LIMITS.MIN_TITLE_LENGTH) {
            errors.push(`Il titolo deve essere di almeno ${CONFIG.LIMITS.MIN_TITLE_LENGTH} caratteri`);
        } else if (data.title.length > CONFIG.LIMITS.MAX_TITLE_LENGTH) {
            errors.push(`Il titolo non può superare ${CONFIG.LIMITS.MAX_TITLE_LENGTH} caratteri`);
        }

        if (!data.category) {
            errors.push('La categoria è obbligatoria');
        }

        if (!data.date) {
            errors.push('La data è obbligatoria');
        } else {
            const eventDate = new Date(data.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (eventDate < today) {
                errors.push('La data deve essere oggi o nel futuro');
            }
        }

        if (!data.location) {
            errors.push('Il luogo è obbligatorio');
        } else if (data.location.length < 3) {
            errors.push('Il luogo deve essere di almeno 3 caratteri');
        }

        if (data.description && data.description.length > CONFIG.LIMITS.MAX_DESCRIPTION_LENGTH) {
            errors.push(`La descrizione non può superare ${CONFIG.LIMITS.MAX_DESCRIPTION_LENGTH} caratteri`);
        }

        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
    }

    // Escape HTML per sicurezza
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Formatta la data in italiano
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Ottieni eventi per categoria
    getEventsByCategory(category) {
        return this.events.filter(event => event.category === category);
    }

    // Ottieni eventi per data
    getEventsByDate(date) {
        return this.events.filter(event => event.date === date);
    }

    // Ottieni statistiche eventi
    getEventsStats() {
        const stats = {
            total: this.events.length,
            byCategory: {},
            byMonth: {},
            upcoming: 0
        };

        const now = new Date();
        
        this.events.forEach(event => {
            // Per categoria
            const category = CONFIG.CATEGORIES[event.category]?.name || 'Altro';
            stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

            // Per mese
            const eventDate = new Date(event.date);
            const monthKey = eventDate.toLocaleDateString('it-IT', { year: 'numeric', month: 'long' });
            stats.byMonth[monthKey] = (stats.byMonth[monthKey] || 0) + 1;

            // Eventi futuri (prossimi 30 giorni)
            const diffDays = (eventDate - now) / (1000 * 60 * 60 * 24);
            if (diffDays >= 0 && diffDays <= 30) {
                stats.upcoming++;
            }
        });

        return stats;
    }

    // Esporta eventi in formato CSV
    exportToCSV() {
        if (this.events.length === 0) {
            alert('Nessun evento da esportare');
            return;
        }

        const headers = ['Titolo', 'Categoria', 'Data', 'Ora', 'Luogo', 'Descrizione', 'Prezzo', 'Contatto'];
        const rows = this.events.map(event => [
            event.title,
            CONFIG.CATEGORIES[event.category]?.name || 'Altro',
            event.date,
            event.time || '',
            event.location,
            event.description || '',
            event.price || '',
            event.contact || ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `eventi_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    }
}

// Inizializza il gestore degli eventi
window.eventsManager = new EventsManager();