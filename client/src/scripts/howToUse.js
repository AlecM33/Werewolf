import { injectNavbar } from "../modules/Navbar.js";

const howToUse = () => { injectNavbar(); };

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = howToUse;
} else {
    howToUse();
}
