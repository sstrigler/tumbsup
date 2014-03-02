var Tumblr = require("tumblr2"),
    util = require('util');

function handleGetBlogPosts(app, config, blogId, res) {
    return function(err, blog) {
        app.logger.log(util.inspect(blog, false, null, true));
        res.render('browse', {title:'Browsing '+blogId,
                              host: config.host,
                              blogId: blogId,
                              blog: blog});
    }
};

module.exports = function(app, config) {
    var tumblr = new Tumblr({consumerKey: config.consumerKey,
                             consumerSecret: config.consumerSecret});

    return {
        get: function(req, res) {
            var blogId = req.params.blogId;
            if (blogId) {
                if (blogId.indexOf('.') == -1) // presumably a plain tumblr-id
                    blogId += ".tumblr.com";
                app.logger.log(blogId);
                if (blogId.indexOf('://') != -1) // strip proto
                    blogId = blogId.substring(blogId.indexOf('://')+3)
                app.logger.log(blogId);
                if (blogId.indexOf('/') != -1) // strip trailing slash
                    blogId = blogId.substring(0, blogId.indexOf('/'));
                app.logger.log(blogId);
                tumblr.getBlogPosts({blogId:blogId, type: ["photo"]},
                                    handleGetBlogPosts(app, config, blogId, res));
            } else {
                res.render('browse', {title:'Browse tumblelog',
                                      host: config.host,
                                      blogId: blogId,
                                      blog:false});
            }
        }
    };
};
