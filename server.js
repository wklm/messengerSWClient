var path = require('path');
var express = require('express');
var http = require('http');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var bodyParser = require('body-parser');
var messenger = require('facebook-chat-api');
var session = require('express-session');
var redisStore = require('connect-redis')(session);
var cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(session({
    store: new redisStore(),
    secret: 'sssecret'
}));
app.use(require('express-promise')());
app.use('/', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var sess;

function login(email, password) {
    messenger({email: email, password: password}, function callback(err, api) {
        sess.apiSession = api.getAppState();
        return !!err;
    });
}

io.on('connection', function (socket) {
    socket.on('chat message outgoing', function (msg) {
        var message = JSON.parse(msg);
        messenger({appState: sess.apiSession}, function callback(err, api) {
            if (!err && message['body'] && message['thread']) {
                api.sendMessage(message['body'], message['thread']);
            } else console.error(err);
        });
        message = null;
    });
});

app.get('/api', function (req, res) {
    sess = req.session;
    sess.email = req.param('email').toString().trim();
    sess.password = req.param('password').toString().trim();
    login(sess.email, sess.password) ? res.send(false) : res.send(true);
});

app.get('/api/currentUserID', function (req, res) {
    messenger({appState: sess.apiSession}, function callback(err, api) {
        if (err) return console.error(err);
        res.send(api.getCurrentUserID());
    });
});

app.get('/api/appStatus', function (req, res) {
    messenger({appState: sess.apiSession}, function callback(err, api) {
        if (err) return console.error(err);
        res.send(api.getAppState());
    });
});

app.get('/api/threads/:threadID/portion/:portion', function (req, res) {
    var start = req.params.portion;
    var end = start + 10;
    messenger({appState: sess.apiSession}, function callback(err, api) {
        if (err) return console.error(err);
        api.getThreadHistory(req.params.threadID, start, end, null, function (err, data) {
            res.send(data);
        });
    });
});

app.get('/api/friends', function (req, res) {
    messenger({appState: sess.apiSession}, function callback(err, api) {
        api.getFriendsList(function (err, data) {
            if (err) return console.error(err);
            res.send(data);
        });
    });
});

var lastMessageID = null;
app.get('/api/listen', function (req, res) { //TODO: support another message types
    messenger({appState: sess.apiSession}, function callback(err, api) {
        if (err) return console.error(err);
        var stopListening = api.listen(function (err, event) {
            if (event.body && event.threadID) {
                var message = {
                    body: event.body,
                    thread: event.threadID,
                    messagedID: event.messageID,
                    attachments: event.attachments,
                    isGroup: event.isGroup,
                    senderID: event.senderID,
                    date: Date.now()
                };
                if (event.messageID !== lastMessageID) { // Prevent multiple io.emit() calls <-- api bug :(
                    io.emit('chat message incoming', JSON.stringify(message));
                }
                lastMessageID = event.messageID;
                message = null;
            }
        });
        stopListening = null;
    })
});

app.get('/api/logout', function (req, res) {
    messenger({appState: sess.apiSession}, function callback(err, api) {
        if (err) return console.error(err);
        api.logout(function () {
            res.send(true);
        });
    });
});

app.get('/api/threads/:portion', function (req, res) {
    var start = req.params.portion;
    var end = start + 25;
    messenger({appState: sess.apiSession}, function callback(err, api) {
        if (err) return console.error(err);
        api.getThreadList(start, end, function (err, data) {
            res.send(data);
        });
    });
});

app.get('/api/getUserByName/:name', function (req, res) {
    messenger({appState: sess.apiSession}, function callback(err, api) {
        api.getUserID(req.params.name, function (err, data) {
            if (err) return console.error(err);
            res.send(data);
        });
    });
});

app.get('/api/getUserById/:id', function (req, res) {
    messenger({appState: sess.apiSession}, function callback(err, api) {
        api.getUserInfo(req.params.id, function (err, data) {
            if (err) return console.error(err);
            res.send(data);
        });
    });
});

app.get('/sw', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/scripts/serviceWorker.js'));
});

app.get('/css', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/css/base.css'));
});

app.get('/react', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/scripts/messenger.js'));
});
app.get('/sw-toolbox', function (req, res) {
    res.sendFile(path.join(__dirname + '/bower_components/sw-toolbox/sw-toolbox.js'));
});

app.listen(app.get('port'), function () {
    console.log('Server started: http://localhost:3000');
});

server.listen(3000); //TODO: envs

