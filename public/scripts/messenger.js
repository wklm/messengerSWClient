var Messenger = React.createClass({
  getInitialState: function() {
    return {authenticated: localStorage.getItem('auth') === 'false'};
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

  // logout: function() {
  //   this.setState({authenticated: false});
  //   localStorage.setItem('auth', false);
  // },

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
         <AppStatus />
      )
    }
  }
})

var AppStatus = React.createClass({
  getInitialState: function() {
    return {data: []};
  },
  loadSessionData: function() {
    $.ajax({
      url: '/api/app-status',
      dataType: 'json',
      cache: true,
      success: function(data) {
        this.setState({data: data})
      }.bind(this),
      error: function(xhr, status, err) {
        console.error('api/login', status, err.toString());
      }.bind(this)
    });
  },

  componentDidMount: function() {
    this.loadSessionData();
  },
  render : function() {
   return (
      <SessionData data={this.state.data} />
    )
  }
})


var SessionData = React.createClass({
  render: function() {
    var commentNodes = this.props.data.map(function(Cookie) {
      return (
        <p key={Cookie.key, Cookie.Path}> {
          Cookie.value + "\n" +
          Cookie.Path + "\n" +
          Cookie.hostOnly + "\n" +
          Cookie.aAge + "\n" +
          Cookie.cAge + "\n" 
        }
        </p>
      );
    });
    return (
      <div className="commentList">
        {commentNodes}
      </div>
    );
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
