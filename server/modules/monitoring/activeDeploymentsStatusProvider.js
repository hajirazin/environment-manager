/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let co = require('co');
let ms = require('ms');
let _ = require('lodash');

let DEFAULT_SERVICE_INSTALLATION_TIMEOUT = '30m';

let Enums = require('../../Enums');
let BaseError = require('../errors/BaseError.class');
let deployments = require('../data-access/deployments');
let sender = require('../sender');
let infrastructureConfigurationProvider = require('../provisioning/infrastructureConfigurationProvider');
let namingConventionProvider = require('../provisioning/namingConventionProvider');
let logger = require('../logger');
let Environment = require('../../models/Environment');
let GetAutoScalingGroup = require('../../queryHandlers/GetAutoScalingGroup');
let GetTargetState = require('../../queryHandlers/services/GetTargetState');

module.exports = {

  all() {
    return co(function* () {
      let activeDeployments = yield getActiveDeploymentsFromHistoryTable();
      logger.debug(`DeploymentMonitor: ${activeDeployments.length} deployments found to monitor.`);

      return activeDeployments;
    }).catch((error) => {
      let message = (error instanceof BaseError) ? error.toString(true) : error.stack;
      logger.error(`DeploymentMonitor: An error has occurred getting active deployments: ${message}`);

      return Promise.reject(error);
    });
  },

  getActiveDeploymentsFullStatus(activeDeployments) {
    return Promise.all(activeDeployments.map(
      activeDeployment => getActiveDeploymentFullStatus(activeDeployment)
    ));
  }

};

function getActiveDeploymentsFromHistoryTable() {
  let FilterExpression = ['and',
    ['=', ['at', 'Value', 'SchemaVersion'], ['val', 2]],
    ['=', ['at', 'Value', 'Status'], ['val', 'In Progress']]
  ];
  return deployments.scanRunning({ FilterExpression });
}

function getActiveDeploymentFullStatus(activeDeployment) {
  let deploymentId = activeDeployment.DeploymentID;
  let environmentName = activeDeployment.Value.EnvironmentName;
  let serviceName = activeDeployment.Value.ServiceName;
  let serviceVersion = activeDeployment.Value.ServiceVersion;
  let accountName = activeDeployment.AccountName;

  return co(function* () {
    let data = yield {
      nodesId: getExpectedNodesIdByDeployment(activeDeployment),
      serviceInstallation: getTargetState(
        `environments/${environmentName}/services/${serviceName}/${serviceVersion}/installation`,
        environmentName,
        true
      ),
      nodesDeployment: getTargetState(
        `deployments/${deploymentId}/nodes/`,
        environmentName,
        true
      )
    };

    let nodesDeployment = getNodesDeployment(data.nodesId, data.nodesDeployment);
    let installationTimeout = data.serviceInstallation.length ? data.serviceInstallation[0].value.InstallationTimeout : DEFAULT_SERVICE_INSTALLATION_TIMEOUT;

    let activeDeploymentFullStatus = {
      deploymentId,
      environmentName,
      accountName,
      installationTimeout: ms(`${installationTimeout}m`),
      startTime: new Date(activeDeployment.Value.StartTimestamp),
      nodesDeployment
    };

    logger.debug(`DeploymentMonitor: Deployment '${deploymentId}' is going to affect following nodes ${JSON.stringify(nodesDeployment)}`);

    return activeDeploymentFullStatus;
  }).catch((error) => {
    let errorString = `An error has occurred getting deployment '${deploymentId}' status: ${error.toString(true)}`;
    logger.error(errorString);

    return Promise.resolve({
      deploymentId,
      error: errorString,
      environmentName,
      accountName
    });
  });
}

function getNodesDeployment(nodesId, nodesDeployment) {
  let mapping = nodesId.map((nodeId) => {
    let nodeDeployment = nodesDeployment
      .filter(x => x.key.indexOf(`/nodes/${nodeId}`) >= 0)
      .map(x => x.value)[0];

    let result = {
      InstanceId: nodeId,
      Status: Enums.NodeDeploymentStatus.NotStarted
    };

    if (!nodeDeployment) return result;

    for (let propertyName in nodeDeployment) {
      if ({}.hasOwnProperty.call(nodeDeployment, propertyName)) {
        let property = nodeDeployment[propertyName];
        if (!property) continue; // eslint-disable-line no-continue
        result[propertyName] = property;
      }
    }

    return result;
  });

  return mapping;
}

function getExpectedNodesIdByDeployment(deployment) {
  return co(function* () {
    let serverRoleName;
    if (deployment.Value.ServerRoleName === undefined) {
      let environment = yield Environment.getByName(deployment.Value.EnvironmentName);
      let deploymentMap = yield environment.getDeploymentMap();
      let serverRoles = _.map(yield deploymentMap.getServerRolesByServiceName(deployment.Value.ServiceName), 'ServerRoleName');
      serverRoleName = serverRoles[0];
      logger.info(`DeploymentMonitor: Picked deployment from old monitor: ${serverRoleName}`);
    } else {
      serverRoleName = deployment.Value.ServerRoleName;
    }

    let configuration = yield infrastructureConfigurationProvider.get(
      deployment.Value.EnvironmentName, deployment.Value.ServiceName, serverRoleName
    );

    let autoScalingGroupName = namingConventionProvider.getAutoScalingGroupName(
      configuration, deployment.Value.ServiceSlice
    );

    let query = {
      name: 'GetAutoScalingGroup',
      accountName: deployment.AccountName,
      autoScalingGroupName
    };

    try {
      let autoScalingGroup = yield sender.sendQuery(GetAutoScalingGroup, { query });
      let nodeIds = autoScalingGroup.Instances
        .filter(instance => instance.LifecycleState === 'InService')
        .map(instance => instance.InstanceId);
      return nodeIds;
    } catch (err) {
      logger.error('Couldn\'t find AutoScalingGroup - it\'s not in cached array?');
      logger.error(err);
      return [];
    }
  });
}

function getTargetState(key, environmentName, recurse) {
  let query = {
    name: 'GetTargetState',
    environment: environmentName,
    key,
    recurse
  };

  return sender.sendQuery(GetTargetState, { query });
}
