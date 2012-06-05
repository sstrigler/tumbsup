# Tumblr REST client API for node.js

Inspired by [ ntwitter ](https://github.com/AvianFlu/ntwitter).

## Installation

    npm install ntumblr


### Setup API 

`consumerKey` and `consumerSecret` can be obtained from [Tumblr](http://www.tumblr.com/oauth/apps).

`accessTokenKey` and `accessTokenSecret` can be obtained via [OAuth](http://www.tumblr.com/docs/en/api/v2#oauth): instruction is [ below ](#access-token).

Minimal server that returns your `accessTokenKey` and `accessTokenSecret` can be found at `/server/app.coffee`
        
    Tumblr = require('ntumblr')

    tumblr = new Tumblr
      consumerKey:       'TumblrConsumerKey'
      consumerSecret:    'TumblrConsumerSecret'
      accessTokenKey:    'AccessTokenKey'
      accessTokenSecret: 'AccessTokenSecret'


### Usage

#### Get blog info

    tumblr.get 'info', (err, data, response)->
      blogInfoData = JSON.parse( data ).response.blog
      { title,
        posts,
        name,
        url,
        updated,
        description,
        ask,
        ask_anon,
        likes } = blogInfoData
    
#### Get posts

    tumblr.get 'posts', (err, data, response)->
      postsData = JSON.parse(data).response.posts
      postsData.forEach (post)->
        {
          blog_name,
          id,
          post_url,
          type,
          date,
          timestamp,
          format,
          reblog_key,
          tags,
          highlighted,
          note_count,
          title,
          body,
        } = post
    
#### Get text posts

    tumblr.get 'posts', type: 'text', (err, data, response)->
      postsData = JSON.parse(data).response.posts

#### Get one text post
Other request parameters can be found at [Request Parameters](http://www.tumblr.com/docs/en/api/v2#posts)

    filterParam =
      type: 'text'
      limit: 1
    
    tumblr.get 'posts', filterParam, (err, data, response)->
      postData = JSON.parse(data).response.posts[0]
    
#### Creating new Text Post as draft
__Requires `AccessTokenKey` and `AccessTokenSecret`__

    postObj =
      type: 'text'
      title: 'Demo Post'
      body: 'Having a nice day :D'
      status: 'draft'

    tumblr.post postObj, (err, data, response)->
      {
        meta,
        response
      } = JSON.parse(data)

      if meta.status is 201 then console.log meta.msg is 'Created'
      newPostId = response.id

#### Creating new Photo Post

__Requires `AccessTokenKey` and `AccessTokenSecret`__

    postObj =
      type: 'photo'
      data: [fs.readFileSync('photo.jpg')]

    tumblr.post postObj, (err, data, response)->
      {
        meta,
        response
      } = JSON.parse(data)

      if meta.status is 201 then console.log meta.msg is 'Created'
      newPostId = response.id


### Test
**Make sure you have got [access tokens](#access-token)**

    # Create the url-strings first to check against
    $ python test/assets/tumblrv2api.py test/assets/photo.jpg
    $ mocha
    $ mocha test/tumblr # only test against tumblr

### Getting Access Tokens<a name="access-token"></a>

1. Copy `config-sample.json` to `config.json` and fill required fields
2. Run simple server by `coffee server` then go to `http://localhost:3000` to allow the app.
3. Check your `config.json`. it should have access tokens in place.
4. You can run test by `$ mocha` :)


-------------------------------------------------
`by mnmly`
