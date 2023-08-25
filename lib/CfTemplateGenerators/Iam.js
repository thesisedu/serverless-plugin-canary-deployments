const _ = require('lodash/fp')

function buildCodeDeployRole (codeDeployRolePermissionsBoundaryArn, areTriggerConfigurationsSet) {
  const attachedPolicies = [
    'arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForLambdaLimited',
    'arn:aws:iam::aws:policy/AWSLambda_FullAccess'
  ]
  if (areTriggerConfigurationsSet) {
    attachedPolicies.push('arn:aws:iam::aws:policy/AmazonSNSFullAccess')
  }
  const iamRoleCodeDeploy = {
    Type: 'AWS::IAM::Role',
    Properties: {
      ManagedPolicyArns: attachedPolicies,
      AssumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: ['sts:AssumeRole'],
            Effect: 'Allow',
            Principal: { Service: ['codedeploy.amazonaws.com'] }
          }
        ]
      }
    }
  }
  if (codeDeployRolePermissionsBoundaryArn) {
    Object.assign(iamRoleCodeDeploy.Properties, { PermissionsBoundary: codeDeployRolePermissionsBoundaryArn })
  }
  return iamRoleCodeDeploy
}

function findCommonPrefix (items) {
  const sortedItems = items.sort()
  const firstItem = sortedItems[0]
  const lastItem = sortedItems[sortedItems.length - 1]
  let i = 0
  while (i < firstItem.length && firstItem.charAt(i) === lastItem.charAt(i)) {
    i++
  }
  return firstItem.substring(0, i)
}

function buildExecutionRoleWithCodeDeploy (inputRole, codeDeployAppName, deploymentGroups) {
  if (deploymentGroups.length === 0) {
    return inputRole
  }

  const outputRole = _.cloneDeep(inputRole)

  const statement = _.prop('Properties.Policies.0.PolicyDocument.Statement', outputRole)
  if (!statement) {
    return inputRole
  }

  const commonPrefix = deploymentGroups.length > 1 ? findCommonPrefix(deploymentGroups) : undefined

  statement.push({
    Action: ['codedeploy:PutLifecycleEventHookExecutionStatus'],
    Effect: 'Allow',
    Resource: commonPrefix
      ? [{
          'Fn::Sub': `arn:\${AWS::Partition}:codedeploy:\${AWS::Region}:\${AWS::AccountId}:deploymentgroup:\${${codeDeployAppName}}/${commonPrefix}*`
        }]
      : deploymentGroups.map((deploymentGroup) => ({
        'Fn::Sub': `arn:\${AWS::Partition}:codedeploy:\${AWS::Region}:\${AWS::AccountId}:deploymentgroup:\${${codeDeployAppName}}/${deploymentGroup}`
      }))
  })

  return outputRole
}

const Iam = {
  buildCodeDeployRole,
  buildExecutionRoleWithCodeDeploy
}

module.exports = Iam
