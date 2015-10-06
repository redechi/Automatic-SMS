var express = require('express');
var path = require('path');
var url = require('url');
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var nconf = require('nconf');

nconf
  .argv()
  .env()
  .file({file:'./config.json'});

var app = express();

if(app.get('env') !== 'development') {
	nconf.set('URL', 'https://automaticsms.herokuapp.com');
} else {
	nconf.set('URL', 'http://localhost:3000');
	app.use(require('connect-livereload')());
}

var routes = require('./routes');
var api = require('./routes/api');
var oauth = require('./routes/oauth');

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser(nconf.get('SESSION_SECRET')));
app.use(express.static(path.join(__dirname, 'public')));

var store;
var cookie;
if(app.get('env') !== 'development') {
  var RedisStore = require('connect-redis')(session);
  var redisURL = url.parse(nconf.get('REDISCLOUD_URL'));
  store = new RedisStore({
    host: redisURL.hostname,
    port: redisURL.port,
    pass: redisURL.auth.split(':')[1]
  });
  cookie = {
    maxAge: 31536000000
  };
} else {
  var memoryStore = session.MemoryStore;
  store = new memoryStore();
  cookie = {
    maxAge: 3600000,
  };
}

app.set('store', store);

app.use(session({
  store: store,
  secret: nconf.get('SESSION_SECRET'),
  saveUninitialized: true,
  resave: true,
  cookie: cookie
}));


if(app.get('env') !== 'development') {
  app.all('*', routes.force_https);
} else {
  app.all('*', routes.check_dev_token);
}


app.get('/', routes.index);

app.get('/l/:share_id/', routes.share);

app.get('/api/user/', routes.authenticate, api.user);

app.get('/api/rules/', routes.authenticate, api.rules);
app.post('/api/rules/', routes.authenticate, api.createRule);
app.put('/api/rules/', routes.authenticate, api.updateRule);
app.delete('/api/rules/', routes.authenticate, api.destroyRule);

app.get('/api/counts/', routes.authenticate, api.counts);

app.get('/authorize/', oauth.authorize);
app.get('/logout/', oauth.logout);
app.get('/disconnect/', oauth.disconnect);
app.get('/redirect/', oauth.redirect);

// Connect to Automatic Events API over Websocket
require('./libs/automatic_websocket')(app);

// error handlers
require('./libs/errors')(app);

module.exports = app;
