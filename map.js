// Gestione della mappa con Leaflet
class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.userMarker = null;
        this.userPosition = null;
        this.isInitialized = false;
    }

    // Inizializza la mappa
    initMap() {
        if (this.isInitialized) return;

        try {
            // Crea la mappa centrata su Milano
            this.map = L.map('map').setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);

            // Aggiunge il layer delle tiles OpenStreetMap
            L.tileLayer(CONFIG.MAP.TILE_LAYER, {
                attribution: CONFIG.MAP.ATTRIBUTION,
                maxZoom: CONFIG.MAP.MAX_ZOOM,
                minZoom: CONFIG.MAP.MIN_ZOOM
            }).addTo(this.map);

            // Gestisce il ridimensionamento
            this.map.on('resize', () => {
                this.map.invalidateSize();
            });

            this.isInitialized = true;

            if (CONFIG.DEBUG) {
                console.log('Mappa inizializzata');
            }

        } catch (error) {
            console.error('Errore inizializzazione mappa:', error);
        }
    }

    // Mostra gli eventi sulla mappa
    showEvents(events) {
        if (!this.isInitialized) return;

        // Rimuove i marker esistenti
        this.clearEventMarkers();

        // Aggiunge i nuovi marker
        events.forEach(event => {
            if (event.latitude && event.longitude) {
                this.addEventMarker(event);
            }
        });

        // Centra la mappa sugli eventi se ce ne sono
        if (this.markers.length > 0) {
            this.fitMapToMarkers();
        }
    }

    // Aggiunge un marker per un evento
    addEventMarker(event) {
        try {
            const categoryInfo = CONFIG.CATEGORIES[event.category] || CONFIG.CATEGORIES['altro'];
            
            // Crea un'icona personalizzata per la categoria
            const icon = this.createCategoryIcon(categoryInfo);
            
            // Crea il marker
            const marker = L.marker([event.latitude, event.longitude], {
                icon: icon
            }).addTo(this.map);

            // Crea il contenuto del popup
            const popupContent = this.createPopupContent(event);
            
            // Associa il popup al marker
            marker.bindPopup(popupContent, {
                maxWidth: 300,
                className: 'custom-popup'
            });

            // Aggiunge il marker alla lista
            this.markers.push(marker);

        } catch (error) {
            console.error('Errore aggiunta marker evento:', error);
        }
    }

    // Crea un'icona personalizzata per la categoria
    createCategoryIcon(categoryInfo) {
        return L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-icon" style="background-color: ${categoryInfo.color};">
                     <i class="${categoryInfo.icon}"></i>
                   </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
        });
    }

    // Crea il contenuto del popup
    createPopupContent(event) {
        const categoryInfo = CONFIG.CATEGORIES[event.category] || CONFIG.CATEGORIES['altro'];
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let distanceText = '';
        if (this.userPosition && event.latitude && event.longitude) {
            const distance = window.dbManager.calculateDistance(
                this.userPosition.lat, this.userPosition.lng,
                event.latitude, event.longitude
            );
            distanceText = `<div class="popup-detail">
                              <i class="fas fa-map-marker-alt"></i>
                              <span class="event-distance">${distance.toFixed(1)} km da te</span>
                           </div>`;
        }

        return `
            <div class="popup-content">
                <div class="popup-title">${event.title}</div>
                <div class="popup-category" style="background-color: ${categoryInfo.color};">
                    ${categoryInfo.name}
                </div>
                <div class="popup-detail">
                    <i class="fas fa-calendar"></i>
                    ${formattedDate}
                </div>
                ${event.time ? `<div class="popup-detail">
                    <i class="fas fa-clock"></i>
                    ${event.time}
                </div>` : ''}
                <div class="popup-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    ${event.location}
                </div>
                ${event.price ? `<div class="popup-detail">
                    <i class="fas fa-euro-sign"></i>
                    ${event.price}
                </div>` : ''}
                ${distanceText}
                ${event.description ? `<div style="margin-top: 0.5rem; font-size: 0.8rem; color: #6b7280;">
                    ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}
                </div>` : ''}
            </div>
        `;
    }

    // Rimuove tutti i marker degli eventi
    clearEventMarkers() {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
    }

    // Centra la mappa per mostrare tutti i marker
    fitMapToMarkers() {
        if (this.markers.length === 0) return;

        if (this.markers.length === 1) {
            // Un solo marker: centra su di esso
            this.map.setView(this.markers[0].getLatLng(), 13);
        } else {
            // Più marker: crea un gruppo e centra su di essi
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    // Ottiene la posizione dell'utente
    async getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalizzazione non supportata'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userPos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    this.userPosition = userPos;
                    this.addUserMarker(userPos);
                    resolve(userPos);
                },
                (error) => {
                    let errorMessage;
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = CONFIG.MESSAGES.ERRORS.GEOLOCATION_DENIED;
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Posizione non disponibile';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Timeout geolocalizzazione';
                            break;
                        default:
                            errorMessage = 'Errore geolocalizzazione';
                            break;
                    }
                    reject(new Error(errorMessage));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minuti
                }
            );
        });
    }

    // Aggiunge il marker della posizione utente
    addUserMarker(position) {
        if (!this.isInitialized) return;

        // Rimuove il marker utente precedente
        if (this.userMarker) {
            this.map.removeLayer(this.userMarker);
        }

        // Crea l'icona per l'utente
        const userIcon = L.divIcon({
            className: 'user-marker',
            html: `<div class="user-marker-icon">
                     <i class="fas fa-user"></i>
                   </div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        // Crea il marker utente
        this.userMarker = L.marker([position.lat, position.lng], {
            icon: userIcon
        }).addTo(this.map);

        // Aggiunge un popup
        this.userMarker.bindPopup('La tua posizione', {
            className: 'user-popup'
        });

        if (CONFIG.DEBUG) {
            console.log('Posizione utente:', position);
        }
    }

    // Centra la mappa sulla posizione utente
    centerOnUser(zoom = 13) {
        if (this.userPosition && this.isInitialized) {
            this.map.setView([this.userPosition.lat, this.userPosition.lng], zoom);
        }
    }

    // Aggiunge gli stili CSS per i marker personalizzati
    addCustomStyles() {
        if (document.getElementById('map-custom-styles')) return;

        const style = document.createElement('style');
        style.id = 'map-custom-styles';
        style.textContent = `
            .custom-marker {
                background: transparent;
                border: none;
            }
            
            .marker-icon {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 14px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                border: 2px solid white;
                position: relative;
            }
            
            .marker-icon::after {
                content: '';
                position: absolute;
                bottom: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 8px solid inherit;
            }
            
            .user-marker {
                background: transparent;
                border: none;
            }
            
            .user-marker-icon {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #10b981;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                border: 2px solid white;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% {
                    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
                }
                70% {
                    box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
                }
                100% {
                    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
                }
            }
            
            .custom-popup .leaflet-popup-content-wrapper {
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            
            .user-popup .leaflet-popup-content-wrapper {
                background: #10b981;
                color: white;
                border-radius: 8px;
            }
            
            .user-popup .leaflet-popup-tip {
                background: #10b981;
            }
        `;
        document.head.appendChild(style);
    }

    // Mostra/nascondi la mappa
    toggleVisibility(show) {
        const mapSection = document.getElementById('eventsMapSection');
        if (mapSection) {
            mapSection.style.display = show ? 'block' : 'none';
            
            if (show && this.isInitialized) {
                // Forza il ridimensionamento della mappa quando viene mostrata
                setTimeout(() => {
                    this.map.invalidateSize();
                }, 100);
            }
        }
    }

    // Pulisce tutte le risorse della mappa
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.markers = [];
        this.userMarker = null;
        this.userPosition = null;
        this.isInitialized = false;
    }
}

// Inizializza il gestore della mappa
window.mapManager = new MapManager();

// Inizializza gli stili personalizzati quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.mapManager.addCustomStyles();
});