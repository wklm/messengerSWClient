var socket = io.connect('localhost:3000'); // TODO: ENVS!

var Messenger = React.createClass({
    getInitialState: function () {
        return {authenticated: localStorage.getItem('auth') === 'false'}; //TODO: REFACTOR!
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
                <ThreadsList/>
            )
        }
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

    //componentWillUpdate: function() {
    //  console.log("poszedl update");
    //},

    handleSubmit: function (e) {
        e.preventDefault();
        if (this.state.currentThread) {
            var timestamp = Date.now();
            var message = {
                id: this.state.messagesCache.length,
                body: $('#' + this.state.currentThread).val(),
                thread: this.state.currentThread,
                own: true,
                date: timestamp
            }
            if (message.body && message.thread) {
                this.appendNewMessageToQueue(message);
            }
            $('#' + this.state.currentThread).val("");
        }
    },

    appendNewMessageToQueue: function (message) {
        var tempQueue = this.state.messageQueue;
        tempQueue.push(message);
        this.setState({
            messageQueue: tempQueue
        })

        socket.emit('chat message outgoing', JSON.stringify(message));
        this.appendNewMessageOnFronted(message);
    },

    appendNewMessageOnFronted: function (message) { //update
        var messages = this.state.messagesCache;
        //if (message.body !== lastSent.body) {
        messages.push(message);
        this.setState({
            messagesCache: messages
        })
        if (message.own) {
            this.setState({
                lastSent: message
            })
        }
        //}
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
                }

                this.setState({
                    lastMessage: message
                })
            }.bind(this),
            error: function (xhr, status, err) {
                console.error('/api/threads/' + thread + '/message/' + 0, status, err.toString());
            }.bind(this)
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
                            date: data[k]['timestampDatetime'],
                            timestamp: data[k]['timestamp'],
                            own: data[k]['senderID'] === 'fbid:' + this.props.currentUserID
                        }
                        threads.push(thread);
                        this.setState({
                            messagesCache: threads
                        })
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
                    <p className="own message-body own-message-background small-5 medium-7 large-9 columns">
                        {message.body}
                    </p>
                    <p className="message-time small-2 large-1 columns">
                        {getTimePassed(message.timestamp)}
                    </p>
                </li>
            ) : (
                <li className="row foreign" key={message.id}>
                    <p className="foreign message-body foreign-message-background small-5 medium-7 large-9 columns">
                        {message.body}
                    </p>
                    <p className="message-time small-2 large-1 columns">
                        {getTimePassed(message.timestamp)}
                    </p>
                </li>
            )
        })
        return this.state.currentThread ? (
            <div className="full-width">
                <ul className="inline-list uiScrollableArea">
                    {messages}
                </ul>
                <form onSubmit={this.handleSubmit} className="row own" action="">
                    <input className="small-11 columns" id={this.state.currentThread} autoComplete="off"
                           placeholder="input new message"/>
                </form>
            </div>
        ) : (
            <div>
                {"choose a thread to display"}
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
                        if (participant.id !== this.props.currentUserID) {
                            participants.push(participant);
                            this.setState({
                                data: participants
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
    render: function () {
        var participants = this.state.data.map(participant => {
            return (
                <div onClick={this.props.a.bind(null,this.props.b)} className="row thread-list-element"
                     key={participant.id}>
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
        this.incomingMessagesListener();

        return {
            data: [],
            currentThread: null,
            newMessageArrived: false,
            currentUserID: null
        };
    },

    componentWillMount: function () {
        this.getCurrentUserID();

        socket.on('chat message incoming', () =>
            this.refs['thread'].loadThread(this.state.currentThread, 1)
        );
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
            currentThread: thread
        })
    },

    componentWillUnmount: function () {
        this.incomingMessagesListener('off');
    },

    render: function () {
        var threads = this.state.data.map(thread => {
            var updateCurrentThread = this.updateCurrentThread;
            let time = getTimePassed(thread.timestamp);
            return (
                <div className="row thread" key={thread.threadID}>
                    <ThreadParticipants a={updateCurrentThread}
                                        b={thread.threadID}
                                        className="small-2 small-centered columns"
                                        ids={thread.participantIDs}
                                        currentUserID={this.state.currentUserID}
                    />
                </div>
            );
        })
        return (
            <div className="scroll-area-container columns">
                <div className=" inline-list uiScrollableArea">
                    <div className="">
                        {threads}
                    </div>
                </div>
                <div className="scroll-area-container columns end">
                    <Thread
                        currentThread={this.state.currentThread}
                        currentUserID={this.state.currentUserID}
                        ref="thread"
                    />
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


if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw', {
        scope: '/'
    }).then(function(reg) {
        console.log(':^)', reg);
        reg.pushManager.subscribe({
            userVisibleOnly: true
        }).then(function(sub) {
            console.log('endpoint:', sub.endpoint);
        });
    });
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
    }

    else if (elapsed < msPerHour) {
        return Math.round(elapsed / msPerMinute) + ' m';
    }

    else if (elapsed < msPerDay) {
        return Math.round(elapsed / msPerHour) + ' h';
    }

    else if (elapsed < msPerMonth) {
        return Math.round(elapsed / msPerDay) + ' d';
    }

    else if (elapsed < msPerYear) {
        return Math.round(elapsed / msPerMonth) + ' mo';
    }

    else {
        return Math.round(elapsed / msPerYear) + ' Y';
    }
}



