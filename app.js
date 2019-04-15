var express = require('express'),
  passport = require('passport'),
  util = require('util'),
  logger = require('morgan'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  session = require('session'),
  methodOverride = require('method-override'),
  request = require('request'),
  ArcGISStrategy = require('passport-arcgis').Strategy;
  var session = require('express-session');

var ARCGIS_CLIENT_ID = "RIABlR5YsNF9kOcH";
var ARCGIS_CLIENT_SECRET = "c2be4fb31c054b69842040d6e09df920";
var router = express.Router();
var thisUser = {};
var agotoken;
var cbport = process.env.PORT || "3000";
// var hurl = encodeURIComponent("https://agopassport.herokuapp.com:" + process.env.PORT || "3000" + "/auth/arcgis/callback");
// var hurl = encodeURIComponent("/auth/" + cbport + "arcgis/callback");
var hurl = "https://agopassport.herokuapp.com:" + cbport + "/auth/arcgis/callback";
// var hurl = ":" + cbport + "/arcgis/callback";
// var hurl = "/auth/arcgis/callback";

console.log("hurl");
console.log(hurl);

console.log("env.PORT");
console.log(process.env.PORT);
console.log(hurl);
//var user = undefined;


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete ArcGIS profile is serialized
//   and deserialized.
passport.serializeUser(function(usr, done) {
  console.log('\nserializeUser\n');
  // console.log(user);
  thisUser.role = usr.role;
  thisUser.orgId = usr.orgId;
  thisUser.username  = usr.username;
  thisUser.fullname = usr.fullname;
  thisUser.email = usr.email;
  // user = thisUser;
  console.log('thisUser');
  console.log(thisUser);
  console.log('\n finished serializeUser');
  done(null, usr);
});

passport.deserializeUser(function(obj, done) {
  console.log('deserializeUser');
  // console.log(obj);
  done(null, obj);
});


// Use the ArcGISStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and ArcGIS
//   profile), and invoke a callback with a user object.
passport.use(new ArcGISStrategy({
    clientID: ARCGIS_CLIENT_ID,
    clientSecret: ARCGIS_CLIENT_SECRET,
    callbackURL: hurl,
    proxy: true,
    passReqToCallback: true
    // callbackURL: "http://localhost:3000/auth/arcgis/callback"//,
    //redirect_uri: 'urn:ietf:wg:oauth:2.0:oob'
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function() {

      // To keep the example simple, the user's ArcGIS profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the ArcGIS account with a user record in your database,
      // and return that user instead.
      console.log('accessToken\n\n');
      console.log(accessToken);
      agotoken = accessToken;
      // console.log('\n\nprofile');
      // console.log(profile);
      return done(null, profile);
    });
  }
));



var app = express();
console.log("express created, port is:");
console.log(process.env.PORT);

// configure Express

  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  // app.use(express.logger());
  app.use(cookieParser());
  // app.use(bodyParser());
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());
  app.use(methodOverride());
  app.use(session({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true
  }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  // app.use(app.router);
  app.use(express.static(__dirname + '/public'));



app.get('/', function(req, res) {
  res.render('index', {
    user: req.user
  });
});

app.get('/account', ensureAuthenticated, function(req, res) {
  console.log('\n\nacccount\n')
  console.log('req.user');
  console.log(req.user);
  console.log('thisUser');
  // console.log(user);
  res.render('account', {
    user: req.user
  });
});

app.get('/login', function(req, res) {
  console.log('\n\nget /login\n\n');
  console.log(req.user);
  res.render('login', {
    user: req.user
  });
});

// GET /auth/arcgis
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in ArcGIS authentication will involve redirecting
//   the user to arcgis.com.  After authorization, ArcGISwill redirect the user
//   back to this application at /auth/arcgis/callback
app.get('/auth/arcgis',
  passport.authenticate('arcgis'),
  function(req, res) {
    // The request will be redirected to ArcGIS for authentication, so this
    // function will not be called.
  });

// GET /auth/arcgis/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/arcgis/callback',
  passport.authenticate('arcgis', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    console.log('\n\ncallback\n\n')
    // console.log(res);
    // user = req.user;
    // console.log(user);
    // user = thisUser;
    // console.log(res);
    res.redirect('/');
  });

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  console.log('\n\nensureAuthenticated\n\n');
  // console.log(req);
  if (req.isAuthenticated()) {
    console.log('\n\nisAuthenticated');
    return next();
  }
  console.log('\n\nnot isAuthenticated');
  res.redirect('/login');
}

app.get('/query', function(req, res) {
  console.log('query route');
  let options =   { // url: 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates',
    // url : 'http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Locators/ESRI_Geocode_USA/GeocodeServer/reverseGeocode',,
    url : 'http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Locators/ESRI_Geocode_USA/GeocodeServer/reverseGeocode?location=-118.58864%2C34.06145&distance=1000&outSR=&f=pjson',
    // url : 'http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Locators/ESRI_Geocode_USA/GeocodeServer/reverseGeocode',
    json: true,
    location: {
      X: -118.58864,
      y: 34.06145
    },
    distance : 1000,
    f : 'json',
    form: {
      f: 'pjson',
      token: agotoken,
      category : 'coffee shop',
        outFields: 'Place_addr, PlaceName, outSR',
        maxLocations : 5,
    }
  }
  console.log(options.url);

    request.post(options,
        function(error, response, body){
          console.log(agotoken);
          console.log('query response, body');
          console.log(body);
          console.log('response error');
          console.log(error);
          // console.log(response);
        }
    );
});


app.get('/search', function(req, res) {
  console.log('search route');
  let options =   {
    url : 'https://www.arcgis.com/sharing/rest/search?q=chicago%20crime&f=pjson',
    json: true,
    form: {
      f: 'json',
      q : 'park',
      //token: agotoken,
      category : 'park',
      searchExtent : {
        "xmin": -118.68702,
        "ymin": 34.03076,
        "xmax": -118.68105,
        "ymax": 34.03592,
        "spatialReference":{
          "latestWkid":3857,
          "wkid":102100
        }
      }
    }
  }
  console.log(options.url);

    request.post(options,
        function(error, response, body){
          console.log(agotoken);
          console.log('query response, body');
          console.log(body);
          console.log('response error');
          console.log(error);
          // console.log(response);
        }
    );
});

app.get('/listings', function(req, res) {
  console.log('listings route');
  let options =   {
    url : 'https://www.arcgis.com/sharing/rest/content/listings?q=arcadia&num=10&f=pjson&restrict=false',
    json: true
    // form: {
    //   f: 'json',
    //   q : 'parks',
    //   token: agotoken,
    //   category : 'park',
    //   searchExtent : {
    //     "xmin": -118.68702,
    //     "ymin": 34.03076,
    //     "xmax": -118.68105,
    //     "ymax": 34.03592,
    //     "spatialReference":{
    //       "latestWkid":3857,
    //       "wkid":102100
    //     }
    //   }
    // }
  }
  console.log(options.url);

    request.post(options,
        function(error, response, body){
          console.log(agotoken);
          console.log('query response, body');
          console.log(body);
          console.log('response error');
          console.log(error);
          // console.log(response);
        }
    );
});
