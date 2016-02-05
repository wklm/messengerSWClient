var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var messenger = require('facebook-chat-api');

app.set('port', (process.env.PORT || 3000));
app.use(require('express-promise')());

app.use('/', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
var email;
var password;

function login(email, password) {
  messenger({email: email, password: password}, function callback (err) {
    return err;
  });
}

app.get('/api', function(req, res) {
  email = req.param('email').toString().trim();
  password = req.param('password').toString().trim();
  login(email, password) ? res.send(false) : res.send(true);
});
//
app.get('/api/threads', function() {
  messenger({email: email, password: password}, function callback(err, api) {
    api.getUserID("Jan Kowalski", function(err, data) {
        if(err) return callback(err);

        // Send the message to the best match (best by Facebook's criteria)
        var threadID = data[0].userID;
        api.sendMessage("yo", threadID);
    });
  });
});




//});
//
//app.get('api/friends', function(req, res){
//  api.getFriendsList(function(err, data) {
//    if(err) return console.error(err);
//    console.log(data.length);
//    res.send(data);
//  });
//});




app.listen(app.get('port'), function() {
  console.log('Server started: http://localhost:' + app.get('port') + '/');
});


