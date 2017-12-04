/* Copyright (c) Trainline Limited, 2016-2017. All rights reserved. See LICENSE.txt in the project root for license information. */

'use strict';

let sinon = require('sinon');
require('should');
const inject = require('inject-loader!../../../commands/deployments/CreateAutoScalingGroup.js');

describe('CreateAutoScalingGroup', function () {
  const name = 'CreateAutoScalingGroup';
  const accountName = 'Prod';
  const autoScalingGroupName = 'auto-scaling-group';
  const launchConfigurationName = 'launch-configuration';
  const topicNotificationMapping = [];
  const min = 1;
  const desired = 2;
  const max = 3;
  const size = { min, desired, max };
  const subnets = ['subnet-a', 'subnet-b'];
  const EnvironmentName = 'pr1';
  const Schedule = '';
  const tags = { EnvironmentName, Schedule };

  const template = {
    autoScalingGroupName,
    launchConfigurationName,
    topicNotificationMapping,
    size,
    subnets,
    tags
  };

  let autoScalingClientMock;
  let autoScalingGroupClientFactory;
  let command;
  let sut;

  beforeEach(() => {
    autoScalingClientMock = { post: sinon.stub() };
    autoScalingClientMock.post.returns(Promise.resolve());

    autoScalingGroupClientFactory = { create: sinon.stub().returns(Promise.resolve(autoScalingClientMock)) };
    command = { name, accountName, template };

    sut = inject({
      '../../modules/resourceFactories/asgResourceFactory': autoScalingGroupClientFactory
    });
  });

  it('creates an ASG client for the correct account', () => {
    return sut(command).then(() => {
      autoScalingGroupClientFactory.create.called.should.be.true();
      autoScalingGroupClientFactory.create.getCall(0).args.should.match(
        [undefined, { accountName }]
      );
    });
  });

  it('should post template values to the ASG client', () => {
    return sut(command).then(() => {
      autoScalingClientMock.post.called.should.be.true();
      autoScalingClientMock.post.getCall(0).args[0].should.match({
        AutoScalingGroupName: template.autoScalingGroupName,
        LaunchConfigurationName: template.launchConfigurationName,
        MaxSize: template.size.max,
        MinSize: template.size.min,
        VPCZoneIdentifier: `${template.subnets[0]},${template.subnets[1]}`,
        DesiredCapacity: template.size.desired,
        Tags: [
          { Key: 'EnvironmentName', Value: EnvironmentName },
          { Key: 'Schedule', Value: '' }
        ]
      });
    });
  });
});

