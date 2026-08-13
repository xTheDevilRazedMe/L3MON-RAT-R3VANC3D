const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

const TUNNEL_STATE_FILE = path.join(__dirname, '../tunnel.json');

class TunnelManager {
    constructor(controlPort = 22222) {
        this.controlPort = controlPort;
        this.tunnel = null;
        this.url = null;
        this._loadState();
    }

    _loadState() {
        try {
            if (fs.existsSync(TUNNEL_STATE_FILE)) {
                let state = JSON.parse(fs.readFileSync(TUNNEL_STATE_FILE, 'utf8'));
                this.url = state.url || null;
            }
        } catch (e) {
            this.url = null;
        }
    }

    _saveState() {
        try {
            fs.writeFileSync(TUNNEL_STATE_FILE, JSON.stringify({ url: this.url, port: this.controlPort }, null, 2));
        } catch (e) { /* ignore */ }
    }

    getUrl() {
        return this.url;
    }

    async start(options = {}) {
        if (this.tunnel) return { url: this.tunnel.url, error: false };

        try {
            this.tunnel = await localtunnel({
                port: this.controlPort,
                subdomain: options.subdomain || process.env.L3MON_TUNNEL_SUBDOMAIN || undefined
            });

            this.url = this.tunnel.url;
            this._saveState();

            this.tunnel.on('close', () => {
                this.tunnel = null;
                this.url = null;
                this._saveState();
            });

            return { url: this.url, error: false };
        } catch (err) {
            return { error: err.message || 'Tunnel failed' };
        }
    }

    stop() {
        if (this.tunnel) {
            this.tunnel.close();
            this.tunnel = null;
            this.url = null;
            this._saveState();
        }
    }
}

module.exports = TunnelManager;
