const express = require('express');
const path = require('path');
const url = require('url');
const favicon = require('serve-favicon');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const nconf = require('nconf');

nconf
  .argv()
  .env()
  .file({file: './config.json'});

const app = express();

if (app.get('env') !== 'development') {
  nconf.set('URL', 'https://automaticsms.herokuapp.com');
} else {
  nconf.set('URL', 'http://localhost:3000');
  app.use(require('connect-livereload')());
}

const routes = require('./routes');
const api = require('./routes/api');
const oauth = require('./routes/oauth');

app.set('views', __dirname + '/views');
app.set('view engine', 'pug');

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser(nconf.get('SESSION_SECRET')));
app.use(express.static(path.join(__dirname, 'public')));

app.locals.googleMapsApiKey = nconf.get('GOOGLE_MAPS_BROWSER_KEY') || '';

let store;
let cookie;
if (app.get('env') !== 'development') {
  const RedisStore = require('connect-redis')(session);
  const redisURL = url.parse(nconf.get('REDISCLOUD_URL'));
  store = new RedisStore({
    host: redisURL.hostname,
    port: redisURL.port,
    pass: redisURL.auth.split(':')[1]
  });
  cookie = {
    maxAge: 31536000000
  };
} else {
  const MemoryStore = session.MemoryStore;
  store = new MemoryStore();
  cookie = {
    maxAge: 3600000
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


if (app.get('env') !== 'development') {
  app.all('*', routes.force_https);
} else {
  app.all('*', routes.check_dev_token);
}


app.get('/', routes.index);

app.get('/l/:shareId/', routes.share);

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

// Error handlers
require('./libs/errors')(app);

module.exports = app;
