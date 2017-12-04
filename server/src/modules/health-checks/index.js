/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let resultCodes = require('./resultCodes');
const ping = require('./library/ping');
const redis = require('./library/redis');

let checks = [
  ping,
  redis
  // ... add more health checks here
];

module.exports = {
  resultCodes,
  checks
};
