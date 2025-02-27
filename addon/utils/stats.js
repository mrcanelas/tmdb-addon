const analytics = require('./analytics');

class Stats {
    constructor() {
        if (Stats.instance) {
            return Stats.instance;
        }
        Stats.instance = this;
        this.installations = new Set(); // IPs únicos que instalaram
        this.totalInstalls = 0; // Total de instalações (incluindo repetidas)
        
        // Carrega dados históricos do Mixpanel na inicialização
        this.loadHistoricalData();
    }

    async loadHistoricalData() {
        try {
            const historicalData = await analytics.getHistoricalInstalls();
            
            if (historicalData) {
                // Adiciona IPs únicos históricos
                historicalData.uniqueIps.forEach(ip => this.installations.add(ip));
                this.totalInstalls = historicalData.totalInstalls;
                
                console.log(`Loaded historical data: ${this.installations.size} unique installs, ${this.totalInstalls} total installs`);
            }
        } catch (error) {
            console.error('Error loading historical data:', error);
        }
    }

    trackInstallation(ip) {
        this.totalInstalls++;
        const wasNewInstall = !this.installations.has(ip);
        
        if (wasNewInstall) {
            this.installations.add(ip);
            analytics.trackInstall({
                uniqueInstalls: this.installations.size,
                totalInstalls: this.totalInstalls,
                ip: ip // para análise interna apenas
            });
        }
    }

    getStats() {
        return {
            uniqueInstalls: this.installations.size,
            totalInstalls: this.totalInstalls,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = new Stats(); 