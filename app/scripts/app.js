'use strict';

const ipConfigButton = document.querySelector('.js-ip-config'),
    configView = document.querySelector('#configView'),
    appView = document.querySelector('#appView'),
    actionButtons = document.querySelectorAll('.btn-action'),
    ipModalField = document.querySelector('#ipField'),
    ipModalSave = document.querySelector('.js-ip-save'),
    statusText = document.querySelector('.vol'),
    muteButton = document.querySelector('button[data-action="MUTE"]');

// Helper event function
function addEvent(evnt, elem, func) {
    if (elem.addEventListener) {
        elem.addEventListener(evnt, func, false);
    } else if (elem.attachEvent) {
        elem.attachEvent('on' + evnt, func);
    } else {
        elem[evnt] = func;
    }
}

const app = {
    socket: null,
    connect: function () {
        app.socket = io.connect(window.location.href, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity
        });
        app.socket.on('connect', () => {
            console.log('connected to server');
            if (localStorage.getItem('ipAddress')) {
                app.start();
            } else {
                app.showIpConfig();
            }
        });
        app.socket.on('disconnect', () => {
            statusText.textContent = 'Disconnected from server';
            console.log('disconnected from server');
        });
        app.socket.on('error', (error) => {
            console.log(error);
        });
        app.socket.on('reconnect', () => {
            console.log('reconnect to server');
        });

        // 'start' event listener
        app.socket.on('volume', (result) => {
            statusText.textContent = 'Volume - ' + result.volume;
        });

        app.socket.on('muted', (result) => {
            muteButton.innerHTML = '<i class="icon-volume-off"></i> ' + (result.muted === '1' ? "Unmute" : "Mute");
        });

        [].forEach.call(actionButtons, (button) => {
            addEvent('click', button, (e) => {
                e.preventDefault();
                button.blur();
                app.socket.emit('action', {action: button.getAttribute('data-action')});
            });
        });

        addEvent('click', ipConfigButton, (e) => {
            e.preventDefault();
            console.log('showIpConfig');
            app.showIpConfig();
        });

        // 'showIpConfig' event listener
        addEvent('click', ipModalSave, (e) => {
            e.preventDefault();
            console.log('ipModalSave');
            app.socket.emit('setIpAddress', ipModalField.value);
        });
        app.socket.on('ipAddressResult', (result) => {
            if (result.ip) {
                console.log('ipAddressResult');
                window.localStorage.setItem('ipAddress', result.ip);
                app.switchView(configView, appView);
            } else if (result.error) {
                window.alert('Invalid IP address');
            }
        });
    },
    switchView: (from, to) => {
        from.style.display = 'none';
        to.style.display = 'block';
    },
    showIpConfig: () => {
        this.switchView(appView, configView);
        ipModalField.value = localStorage.getItem('ipAddress');
    },
    start: () => {
        console.log('start()');
        app.socket.emit('setIpAddress', localStorage.getItem('ipAddress'));
    }
};
app.connect();
