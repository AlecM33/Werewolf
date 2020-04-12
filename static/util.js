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
}
};
