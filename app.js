// Applicazione principale - Inizializzazione e coordinamento
class App {
    constructor() {
        this.isInitialized = false;
        this.version = '1.0.0';
    }

    // Inizializza l'applicazione
    async init() {
        if (this.isInitialized) return;

        try {
            if (CONFIG.DEBUG) {
                console.log('🚀 Inizializzazione Eventi Comunità v' + this.version);
                console.log('Configurazione:', CONFIG);
            }

            // Verifica la configurazione
            this.validateConfig();

            // Inizializza i componenti nell'ordine giusto
            await this.initializeComponents();

            // Imposta gli event listeners globali
            this.setupGlobalListeners();

            // Carica i dati iniziali
            await this.loadInitialData();

            this.isInitialized = true;

            if (CONFIG.DEBUG) {
                console.log('✅ Applicazione inizializzata correttamente');
            }

        } catch (error) {
            console.error('❌ Errore durante l\'inizializzazione:', error);
            this.handleInitializationError(error);
        }
    }

    // Valida la configurazione
    validateConfig() {
        const requiredConfigs = [
            'GOOGLE_CLIENT_ID',
            'GOOGLE_SHEETS_ID',
            'GOOGLE_API_KEY'
        ];

        const missingConfigs = requiredConfigs.filter(key => !CONFIG[key] || CONFIG[key].startsWith('TUO_'));

        if (missingConfigs.length > 0) {
            throw new Error(`Configurazione mancante: ${missingConfigs.join(', ')}`);
        }
    }

    // Inizializza tutti i componenti
    async initializeComponents() {
        // 1. Autenticazione (deve essere primo)
        if (window.authManager) {
            await window.authManager.init();
        }

        // 2. Gestori dei filtri
        if (window.filtersManager) {
            window.filtersManager.init();
        }

        // 3. Gestore degli eventi
        if (window.eventsManager) {
            window.eventsManager.init();
        }

        // 4. Mappa (inizializzazione lazy)
        // La mappa verrà inizializzata quando necessario

        if (CONFIG.DEBUG) {
            console.log('📦 Componenti inizializzati');
        }
    }

    // Imposta listener globali
    setupGlobalListeners() {
        // Gestisce il resize della finestra
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleWindowResize();
            }, 250);
        });

        // Gestisce la visibilità della pagina
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // Gestisce errori non catturati
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event.error);
        });

        // Gestisce promise rejections non catturate
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError(event.reason);
        });

        // Gestisce la connettività
        window.addEventListener('online', () => {
            this.handleConnectivityChange(true);
        });

        window.addEventListener('offline', () => {
            this.handleConnectivityChange(false);
        });

        if (CONFIG.DEBUG) {
            console.log('🎧 Event listeners globali configurati');
        }
    }

    // Carica i dati iniziali
    async loadInitialData() {
        try {
            // Mostra loading
            this.showInitialLoading(true);

            // Carica gli eventi
            await window.filtersManager.performSearch();

            if (CONFIG.DEBUG) {
                console.log('📊 Dati iniziali caricati');
            }

        } catch (error) {
            console.error('Errore caricamento dati iniziali:', error);
            this.showError('Errore durante il caricamento degli eventi. Riprova più tardi.');
        } finally {
            // Nascondi loading
            this.showInitialLoading(false);
        }
    }

    // Gestisce il ridimensionamento della finestra
    handleWindowResize() {
        // Ridimensiona la mappa se visibile
        if (window.mapManager && window.mapManager.isInitialized) {
            setTimeout(() => {
                window.mapManager.map.invalidateSize();
            }, 100);
        }

        if (CONFIG.DEBUG) {
            console.log('🔄 Finestra ridimensionata');
        }
    }

    // Gestisce il cambio di visibilità della pagina
    handleVisibilityChange() {
        if (document.hidden) {
            // Pagina nascosta - pausa operazioni non critiche
            if (CONFIG.DEBUG) {
                console.log('👁️ Pagina nascosta');
            }
        } else {
            // Pagina visibile - riprendi operazioni
            if (CONFIG.DEBUG) {
                console.log('👁️ Pagina visibile');
            }
            
            // Controlla se ci sono aggiornamenti ai dati
            this.checkForUpdates();
        }
    }

    // Gestisce errori globali
    handleGlobalError(error) {
        console.error('🚨 Errore globale:', error);

        // In produzione, invia l'errore a un servizio di monitoring
        if (!CONFIG.DEBUG) {
            // Qui potresti inviare l'errore a Sentry, LogRocket, etc.
        }

        // Mostra un messaggio all'utente solo per errori critici
        if (this.isCriticalError(error)) {
            this.showError('Si è verificato un errore. Ricarica la pagina se il problema persiste.');
        }
    }

    // Gestisce i cambiamenti di connettività
    handleConnectivityChange(isOnline) {
        if (isOnline) {
            this.showSuccess('Connessione ripristinata');
            // Ricarica i dati se necessario
            this.checkForUpdates();
        } else {
            this.showWarning('Connessione persa. Alcune funzionalità potrebbero non essere disponibili.');
        }

        if (CONFIG.DEBUG) {
            console.log('🌐 Connettività:', isOnline ? 'Online' : 'Offline');
        }
    }

    // Controlla se un errore è critico
    isCriticalError(error) {
        const criticalKeywords = [
            'network',
            'authentication',
            'authorization',
            'cors'
        ];

        const errorString = error.toString().toLowerCase();
        return criticalKeywords.some(keyword => errorString.includes(keyword));
    }

    // Controlla aggiornamenti ai dati
    async checkForUpdates() {
        try {
            // Invalida la cache del database
            if (window.dbManager) {
                window.dbManager.invalidateCache();
            }

            // Ricarica solo se sono passati più di 5 minuti
            const lastUpdate = localStorage.getItem('lastDataUpdate');
            const now = Date.now();
            
            if (!lastUpdate || (now - parseInt(lastUpdate)) > 5 * 60 * 1000) {
                await window.filtersManager.performSearch();
                localStorage.setItem('lastDataUpdate', now.toString());
            }

        } catch (error) {
            console.error('Errore controllo aggiornamenti:', error);
        }
    }

    // Mostra loading iniziale
    showInitialLoading(show) {
        const loadingSection = document.getElementById('loadingSection');
        if (loadingSection) {
            loadingSection.style.display = show ? 'block' : 'none';
        }
    }

    // Mostra messaggi all'utente
    showMessage(message, type = 'info', duration = 5000) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `app-message app-message-${type}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <i class="fas ${this.getMessageIcon(type)}"></i>
                <span>${message}</span>
                <button class="message-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Applica stili
        messageDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            max-width: 400px;
            background: ${this.getMessageColor(type)};
            color: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1002;
            animation: slideInRight 0.3s ease-out;
            font-family: inherit;
        `;

        document.body.appendChild(messageDiv);

        // Auto-remove dopo la durata specificata
        if (duration > 0) {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, duration);
        }

        return messageDiv;
    }

    // Ottieni icona per tipo di messaggio
    getMessageIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // Ottieni colore per tipo di messaggio
    getMessageColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    // Metodi di convenienza per i messaggi
    showSuccess(message, duration = 3000) {
        return this.showMessage(message, 'success', duration);
    }

    showError(message, duration = 0) {
        return this.showMessage(message, 'error', duration);
    }

    showWarning(message, duration = 5000) {
        return this.showMessage(message, 'warning', duration);
    }

    showInfo(message, duration = 5000) {
        return this.showMessage(message, 'info', duration);
    }

    // Gestisce errori di inizializzazione
    handleInitializationError(error) {
        const errorMessage = `
            <div style="max-width: 600px; margin: 2rem auto; padding: 2rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b;">
                <h2 style="color: #991b1b; margin-bottom: 1rem;">
                    <i class="fas fa-exclamation-triangle"></i>
                    Errore di inizializzazione
                </h2>
                <p><strong>Dettagli:</strong> ${error.message}</p>
                <div style="margin-top: 1rem; padding: 1rem; background: #fee2e2; border-radius: 4px; font-family: monospace; font-size: 0.9rem;">
                    Verifica la configurazione in config.js:
                    <ul style="margin: 0.5rem 0; padding-left: 1rem;">
                        <li>GOOGLE_CLIENT_ID deve essere configurato</li>
                        <li>GOOGLE_SHEETS_ID deve puntare al tuo foglio</li>
                        <li>GOOGLE_API_KEY deve essere valida</li>
                    </ul>
                </div>
                <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-redo"></i> Ricarica pagina
                </button>
            </div>
        `;

        const main = document.querySelector('.main .container');
        if (main) {
            main.innerHTML = errorMessage;
        }
    }

    // Ottieni informazioni sull'app
    getAppInfo() {
        return {
            version: this.version,
            initialized: this.isInitialized,
            userAgent: navigator.userAgent,
            online: navigator.onLine,
            components: {
                authManager: !!window.authManager,
                dbManager: !!window.dbManager,
                mapManager: !!window.mapManager,
                filtersManager: !!window.filtersManager,
                eventsManager: !!window.eventsManager
            }
        };
    }

    // Debug: mostra info app
    debug() {
        if (CONFIG.DEBUG) {
            console.table(this.getAppInfo());
        }
    }
}

// Aggiunge stili per i messaggi
const appStyles = document.createElement('style');
appStyles.textContent = `
    .message-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .message-close {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        margin-left: auto;
        opacity: 0.8;
        transition: opacity 0.2s;
    }
    
    .message-close:hover {
        opacity: 1;
        background: rgba(255,255,255,0.1);
    }
`;
document.head.appendChild(appStyles);

// Inizializza l'applicazione
const app = new App();

// Avvia l'app quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app.init();
    });
} else {
    app.init();
}

// Espone l'app globalmente per debugging
if (CONFIG.DEBUG) {
    window.app = app;
}