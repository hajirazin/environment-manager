/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let _ = require('lodash');
let sender = require('../modules/sender');
let TaggableMixin = require('./TaggableMixin');
let ScanSecurityGroups = require('../queryHandlers/ScanSecurityGroups');

class SecurityGroup {
  constructor(data) {
    _.assign(this, data);
  }

  getName() {
    return this.getTag('Name');
  }

  static getAllByIds(accountName, vpcId, groupIds) {
    let query = {
      name: 'ScanSecurityGroups',
      accountName,
      vpcId,
      groupIds
    };

    return sender.sendQuery(ScanSecurityGroups, { query }).then(list => list.map(item => new TaggableSecurityGroup(item)));
  }

  static getAllByNames(accountName, vpcId, groupNames) {
    let query = {
      name: 'ScanSecurityGroups',
      accountName,
      vpcId,
      groupNames
    };

    return sender.sendQuery(ScanSecurityGroups, { query }).then(list => list.map(item => new TaggableSecurityGroup(item)));
  }
}

class TaggableSecurityGroup extends TaggableMixin(SecurityGroup) { }

module.exports = TaggableSecurityGroup;
