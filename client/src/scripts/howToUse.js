import { injectNavbar } from '../modules/front_end_components/Navbar.js';

const howToUse = () => {
    injectNavbar();
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = howToUse;
} else {
    howToUse();
}
