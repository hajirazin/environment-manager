/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let co = require('co');
const asgResourceFactory = require('../../modules/resourceFactories/asgResourceFactory');

function* handleQuery(query) {
  // Create an instance of the resource to work with based on the resource
  // descriptor and AWS account name.
  let parameters = { accountName: query.accountName };
  let resource = yield asgResourceFactory.create(undefined, parameters);

  // Get AutoScalingGroup by name
  return resource.get({ name: query.autoScalingGroupName, clearCache: query.clearCache });
}

module.exports = co.wrap(handleQuery);
