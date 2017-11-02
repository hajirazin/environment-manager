/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let _ = require('lodash');
let sender = require('../modules/sender');
let co = require('co');
let ScanCrossAccountImages = require('../queryHandlers/ScanCrossAccountImages');

class Image {

  constructor(data) {
    _.assign(this, data);
  }

  static getById(id) {
    return co(function* () {
      let images = yield sender.sendQuery(ScanCrossAccountImages, {
        query: {
          name: 'ScanCrossAccountImages'
        }
      });
      let image = _.find(images, { ImageId: id });
      return new Image(image);
    });
    // let image = yield imageProvider.get(awsLaunchConfig.ImageId);
  }

}

module.exports = Image;
