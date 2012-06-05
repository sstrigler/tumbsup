
/**
 * Module dependencies.
 */

var express = require('express'),
routes = require('./routes'),
config = require('./config'),
everyauth = require('everyauth'),
util = require('util');

everyauth.debug = true;

var usersById = {};
var nextUserId = 0;

function addUser (source, sourceUser) {
  var user;
  if (arguments.length === 1) { // password-based
    user = sourceUser = source;
    user.id = ++nextUserId;
    return usersById[nextUserId] = user;
  } else { // non-password-based
    user = usersById[++nextUserId] = {id: nextUserId};
    user[source] = sourceUser;
  }
  return user;
}
var usersByTumblrName = {};

everyauth.everymodule
    .findUserById( function (id, callback) {
        console.log("check id "+id);
        callback(null, usersById[id]);
    });

everyauth.tumblr
    .consumerKey(config.consumerKey)
    .consumerSecret(config.consumerSecret)
    .findOrCreateUser( function (sess, accessToken, accessSecret, user) {
        console.log("tumblr");
        console.log(sess);
        console.log(accessToken);
        console.log(accessSecret);
        console.log(user);
        user.accessToken = accessToken;
        user.accessSecret = accessSecret;
        return usersByTumblrName[user.name] ||
            (usersByTumblrName[user.name] = addUser('tumblr', user));
    })
    .redirectPath('/');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.logger());
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({
        "secret": "hallowelt1234"
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
