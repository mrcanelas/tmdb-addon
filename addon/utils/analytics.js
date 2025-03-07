require('dotenv').config()
const Mixpanel = require('mixpanel');
const axios = require('axios');

const MIXPANEL_TOKEN = process.env.MIXPANEL_TOKEN || '';
const MIXPANEL_API_SECRET = process.env.MIXPANEL_API_SECRET || '';

class Analytics {
    static instance;
    constructor() {
        if (!Analytics.instance) {
            if (!MIXPANEL_TOKEN) {
                console.warn("Mixpanel não inicializado: Token não definido.");
                return;
            }
    
            this.mixpanel = Mixpanel.init(MIXPANEL_TOKEN);
            Analytics.instance = this;
        }
        return Analytics.instance;
    }

    trackInstall(data) {
        if (!this.mixpanel) {
            return;
        }
    
        this.mixpanel.track('Addon Installed', {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    trackCatalogAccess(data) {
        if (!this.mixpanel) {
            return;
        }

        this.mixpanel.track('Catalog Accessed', {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    trackMetadataRequest(data) {
        if (!this.mixpanel) {
            return;
        }

        this.mixpanel.track('Metadata Requested', {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    trackConfigUpdate(data) {
        if (!this.mixpanel) {
            return;
        }

        this.mixpanel.track('Configuration Updated', {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    trackError(data) {
        if (!this.mixpanel) {
            return;
        }

        this.mixpanel.track('Error Occurred', {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    trackAPIPerformance(data) {
        if (!this.mixpanel) {
            return;
        }

        this.mixpanel.track('API Performance', {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    trackActiveUsers(count) {
        if (!this.mixpanel) {
            return;
        }

        this.mixpanel.track('Active Users', {
            count,
            timestamp: new Date().toISOString()
        });
    }

    trackUsers(ip) {
        if (!this.mixpanel) {

            return;
        }
    
        this.mixpanel.people.set(ip, {
            $last_seen: new Date().toISOString()
        });
    
        this.mixpanel.track('Users', {
            ip,
            timestamp: new Date().toISOString()
        });
    }

    async getUniqueUserCount() {
        try {
            if (!MIXPANEL_API_SECRET) {
                return { uniqueUserCount: 0 };
            }
    
            const endDate = new Date();
            const startDate = new Date('2011-07-10');
    
            const response = await axios.get('https://data-eu.mixpanel.com/api/2.0/export', {
                params: {
                    event: JSON.stringify(['Users']),
                    from_date: startDate.toISOString().split('T')[0],
                    to_date: endDate.toISOString().split('T')[0]
                },
                headers: {
                    'Authorization': `Basic ${Buffer.from(MIXPANEL_API_SECRET).toString('base64')}`
                }
            });
    
            const lines = response.data.trim().split('\n');
            const events = lines.map(line => JSON.parse(line));
    
            const uniqueUsers = new Set(events.map(event => event.properties.distinct_id));
    
            return { uniqueUserCount: uniqueUsers.size };
        } catch (error) {
            console.error('Erro ao buscar usuários únicos:', error.response ? error.response.data : error.message);
            return { uniqueUserCount: 0 };
        }
    }    
}

module.exports = new Analytics();