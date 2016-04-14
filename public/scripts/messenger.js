var socket = io.connect('localhost:3000'); // TODO: ENVS!
var participantsRepository = {}; // TODO: should be stored in an independent state container, now global because of GC

var Messenger = React.createClass({
    getInitialState: function () {
        return {
            authenticated: localStorage.getItem('auth'), //TODO: REFACTOR!
            currentView: ""
        }
    },

    componentDidMount: function () {
        this.setState({
            currentView: "threadsListView"
        })
    },

    handleLogin: function (credentials) {
        $.ajax({
            url: '/api',
            dataType: 'json',
            data: credentials,
            success: function (data) {
                this.setState({authenticated: data});
                localStorage.setItem('auth', !data);
            }.bind(this),
            error: function (xhr, status, err) {
                this.setState({data: credentials});
                console.error('api/login', status, err.toString());
            }.bind(this)
        });
    },

    goBack: function () {
        this.setState({
            currentView: 'threadsListView',
            currentThread: null
        })
        this.refs['threadsList'].resetCurrentThread();
    },

    updateView: function (viewName) {
        this.setState({
            currentView: viewName
        })
        switch (viewName) {
            case "threadsList":
                jQuery('#go-back-button').addClass('hidden');
                break;
            case "threadView":
                jQuery('#go-back-button').removeClass('hidden');
                break;
        }
    },

    logout: function () {
        this.setState({authenticated: false});
        localStorage.setItem('auth', false);
    },

    render: function () {
        return this.state.authenticated ? (
            <div>
                <ul className="menu-bar full-width">
                    <li className="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect menu-bar-element hidden"
                        id="go-back-button">
                        <button onClick={this.goBack}> {"<<<"} </button>
                    </li>
                    <li className="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect menu-bar-element">
                        <button onClick={this.logout}> logout</button>
                    </li>
                </ul>
                <div className="row">
                    <ThreadsList
                        currentView={this.state.currentView}
                        updateViewOnMessengerComponent={this.updateView}
                        ref="threadsList"/>
                </div>
            </div>
        ) : (
            <div className="Messenger">
                <h1>Messenger on Steroids</h1>
                <LoginForm onLogin={this.handleLogin}/>
            </div>
        )
    }
});

var ThreadsList = React.createClass({
    getInitialState: function () {
        this.incomingMessagesListener();
        return {
            data: [], //TODO: should be a dictionary with the key threadID
            currentThread: null,
            lastThread: null,
            newMessageArrived: false,
            currentUserID: null,
            lastMessageID: null,
            currentView: 'threadsListView'
        };
    },

    appendNewMessage: function (message) {
        for (var i = 0; i < this.state.data.length; i++) {
            if (message.thread === this.state.data[i].threadID) {
                this.state.data[i].snippet = message.body;
                this.state.data[i].serverTimestamp = Date.now();
                this.state.data.splice(0, 0, this.state.data.splice(i, 1)[0]);
                return;
            }
        }
        this.loadThreadsList(0);
    },

    componentWillReceiveProps: function (nextProp) {
        if (nextProp && this.state.currentView !== nextProp.currentView) {
            this.setState({
                currentView: nextProp.currentView
            });
            nextProp.currentView === 'threadsListView' ?
                jQuery('#go-back-button').addClass('hidden') : jQuery('#go-back-button').remove('hidden');
        }
    },

    componentWillMount: function () {
        this.getCurrentUserID();
        socket.on('chat message incoming', (msg) =>
            this.incomingMessageHandler(JSON.parse(msg))
        )
    },

    getCurrentUserID: function () {
        $.ajax({
            url: '/api/currentUserID/',
            success: function (data) {
                this.setState({
                    currentUserID: data
                })
            }.bind(this),
            error: function (xhr, status, err) {
                console.error('/api/currentUserID', status, err.toString());
            }.bind(this)
        });
    },

    resetCurrentThread: function () {
        this.setState({
            lastThread: this.state.currentThread,
            currentThread: null
        })
        this.refs['thread'].forceUpdate();
    },

    incomingMessagesListener: function () {
        $.ajax({
            url: '/api/listen'
        });
    },

    incomingMessageHandler: function (message) {
        if (message.messagedID !== this.state.lastMessageID) { // API TYPO :(
            this.appendNewMessage(message);
            this.state.lastMessageID = message.messagedID;
            if (this.refs['thread']) { // check if Thread component mounted
                this.refs['thread'].appendIncomingMessageOnFronted(message);
            }
            this.handleNotification(message);
        }
    },

    handleNotification: function (message) {
        if (!Notification) { return; }
        if (Notification.permission !== "granted") { Notification.requestPermission(); }
        else {
            var notification = new Notification(participantsRepository[message.senderID].firstName, {
                icon: participantsRepository[message.senderID].photo,
                body: message.body,
            });
            notification.onclick = function () {
                this.props.updateViewOnMessengerComponent('threadView');
                this.updateCurrentThread(message.thread, true);
            }.bind(this);
        }
    },

    loadThreadsList: function (portion) {
        $.ajax({
            url: '/api/threads/' + portion,
            dataType: 'json',
            success: function (data) {
                this.setState({data: data})
            }.bind(this),
            error: function (xhr, status, err) {
                console.error('api/threads/' + portion, status, err.toString());
            }.bind(this)
        });
    },

    componentDidMount: function () {
        this.loadThreadsList(0); //TODO: add jQery scroll
    },

    updateCurrentThread: function (thread, fromNotification) {
        if (fromNotification || thread === this.state.currentThread || this.state.currentThread === null) {
            this.setState({
                lastThread: this.state.currentThread,
                currentThread: thread,
                currentView: 'threadView'
            })
            jQuery('#go-back-button').removeClass('hidden');
        }
    },

    componentWillUnmount: function () {
        this.incomingMessagesListener('off');
        jQuery('#go-back-button').addClass('hidden');

    },

    shouldComponentUpdate: function(nextState) {
      return this.state.currentThread !== nextState.currentThread
    },

    render: function () {
        var threads = this.state.data.map(thread => {
            var updateCurrentThread = this.updateCurrentThread;
            let time = getTimePassed(thread.timestamp);
            return (
                <div className="row thread" key={thread.threadID}
                     onClick={updateCurrentThread.bind(null,thread.threadID, false)}>
                    <div className="small-3 columns">
                        <ThreadParticipants ids={thread.participantIDs}
                                            currentUserID={this.state.currentUserID}
                                            ref="threadParticipants"/>
                    </div>
                    <p className="small-7 columns threads-list-snippet mdl-card__supporting-text">{thread.snippet}</p>
                    <p className="small-2 columns end">{getTimePassed(thread.serverTimestamp)} ago</p>
                </div>
            );
        });

        return (
            <div className=" scroll-area-container columns">
                <div
                    className={this.state.currentView === 'threadsListView' ?
                                "inline-list uiScrollableArea small-12 columns hidden" :
                                "inline-list uiScrollableArea small-12 columns"}>
                    <Thread
                        currentThread={this.state.currentThread}
                        lastThread={this.state.lastThread}
                        currentUserID={this.state.currentUserID}
                        updateThreadsList={this.appendNewMessage}
                        currentView={this.state.currentView}
                        currentUserID={this.state.currentUserID}
                        ref="thread"
                        className={this.state.currentView === 'threadsListView' ? "hidden" : null}
                    />
                </div>

                <div className={this.state.currentView === 'threadsListView' ?
                 "inline-list uiScrollableArea small-12 columns" :
                 "inline-list uiScrollableArea small-12 columns hidden"}>
                    {threads}
                </div>
            </div>
        );
    }
});

var Thread = React.createClass({
    getInitialState: function () {
        return {
            messagesCache: [],
            lastSent: null,
            lastReceived: null,
            messageQueue: []
        }
    },

    handleSubmit: function (e) {
        e.preventDefault();
        if (this.props.currentThread) {
            var message = {
                id: this.state.messagesCache.length,
                body: $('#' + this.props.currentThread).val(),
                thread: this.props.currentThread,
                senderName: 'you', //todo: name
                own: true,
                date: Date.now(),
                photo: 'https://graph.facebook.com/' + this.props.currentUserID + '/picture?width=50'

            };
            if (message.body && message.thread) {
                this.appendNewMessageToQueue(message);
            }
            $('#' + this.props.currentThread).val("");
        }
    },

    appendNewMessageToQueue: function (message) {
        socket.emit('chat message outgoing', JSON.stringify(message));
        this.state.messageQueue.push(message);
        if (this.appendOutgoingMessageOnFronted(message)) {
            this.props.updateThreadsList(message);
        }
    },

    appendOutgoingMessageOnFronted: function (message) {
        message.timestamp = Date.now();
        this.state.messagesCache.push(message);
        this.setState({
            lastSent: message.own ? message : this.state.lastSent
        });
        return true;
    },

    appendIncomingMessageOnFronted: function (msg) {
        if (msg.thread === this.props.currentThread) {
            var message = {
                id: msg.messagedID,
                body: msg.body,
                thread: msg.thread,
                senderName: participantsRepository[msg.senderID].firstName,
                own: false,
                date: Date.now(),
                photo: 'https://graph.facebook.com/' + msg.senderID + '/picture?width=50'
            };
            this.state.messagesCache.push(message);
            this.setState({
                lastReceived: message
            })
        }
        return true;
    },

    componentWillReceiveProps: function (nextProp) {
        this.state.messagesCache.length = 0; // flush messages cache
        if(nextProp.currentView === "threadView") {
            this.loadThread(nextProp.currentThread, 1);
            this.state.currentThread = nextProp.currentThread;
        }
    },

    shouldComponentUpdate: function(nextProp) {
      return nextProp.currentView === "threadView";
    },

    componentWillUnmount: function () {
        this.state.messagesCache = null;
    },

    loadThread: function (thread, portion) {
        let threads = [];
        if (thread !== this.props.currentThread && portion) {
            $.ajax({
                url: '/api/threads/' + thread + '/portion/' + portion,
                dataType: 'json',
                success: function (data) {
                    for (var k in data) {
                        let thread = {
                            id: data[k]['messageID'], //  "mid.1458587656203:971b25d6fef9be6652" fells like bottleneck
                            senderName: data[k]['senderName'],
                            senderID: data[k]['senderID'],
                            body: data[k]['body'],
                            timestamp: data[k]['timestamp'],
                            own: data[k]['senderID'] === 'fbid:' + this.props.currentUserID,
                            photo: 'https://graph.facebook.com/' + data[k]['senderID'].toString().slice(5) + '/picture?width=50'
                        };
                        threads.push(thread);
                    }
                    this.setState({
                        messagesCache: threads
                    });
                }.bind(this),
                error: function (xhr, status, err) {
                    console.error('/api/threads/' + thread + '/portion/' + portion, status, err.toString());
                }.bind(this)
            });
        }
    },

    render: function () {
        if (this.props.currentThread && this.props.currentThread !== this.props.lastThread)
        var messages = this.state.messagesCache.map(message => {
            return (message.own) ? (
                <li className="row own" key={message.id}>
                    <img src={message.photo} alt={message.senderName + " photo"} className="message-sender me"/>
                    <p className="own message-body own-message-background small-5 medium-7 large-9 columns">
                        {message.body}
                    </p>
                    <p className="message-time small-2 large-1 columns">
                        {getTimePassed(message.timestamp)}
                    </p>
                </li>
            ) : (
                <li className="row foreign" key={message.id}>
                    <img src={message.photo} alt={message.senderName + " photo"}     className="message-sender friend"/>
                    <p className="foreign message-body foreign-message-background small-5 medium-7 large-9 columns">
                        {message.body}
                    </p>
                    <p className="message-time small-2 large-1 columns">
                        {getTimePassed(message.timestamp)}
                    </p>
                </li>
            )
        });
        return (
            <ul>
                {messages}
                <li className="row">
                    <form onSubmit={this.handleSubmit} action="">
                        <input className="message-input small-12 columns" id={this.props.currentThread}
                               autoComplete="off"
                               placeholder="input new message"/>
                    </form>
                </li>
            </ul>
        )
        messages = null;
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
        return {
            data: [],
            repository: []
        };
    },

    loadParticipants: function () { // <-- spinner
        var participants = [];
        for (var id in this.props.ids) {
            $.ajax({
                url: '/api/getUserById/' + this.props.ids[id],
                dataType: 'json',
                success: function (data) {
                    for (var k in data) {
                        let participant = {
                            id: k,
                            fullName: data[k]['name'],
                            firstName: data[k]['firstName'],
                            photo: 'https://graph.facebook.com/' + k + '/picture?width=200',
                            profileUrl: data[k]['profileUrl']
                        };
                        if (participant.id !== this.props.currentUserID) {
                            participants.push(participant);
                            participantsRepository[k] = participant;
                        }
                    }
                    this.setState({
                        data: participants
                    });
                }.bind(this),
                error: function (xhr, status, err) {
                    console.error('api/threads/', status, err.toString());
                }.bind(this)
            });
        }
    },

    componentDidMount: function () {
        this.loadParticipants();
    },

    getParticipantByID: function (id) {
        return this.state.repository[id];
    },

    render: function () {
        var participants = this.state.data.map(participant => {
            return (
                <div key={participant.id} className="row">
                    <figure>
                        <img src={participant.photo}
                             alt={participant.fullName + " photo"}
                             className="thread-list-photo"/>
                        <figcaption>
                            {participant.firstName}
                        </figcaption>
                    </figure>
                </div>
            );
        });

        return participants.length < 4 ? (
            <div className="small-12 columns">
                {participants}
            </div>
        ) : (
            <div className="small-12 columns">
                {participants.slice(0, 3)}
                <p>and {participants.length - 3} others</p>
            </div>
        );
    }
});

ReactDOM.render(
    <Messenger />,
    document.getElementById('messenger')
);

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw', {
        scope: '/'
    });
    //navigator.serviceWorker.ready.then(function (swRegistration) {
    //    return swRegistration.sync.register('myFirstSync');
    //});
}

function getTimePassed(threadTimestamp) {
    var elapsed = Date.now() - threadTimestamp;
    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;
    var msPerMonth = msPerDay * 30;
    var msPerYear = msPerDay * 365;

    if (elapsed < msPerMinute) {
        return Math.round(elapsed / 1000) + ' s';
    } else if (elapsed < msPerHour) {
        return Math.round(elapsed / msPerMinute) + ' m';
    } else if (elapsed < msPerDay) {
        return Math.round(elapsed / msPerHour) + ' h';
    } else if (elapsed < msPerMonth) {
        return Math.round(elapsed / msPerDay) + ' d';
    } else if (elapsed < msPerYear) {
        return Math.round(elapsed / msPerMonth) + ' Mo';
    } else {
        return Math.round(elapsed / msPerYear) + ' Y';
    }
}



