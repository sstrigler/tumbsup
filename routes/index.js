var ntumblr = require('ntumblr');

/*
 * GET home page.
 */

exports.index = function(req, res){

    if (req.user.loggedIn) {

        res.render('home', { title: 'tumblikes' });
    } else {
        res.render('login', { title: 'tumblikes'});
    }
};