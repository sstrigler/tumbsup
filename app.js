
/**
 * Module dependencies.
 */

var express = require('express'),
routes = require('./routes'),
config = require('./config'),
util = require('util'),
everyauth = require('everyauth'),
io = require('socket.io'),
Tumblr = require('tumblr2'),
parseCookie = require('connect').utils.parseCookie;

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
// Configuration

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.logger());
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

var sio = io.listen(app);
sio.set('authorization', function(data, accept) {
    if (data.headers.cookie) {
        data.cookie = parseCookie(data.headers.cookie);
        data.sessionID = data.cookie['express.sid'];
        // (literally) get the session data from the session store
        sessionStore.get(data.sessionID, function (err, session) {
            if (err || !session) {
                // if we cannot grab a session, turn down the connection
                accept('Error', false);
            } else {
                // save the session data and accept the connection
                data.session = session;
                accept(null, true);
            }
        });
    } else {
       return accept('No cookie transmitted.', false);
    }
});

var url = require('url');
var http = require('http');
var fs = require('fs');
var spawn = require('child_process').spawn;
sio.sockets.on('connection', function(socket) {
    var session = socket.handshake.session;
    console.log('got handshake:\n'+util.inspect(session, false, null, true));
    socket.on('get_likes', function(data, fn) {
        console.log('getting likes for '+session.auth.tumblr.user.name);
        // TODO make sure name isn't a filesystem path and a valid name for a file
        var dir = config.tmp_dir+'/'+session.auth.tumblr.user.name;
        try {
            fs.mkdirSync(dir);
        } catch(e) { }
        new Tumblr(getOAuthConfig(session)).getUserLikes({limit:1}, function(err, res) {
            if (err) {
                console.error(err);
                return;
            }
            console.log("got likes:\n"+util.inspect(res, false, null, true));
            var num_photos = 0;
            var photos_got = 0;
            var zipfile = config.download_dir+session.auth.tumblr.user.name+'.zip';
            var zipOpts = ['-j', process.cwd()+'/public/'+zipfile];
            res.liked_posts.forEach(function(like) {
                if (!like.photos) return; 
                like.photos.forEach(function(photo) {
                    num_photos++;
                    var u = url.parse(photo.original_size.url);
                    console.log("getting url "+photo.original_size.url);
                    var filename = u.path.substring(u.path.lastIndexOf('/'));
                    http.get(u, function(response) {
                        var file = fs.createWriteStream(dir+filename);
                        response.on('data', function(chunk){ file.write(chunk); });
                        response.on('end', function() {
                            file.end();
                            console.log("wrote file "+dir+filename);
                            socket.emit('file', filename);
                            photos_got++;
                            if (photos_got == num_photos) {
                                // we're done downloading

                                // zip the file
                                zipOpts.push(dir+filename);
                                console.log(zipOpts);
                                var zip = spawn('zip', zipOpts);
                                zip.stdout.on('data', function (data) {
                                    console.log('stdout: ' + data);
                                });
                                zip.stderr.on('data', function (data) {
                                    console.log('stderr: ' + data);
                                });
                                zip.on('exit', function(code) {
                                    console.log('child process exited with code ' + code);

                                    socket.emit('download', config.host+zipfile);
                                });
                            }
                        });
                    });
                });
            });

            fn(num_photos);
        });
    });
});

function getOAuthConfig(session) {
    var t = session.auth.tumblr;
    var c = {
        consumerKey: config.consumerKey,
            consumerSecret: config.consumerSecret,
            accessTokenKey: t.accessToken,
            accessTokenSecret: t.accessTokenSecret
        };
    console.log("got oauth config:\n" + util.inspect(c, false, null, true));
    return c;
}