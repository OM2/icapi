'use strict';

/*
 * Defining the Package
 */
var Module = require('meanio').Module;

var Icapi = new Module('icapi');

Icapi.register(function(app, auth, database, swagger) {

  //We enable routing. By default the Package Object is passed to the routes
  Icapi.routes(app, auth, database);

  swagger.add(__dirname);

  return Icapi;
});
