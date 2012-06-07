
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
            console.log("got user info:\n"+util.inspect(info, false, null, true));
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

var Url = require('url');
var http = require('http');
var fs = require('fs');
var spawn = require('child_process').spawn;
sio.sockets.on('connection', function(socket) {
    var session = socket.handshake.session;
    console.log('got handshake:\n'+util.inspect(session, false, null, true));

    socket.on('get_likes', function(data) {
        console.log('getting likes for '+session.auth.tumblr.user.name);
        console.log(session.likes);
        // TODO make sure name isn't a filesystem path and a valid name for a file
        var dir = config.tmp_dir+'/'+session.auth.tumblr.user.name;
        try {
            fs.mkdirSync(dir);
        } catch(e) { }

        var num_likes = Math.min(session.likes, config.likes_limit);
        console.log("getting "+num_likes+" likes");
        socket.emit('status', 'Determining photos to download...');
        socket.emit('progress', 0);
        getPhotoUrls(getOAuthConfig(session), socket, [], num_likes, 0, function(urls) {
            var num_photos = urls.length;
            console.log("got "+num_photos+" photo urls");
            
            socket.emit('status', 'Downloading '+num_photos+' photos...');
            socket.emit('progress', 0);

            var opts = {zipOpts: [],
                        photos_got: 0
                       };

            urls.forEach(function(url) {
                console.log("checking url "+url);
                url = Url.parse(url);


                var filename = dir+url.path.substring(url.path.lastIndexOf('/'));
                try {
                    fs.statSync(filename);
                    console.log("file already downloaded "+filename);
                    // no need to download
                    opts = addFile(opts, filename, socket, num_photos, session);
                } catch(e) {
                    console.log("getting file "+filename);
                    http.get(url, function(response) {
                        var file = fs.createWriteStream(filename);
                        response.on('data', function(chunk){ file.write(chunk); });
                        response.on('end', function() {
                            file.end();
                            console.log("wrote file "+filename);
                            opts = addFile(opts, filename, socket, num_photos, session);
                        });
                    });
                }
            });
        });
    });
});

function addFile(opts, filename, socket, num_photos, session){
    opts.zipOpts.push(filename);
    opts.photos_got++;
    socket.emit('progress', (opts.photos_got/num_photos)*100);
    if (opts.photos_got == num_photos) {
        // we're done downloading
        // zip the file
        socket.emit('status', 'Creating ZIP file...');
        var zipfile = config.download_dir+session.auth.tumblr.user.name+'.zip';
        zipOpts = ['-j', process.cwd()+'/public/'+zipfile].concat(opts.zipOpts);
        console.log(opts.zipOpts);
        var zip = spawn('zip', opts.zipOpts);
        zip.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
        });
        zip.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
        });
        zip.on('exit', function(code) {
            console.log('child process exited with code ' + code);
            socket.emit('status', '<a href="'+config.host+zipfile+'">Your ZIP archive has been created sucessfully. Click here to download!</a>');
            socket.emit('done');
        });
    }
    return opts;
}

function getPhotoUrls(config, socket, urls, limit, offset, cb) {
    new Tumblr(config).getUserLikes({limit: 20, offset: offset}, function(err, res) {
        console.log(offset);
        if (err) {
            console.log(err);
            socket.emit('status', err);
            return cb(urls);
        }
        res.liked_posts.forEach(function(like) {
            if (like.photos) {
                like.photos.forEach(function(photo) {
                    urls.push(photo.original_size.url);
                });
            }
        });

        socket.emit('progress', ((offset+20)/limit)*100);

        if (offset+20 < limit) {
            getPhotoUrls(config, socket, urls, limit, offset+20, cb);
        } else {
            cb(urls);
        }
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
//    console.log("got oauth config:\n" + util.inspect(c, false, null, true));
    return c;
}
