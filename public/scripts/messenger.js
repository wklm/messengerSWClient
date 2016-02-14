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

  componentDidMount: function () {
    var socket = io.connect('localhost:3000'); // TODO: ENVS!
    $('form').submit(function () {
      socket.emit('chat message', $('#m').val());
      $('#m').val('');
      return false;
    });
    socket.on('chat message', function (msg) {
      $('#messages').append($('<li>').text(msg));
    });
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
        <div className="Messenger row text-center">
          <div className="small-4 columns">
            <ThreadsList/>
          </div>
          <div className="small-8 columns end">
            <Thread/>
          </div>
        </div>
      )
    }
  }
});

var Thread = React.createClass({
  render: function () {
    return (
      <div>
        <p className="right"> lalala </p>
        <ul id="messages"></ul>
        <form action="">
          <input id="m" autoComplete="off"/>
          <button>Send</button>
        </form>
      </div>
    )
  }
})

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
        console.log(data);
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

var ThreadsList = React.createClass({
  getInitialState: function () {
    return {data: []};
  },
  loadFriendsList: function () {
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
    this.loadFriendsList();
  },

  render: function () {
    var friends = this.state.data.map(function (thread) {
      var timeDifferenceInHours = (Date.now() - thread.timestamp) / (1000 * 60 * 60);
      var time = timeDifferenceInHours > 24 ? // TODO: REFACTOR!!!!
      Math.floor(timeDifferenceInHours / 24) + " d ago" :
        timeDifferenceInHours / 60 > 1 ?
        Math.floor(timeDifferenceInHours) + " h ago" :
          timeDifferenceInHours * 60 > 1 ?
          Math.floor(timeDifferenceInHours * 60) + " m ago" :
          Math.floor(timeDifferenceInHours * 60 * 60) + " s ago";
      return (
          <div className="row" key={thread.threadID}>
            <div className="small-4 columns">
              <img src={thread.imageSrc} alt=""/>
            </div>
            <div className="small-4 columns thread-time">
              <p> {time} </p>
            </div>
          </div>
      );
    });

    return (
      <div className="threadsList">
        {friends}
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
        console.error('api/login', status, err.toString());
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

ReactDOM.render(
  <Messenger />,
  document.getElementById('messenger')
);

//if ('serviceWorker' in navigator) {
//  navigator.serviceWorker.register('/sw', {
//    scope: '/'
//  });
//}
