/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let co = require('co');
let userService = require('../../../modules/user-service');
let cookieConfiguration = require('../../../modules/authentications/cookieAuthenticationConfiguration');

/**
 * POST /login
 */
function login(req, res, next) {
  return co(function* () {
    let body = req.swagger.params.body.value;
    let duration = cookieConfiguration.getCookieDuration();

    let credentials = {
      username: body.username,
      password: body.password,
      scope: 'ui'
    };

    let token = yield userService.authenticateUser(credentials, duration);
    let cookieName = cookieConfiguration.getCookieName();
    let cookieValue = token;
    let cookieOptions = cookieConfiguration.buildCookieOptions();

    res.cookie(cookieName, cookieValue, cookieOptions);
    res.send(token);
  }).catch(next);
}

/**
 * POST /logout
 */
function logout(req, res, next) {
  let cookieName = cookieConfiguration.getCookieName();
  let token = req.cookies[cookieName];

  return userService.signOut(token).then(() => {
    res.clearCookie(cookieName, cookieConfiguration.buildCookieOptions());
    res.json({ ok: true });
  }).catch(next);
}

module.exports = {
  login,
  logout
};
