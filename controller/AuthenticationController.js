var AuthenticationController
  , passport = require('passport')
  , UserController = require('./UserController')
  , ErrorController = require('./ErrorController')
  ;

AuthenticationController = (function() {
  var authenticateTo
    , callbackFrom
    , configure
    , handleAuthenticatedUser
    , sendUnsupportedPartyError
    ;

  authenticateTo = {
    familysearch: function(req, res, next) {
      passport.authenticate('familysearch')(req, res, next);
    }
  };

  callbackFrom = {
    familysearch: function(req, res, next) {
      passport.authenticate('familysearch', {
        successRedirect: '/users/me',
        failureRedirect: '/familysearch-failure'
      })(req, res, next);
    }
  }

  sendUnsupportedPartyError = function(res, provider) {
    var message = 'The third-party provider "' + provider + '" is not supported';
    var code = 400;
    ErrorController.sendErrorJson(res, code, message);
  }


  handleAuthenticatedUser = function(accessToken, refreshToken, profile, done) {
    profile.fromPassport = true;
    UserController.handleAuthenticatedUser(profile, function(error, user) {
      if (error) {
        console.log('There was an error with handling a ' + profile.provider + ' authenticated user!');
        return done(error);
      }
      done(null, user);
    });
  }

  configure = {
    familySearch: function() {
      var FamilySearchStrategy = require('passport-familysearch').Strategy;

      passport.use(new FamilySearchStrategy({
        authorizationURL: 'https://sandbox.familysearch.org/cis-web/oauth2/v3/authorization',
        tokenURL: 'https://sandbox.familysearch.org/cis-web/oauth2/v3/token',
        devKey: process.env.FS_KEY,
        callbackURL: process.env.BASE_URL + "/auth/familysearch/callback"
//        callbackURL: "http://127.0.0.1:3000/auth/familysearch/callback"
      },
      handleAuthenticatedUser));
    }
  }

  return {
    setupPassport: function() {
      configure.familySearch();

      passport.serializeUser(function(user, done) {
        done(null, user._id);
      });

      passport.deserializeUser(function(id, done) {
        UserController.findById(id, function(error, user) {
          done(error, user);
        });
      });
    },
    authenticate: function(req, res, next) {
      var authFunction = authenticateTo[req.params.provider];
      if (authFunction) {
        authFunction(req, res, next);
      } else {
        sendUnsupportedPartyError(res, req.params.provider);
      }
    },
    callback: function(req, res, next) {
      var callbackFunction = callbackFrom[req.params.provider];
      if (callbackFunction) {
        callbackFunction(req, res, next);
      } else {
        sendUnsupportedPartyError(res, req.params.provider);
      }
    }
  }
})();

module.exports = AuthenticationController;