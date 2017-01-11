/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let co = require('co');
let resourceProvider = require('modules/resourceProvider');
let imageSummary = require('modules/machineImage/imageSummary');
let assert = require('assert');

/**
 * Get all the EC2 images ordered by AMI Type (lexicographical, ascending) then by
 * AMI version (semver, descending).
 */
function* handler(query) {
  assert(query.accountName);
  let parameters = { accountName: query.accountName };
  let resource = yield resourceProvider.getInstanceByName('images', parameters);

  let images = yield resource.all({ filter: query.filter });
  return imageSummary.rank(images.map(imageSummary.summaryOf).sort(imageSummary.compare));
}

module.exports = co.wrap(handler);

