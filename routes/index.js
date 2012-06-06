var util= require('util'),
config = require('../config'),
Tumblr = require('tumblr2');

/*
 * GET home page.
 */

exports.index = function(req, res){
    if (req.session && req.session.auth && req.session.auth.loggedIn) {
        new Tumblr(getOAuthConfig(req.session)).getUserInfo(function(err, info) {
            console.log("got user info:\n"+util.inspect(info, false, null, true));
            res.render('home', { title: 'tumblikes', info: info });
        });
    } else {
        res.render('login', { title: 'tumblikes' });
    }
};

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