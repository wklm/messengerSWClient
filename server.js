var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var messenger = require('facebook-chat-api');

var email;
var password;

app.set('port', (process.env.PORT || 3000));
app.use(require('express-promise')());
app.use('/', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


function login(email, password) {
  messenger({email: email, password: password}, function callback(err) {
    return err;
  });
}

app.get('/api', function (req, res) {
  email = req.param('email').toString().trim();
  password = req.param('password').toString().trim();
  login(email, password) ? res.send(false) : res.send(true);
});

app.get('/api/app-status', function (req, res) {
  messenger({email: email, password: password}, function callback(err, api) {
    if (err) return console.error(err);
    res.send(api.getAppState());
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

app.get('/api/threads', function (req, res) {
  var start = 0;
  var end = 100;
  messenger({email: email, password: password}, function callback(err, api) {
    api.getThreadList(start, end, function (err, data) {
      if (err) return console.error(err);
      res.send(data);
      console.log(data.length)
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
  console.log('Server started: http://localhost:' + app.get('port') + '/');
});


//TODO : prevent multiple logins