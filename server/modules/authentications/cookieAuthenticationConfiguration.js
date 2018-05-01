/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let assert = require('assert');
let config = require('../../config');
let ms = require('ms');
let utils = require('../../modules/utilities');

let cookieConfig;

module.exports = {
  getCookieName: () => {
    loadConfiguration();
    return cookieConfig.cookieName;
  },

  getCookieDuration: () => {
    loadConfiguration();
    return cookieConfig.cookieDuration;
  },
  buildCookieOptions: () => {
    loadConfiguration();
    return {
      expires: utils.offsetMilliseconds(new Date(), ms(cookieConfig.cookieDuration)),
      domain: cookieConfig.cookieDomain
    };
  }
};

function loadConfiguration() {
  let localConfig = config.getUserValue('local');

  assert(localConfig.authentication, 'missing \'authentication\' field in configuration');
  assert(localConfig.authentication.cookieName, 'missing \'authentication.cookieName\' field in configuration');
  assert(localConfig.authentication.cookieDuration, 'missing \'authentication.cookieDuration\' field in configuration');
  assert(localConfig.authentication.cookieDomain, 'missing \'authentication.cookieDomain\' field in configuration');

  cookieConfig = {
    loginUrl: localConfig.authentication.loginUrl,
    cookieName: localConfig.authentication.cookieName,
    cookieDuration: localConfig.authentication.cookieDuration,
    cookieDomain: localConfig.authentication.cookieDomain
  };
}
