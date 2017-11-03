/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let co = require('co');
let Promise = require('bluebird');
let ActiveDirectory = require('activedirectory');
let ActiveDirectoryError = require('../errors/ActiveDirectoryError.class');
let InvalidCredentialsError = require('../errors/InvalidCredentialsError.class');
let ActiveDirectoryAdapterConfiguration = require('./activeDirectoryAdapterConfiguration');

let activeDirectoryAdapterConfiguration = new ActiveDirectoryAdapterConfiguration();

module.exports = function ActiveDirectoryAdapter() {
  let configuration = activeDirectoryAdapterConfiguration.get();
  let adClient = Promise.promisifyAll(new ActiveDirectory(configuration));

  function standardizeError(error) {
    switch (error.name) {
      case 'InvalidCredentialsError':
        return new InvalidCredentialsError('Provided CORP username or password are invalid.');
      default:
        return new ActiveDirectoryError(error.message);
    }
  }

  // eslint-disable-next-line arrow-body-style
  this.authorizeUser = (credentials) => {
    return co(function* () {
      // Authenticate ActiveDirectory via its credentials
      yield adClient.authenticateAsync(credentials.username, credentials.password);

      // Get the user information
      let segments = credentials.username.split('\\');

      let username = segments.length < 2 ? segments[0] : segments[1];

      let groups = yield adClient.getGroupMembershipForUserAsync(username);

      let activeDirectoryUser = {
        name: username,
        roles: groups.map(group => group.cn)
      };

      return activeDirectoryUser;
    }).catch((error) => {
      throw standardizeError(error);
    });
  };
};
