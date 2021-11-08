const fs = require('fs');

function checkIfFileExists(file) {
    return fs.promises.access(file, fs.constants.F_OK)
        .then(() => true)
        .catch((e) => { console.error(e); return false });
}

module.exports = checkIfFileExists;
