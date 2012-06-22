
/**
 * Module dependencies.
 */

var express = require('express'),
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

app.get('/', function(req, res){
    if (req.session && req.session.auth && req.session.auth.loggedIn) {
        new Tumblr(getOAuthConfig(req.session)).getUserInfo(function(err, info) {
            console.log("got user info:\n"+util.inspect(info));
            req.session.likes = info.user.likes;
            res.render('home', { title: 'tumblikes', info: info, host: config.host, limit: config.likes_limit });
        });
    } else {
        res.render('login', { title: 'tumblikes' });
    }
});

app.listen(config.port, function(){
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

sio.sockets.on('connection', function(socket) {
    var session = socket.handshake.session;
    console.log('got handshake:\n'+util.inspect(session));

    socket.on('get_likes', function(data) {
        console.log('getting likes for '+session.auth.tumblr.user.name);
        console.log(session.likes);

        var num_likes = Math.min(session.likes, config.likes_limit);
        console.log("getting "+num_likes+" likes");
        socket.emit('status', 'Determining photos to download...');
        socket.emit('progress', 0);

        var loops = Math.ceil(num_likes/20);
        var cnt = 0;
        var all_urls = [];
        var cb = function(urls) {
            cnt++;
            all_urls = all_urls.concat(urls);
            socket.emit('progress', (cnt/loops)*100);
            if (cnt == loops) {
                getPhotos(all_urls, socket);
            }
        };
        var offset = 0;
        var oAuthConfig = getOAuthConfig(session);
        while (offset+20 <= num_likes) {
            getPhotoUrls(oAuthConfig, offset, cb);
            offset += 20;
        }
    });
});

function getPhotoUrls(oAuthConfig, offset, cb) {
    new Tumblr(oAuthConfig).getUserLikes({limit: 20, offset: offset}, function(err, res) {
        console.log("got likes with offset "+offset);

        var urls = [];
        if (err) {
            console.log("error: "+err);
            return cb(urls);
        }

        res.liked_posts.forEach(function(like) {
            if (like.photos) {
                like.photos.forEach(function(photo) {
                    urls.push(photo.original_size.url);
                });
            }
        });

        cb(urls);
    });
}

var path = require('path');
var Url = require('url');
var http = require('http');
var fs = require('fs');
function getPhotos(urls, socket) {
    var num_photos = urls.length;
    console.log("got "+num_photos+" photo urls");

    socket.emit('status', 'Downloading '+num_photos+' photos...');
    socket.emit('progress', 0);

    var files = new FileStore(num_photos, socket);
    urls.forEach(function(url) {
        console.log("checking url "+url);

        var filename = config.cache_dir+url.substring(url.lastIndexOf('/')+1);
        if (path.existsSync(filename)) {
            console.log("file already downloaded "+filename);
            files.add(filename);
        } else {
            console.log("getting file "+filename);
            url = Url.parse(url);
            http.get(url, function(response) {
                var file = fs.createWriteStream(filename);
                response.on('data', function(chunk){ file.write(chunk); });
                response.on('end', function() {
                    file.end();
                    console.log("wrote file "+filename);
                    files.add(filename);
                });
                response.on('close', function(err) {
                    console.error(err);
                    files.dec();
                });
            });
        }
    });
}

function FileStore(num_files, socket) {
    this.files = [];
    this.num_files = num_files;
 
    this.add = function(filename) {
        if (this.files.indexOf(filename) != -1) {
            console.log("got a dup! "+filename);
            this.dec();
        } else {
            this.files.push(filename);
        }
        socket.emit('progress', (this.files.length/this.num_files)*100);
        if (this.files.length == this.num_files) {
            // we're done downloading
            createZIP(this.files, socket);
        }
    };

    this.dec = function() {
        this.num_files--;
    };
}

var spawn = require('child_process').spawn;
var crypto = require('crypto');
function createZIP(files, socket) {
    var session = socket.handshake.session;

    // zip the file
    socket.emit('status', 'Creating ZIP file...');
    var sha = crypto.createHash('sha1');
    sha.update(Date.now()+session.auth.tumblr.user.name); // create hash for timestamp plus nick
    var zipfile = config.download_dir+sha.digest('hex')+'.zip';
    console.log(zipfile);

    var zipOpts = ['-qj', process.cwd()+'/public/'+zipfile].concat(files);
    var zip = spawn('zip', zipOpts);
    zip.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });
    zip.on('exit', function(code) {
        console.log('child process exited with code ' + code);
        socket.emit('download', config.host+zipfile);
        socket.emit('done');
    });
}

function getOAuthConfig(session) {
    var t = session.auth.tumblr;
    var c = {
        consumerKey: config.consumerKey,
            consumerSecret: config.consumerSecret,
            accessTokenKey: t.accessToken,
            accessTokenSecret: t.accessTokenSecret
        };
    return c;
}
