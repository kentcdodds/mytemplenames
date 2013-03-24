var UserController,
  User = require('../model/User')
  , DatabaseController = require('./DatabaseController')
  , ErrorController = require('./ErrorController');

UserController = (function() {

  var findUserWithProviderId
    , createNewUser
    , userIsAdmin
    , findUserById
    , userCollectionName = 'MFN_USER';

  findUserWithProviderId = function(profile, callback) {
    var query = {};
    query[profile.provider + 'Id'] = profile.id;
    console.log(JSON.stringify(query));
    DatabaseController.findOneObjectByQuery(userCollectionName, query, function(error, doc) {
      console.log(JSON.stringify(doc, null, 2));
      var user = (doc ? new User(doc) : null);
      callback(error, user);
    });
  };

  createNewUser = function(profile, callback) {
    console.log('creating new user from below profile:');
    console.log(JSON.stringify(profile, null, 2));
    var user = new User(
      {
        name: profile.displayName,
        fromPassport: profile.fromPassport || false,
        emails: (profile.emails && profile.emails[0] ? profile.emails : null),
        familySearchId: (profile.provider.toLowerCase() === 'familysearch' ? profile.id.toString() : null)
      }
    );
    if (userIsAdmin(user)) {
      user.privilages = 'admin';
    }
    console.log('Saving below user to Database');
    console.log(JSON.stringify(user, null, 2));
    DatabaseController.saveObject(userCollectionName, user, callback);
  };

  userIsAdmin = function(user) {
    if (user.emails) {
      var adminEmails = JSON.parse(process.env.ADMIN_EMAILS);
      for (var i = 0; i < user.emails.length; i++) {
        for (var j = 0; j < adminEmails.length; j++) {
          if (user.emails[i] === adminEmails[j]) {
            return true;
          }
        }
      }
    }
    return false;
  }

  findOrCreateUser = function(profile, callback) {
    findUserWithProviderId(profile, function(error, user) {
      console.log(error);
      if (error) {
        throw error;
      }
      if (!user) {
        createNewUser(profile, callback);
      } else {
        user.lastLogin = new Date();
        DatabaseController.saveObject(userCollectionName, user, function(error, updatedUser) {
          callback(error, user);
        });
      }
    });
  };

  findUserById = function(id, callback) {
    DatabaseController.findOneObjectById(userCollectionName, id, function(error, doc) {
      var user = new User(doc);
      callback(error, user);
    });
  }

  return {
    getMe: function(req, res) {
      res.json(req.user);
    },
    getAllUsers: function(req, res) {
      DatabaseController.findAll(userCollectionName, function(error, results) {
        res.json(results);
      });
    },
    getUser: function(req, res) {
      findUserById(req.params.id, function(error, user) {
        if (error || !user) {
          ErrorController.sendErrorJson(res, 500, error);
        } else {
          res.json(user);
        }
      });
    },
    handleAuthenticatedUser: function(profile, callback) {
      findOrCreateUser(profile, callback);
    },
    findById: function(id, callback) {
      findUserById(id, callback);
    },
    saveUser: function(req, res) {
      var user = new User(req.body);
      findOrCreateUser(user, function(error, newUser) {
        res.json(newUser);
      })
    },
    deleteUser: function(req, res) {
      DatabaseController.deleteObjectById(userCollectionName, req.params.id, function(error, numberRemoved) {
        if (error) {
          ErrorController.sendErrorJson(res, 500, error);
        } else {
          res.json({response: 'Success deleting user with id ' + req.params.id});
        }
      });
    }
  }

})();

module.exports = UserController;