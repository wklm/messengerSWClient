var path = require('path');
var express = require('express');
var http = require('http');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var bodyParser = require('body-parser');
var messenger = require('facebook-chat-api');
var session = require('express-session');
var cookieParser = require('cookie-parser');

app.use(cookieParser());
//app.use(expressSession({secret:'veryverysecrettoken'}));
app.use(require('express-promise')());
app.use('/', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var email;
var password;
var apiSession;

function login(email, password) {
  messenger({email: email, password: password}, function callback(err, api) {
    apiSession = api.getAppState();
    return err;
  });
}

io.on('connection', function (socket) {
  socket.on('chat message outgoing', function (msg) {
    message = JSON.parse(msg);
    messenger({appState: apiSession}, function callback(err, api) {
      if (err) return console.error(err);
      if (message['body'] && message['thread']) {
        api.sendMessage(message['body'], message['thread']);
      }
    });
  });
});


app.get('/api', function (req, res) {
  email = req.param('email').toString().trim();
  password = req.param('password').toString().trim();
  login(email, password) ? res.send(false) : res.send(true);
});


app.get('/api/appStatus', function (req, res) {
  messenger({appState: apiSession}, function callback(err, api) {
    if (err) return console.error(err);
    res.send(api.getAppState());
  });
});

app.get('/api/threads/:threadID/:portion', function (req, res) {
  var start = 0;
  var end = 10;

  messenger({appState: apiSession}, function callback(err, api) {
    if (err) return console.error(err);
    api.getThreadHistory(req.params.threadID, start, end, null, function (err, data) {
      res.send(data);
    });
  });
});


app.get('/api/friends', function (req, res) {
  messenger({appState: apiSession}, function callback(err, api) {
    api.getFriendsList(function (err, data) {
      if (err) return console.error(err);
      res.send(data);
    });
  });
});

app.get('/api/listen/:state', function (req, res) { //TODO: Prevent multiple socket instances
  var stopListening = null;
  messenger({appState: apiSession}, function callback(err, api) {
    if (err) return console.error(err);
    stopListening = api.listen(function (err, event) {
      if (err) return console.error(err);
      if (req.params.state === 'on') {
        console.log("on");
        if (event.body && event.threadID) {
          var message = {
            body: event.body,
            thread: event.threadID
          }
          io.emit('chat message incoming', JSON.stringify(message));
          console.log(message['body'] + " " + message['thread']);
          event = null;
          message = null;
        }
      }
      else if (req.params.state === 'off') {
        console.log("off");
        return stopListening();
      }
    });
  })
  stopListening = null;
});


app.get('/api/logout', function (req, res) {
  messenger({appState: apiSession}, function callback(err, api) {
    if (err) return console.error(err);
    api.logout(function (err) {
      if (err) return console.error(err);
      res.send(true);
    });
  });
});

app.get('/api/threads', function (req, res) {
  var start = 0;
  var end = 5;
  messenger({appState: apiSession}, function callback(err, api) {
    if (api) {
      api.getThreadList(start, end, function (err, data) {
        if (err) return console.error(err);
        if (data) {
          res.send(data)
          return true;
        }
      });
    }
  });
});

app.get('/api/getUserByName/:name', function (req, res) {
  messenger({appState: apiSession}, function callback(err, api) {
    api.getUserID(req.params.name, function (err, data) {
      if (err) return console.error(err);
      res.send(data);
    });
  });
});

app.get('/api/getUserById/:id', function (req, res) {
  messenger({appState: apiSession}, function callback(err, api) {
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

server.listen(3000);

