'use strict';

var connect = require('connect'),
    http = require('http'),
    port = 3000,
    app = connect().use(connect.static(__dirname + '/app'));


// Start the app
console.log('App started on port ' + port);
var server = http.createServer(app).listen(port);

// Configure socket.io for WebSockets
var io = require('socket.io')
    .listen(server)
    .set('log level', 1);

// A method for sending requests
var sendRequest = function (ipAddress, type, action, command, options) {
    var url, urn;
    if (typeof ipAddress === 'undefined') return;
    if (type === 'command') {
        url = '/nrc/control_0';
        urn = 'panasonic-com:service:p00NetworkControl:1';
    } else if (type === 'render') {
        url = '/dmr/control_0';
        urn = 'schemas-upnp-org:service:RenderingControl:1';
    } else if (type === 'contentDirectory') {
        url = '/dms/control_0';
        urn = 'schemas-upnp-org:service:ContentDirectory:1';
    }

    var body = "<?xml version='1.0' encoding='utf-8'?> \
                <s:Envelope xmlns:s='http://schemas.xmlsoap.org/soap/envelope/' s:encodingStyle='http://schemas.xmlsoap.org/soap/encoding/'> \
                  <s:Body> \
                    <u:" + action + " xmlns:u='urn:" + urn + "'> \
                    " + command + " \
                    </u:" + action + "> \
                  </s:Body> \
                </s:Envelope>";

    var postRequest = {
        //proxy:'127.0.0.1:8888',
        host: ipAddress,
        path: url,
        port: 55000,
        method: 'POST',
        headers: {
            'Content-Length': body.length,
            'Content-Type': 'text/xml; charset="utf-8"',
            'SOAPACTION': '"urn:' + urn + '#' + action + '"'
        }
    };

    var self = {};
    if (options !== undefined) {
        self.callback = options.callback;
    } else {
        self.callback = function () {
            console.log('Command:', command);
        };
    }

    var req = http.request(postRequest, function (res) {
        res.setEncoding('utf8');
        res.on('data', self.callback);
    });

    req.on('error', function (e) {
        console.log('Error ' + e);
        return false;
    });

    req.write(body);
    req.end();
};

// Define WebSockets connections
io.sockets.on('connection', function (socket) {

    var ipAddress;
    socket.on('setIpAddress', function (ip) {
        var ipRegExp = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
        if (ipRegExp.test(ip)) {
            ipAddress = ip;
            socket.emit('ipAddressResult', {ip: ipAddress});
        } else {
            socket.emit('ipAddressResult', {error: 'Invalid IP address'});
        }
    });

    function getVolume() {
        sendRequest(ipAddress, 'render', 'GetVolume', '<InstanceID>0</InstanceID><Channel>Master</Channel>', {
            callback: function (data) {
                var match = /<CurrentVolume>(\d*)<\/CurrentVolume>/gm.exec(data);
                if (match !== null) {
                    socket.emit('volume', {volume: match[1]});
                }
            }
        });
    }

    function getMute() {
        sendRequest(ipAddress, 'render', 'GetMute', '<InstanceID>0</InstanceID><Channel>Master</Channel>', {
            callback: function (data) {
                var match = /<CurrentMute>(\d*)<\/CurrentMute>/gm.exec(data);
                if (match !== null) {
                    socket.emit('muted', {muted: match[1]});
                }
            }
        });
    }

    function getTest() {
        sendRequest(ipAddress, 'render', 'LastChange', '<InstanceID>0</InstanceID><Channel>Master</Channel>', {
            callback: function (data) {
                console.log(data);
                // var match = /<CurrentMute>(\d*)<\/CurrentMute>/gm.exec(data);
                // if(match !== null) {
                //     socket.emit('muted', { muted: match[1] });
                // }
            }
        });
    }

    (function interval() {
        getVolume();
        getMute();
        setTimeout(interval, 1000);
    })();

    socket.on('action', function (action) {
        if (action.action === "TEST") {
            getTest();
            return;
        }
        var action = action['action'].toUpperCase();
        var actionCommand = 'NRC_' + action + '-ONOFF';
        var isSuccess = sendRequest(ipAddress, 'command', 'X_SendKey', '<X_KeyEvent>' + actionCommand + '</X_KeyEvent>')
        if (!isSuccess) {
            socket.emit('actionError', {error: 'internal error'});
            return;
        }
        /*        if (["VOLUP", "VOLDOWN"].indexOf(action) > -1){
                    getVolume();
                }else if (action === "MUTE"){
                    getMute();
                }*/
    });
});

function browse() {
    sendRequest('192.168.1.10', 'contentDirectory', 'Browse',
        '<ObjectID>0</ObjectID>' +
        '<BrowseFlag>BrowseDirectChildren</BrowseFlag>' +
        '<Filter>*</Filter>' +
        '<StartingIndex>0</StartingIndex>' +
        '<RequestedCount>0</RequestedCount>' +
        '<SortCriteria></SortCriteria>', {
            callback: function (data) {
                //console.log(data);
                var match = /<NumberReturned>(\d*)<\/NumberReturned>/gm.exec(data);
                if (match !== null) {
                    console.log('NumberReturned: ' + match[1]);
                    //socket.emit('muted', { muted: match[1] });
                }
            }
        });
}

//browse();
