export const injectNavbar = (page = null) => {
    if (document.getElementById('navbar') !== null) {
        document.getElementById('navbar').innerHTML =
            "<button name='Mobile Navbar' aria-label='Mobile Navbar' id=\"navbar-hamburger\" class=\"hamburger hamburger--collapse\" type=\"button\">" +
            '<span class="hamburger-box">' +
            '<span class="hamburger-inner"></span>' +
            '</span>' +
            '</button>' +
            '<div id="mobile-menu" class="hidden">' +
            '<div id="mobile-links">' +
            getNavbarLinks(page, 'mobile') +
            '</div>' +
            '</div>' +
            '</a>' +
            '<div id="desktop-menu">' +
            '<div id="desktop-links">' +
            getNavbarLinks(page, 'desktop') +
            '</div>' +
            '</div>' +
            '<div id="navbar-profile"></div>';
    }
    attachHamburgerListener();
};

function flipHamburger () {
    const hamburger = document.getElementById('navbar-hamburger');
    if (hamburger.classList.contains('is-active')) {
        hamburger.classList.remove('is-active');
        document.getElementById('mobile-menu').classList.add('hidden');
        document.getElementById('mobile-menu-background-overlay').classList.remove('overlay');
    } else {
        hamburger.classList.add('is-active');
        document.getElementById('mobile-menu-background-overlay').classList.add('overlay');
        document.getElementById('mobile-menu').classList.remove('hidden');
    }
}

function getNavbarLinks (page = null, device) {
    const linkClass = device === 'mobile' ? 'mobile-link' : 'desktop-link';
    return '<a href="/" class="logo ' + linkClass + '">' +
    '<img alt="logo" src="../../images/Werewolf_Small.png"/>' +
    '</a>' +
    '<a class="' + linkClass + '" href="/">Home</a>' +
    '<a class="' + linkClass + '" href="/create">Create</a>' +
    '<a class="' + linkClass + '" href="/how-to-use">How to Use</a>' +
    '<a class="' + linkClass + ' "href="mailto:play.werewolf.contact@gmail.com?Subject=Werewolf App" target="_top">Feedback</a>' +
    '<a class="' + linkClass + ' "href="https://github.com/alecm33/Werewolf" target="_top">Github</a>' +
    '<a class="' + linkClass + '" href="https://www.buymeacoffee.com/alecm33">Support the App</a>';
}

function attachHamburgerListener () {
    if (document.getElementById('navbar') !== null && document.getElementById('navbar').style.display !== 'none') {
        document.getElementById('navbar-hamburger').addEventListener('click', flipHamburger);
    }
}
