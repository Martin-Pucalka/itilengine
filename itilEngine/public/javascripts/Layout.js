var Layout = Layout || {};

// show player or creator website header
Layout.init = function () {
    if (window.location.href.indexOf("/creator/") !== -1) {
        // show creator buttons
        document.getElementById('creatorMenu').style.display = 'block';
        document.getElementById('playerMenu').style.display = 'none';
        document.getElementById('creatorButton').classList.add('active');
        document.getElementById('playerButton').classList.remove('active');

        // highlight created or published button according to URL
        [].forEach.call(document.getElementsByClassName("navButton"), function (el) {
            el.classList.remove('active');
        });
        if (window.location.href.indexOf("/creator/services/created") !== -1) {
            document.getElementById('createdServicesButton').classList.add('active');
        } else if (window.location.href.indexOf("/creator/services/published") !== -1) {
            document.getElementById('publishedServicesButton').classList.add('active');
        }
    } else if (window.location.href.indexOf("/player/") !== -1) {
        // show player buttons
        document.getElementById('creatorMenu').style.display = 'none';
        document.getElementById('playerMenu').style.display = 'block';
        document.getElementById('creatorButton').classList.remove('active');
        document.getElementById('playerButton').classList.add('active');

        // highlight available services or played services or service desk button according to URL
        if (window.location.href.indexOf("/player/services/available") !== -1) {
            document.getElementById('publishedServicesButton').classList.remove('active');
            document.getElementById('seviceCataloguesButton').classList.remove('active');
            document.getElementById('availableServicesButton').classList.add('active');
        } else if (window.location.href.indexOf("/player/games/listPlayed") !== -1) {
            document.getElementById('availableServicesButton').classList.remove('active');
            document.getElementById('serviceDeskButton').classList.remove('active');
            document.getElementById('seviceCataloguesButton').classList.add('active');
        } else if (window.location.href.indexOf("/player/games/serviceDesk") !== -1) {
            document.getElementById('availableServicesButton').classList.remove('active');
            document.getElementById('seviceCataloguesButton').classList.remove('active');
            document.getElementById('serviceDeskButton').classList.add('active');
        }
    } else {
        // register or login page - no player neither creator buttons
        document.getElementById('playerMenu').style.display = 'none';
        document.getElementById('creatorMenu').style.display = 'none';
    }
}