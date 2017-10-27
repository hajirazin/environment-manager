/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let _ = require('lodash');
let amazonClientFactory = require('../amazon-client/childAccountClient');

let AwsError = require('../errors/AwsError.class');
let LaunchConfigurationAlreadyExistsError = require('../errors/LaunchConfigurationAlreadyExistsError.class');

function standardifyError(error, launchConfigurationName) {
  if (!error) return null;

  let awsError = new AwsError(error.message);

  if (error.code === 'AlreadyExists') {
    return new LaunchConfigurationAlreadyExistsError(
      `LaunchConfiguration "${launchConfigurationName}" already exists`, awsError
    );
  }

  return awsError;
}

function cleanup(launchconfig) {
  delete launchconfig.LaunchConfigurationARN;
  delete launchconfig.CreatedTime;

  if (_.isNull(launchconfig.KernelId) || _.isEmpty(launchconfig.KernelId)) delete launchconfig.KernelId;
  if (_.isNull(launchconfig.RamdiskId) || _.isEmpty(launchconfig.RamdiskId)) delete launchconfig.RamdiskId;
}

class LaunchConfigurationResource {

  constructor(client) {
    this.client = client;
  }

  describeLaunchConfigurations(names) {
    let self = this;
    let launchconfigs = [];
    let request = {};

    if (names.length) {
      request.LaunchConfigurationNames = names;
    }

    function query() {
      return self.client.describeLaunchConfigurations(request).promise().then((data) => {
        launchconfigs = launchconfigs.concat(data.LaunchConfigurations);

        if (!data.NextToken) return launchconfigs;

        // Scan from next index
        request.NextToken = data.NextToken;
        return query();
      });
    }

    return query();
  }

  get(parameters) {
    return this.describeLaunchConfigurations([parameters.name]).then(data => data[0]);
  }

  all(parameters) {
    return this.describeLaunchConfigurations(parameters.names || []);
  }

  delete({ name }) {
    let request = { LaunchConfigurationName: name };

    return this.client.deleteLaunchConfiguration(request).promise().catch((error) => {
      throw standardifyError(error, name);
    });
  }

  post(parameters) {
    cleanup(parameters);

    let request = parameters;
    return this.client.createLaunchConfiguration(request).promise().catch((error) => {
      throw standardifyError(error, parameters.LaunchConfigurationName);
    });
  }
}

module.exports = {

  canCreate: resourceDescriptor =>
    resourceDescriptor.type.toLowerCase() === 'launchconfig',

  create: (resourceDescriptor, parameters) =>
    amazonClientFactory.createASGClient(parameters.accountName).then(client => new LaunchConfigurationResource(client))
};
