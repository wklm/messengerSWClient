var path = require('path');
var express = require('express');
var http = require('http');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var bodyParser = require('body-parser');
var messenger = require('facebook-chat-api');

app.use(require('express-promise')());
app.use('/', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var email;
var password;

function login(email, password) {
  messenger({email: email, password: password}, function callback(err) {
    return err;
  });
}

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    console.log('message: ' + msg);
  });
});



app.get('/api', function (req, res) {
  email = req.param('email').toString().trim();
  password = req.param('password').toString().trim();
  login(email, password) ? res.send(false) : res.send(true);
});



app.get('/api/appStatus', function (req, res) {
  messenger({email: email, password: password}, function callback(err, api) {
    if (err) return console.error(err);
    res.send(api.getAppState());
  });
});

app.get('/api/threads/:threadID/:portion', function (req, res) {
  var start = req.params.portion;
  var end = start + 10;

  messenger({email: email, password: password}, function callback(err, api) {
    if (err) return console.error(err);
    api.getThreadHistory(req.params.threadID, start, end, null, function (err, data) {
      res.send(data);
    });
  });
});



app.get('/api/friends', function (req, res) {
  messenger({email: email, password: password}, function callback(err, api) {
    api.getFriendsList(function (err, data) {
      if (err) return console.error(err);
      res.send(data);
    });
  });
});

app.get('/api/logout', function (req, res) {
  messenger({email: email, password: password}, function callback(err, api) {
    api.logout(function (err) {
      if (err) return console.error(err);
      res.send(true);
    });
  });
});

app.get('/api/listen', function (req, res) { //socket.io
  messenger({email: email, password: password}, function callback(err, api) {
    if (err) return console.error(err);
    api.setOptions({listenEvents: true});

    api.listen(function (err, event) {

      switch (event.type) {
        case "message":
          res.send(event);
          break;
        case "event":
          res.send(event);
          break;
        default:
          console.log(event);
          break;
      }
    });
  })
});

app.get('/api/threads', function (req, res) {
  var start = 0;
  var end = 5;
  messenger({email: email, password: password}, function callback(err, api) {
    api.getThreadList(start, end, function (err, data) {
      if (err) return console.error(err);
      res.send(data);
    });
  });
});

app.get('/api/getUserByName/:name', function (req, res) {
  messenger({email: email, password: password}, function callback(err, api) {
    api.getUserID(req.params.name, function (err, data) {
      if (err) return console.error(err);
      res.send(data);
    });
  });
});

app.get('/api/getUserById/:id', function (req, res) {
  messenger({email: email, password: password}, function callback(err, api) {
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

app.listen(app.get('port'), function () {
  console.log('Server started: http://localhost:3000');
});

server.listen(3000);

//TODO : prevent multiple logins