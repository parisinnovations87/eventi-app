// Gestione dell'autenticazione con Google
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.callbacks = [];
    }

    // Inizializza l'autenticazione Google
    async init() {
        try {
            // Aspetta che la libreria Google sia caricata
            await this.waitForGoogle();
            
            // Inizializza Google Identity Services
            google.accounts.id.initialize({
                client_id: CONFIG.GOOGLE_CLIENT_ID,
                callback: this.handleCredentialResponse.bind(this)
            });

            this.isInitialized = true;
            
            // Controlla se l'utente è già loggato
            this.checkExistingAuth();
            
            if (CONFIG.DEBUG) {
                console.log('AuthManager inizializzato');
            }
        } catch (error) {
            console.error('Errore inizializzazione auth:', error);
        }
    }

    // Aspetta che la libreria Google sia disponibile
    waitForGoogle() {
        return new Promise((resolve, reject) => {
            const maxAttempts = 50;
            let attempts = 0;
            
            const check = () => {
                attempts++;
                if (typeof google !== 'undefined' && google.accounts) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Google library not loaded'));
                } else {
                    setTimeout(check, 100);
                }
            };
            
            check();
        });
    }

    // Gestisce la risposta di autenticazione
    async handleCredentialResponse(response) {
        try {
            // Decodifica il JWT token
            const userInfo = this.parseJwt(response.credential);
            
            const user = {
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture,
                token: response.credential
            };

            this.currentUser = user;
            
            // Salva i dati utente nel database
            await this.saveUserData(user);
            
            // Aggiorna l'interfaccia
            this.updateUI();
            
            // Notifica i callback
            this.notifyCallbacks('login', user);
            
            if (CONFIG.DEBUG) {
                console.log('Utente autenticato:', user);
            }
            
        } catch (error) {
            console.error('Errore durante l\'autenticazione:', error);
        }
    }

    // Decodifica il JWT token
    parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Errore parsing JWT:', error);
            return {};
        }
    }

    // Mostra il popup di login
    showLogin() {
        if (!this.isInitialized) {
            console.error('AuthManager non inizializzato');
            return;
        }

        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                // Se il prompt non viene mostrato, mostra il pulsante di login
                this.renderLoginButton();
            }
        });
    }

    // Renderizza il pulsante di login Google
    renderLoginButton() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            // Sostituisce il pulsante personalizzato con quello di Google
            google.accounts.id.renderButton(
                loginBtn,
                {
                    theme: 'outline',
                    size: 'medium',
                    type: 'standard',
                    text: 'signin_with',
                    locale: 'it'
                }
            );
        }
    }

    // Effettua il logout
    logout() {
        this.currentUser = null;
        
        // Rimuove i dati dalla sessione
        sessionStorage.removeItem('user');
        
        // Aggiorna l'interfaccia
        this.updateUI();
        
        // Notifica i callback
        this.notifyCallbacks('logout');
        
        // Revoca l'accesso Google
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.disableAutoSelect();
        }
        
        if (CONFIG.DEBUG) {
            console.log('Utente disconnesso');
        }
    }

    // Controlla se c'è già un'autenticazione attiva
    checkExistingAuth() {
        try {
            const userData = sessionStorage.getItem('user');
            if (userData) {
                this.currentUser = JSON.parse(userData);
                this.updateUI();
                this.notifyCallbacks('login', this.currentUser);
            }
        } catch (error) {
            console.error('Errore controllo auth esistente:', error);
            sessionStorage.removeItem('user');
        }
    }

    // Salva i dati utente nel database
    async saveUserData(user) {
        try {
            // Salva in sessione
            sessionStorage.setItem('user', JSON.stringify(user));
            
            // Prepara i dati per Google Sheets
            const userData = [
                user.email,
                user.name,
                user.picture,
                new Date().toISOString(), // first_login (se non esiste già)
                new Date().toISOString(), // last_login
                'true' // active
            ];
            
            // Salva nel database (implementazione in database.js)
            if (window.dbManager) {
                await window.dbManager.saveUser(userData);
            }
            
        } catch (error) {
            console.error('Errore salvataggio dati utente:', error);
        }
    }

    // Aggiorna l'interfaccia utente
    updateUI() {
        const loginSection = document.getElementById('loginSection');
        const userSection = document.getElementById('userSection');
        const userPhoto = document.getElementById('userPhoto');
        const userName = document.getElementById('userName');

        if (this.currentUser) {
            // Utente loggato
            if (loginSection) loginSection.style.display = 'none';
            if (userSection) userSection.style.display = 'flex';
            if (userPhoto) userPhoto.src = this.currentUser.picture;
            if (userName) userName.textContent = this.currentUser.name;
        } else {
            // Utente non loggato
            if (loginSection) loginSection.style.display = 'block';
            if (userSection) userSection.style.display = 'none';
        }
    }

    // Aggiunge un callback per gli eventi di auth
    onAuthChange(callback) {
        this.callbacks.push(callback);
    }

    // Notifica tutti i callback registrati
    notifyCallbacks(event, data = null) {
        this.callbacks.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Errore callback auth:', error);
            }
        });
    }

    // Restituisce l'utente corrente
    getCurrentUser() {
        return this.currentUser;
    }

    // Controlla se l'utente è autenticato
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Richiede l'autenticazione se necessario
    requireAuth() {
        if (!this.isAuthenticated()) {
            alert('Devi effettuare il login per eseguire questa azione.');
            this.showLogin();
            return false;
        }
        return true;
    }
}

// Inizializza il gestore dell'autenticazione
window.authManager = new AuthManager();

// Event listeners per i pulsanti
document.addEventListener('DOMContentLoaded', () => {
    // Inizializza l'autenticazione
    window.authManager.init();
    
    // Pulsante login
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.authManager.showLogin();
        });
    }
    
    // Pulsante logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.authManager.logout();
        });
    }
});