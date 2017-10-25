/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let configEnvironments = require('../data-access/configEnvironments');

function getEnvironment(name, user) {
  return configEnvironments.get({ EnvironmentName: name });
}

function getModifyPermissionsForEnvironment(environmentName, user) {
  return getEnvironment(environmentName, user).then((environment) => {
    if (environment) {
      return {
        cluster: environment.Value.OwningCluster.toLowerCase(),
        environmentType: environment.Value.EnvironmentType.toLowerCase()
      };
    }
    throw new Error(`Could not find environment: ${environmentName}`);
  });
}

exports.getRules = (request) => {
  let r = /^(.*?)-/;
  let match = r.exec(request.params.name);

  if (match && match[1]) {
    return getModifyPermissionsForEnvironment(match[1], request.user).then(envPermissions => (
      [{
        resource: request.url.replace(/\/+$/, ''),
        access: request.method,
        clusters: [envPermissions.cluster],
        environmentTypes: [envPermissions.environmentType]
      }]
    ));
  }

  return Promise.resolve();
};

exports.docs = {
  requiresClusterPermissions: true,
  requiresEnvironmentTypePermissions: true
};
