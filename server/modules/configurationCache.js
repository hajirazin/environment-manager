/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let co = require('co');
let environmentDatabase = require('./environmentDatabase');
let cacheManager = require('./cacheManager');

const TEN_MINUTES = 10 * 60;

cacheManager.create('Environment', x => environmentDatabase.getEnvironmentByName(x), { stdTTL: TEN_MINUTES });
cacheManager.create('EnvironmentType', x => environmentDatabase.getEnvironmentTypeByName(x), { stdTTL: TEN_MINUTES });

function getEnvironmentByName(name) {
  return cacheManager.get('Environment').get(name);
}

function getEnvironmentTypeByName(name) {
  return cacheManager.get('EnvironmentType').get(name);
}

function getConsulConfig(environmentName) {
  return co(function* () {
    let environment = yield getEnvironmentByName(environmentName);
    let environmentType = yield getEnvironmentTypeByName(environment.EnvironmentType);
    return environmentType.Consul;
  });
}

module.exports = {
  getEnvironmentByName,
  getEnvironmentTypeByName,
  getConsulConfig
};
