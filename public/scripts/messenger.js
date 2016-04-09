var socket = io.connect('localhost:3000'); // TODO: ENVS!
var participantsRepository = {}; // TODO: should be stored in an independent state container

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
            cache: true,
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
            currentView: 'threadsListView'
        })
    },

    logout: function () {
        this.setState({authenticated: false});
        localStorage.setItem('auth', false);
    },

    render: function () {
        return this.state.authenticated ? (
            <div>
                <ul className="menu-bar full-width">
                    <li className="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect menu-bar-element hidden" id="go-back-button">
                        <button onClick={this.goBack}> {"<<<"} </button>
                    </li>
                    <li className="menu-bar-element">
                        <button onClick={this.logout}> logout</button>
                    </li>

                </ul>
                <div className="row">
                    <ThreadsList
                        currentView={this.state.currentView}
                        ref="threadsList"

                    />
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
            data: [],
            currentThread: null,
            newMessageArrived: false,
            currentUserID: null,
            lastMessageID: null,
            currentView: 'threadsListView'
        };
    },

    componentWillReceiveProps: function (nextProp) {
        this.setState({
            currentView: nextProp.currentView
        })
        if ( nextProp.currentView === 'threadsListView') {
            jQuery('#go-back-button').addClass('hidden');

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
            cache: true,
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

    incomingMessagesListener: function () {
        $.ajax({
            url: '/api/listen',
            success: function () {
                console.log("incomingMessagesListener started");
            }.bind(this),
            error: function (xhr, status, err) {
                console.error('api/listen', status, err.toString());
            }.bind(this)
        });
    },

    incomingMessageHandler: function (message) {
        if (message.messagedID !== this.state.lastMessageID) { // API TYPO :(
            this.loadThreadsList();
            this.setState({
                lastMessageID: message.messagedID
            });
            this.refs['thread'].appendIncomingMessageOnFronted(message);
            this.handleNotification(message);
        }
    },

    handleNotification: function (message) {
        if (!Notification) {
            alert('Desktop notifications not available in your browser. Try Chromium.');
            return;
        }
        if (Notification.permission !== "granted")
            Notification.requestPermission();
        else {
            var notification = new Notification(participantsRepository[message.senderID].firstName, {
                icon: participantsRepository[message.senderID].photo,
                body: message.body,
            });
            notification.onclick = function () {
                this.setState({
                    currentThread: message.thread
                })
            }.bind(this);
        }
    },

    loadThreadsList: function (portion) {
        $.ajax({
            url: '/api/threads/' + portion,
            dataType: 'json',
            cache: true,
            success: function (data) {
                this.setState({data: data})
            }.bind(this),
            error: function (xhr, status, err) {
                console.error('api/threads/' + portion, status, err.toString());
            }.bind(this)
        });
    },

    componentDidMount: function () {
        this.loadThreadsList(0); //jQery scroll
    },

    updateCurrentThread: function (thread) {
        this.setState({
            currentThread: thread,
            currentView: 'threadView'
        })
        jQuery('#go-back-button').removeClass('hidden');

    },

    componentWillUnmount: function () {
        this.incomingMessagesListener('off');
        jQuery('#go-back-button').addClass('hidden');

    },

    render: function () {
        var threads = this.state.data.map(thread => {
            var updateCurrentThread = this.updateCurrentThread;
            let time = getTimePassed(thread.timestamp);
            return (
                <div className="row thread" key={thread.threadID}>
                    <ThreadParticipants a={updateCurrentThread}
                                        b={thread.threadID}
                                        ids={thread.participantIDs}
                                        currentUserID={this.state.currentUserID}
                                        ref="threadParticipants"
                    />
                    <p>{thread.snippet}</p>
                    <p>{getTimePassed(thread.serverTimestamp)} ago</p>
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
                        currentUserID={this.state.currentUserID}
                        ref="thread"
                        className={this.state.currentView === 'threadsListView' ? "hidden" : ""}
                    />
                </div>

                <div className={this.state.currentView === 'threadsListView' ?
                 "inline-list uiScrollableArea small-12 columns" :
                 "inline-list uiScrollableArea small-12 columns hidden"}
                >
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
            currentThread: null,
            lastMessage: null,
            lastSent: null,
            messageQueue: []
        }
    },

    handleSubmit: function (e) {
        e.preventDefault();
        if (this.state.currentThread) {
            var timestamp = Date.now();
            var message = {
                id: this.state.messagesCache.length,
                body: $('#' + this.state.currentThread).val(),
                thread: this.state.currentThread,
                senderName: 'you', //todo: name
                own: true,
                date: timestamp
            };
            if (message.body && message.thread) {
                this.appendNewMessageToQueue(message);
            }
            $('#' + this.state.currentThread).val("");
        }
    },

    appendNewMessageToQueue: function (message) {
        socket.emit('chat message outgoing', JSON.stringify(message));
        var tempQueue = this.state.messageQueue;
        tempQueue.push(message);
        this.setState({
            messageQueue: tempQueue
        });
        this.appendOutgoingMessageOnFronted(message);
    },

    appendOutgoingMessageOnFronted: function (message) { //update
        var messages = this.state.messagesCache;
        message.timestamp = Date.now();
        messages.push(message);
        this.setState({
            messagesCache: messages
        });
        if (message.own) {
            this.setState({ // TODO: Refactor
                lastSent: message
            })
        }
    },

    appendIncomingMessageOnFronted: function (msg) {
        var messages = this.state.messagesCache;
        var timestamp = Date.now();
        var message = {
            id: msg.messagedID,
            body: msg.body,
            thread: msg.thread,
            senderName: participantsRepository[msg.senderID].firstName,
            own: false,
            date: timestamp
        };
        if (message.thread === this.state.currentThread) {
            messages.push(message);
            this.setState({
                messagesCache: messages
            })
        }
    },

    componentWillReceiveProps: function (nextProp) { //update
        this.loadThread(nextProp.currentThread, 1);
        this.setState({
            currentThread: nextProp.currentThread
        })
    },

    getLastMessage: function () {
        $.ajax({
            url: '/api/threads/' + thread + '/message/' + 0,
            dataType: 'json',
            cache: true,
            success: function (data) {
                let message = {
                    id: k,
                    senderName: data['senderName'],
                    body: data['body'],
                    date: data['timestampDatetime'],
                    timestamp: data['timestamp'],
                    own: data['senderID'] === 'fbid:' + this.props.currentUserID
                };

                this.setState({
                    lastMessage: message
                })
            }.bind(this),
            error: function (xhr, status, err) {
                console.error('/api/threads/' + thread + '/message/' + 0, status, err.toString());
            }.bind(this)
        });
    },

    componentWillUnmount: function () {
        this.setState({
            messagesCache: [],
            currentThread: null,

        });
    },

    loadThread: function (thread, portion) {
        var threads = [];
        if (thread && portion) {
            $.ajax({
                url: '/api/threads/' + thread + '/portion/' + portion,
                dataType: 'json',
                cache: true,
                success: function (data) {
                    for (var k in data) {
                        let thread = {
                            id: k,
                            senderName: data[k]['senderName'],
                            senderID: data[k]['senderID'],
                            body: data[k]['body'],
                            //date: data[k]['timestampDatetime'],
                            timestamp: data[k]['timestamp'],
                            own: data[k]['senderID'] === 'fbid:' + this.props.currentUserID
                        };
                        threads.push(thread);
                        this.setState({
                            messagesCache: threads
                        });
                        if (data.length - 1 == k) {
                            this.setState({
                                lastMessage: thread
                            })
                        }
                    }
                }.bind(this),
                error: function (xhr, status, err) {
                    console.error('/api/threads/' + thread + '/portion/' + portion, status, err.toString());
                }.bind(this)
            });
        }
    },

    render: function () {
        var messages = this.state.messagesCache.map(message => {
            return (message.own) ? (
                <li className="row own" key={message.id}>
                    <p className="message-sender me">
                        {message.senderName ? message.senderName.charAt(0) : "X"}
                    </p>
                    <p className="own message-body own-message-background small-5 medium-7 large-9 columns">
                        {message.body}
                    </p>
                    <p className="message-time small-2 large-1 columns">
                        {getTimePassed(message.timestamp)}
                    </p>
                </li>
            ) : (
                <li className="row foreign" key={message.id}>
                    <p className="message-sender friend">
                        {message.senderName.charAt(0)}
                    </p>
                    <p className="foreign message-body foreign-message-background small-5 medium-7 large-9 columns">
                        {message.body}
                    </p>
                    <p className="message-time small-2 large-1 columns">
                        {getTimePassed(message.timestamp)}
                    </p>
                </li>
            )
        });
        return this.state.currentThread ? (
            <ul>
                {messages}
                <li className="row">
                    <form onSubmit={this.handleSubmit} action="">
                        <input className="message-input small-12 columns" id={this.state.currentThread}
                               autoComplete="off"
                               placeholder="input new message"/>
                    </form>
                </li>
            </ul>
        ) : (
            <div className="hidden"></div>
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
        return {
            data: [],
            repository: []
        };
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
                            photo: 'https://graph.facebook.com/' + k + '/picture?width=300',
                            profileUrl: data[k]['profileUrl']
                        };
                        if (participant.id !== this.props.currentUserID) {

                            participants.push(participant);
                            participantsRepository[k] = participant;
                            this.setState({
                                data: participants,
                            });
                        }
                    }
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
                <div onClick={this.props.a.bind(null,this.props.b)}
                     key={participant.id}
                     className="row">
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
            <div className="">
                {friends}
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
    })
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



