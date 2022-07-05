import { injectNavbar } from '../modules/Navbar.js';

const notFound = () => {
    injectNavbar();
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = notFound;
} else {
    notFound();
}
