
var	VERSION = '0.1.6';

var	http = require('http'),
querystring = require('querystring'),
oauth = require('oauth'),
utils = require('./utils');

module.exports = Tumblr;

function Tumblr(args) {
  if (!(this instanceof Tumblr)) return new Tumblr(args);

  var defaults = {
    consumerKey: null,
    consumerSecret: null,
    accessTokenKey: null,
    accessTokenSecret: null,

    headers: {
      'Accept': '*/*',
      'Connection': 'close',
      'User-Agent': 'node-tumblr-v2/' + VERSION
    },
    requestTokenUrl: 'http://www.tumblr.com/oauth/request_token',
    accessTokenUrl: 'http://www.tumblr.com/oauth/access_token',
    authorizeUrl: 'http://www.tumblr.com/oauth/authorize',
    restBase : 'http://api.tumblr.com/v2'
  };
  
  this.options = utils.merge(defaults, args);

  this.oauth = new oauth.OAuth(
    this.options.requestTokenUrl,
    this.options.accessTokenUrl,
    this.options.consumerKey,
    this.options.consumerSecret,
    '1.0', null, 'HMAC-SHA1', null,
    this.options.headers);
}


/************************************************/
/*              Blog GET Methods                */
/************************************************/

/*
 * Retrieve Blog Info
 * http://www.tumblr.com/docs/en/api/v2#blog-info
 * @params {
 *  blogId {Required}
 * }
 */
Tumblr.prototype.getBlogInfo = function(params, callback) {
  params.api_key = this.options.consumerKey;
  this._get('/blog/{blogId}/info'.replace('{blogId}', params.blogId), params, callback);
  return this;
}

/*
 * Retrieve a Blog Avatar
 * http://www.tumblr.com/docs/en/api/v2#blog-avatar
 * @params {
 *  blogId {Required}
 *  size = 64 [16, 24, 30, 40, 48, 64, 96, 128, 512]
 * }
 */
Tumblr.prototype.getBlogAvatar = function(params, callback) {
  var url = '/blog/{blogId}/avatar'.replace('{blogId}', params.blogId);
  if(typeof params !== 'function' && params && params.size) {
    url += '/' + params.size;
    delete params.size;
  }
  this._get(url, params, callback);
  return this;
}

/*
 * Retrieve a Blog's Followers
 * http://www.tumblr.com/docs/en/api/v2#blog-followers
 * params { limit = 20, offset = 0 }
 */
Tumblr.prototype.getBlogFollowers = function(params, callback) { 
  this._get('/blog/{blogId}/followers'.replace('{blogId}', params.blogId), params, callback);
  return this;
}

/*
 * Retrieve Published Posts
 * http://www.tumblr.com/docs/en/api/v2#posts
 * @params {
 *  blogId {Required}
 *  type = [ text, quote, link, answer, video, audio, photo]
 *  id,
 *  tag
 *  limit = 20
 *  offset = 0
 *  reblog_info = false
 *  notes_info = false
 *  format = [raw, text]
 * }
 */
Tumblr.prototype.getBlogPosts = function(params, callback) {
  params.api_key = this.options.consumerKey;
  this._get('/blog/{blogId}/posts'.replace('{blogId}', params.blogId), params, callback);
  return this;
}


/*
 * Retrieve Queued Posts
 * http://www.tumblr.com/docs/en/api/v2#blog-queue
 */
Tumblr.prototype.getBlogQueue = function(params, callback) {
  this._get('/blog/{blogId}/posts/queue'.replace('{blogId}', params.blogId), params, callback);
  return this;
}


/*
 * Retrieve Draft Posts
 * http://www.tumblr.com/docs/en/api/v2#blog-drafts
 * @params {
 * blogId {Required}
 * }
 */
Tumblr.prototype.getBlogDraft = function(params, callback) {
  this._get('/blog/{blogId}/posts/draft'.replace('{blogId}', params.blogId), params, callback);
  return this;
}

/*
 * Retrieve Submission Posts
 * http://www.tumblr.com/docs/en/api/v2#blog-submissions
 * @params {
 * blogId {Required}
 * }
 */
Tumblr.prototype.getBlogSubmission = function(params, callback) {
  this._get('/blog/{blogId}/posts/submission'.replace('{blogId}', params.blogId), params, callback);
  return this;
}


/************************************************/
/*                 Blog Post Actions            */
/************************************************/

/*
 * Create a New Blog Post
 * http://www.tumblr.com/docs/en/api/v2#posting
 * @params {
 *  blogId {Required}
 *  type {Required} [text, quote, link, answer, video, audio, photo]
 *  state = [{default} published, draft, queue]
 *  tags //Comma-separated tags for this post
 *  tweet
 *  date
 *  markdown = false
 *  slug
 *
 *  //Text Posts
 *  title
 *  body {Required}
 *
 *  //Photo Posts
 *  caption
 *  link
 *  source {Required if no data} //The photo source URL
 *  data {Required if no source} //Array (URL-encoded binary contents) Limit: 5 MB
 *
 *  //Quote Posts
 *  quote {Required}
 *  source
 *
 *  //Link Posts
 *  title
 *  url {Required}
 *  description
 *
 *  //Chat Posts
 *  title
 *  conversation {Required}
 *
 *  //Audio Posts
 *  caption
 *  external_url {Required if no data}
 *  data {Required if no external_url} //String (URL-encoded binary contents) Limit: 5 MB
 *
 *  //Video Posts
 *  caption
 *  embed {Required if no data} //HTML embed code for the video
 *  data {Required if no embed} //String (URL-encoded binary contents) Limit: 5 MB
 *
 * }
 */
Tumblr.prototype.post = function(params, callback) {
  this._post('/blog/{blogId}/post'.replace('{blogId}', params.blogId), params, callback);
  return this;
}

/*
 * Edit a Blog Post
 * http://www.tumblr.com/docs/en/api/v2#editing
 * This parameter is in addition to the common parameters listed under post.
 * @params {
 * blogId {Required} 
 * id {Required}
 * }
 */
Tumblr.prototype.edit = function(params, callback) {
  this._post('/blog/{blogId}/post/edit'.replace('{blogId}', params.blogId), params, callback);
  return this;
}

/*
 * Reblog a Post
 * http://www.tumblr.com/docs/en/api/v2#reblogging
 * This parameter is in addition to the common parameters listed under post.
 * @params {
 * blogId {Required}
 * id,
 * reblog_key {Required} //The reblog key for the reblogged post Ğ get the reblog key with a /posts request	
 * comment
 * }
 */
Tumblr.prototype.reblog = function(params, callback) {
  this._post('/blog/{blogId}/post/reblog'.replace('{blogId}', params.blogId), params, callback);
  return this;
}

/*
 * Delete a Post
 * http://www.tumblr.com/docs/en/api/v2#deleting-posts
 * @params {
 *  id {Required}
 *  blogId {Required}
 * }
 */
Tumblr.prototype.remove = function(params, callback) {
  this._post('/blog/{blogId}/reblog'.replace('{blogId}', params.blogId), params, callback);
  return this;
}


/************************************************/
/*                User Get Methods                  */
/************************************************/

/*
 * Get a User's Information
 * http://www.tumblr.com/docs/en/api/v2#user-methods
 */
Tumblr.prototype.getUserInfo = function(params, callback) {
  this._get('/user/info', params, callback);
  return this;
}


/*
 * Retrieve a User's Dashboard
 * http://www.tumblr.com/docs/en/api/v2#user-methods
 * @params {
 *  limit = 20
 *  offset = 0
 *  type [text, photo, quote, link, chat, audio, video, question]
 *  since_id //Return posts that have appeared after this ID
 *  reblog_info = false
 *  notes_info = false
 * }
 */
Tumblr.prototype.getUserDashboard = function(params, callback) {
  this._get('/user/dashboard', params, callback);
  return this;
}

/*
 * Retrieve a User's Likes
 * http://www.tumblr.com/docs/en/api/v2#user-methods
 * @params {
 *  limit = 20
 *  offset = 0
 * }
 */
Tumblr.prototype.getUserLikes = function(params, callback) {
  this._get('/user/likes', params, callback);
  return this;
}

/*
 * Retrieve the Blogs a User Is Following
 * http://www.tumblr.com/docs/en/api/v2#user-methods
 * @params {
 *  limit = 20
 *  offset = 0
 * }
 */
Tumblr.prototype.getUserFollowing = function(params, callback) {
  this._get('/user/following', params, callback);
  return this;
}

/************************************************/
/*                User Post actions             */
/************************************************/

/*
 * Follow a blog
 * http://www.tumblr.com/docs/en/api/v2#user-methods
 * @params {
 *  url {Required}
 * }
 */
Tumblr.prototype.follow = function(params, callback) {
  this._post('/user/follow', params, callback);
  return this;
}

/*
 * Unfollow a blog
 * http://www.tumblr.com/docs/en/api/v2#user-methods
 * @params {
 *  url {Required}
 * }
 */
Tumblr.prototype.unfollow = function(params, callback) {
  this._post('/user/unfollow', params, callback);
  return this;
}


/************************************************/
/*              Helper functions                */
/************************************************/


Tumblr.prototype._handleResponse = function(json, callback) {
  if(json && json.meta && json.meta.status) {
    var status = json.meta.status;
    if(status >= 200 && status < 300 || status === 304 ) {
      callback(null, json.response);
    } else {
      var err = new Error(json.meta.msg);
      err.statusCode = status;
      callback(err);
    }
  }
}

/*
 * GET
 */
Tumblr.prototype._get = function(url, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = null;
  }

  if ( typeof callback !== 'function' ) {
    throw "FAIL: INVALID CALLBACK.";
    return this;
  }

  if (url[0] == '/') {
    url = this.options.restBase + url;
  }

  this.oauth.get(url + '?' + querystring.stringify(params),
    this.options.accessTokenKey,
    this.options.accessTokenSecret,
    function(error, data, response) {
      if (error) {
        var err = new Error('HTTP Error '
          + error.statusCode + ': '
          + http.STATUS_CODES[error.statusCode]);
        err.statusCode = error.statusCode;
        err.data = error.data;
        callback(err);
      } else {
        try {
          this._handleResponse(JSON.parse(data), callback);
        } catch(err) {
          callback(err);
        }
      }
    }.bind(this));
  return this;
}

Tumblr.prototype._post = function(url, content, contentType, callback) {
  if (typeof content === 'function') {
    callback = content;
    content = null;
    contentType = null;
  } else if (typeof contentType === 'function') {
    callback = contentType;
    contentType = null;
  }

  if (typeof callback !== 'function' ) {
    throw new Error("FAIL: INVALID CALLBACK.");
    return this;
  }

  if (url.charAt(0) == '/') url = this.options.restBase + url;
  
  // Workaround: oauth + booleans == broken signatures
  if (content && typeof content === 'object') {
    Object.keys(content).forEach(function(e) {
      if (typeof content[e] === 'boolean' )
        content[e] = content[e].toString();
    });
  }
  
  this.oauth.post(url,
    this.options.accessTokenKey,
    this.options.accessTokenSecret,
    content, contentType,
    function(error, data, response) {
      if (error) {
        var err = new Error('HTTP Error '
          + error.statusCode + ': '
          + http.STATUS_CODES[error.statusCode]);
        err.statusCode = error.statusCode;
        err.data = error.data;
        callback(err);
      } else {
        try {
          this._handleResponse(JSON.parse(data), callback);
        } catch(err) {
          callback(err);
        }
      }
    }.bind(this));
  return this;
}
