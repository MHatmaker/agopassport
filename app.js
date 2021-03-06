var express = require('express'),
  passport = require('passport'),
  util = require('util'),
  logger = require('morgan'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  session = require('session'),
  methodOverride = require('method-override'),
  request = require('request'),
  ArcGISStrategy = require('passport-arcgis').Strategy,
  cors = require('cors'),
  session = require('express-session');

var ARCGIS_CLIENT_ID = "RIABlR5YsNF9kOcH";
var ARCGIS_CLIENT_SECRET = "c2be4fb31c054b69842040d6e09df920";
var router = express.Router();
var thisUser = {};
var agotoken;
var cbport = process.env.PORT || "3000";
// var hurl = encodeURIComponent("https://agopassport.herokuapp.com:" + process.env.PORT || "3000" + "/auth/arcgis/callback");
// var hurl = encodeURIComponent("/auth/" + cbport + "arcgis/callback");
var hurl = cbport == '3000' ?
  "http://localhost:3000/auth/arcgis/callback" :
  "https://agopassport.herokuapp.com:" + cbport + "/auth/arcgis/callback";
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
    callbackURL: hurl
    // proxy: cbport == '3000' ? false : true,
    // passReqToCallback: true
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
      // console.log(accessToken);
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

app.use(cors({origin:'http://localhost:8100', methods: 'GET'}));
app.options('*', cors());

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
  // app.use(app.router);  // deprecated, so remove
  app.use(express.static(__dirname + '/public'));
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
  });


app.get('/', cors(), function(req, res) {
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

// app.get('/login', function(req, res) {
//   console.log('\n\nget /login\n\n');
//   console.log(req.user);
//   res.render('login', {
//     user: req.user
//   });
// });

app.get('/login', (req, res, next) => {
  passport.authenticate('arcgis', function(err, user, info) {
    console.log('res for /login');
    console.log(res);
    if (err) { return next(err); }
    if (!user) { return res.redirect('/login'); }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.render('login', {
        user : user.username
      });
      })
    })(req, res, next);
  });

  app.get('/loginremote', cors(), (req, res, next) => {
    console.log('node handler for loginremote');
    passport.authenticate('arcgis', function(err, user, info) {
      console.log('res for /login');
      console.log(res);
      if (err) { return next(err); }
      if (!user) { return res.redirect('/login'); }
      req.logIn(user, function(err) {
        if (err) { return next(err); }
        return {
          user : user.username
        };
        })
      })(req, res, next);
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

/*
app.get('/authremote/arcgis', cors(),
  // let options =   {
  //   // url : 'https://darcadian.maps.arcgis.com/home/search.html?q=chicago%20crime&num=10&f=pjson&restrict=false',
  //   url : 'https://www.arcgis.com/sharing/rest/search?q=arcadia%20runs&num=10&f=pjson&restrict=false',
  //   json: true
  // }
  function(req, res, next) {
    console.log('/authremote selector');
    // request.get()
    passport.authenticate('arcgis', function(err, user, info) {
    console.log('res for /authremote');
    console.log(res);
    if (err) { return next(err); }
    if (!user) { return res.redirect('/login'); }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.render('login', {
        user : user.username
      });
     })
    })(req, res, next);

    // The request will be redirected to ArcGIS for authentication, so this
    // function will not be called.
  });
*/
// app.get('/authremote/arcgis', cors(), (req, res, next) => {
app.get('/authremote/arcgis', cors(), function(req, res) {
  console.log("route authremote/arcgis");
  console.log(ARCGIS_CLIENT_ID);
  let jresp = null;
  let frm = {
        'f': 'json',
        'client_id': ARCGIS_CLIENT_ID,
        'client_secret': ARCGIS_CLIENT_SECRET,
        'grant_type': 'client_credentials',
        'expiration': '1440'
      };
  console.log(frm);
  request.post({ url: 'https://www.arcgis.com/sharing/rest/oauth2/token/?client_id=' + ARCGIS_CLIENT_ID + '&client_secret=' + ARCGIS_CLIENT_SECRET +  '&grant_type=client_credentials&expiration=1440&redirect_uri=' + hurl},
  // request.post({ url: 'https://www.arcgis.com/sharing/rest/oauth2/token/'
  //     json: true,
  //     form: frm,
  //     'headers' : {'Content-Type': 'application/x-www-form-urlencoded'}
  //   },
    (error, response, body) =>
    {
      console.log("returned");
      console.log(response.body);
      this.jsresp = JSON.parse(response.body);
      console.log("\n\ntoken: " + this.jsresp.access_token);
      console.log("\nexpires_in " + this.jsresp.expires_in);
      return res.send(jsresp);
    })
    console.log("outer return");
    console.log(this.jsresp);
    return this.jresp;
  })

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
    console.log(res);
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

app.get('/queryremote', cors(), function(req, res) {
  console.log('queryremote route');
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
      function(req2, res2){
        console.log('return from post');
        console.log(res2.body);
        res.send(res2.body);
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
    url : 'https://www.arcgis.com/sharing/rest/content/listings?q=chicago+crime&num=10&f=pjson&restrict=false',
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

app.get('/listingsremote', cors(), function(req, res) {
  console.log('listingsremote route');
  let options =   {
    // url : 'https://darcadian.maps.arcgis.com/home/search.html?q=chicago%20crime&num=10&f=pjson&restrict=false',
    url : 'https://www.arcgis.com/sharing/rest/search?q=arcadia%20runs&num=10&f=pjson&restrict=false?token=' + agotoken ,
    json: true
  }
  console.log(options.url);

    request.get(options,
        function(req2, res2){
          console.log('query response, body');
          console.log(res2.body);
          res.send(res2.body);
          // console.log(response);
        }
    // request.post(options,
    //     function(error, response, body){
    //       console.log(agotoken);
    //       console.log('query response, body');
    //       console.log(body);
    //       console.log('response error');
    //       console.log(error);
    //       res.send(body);
    //       // console.log(response);
    //     }
    );
});
