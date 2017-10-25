/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let launchConfigUpdater = require('./launchConfigUpdater');
let co = require('co');
let sender = require('../../modules/sender');
let logger = require('../../modules/logger');
let _ = require('lodash');

let imageProvider = require('../../modules/provisioning/launchConfiguration/imageProvider');
let instanceDevicesProvider = require('../../modules/provisioning/launchConfiguration/instanceDevicesProvider');
let securityGroupsProvider = require('../../modules/provisioning/launchConfiguration/securityGroupsProvider');

let AutoScalingGroup = require('../../models/AutoScalingGroup');

module.exports = function SetLaunchConfiguration(command) {
  return co(function* () {
    let data = command.data;
    let updated = {};
    let autoScalingGroup = yield AutoScalingGroup.getByName(command.accountName, command.autoScalingGroupName);
    let originalLaunchConfiguration = yield autoScalingGroup.getLaunchConfiguration();

    // Get the image and disk size specified
    let image = yield imageProvider.get(data.AMI || originalLaunchConfiguration.ImageId);
    let osDiskSize = getOSDiskSize(data.Volumes, originalLaunchConfiguration.BlockDeviceMappings);

    // Check the OS disk size supports that image
    if (osDiskSize < image.rootVolumeSize) {
      throw new Error(`The specified OS volume size (${osDiskSize} GB) is not sufficient for image '${image.name}' (${image.rootVolumeSize} GB)`);
    }

    let environmentType = yield autoScalingGroup.getEnvironmentType();
    let vpcId = environmentType.VpcId;

    if (data.InstanceProfileName !== undefined) {
      // That's checking if this instance profile name exists
      yield getInstanceProfileByName(command.accountName, data.InstanceProfileName);
      updated.IamInstanceProfile = data.InstanceProfileName;
    }

    if (data.InstanceType !== undefined) {
      updated.InstanceType = data.InstanceType;
    }

    if (data.Volumes !== undefined) {
      updated.BlockDeviceMappings = instanceDevicesProvider.toAWS(data.Volumes);
    }

    if (data.SecurityGroups !== undefined) {
      let securityGroupsNamesAndReasons = _.map(data.SecurityGroups, name => ({
        name,
        reason: 'It was set by user in LaunchConfig form'
      }));
      let securityGroups = yield securityGroupsProvider.getFromSecurityGroupNames(command.accountName, vpcId, securityGroupsNamesAndReasons, logger);
      updated.SecurityGroups = _.map(securityGroups, 'GroupId');
    }

    if (data.AMI !== undefined) {
      updated.ImageId = image.id;
    }

    if (data.UserData !== undefined) {
      updated.UserData = new Buffer(data.UserData).toString('base64');
    }

    let accountName = command.accountName;
    let autoScalingGroupName = command.autoScalingGroupName;

    logger.debug(`Updating ASG ${autoScalingGroupName} with: ${JSON.stringify(updated)}`);

    return launchConfigUpdater.set(
      accountName,
      autoScalingGroup,
      (launchConfiguration) => {
        _.assign(launchConfiguration, updated);
      }
    );
  });
};

function getOSDiskSize(newVolumes, originalBlockDeviceMappings) {
  if (newVolumes !== undefined) {
    let newOSVolume = _.find(newVolumes, v => v.Name === 'OS');
    return newOSVolume.Size;
  }

  let originalOSBlockDeviceMapping = _.find(originalBlockDeviceMappings, d => _.includes(['/dev/sda1', '/dev/xvda'], d.DeviceName));
  return originalOSBlockDeviceMapping.Ebs.VolumeSize;
}

function getInstanceProfileByName(accountName, instanceProfileName) {
  let query = {
    name: 'GetInstanceProfile',
    accountName,
    instanceProfileName
  };

  return sender.sendQuery({ query });
}
