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
    }
};
