/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let _ = require('lodash');
let Enums = require('../../Enums');
let co = require('co');
let getASG = require('../../queryHandlers/GetAutoScalingGroup');
let Environment = require('../../models/Environment');

function* getASGReady({ autoScalingGroupName, environmentName }) {
  return co(function* () {
    let accountName = yield Environment.getAccountNameForEnvironment(environmentName);
    return getASG({ accountName, autoScalingGroupName }).then((data) => {
      let instances = data.Instances;
      let instancesInService = _.filter(instances, { LifecycleState: Enums.ASGLifecycleState.IN_SERVICE });
      let instancesByLifecycleState = _(instances).groupBy('LifecycleState').mapValues(list => list.length).value();

      return {
        ReadyToDeploy: instancesInService.length === instances.length,
        InstancesByLifecycleState: instancesByLifecycleState,
        InstancesTotalCount: instances.length
      };
    });
  });
}

module.exports = co.wrap(getASGReady);
