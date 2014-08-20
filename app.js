/**
 * Module dependencies.
 */

var express = require('express'),
config = require('./config'),
everyauth = require('everyauth'),
Logger = require('./src/logger');

// Session store
var RedisStore = require('connect-redis')(express);
var sessionStore = new RedisStore();

// setup everyauth - needs to be done before configuring app
everyauth.tumblr
    .consumerKey(config.consumerKey)
    .consumerSecret(config.consumerSecret)
    .myHostname(config.host)
    .findOrCreateUser( function (sess, accessToken, accessSecret, user) {
        return true;
    })
    .handleAuthCallbackError( function (req, res) {
        res.render('login', { title: 'Tumbsup',
                              host: config.host,
                              error: 'You need to authorize Tumbsup in order to make this work, sorry!'
                            });
    })
    .redirectPath('/');

var app = module.exports = express.createServer();

// Configuration
app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.logger());
    app.use(express.favicon());
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({
        'store': sessionStore,
        'secret': config.session_secret,
        'key': 'express.sid'
    }));
    app.use(everyauth.middleware());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});
app.sessionStore = sessionStore;

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.logger = new Logger(true);
});

app.configure('production', function(){
    app.use(express.errorHandler());
    app.logger = new Logger(false);
});

everyauth.helpExpress(app);

// Routes

// backup blog
var backup = require('./src/backup')(app, config);
app.get('/backup', backup.get);

// browse blogs
var browse = require('./src/browse')(app, config);
app.get('/browse/:blogId?', browse.get);

app.listen(config.port, function(){
    app.logger.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

