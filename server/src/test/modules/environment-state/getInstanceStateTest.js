/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

const assert = require('assert');
const inject = require('inject-loader!../../../modules/environment-state/getInstanceState');

describe('getInstanceState', function () {
  let sut;
  let serviceDiscovery;
  let serviceTargets;
  let targetStates = [];
  let currentStates = [];

  function setup() {
    serviceDiscovery = {
      getNodeHealth: () => Promise.resolve({}),
      getNode: () => Promise.resolve({ Services: currentStates })
    };
    serviceTargets = {
      getAllServiceTargets: () => Promise.resolve(targetStates),
      getInstanceServiceDeploymentInfo: () => Promise.resolve({ Status: 'Success' }),
      getServiceDeploymentCause: () => Promise.resolve('Test')
    };

    sut = inject({
      '../service-discovery': serviceDiscovery,
      '../service-targets': serviceTargets
    });
  }

  let SERVICE_STATES = [
    { Install: 0, Ignore: 0, Missing: 0, Unexpected: 0 },         // No services

    { Install: 87, Ignore: 0, Missing: 0, Unexpected: 0 },        // Only Installed
    { Install: 0, Ignore: 64, Missing: 0, Unexpected: 0 },        // Only Ignored
    { Install: 0, Ignore: 0, Missing: 94, Unexpected: 0 },        // Only Missing
    { Install: 0, Ignore: 0, Missing: 0, Unexpected: 45 },        // Only Unexpected

    { Install: 67, Ignore: 93, Missing: 0, Unexpected: 0 },       // Installed and Ignored
    { Install: 32, Ignore: 0, Missing: 29, Unexpected: 0 },       // Installed and Missing
    { Install: 40, Ignore: 0, Missing: 0, Unexpected: 70 },       // Installed and Unexpected
    { Install: 0, Ignore: 12, Missing: 7, Unexpected: 0 },        // Ignored and Missing
    { Install: 0, Ignore: 61, Missing: 0, Unexpected: 19 },       // Ignored and Unexpected
    { Install: 0, Ignore: 0, Missing: 72, Unexpected: 28 },       // Missing and Unexpected

    { Install: 106, Ignore: 19, Missing: 44, Unexpected: 0 },     // Installed, Ignored and Missing
    { Install: 22, Ignore: 0, Missing: 87, Unexpected: 90 },      // Installed, Missing and Unexpected
    { Install: 4, Ignore: 16, Missing: 0, Unexpected: 28 },       // Installed, Ignored and Unexpected
    { Install: 0, Ignore: 77, Missing: 30, Unexpected: 20 },      // Ignored, Missing and Unexpected

    { Install: 99, Ignore: 101, Missing: 98, Unexpected: 67 }     // All states
  ];
  describe('service states', function () {
    SERVICE_STATES.forEach(function (params) {
      const installed = params.Install || 0;
      const ignored = params.Ignore || 0;
      const missing = params.Missing || 0;
      const unexpected = params.Unexpected || 0;
      const missingOrUnexpected = missing + unexpected > 0;
      const expected = installed + missing + unexpected;

      describe(`with ${installed} installed, ${missing} missing, ${unexpected} unexpected and ${ignored} ignored`, function () {
        beforeEach(() => {
          targetStates = [];
          currentStates = [];
          Object.keys(params).forEach((key) => {
            createServiceStates(targetStates, currentStates, params[key], key);
          });
          setup();
        });

        it(`should return ${expected + unexpected} services`, () => {
          return sut().then((result) => {
            assert.equal(result.Services.length, expected + unexpected);
          });
        });

        it(`should ${missingOrUnexpected ? '' : 'not '}warn of missing or unexpected services`, () => {
          return sut().then((result) => {
            assert.equal(result.MissingOrUnexpectedServices, missingOrUnexpected);
          });
        });

        it(`should report ${installed + unexpected} running services`, () => {
          return sut().then((result) => {
            assert.equal(result.RunningServicesCount, installed + unexpected);
          });
        });
      });
    });
  });
});

/**
 * Utils for creating mock service states
 */
const randInt = n => Math.round(Math.random() * n);
const randSlice = () => Math.round(Math.random()) ? 'blue' : 'green'; // eslint-disable-line no-confusing-arrow
const randStr = n => [...Array(n)].map(() => String.fromCharCode(Math.round(Math.random() * 25) + 97)).join('');

function createServiceStates(targetState, currentState, n, state) {
  return [...Array(n)].map(() => createServiceStatePairs(targetState, currentState, state));
}

function createServiceStatePairs(targetState, currentState, state = 'Install') {
  const serviceVersion = `${randInt(10)}.${randInt(100)}.${randInt(1000)}`;
  const serviceSlice = `${randSlice()}`;
  const serviceName = `${randStr(22)}`;
  const consulServiceName = `${randStr(2)}-${serviceName}`;
  const owningCluster = `${randStr(22)}`;
  const serverRole = `${randStr(1)}${randInt(99)}-${randStr(2)}-${randStr(12)}`;
  const deploymentId = `${randStr(8)}-${randStr(8)}-${randStr(8)}-${randStr(8)}`;
  const ignore = state === 'Ignore';

  const inCurrentState = state === 'Install' || state === 'Unexpected';
  const inTargetState = state === 'Install' || state === 'Ignore';

  let targetService = {
    Name: serviceName,
    DeploymentId: deploymentId,
    Slice: serviceSlice,
    Action: ignore ? 'Ignore' : 'Install'
  };

  let currentService = {
    Name: consulServiceName,
    Service: consulServiceName,
    Tags: [
      `version:${serviceVersion}`,
      `slice:${serviceSlice}`,
      `owning_cluster:${owningCluster}`,
      `server_role:${serverRole}`,
      `deployment_id:${deploymentId}`
    ]
  };

  if (!inTargetState) {
    targetService.Name = consulServiceName;
  }

  targetState.push(targetService);

  if (inCurrentState) {
    currentState.push(currentService);
  }
}
