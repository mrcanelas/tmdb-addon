const Mixpanel = require('mixpanel');
const axios = require('axios');

const MIXPANEL_TOKEN = process.env.MIXPANEL_TOKEN || '';
const MIXPANEL_API_SECRET = process.env.MIXPANEL_API_SECRET || '';

class Analytics {
    static instance;
    constructor() {
        if (!Analytics.instance) {
            this.mixpanel = Mixpanel.init(MIXPANEL_TOKEN);
            Analytics.instance = this;
        }
        return Analytics.instance;
    }

    // Busca dados históricos do Mixpanel usando a API Export
    async getHistoricalInstalls() {
        try {
            if (!MIXPANEL_API_SECRET) {
                console.warn('MIXPANEL_API_SECRET não configurados. Dados históricos não disponíveis.');
                return { uniqueIps: [], totalInstalls: 0 };
            }

            const endDate = new Date();
            const startDate = new Date('2011-07-10'); // Data mínima suportada pelo Mixpanel

            const response = await axios.get('https://data-eu.mixpanel.com/api/2.0/export', {
                params: {
                    event: JSON.stringify(['Addon Installed']),
                    from_date: startDate.toISOString().split('T')[0], 
                    to_date: endDate.toISOString().split('T')[0]
                },
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${MIXPANEL_API_SECRET}`).toString('base64')}`
                }
            });
            
            const events = response.data.split("\n").filter(line => line).map(line => JSON.parse(line));
            const uniqueIps = new Set();
            let totalInstalls = events.length;

            events.forEach(event => {
                if (event.properties && event.properties.$ip) { // Mixpanel geralmente usa `$ip` ao invés de `ip`
                    uniqueIps.add(event.properties.$ip);
                }
            });
            
            console.log(`Dados históricos carregados com sucesso: ${uniqueIps.size} instalações únicas, ${totalInstalls} instalações totais`);

            return {
                uniqueIps: Array.from(uniqueIps),
                totalInstalls
            };
        } catch (error) {
            console.error('Erro ao buscar dados do Mixpanel:', error.message);
        
            if (error.response) {
                console.error(`Status: ${error.response.status}`);
                console.error('Resposta:', error.response.data);
            } else {
                console.error('Erro desconhecido:', error);
            }
        
            return { uniqueIps: [], totalInstalls: 0 };
        }
        
    }

    // Track addon installation
    trackInstall(data) {
        if (!this.mixpanel) {
            console.warn("Mixpanel não inicializado corretamente.");
            return;
        }
    
        this.mixpanel.track('Addon Installed', {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    // Track catalog access
    trackCatalogAccess(data) {
        if (!this.mixpanel) {
            console.warn("Mixpanel não inicializado corretamente.");
            return;
        }

        this.mixpanel.track('Catalog Accessed', {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    // Track metadata requests
    trackMetadataRequest(data) {
        if (!this.mixpanel) {
            console.warn("Mixpanel não inicializado corretamente.");
            return;
        }

        this.mixpanel.track('Metadata Requested', {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    // Track configuration changes
    trackConfigUpdate(data) {
        if (!this.mixpanel) {
            console.warn("Mixpanel não inicializado corretamente.");
            return;
        }

        this.mixpanel.track('Configuration Updated', {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    // Track errors
    trackError(data) {
        if (!this.mixpanel) {
            console.warn("Mixpanel não inicializado corretamente.");
            return;
        }

        this.mixpanel.track('Error Occurred', {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    // Track API performance
    trackAPIPerformance(data) {
        if (!this.mixpanel) {
            console.warn("Mixpanel não inicializado corretamente.");
            return;
        }

        this.mixpanel.track('API Performance', {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    // Track active users
    trackActiveUsers(count) {
        if (!this.mixpanel) {
            console.warn("Mixpanel não inicializado corretamente.");
            return;
        }

        this.mixpanel.track('Active Users', {
            count,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = new Analytics();