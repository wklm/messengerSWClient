var Messenger = React.createClass({
  getInitialState: function () {
    return {authenticated: localStorage.getItem('auth') === 'false'};
  },

  handleLogin: function (credentials) {
    $.ajax({
      url: '/api',
      dataType: 'json',
      cache: true,
      data: credentials,
      success: function (data) {
        this.setState({authenticated: data});
        localStorage.setItem('auth', data);
      }.bind(this),
      error: function (xhr, status, err) {
        this.setState({data: credentials});
        console.error('api/login', status, err.toString());
      }.bind(this)
    });
  },

  logout: function () {
    this.setState({authenticated: false});
    localStorage.setItem('auth', false);
  },


  render: function () {
    if (!this.state.authenticated) {
      return (
        <div className="Messenger">
          <h1>Messenger on Steroids</h1>
          <LoginForm onLogin={this.handleLogin}/>
        </div>
      )
    } else {
      return (
        <div className="row">
          <ThreadsList/>
        </div>
      )
    }
  }
});

var Thread = React.createClass({
  getInitialState: function () {
    return {init: true, threadsCache: []};
  },

  componentWillReceiveProps: function (nextProp) {
    this.loadThread(nextProp.currentThread, 1);

    var socket = io.connect('localhost:3000'); // TODO: ENVS!

    $('form').submit(function () {
      if ($('#m').val() && nextProp.currentThread) {
        let message = {
          body: $('#m').val(),
          thread: nextProp.currentThread
        }
        socket.emit('chat message', JSON.stringify(message));
        return true;
      }
      return false;
    });
    //socket.on('chat message', function (msg) {
    //  $('#messages').append($('<li>').text(msg));
    //});
  },

  loadThread: function (thread, portion) {
    var threads = [];
    $.ajax({
      url: '/api/threads/' + thread + '/' + portion,
      dataType: 'json',
      cache: true,
      success: function (data) {
        for (var k in data) {
          let thread = {
            id: k,
            senderName: data[k]['senderName'],
            body: data[k]['body'],
            date: data[k]['timestampDatetime'],
            timestamp: data[k]['timestamp']
          }
          threads.push(thread);
          this.setState({
            threadsCache: threads
          })
        }
      }.bind(this),
      error: function (xhr, status, err) {
        this.state.init ?
          this.setState({
            init: false
          }) :
          console.error('/api/threads/' + thread + '/' + portion, status, err.toString());
      }.bind(this)
    });
  },
  render: function () {
    var messages = this.state.threadsCache.map(message => {
      return (
        <li className="row" key={message.id}>
          <div className="message-sender small-4 columns">
            {message.senderName}
          </div>
          <div className="message-body small-6 columns">
            {message.body}
          </div>
          <div className="message-time small-2 columns">
            {getTimePassed(message.timestamp)}
          </div>
        </li>
      )
    })
    return (
      <div>
        <h1 className="right"> {this.props.currentThread} </h1>
        <ul className="messages inline-list uiScrollableArea">
          {messages}
        </ul>
        <form action="">
          <input id="m" autoComplete="off"/>
          <button>Send</button>
        </form>
      </div>
    )
  }
});

var LoginForm = React.createClass({
  getInitialState: function () {
    return {email: '', password: ''};
  },
  handleEmailChange: function (e) {
    this.setState({email: e.target.value});
  },
  handlePasswordChange: function (e) {
    this.setState({password: e.target.value});
  },
  handleSubmit: function (e) {
    e.preventDefault();
    var email = this.state.email.trim();
    var password = this.state.password.trim();
    if (!email || !password) return;
    this.props.onLogin({email: email, password: password});
    this.setState({email: '', password: ''});
  },
  render: function () {
    return (
      <div className="row">
        <form className="loginForm small-4 columns" onSubmit={this.handleSubmit}>
          <input
            type="text"
            placeholder="your email"
            value={this.state.email}
            onChange={this.handleEmailChange}
          />
          <input
            type="password"
            placeholder="password"
            value={this.state.password}
            onChange={this.handlePasswordChange}
          />
          <input type="submit" value="login"/>
        </form>
      </div>
    );
  }
});

var ThreadParticipants = React.createClass({
  getInitialState: function () {
    return {data: [], photos: []};
  },
  loadParticipants: function () {
    var participants = [];
    for (var id in this.props.ids) {
      $.ajax({
        url: '/api/getUserById/' + this.props.ids[id],
        dataType: 'json',
        cache: true,
        success: function (data) {
          for (var k in data) {
            let participant = {
              id: k,
              fullName: data[k]['name'],
              firstName: data[k]['firstName'],
              photo: data[k]['thumbSrc']
            }
            participants.push(participant);
            this.setState({
              data: participants
            });
          }
        }.bind(this),
        error: function (xhr, status, err) {
          console.error('api/threads', status, err.toString());
        }.bind(this)
      });
    }
  },
  componentDidMount: function () {
    this.loadParticipants();
  },
  render: function () {
    var participants = this.state.data.map(participant => {
      return (
        <div onClick={this.props.a.bind(null,this.props.b)} className="row thread-list-element" key={participant.id}>
          <p className="small-8 columns thread-list-name">
            {participant.firstName}
          </p>
          <img className="small-4  columns thread-list-photo" src={participant.photo}
               alt={participant.name + " photo"}/>
        </div>
      );
    });

    return (
      <div className="threadsList">
        {participants}
      </div>
    );
  }
});

var ThreadsList = React.createClass({
  getInitialState: function () {
    return {data: [], currentThread: null};
  },
  loadThreadsList: function () {
    $.ajax({
      url: '/api/threads',
      dataType: 'json',
      cache: true,
      success: function (data) {
        this.setState({data: data})
      }.bind(this),
      error: function (xhr, status, err) {
        console.error('api/threads', status, err.toString());
      }.bind(this)
    });
  },

  componentDidMount: function () {
    this.loadThreadsList();
  },
  updateCurrentThread: function (thread) {
    this.setState({
      currentThread: thread
    })
  },


  render: function () {
    var threads = this.state.data.map(thread => {
      var updateCurrentThread = this.updateCurrentThread;
      let time = getTimePassed(thread.timestamp);
      return (
        <div className="row thread" key={thread.threadID}>
          <ThreadParticipants a={updateCurrentThread} b={thread.threadID} className="small-2 small-centered columns"
                              ids={thread.participantIDs}/>
        </div>
      );
    })
    return (
      <div>
        <div className="small-3 columns ">
          <div className="threadsList">
            {threads}
          </div>
        </div>
        <div className="small-5 columns end">
          <Thread currentThread={this.state.currentThread}/>
        </div>
      </div>
    );
  }
});

var AppStatus = React.createClass({
  getInitialState: function () {
    return {data: []};
  },
  loadSessionData: function () {
    $.ajax({
      url: '/api/app-status',
      dataType: 'json',
      cache: true,
      success: function (data) {
        this.setState({data: data})
      }.bind(this),
      error: function (xhr, status, err) {
        console.error('api/login', status, err);
      }.bind(this)
    });
  },

  componentDidMount: function () {
    this.loadSessionData();
  },
  render: function () {
    return (
      <SessionData data={this.state.data}/>
    )
  }
});

var SessionData = React.createClass({
  render: function () {
    var sesionData = this.props.data.map(function (Cookie) {
      return (
        <p key={Cookie.key}> {
          Cookie.value + "\n" +
          Cookie.Path + "\n" +
          Cookie.hostOnly + "\n" +
          Cookie.aAge + "\n" +
          Cookie.cAge + "\n"
        }</p>
      );
    });
    return (
      <div className="sessionData">
        {sesionData}
      </div>
    );
  }
});

var FriendsList = React.createClass({
  getInitialState: function () {
    return {data: []};
  },
  loadFriendsList: function () {
    $.ajax({
      url: '/api/friends',
      dataType: 'json',
      cache: true,
      success: function (data) {
        this.setState({data: data});
      }.bind(this),
      error: function (xhr, status, err) {
        console.error('api/friends', status, err.toString());
      }.bind(this)
    });
  },
  componentDidMount: function () {
    this.loadFriendsList();
  },

  render: function () {
    var friends = this.state.data.map(function (friend) {
      return (
        <div key={friend.userID}>
          <img src={friend.profilePicture} alt=""/>
          <p> {friend.firstName} </p>
        </div>
      );
    });
    return (
      <div className="commentList">
        {friends}
      </div>
    );
  }
});

ReactDOM.render(
  <Messenger />,
  document.getElementById('messenger')
);
//
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw', {
    scope: '/'
  });

}


function getTimePassed(threadTimestamp) { // TODO: REFACTOR!!!!
  var timeDifferenceInHours = (Date.now() - threadTimestamp) / (1000 * 60 * 60);
  return timeDifferenceInHours > 24 ?
  Math.floor(timeDifferenceInHours / 24) + " d" : timeDifferenceInHours / 60 > 1 ?
  Math.floor(timeDifferenceInHours) + " h" : timeDifferenceInHours * 60 > 1 ?
  Math.floor(timeDifferenceInHours * 60) + " m" :
  Math.floor(timeDifferenceInHours * 60 * 60) + " s";
}

