export const utility =
{
    generateID() {
        let code = "";
        let charPool = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        for (let i = 0; i < 10; i++) {
            code += charPool[this.getRandomInt(61)]
        }
        return code;
    },

    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    },

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    validateCustomRolesJsonObject(name, expectedKeys) {
        let value = localStorage.getItem(name);
        if (value !== null) {
            let valueJson;
            try {
                valueJson = JSON.parse(value);
            } catch(e) {
                console.error(e.message);
                localStorage.removeItem(name);
                return false;
            }
            if (valueJson && Array.isArray(valueJson)) { // some defensive programming - check if it's an array, and that the object has the expected structure
                for (let i = 0; i < valueJson.length; i++){
                    if (expectedKeys.some((key) => !Object.keys(valueJson[i]).includes(key))) {
                        console.error("tried to read invalid object: " + valueJson[i] + " with expected keys: " + expectedKeys);
                        valueJson.splice(i, 1);
                        localStorage.setItem(name, JSON.stringify(valueJson));
                    }
                }
                return valueJson;
            } else { // object has been messed with. remove it.
                localStorage.removeItem(name);
                return false;
            }
        }
    }
};
