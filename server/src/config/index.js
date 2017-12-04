/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let nconf = require('nconf');
let fs = require('fs');
let { getVersion } = require('./version');

const REQUIRED_VALUES = ['EM_AWS_REGION', 'EM_PACKAGES_BUCKET'];
const LOGGED_VALUES = [...REQUIRED_VALUES, 'EM_AWS_RESOURCE_PREFIX', 'EM_AWS_S3_BUCKET', 'EM_PACKAGES_KEY_PREFIX'];

function init() {
  const APP_VERSION = getVersion();

  /**
   * ENV is default but allow argument overrides
   */
  nconf.env().argv();
  nconf.use('memory');

  /**
   * If an `EM_PROFILE` value is set, override values with that profile
   */
  const profileOverride = nconf.get('EM_PROFILE');
  if (profileOverride !== undefined) {
    if (fs.existsSync(profileOverride) === false) {
      throw Error(`File EM_PROFILE=${profileOverride} doesn't exist.`);
    }
    nconf.file(profileOverride);
  }

  /**
   * Defaults if not previously set via ENV, args or profile
   */
  nconf.defaults({
    EM_AWS_RESOURCE_PREFIX: '',
    EM_LOG_LEVEL: 'Debug',
    EM_AWS_S3_BUCKET: 'S3 Bucket value not set',
    EM_AWS_S3_KEY: 'S3 Key value not set',
    EM_PACKAGES_KEY_PREFIX: 'PACKAGES'
  });

  /**
   * Convenience values
   */
  const isProduction = nconf.get('NODE_ENV') === 'production';
  const isRemoteDebug = nconf.get('REMOTE_DEBUG') === 'true';
  const useDevSources = nconf.get('DEV_SOURCES') === 'true';
  const publicDir = isProduction || useDevSources ? './dist' : '../client';

  nconf.set('IS_PRODUCTION', isProduction);
  nconf.set('IS_REMOTE_DEBUG', isRemoteDebug);
  nconf.set('APP_VERSION', APP_VERSION);
  nconf.set('PUBLIC_DIR', publicDir);

  /**
   * Ensure required values are set
   */
  REQUIRED_VALUES.filter(v => nconf.get(v) === undefined).forEach((missing) => {
    throw new Error(`${missing} value is not set.`);
  });
}

/**
 * Set user namespaced config value
 */
function userSet(key, value) {
  return nconf.set(`user:${key}`, value);
}

/**
 * Get user namespaced config value
 */
function userGet(key) {
  return nconf.get(`user:${key}`);
}

let afterInit = (() => {
  let isInitialised = false;
  return fn => (...args) => {
    if (!isInitialised) {
      init();
      isInitialised = true;
    }
    return fn(...args);
  };
})();

module.exports = {
  logBootstrapValues: () => {
    LOGGED_VALUES.forEach((key) => {
      console.log(`${key}=${nconf.get(key)}`);
    });
  },
  get: afterInit(nconf.get.bind(nconf)),
  set: afterInit(nconf.set.bind(nconf)),
  setUserValue: afterInit(userSet),
  getUserValue: afterInit(userGet)
};
