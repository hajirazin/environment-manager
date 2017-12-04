/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let co = require('co');
let configEnvironments = require('../data-access/configEnvironments');
let loadBalancerUpstreams = require('../data-access/loadBalancerUpstreams');
let Environment = require('../../models/Environment');
let logger = require('../logger');

function getUpstream(upstreamName) {
  return loadBalancerUpstreams.get({ Key: upstreamName });
}

function getEnvironment(name) {
  return configEnvironments.get({ EnvironmentName: name });
}

function getModifyPermissionsForEnvironment(environmentName) {
  return getEnvironment(environmentName).then(environment => ({
    cluster: environment.Value.OwningCluster.toLowerCase(),
    environmentType: environment.Value.EnvironmentType.toLowerCase()
  }));
}

function getEnvironmentPermissionsPromise(upstreamName, environmentName, accountName, method) {
  if (method === 'POST') {
    return getModifyPermissionsForEnvironment(environmentName);
  }

  return getUpstream(upstreamName)
    .then((upstream) => {
      if (upstream) {
        let envName = upstream.Environment;
        return getModifyPermissionsForEnvironment(envName);
      }

      throw new Error(`Could not find upstream: ${upstreamName}`);
    });
}

exports.getRules = (request) => {
  let r = /^\/(.*)\/config$/;
  let upstreamName = request.params.key || request.params.name || request.params.body.key;
  let accountName = request.params.account;

  return co(function* () {
    let body = request.params.body || request.body;
    logger.debug('Upstreams authorizer', { body, url: request.url });
    let environmentName = upstreamName.substr(1, 3);

    if (accountName === undefined) {
      accountName = yield Environment.getAccountNameForEnvironment(environmentName);
    }

    let match = r.exec(upstreamName);
    let path = `/${request.params.account}/config/lbUpstream/${match[1]}`;
    let getEnvironmentPermissions = getEnvironmentPermissionsPromise(upstreamName, environmentName, accountName, request.method);

    return getEnvironmentPermissions.then(envPermissions => [{
      resource: path,
      access: request.method,
      clusters: [envPermissions.cluster],
      environmentTypes: [envPermissions.environmentType]
    }]);
  });
};

exports.docs = {
  requiresClusterPermissions: true,
  requiresEnvironmentTypePermissions: true
};
