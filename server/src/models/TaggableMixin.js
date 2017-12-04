/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let _ = require('lodash');

let TaggableMixin = Base => class extends Base {
  getTag(key, defaultValue) {
    let tag = _.find(this.Tags, { Key: key });
    if (tag === undefined) {
      if (arguments.length <= 1) {
        throw new Error(`Can't find tag "${key}"`);
      } else {
        return defaultValue;
      }
    }
    return tag.Value;
  }

  setTag(key, value) {
    let tag = this.getTag(key);
    if (tag === undefined) {
      tag = {
        Key: key,
        Value: value
      };
      this.Tags.push(tag);
    } else {
      tag.Value = value;
    }
  }
};

module.exports = TaggableMixin;
