import { injectNavbar } from '../modules/front_end_components/Navbar.js';

const notFound = () => {
    injectNavbar();
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = notFound;
} else {
    notFound();
}
