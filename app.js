
/**
 * Module dependencies.
 */

var express = require('express'),
routes = require('./routes'),
config = require('./config'),
everyauth = require('everyauth'),
io = require('socket.io');

// Session store
var RedisStore = require('connect-redis')(express);
var sessionStore = new RedisStore();

everyauth.tumblr
    .consumerKey(config.consumerKey)
    .consumerSecret(config.consumerSecret)
    .findOrCreateUser( function (sess, accessToken, accessSecret, user) {
        return true;
    })
    .redirectPath('/');

var app = module.exports = express.createServer();
io = io.listen(app);
// Configuration

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.logger());
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({
		'store': sessionStore,
        'secret': config.session_secret
    }));
    app.use(everyauth.middleware());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

everyauth.helpExpress(app);

// Routes

app.get('/', routes.index);

app.listen(3000, function(){
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

io.sockets.on('connection', function(socket) {
    socket.on('get_likes', function(data, fn) {
        console.log('getting likes');
        fn('hallo welt');
    });
});
