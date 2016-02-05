
var Thread = React.createClass({
  render: function() {
    return (
      <div>message</div>
    )
  }
});

var lastThreads;
var ThreadsList = React.createClass({

  componentDidMount(threads) {
    console.log("wienio, jestem tu");
    $.ajax({
      url: '/api/threads',
      dataType: 'json',
      cache: true,
      data: threads,
      success: function(data) {
        this.setState({lastThreads: data});
        console.log(lastThreads);

        this.forceUpdate();
      }.bind(this),
      error: function(xhr, status, err) {
        console.error('api/threads', status, err.toString());
      }.bind(this)
    });
  },


  render: function() {
     return (
       <p>{lastThreads}</p>
     )

  }
});

var FriendsList = React.createClass({

    render: function() {
    return (
      <div> elo </div>
    )
  }
});

var Messenger = React.createClass({
  getInitialState: function() {
    return {authenticated: localStorage.getItem('auth') === 'true'};
  },
  handleLogin: function(credentials) {
    $.ajax({
      url: '/api',
      dataType: 'json',
      cache: true,
      data: credentials,
      success: function(data) {
        this.setState({authenticated: data});
        localStorage.setItem('auth', data);
      }.bind(this),
      error: function(xhr, status, err) {
        this.setState({data: credentials});
        console.error('api/login', status, err.toString());
      }.bind(this)
    });
  },

  logout: function() {
    this.setState({authenticated: false});
    localStorage.setItem('auth', false);
  },
  render: function() {
    if (!this.state.authenticated) {
      return (
        <div className="Messenger">
          <h1>Messenger</h1>
          <LoginForm onLogin={this.handleLogin}/>
        </div>
      )
    } else {
      return (
        <ThreadsList/>
      )
    }
  }
})

var LoginForm = React.createClass({
  getInitialState: function() {
    return {email: '', password: ''};
  },
  handleEmailChange: function(e) {
    this.setState({email: e.target.value});
  },
  handlePasswordChange: function(e) {
    this.setState({password: e.target.value});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    var email = this.state.email.trim();
    var password = this.state.password.trim();
    if(!email || !password) return;
    this.props.onLogin({email: email, password: password});
    this.setState({email: '', password: ''});
  },
  render: function() {
    return (
      <form className="loginForm" onSubmit={this.handleSubmit}>
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
    );
  }
});

ReactDOM.render(
  <Messenger />,
  document.getElementById('content')
);
