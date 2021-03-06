import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { readFileSync } from 'fs';

export class AwsCdkMongodbPerformanceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'mongodb-vpc', {
      cidr: '10.0.0.0/16',
      natGateways: 0,
      subnetConfiguration: [
        { name: 'public', cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC },
      ]
    })

    const mongoSG = new ec2.SecurityGroup(this, 'mongoserver-sg', {
      vpc,
      allowAllOutbound: true,
    });

    mongoSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'allow SSH access from anywhere',
    );

    mongoSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(27017),
      'allow connection to MongoDB',
    );

    // Create three instances
    this.createEc2Instance({ name: 'mongodb0', securityGroup: mongoSG, vpc: vpc })
    this.createEc2Instance({ name: 'mongodb1', securityGroup: mongoSG, vpc: vpc })
    this.createEc2Instance({ name: 'mongodb2', securityGroup: mongoSG, vpc: vpc })
  }

  createEc2Instance({ name, securityGroup, vpc }: { name: string, securityGroup: ec2.SecurityGroup, vpc: ec2.Vpc }) {
    const ec2Instance = new ec2.Instance(this, name, {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      securityGroup: securityGroup,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      keyName: 'aws-ec2-key-pair',
    });

    const userDataScript = readFileSync('./lib/user-data.sh', 'utf8');
    ec2Instance.addUserData(userDataScript);
  }
}
