/**
 * Created by wojtek on 04.02.16.
 */


var messenger = require('facebook-chat-api');


messenger({email: "americano1945@o2.pl", password: "Warszawa1993"}, function callback (err, api) {
  if(err) return console.error(err);

  api.setOptions({listenEvents: true});

  var stopListening = api.listen(function(err, event) {
    if(err) return console.error(err);

    switch(event.type) {
      case "message":
        if(event.body === '/stop') {
          api.sendMessage("Goodbye...", event.threadID);
          return stopListening();
        }
        api.markAsRead(event.threadID, function(err) {
          if(err) console.log(err);
        });
        api.sendMessage("TEST BOT: " + event.body, event.threadID);
        break;
      case "event":
        console.log(event);
        break;
    }
  });
});
