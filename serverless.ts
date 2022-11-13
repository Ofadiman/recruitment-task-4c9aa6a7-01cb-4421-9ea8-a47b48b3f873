import type { AWS } from '@serverless/typescript'

const serverlessConfiguration: AWS = {
  service: 'media',
  frameworkVersion: '3',
  plugins: ['serverless-plugin-typescript'],
  provider: {
    region: 'eu-west-1',
    name: 'aws',
    runtime: 'nodejs16.x',
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: 's3:*',
        Resource: 'arn:aws:s3:::media-temporary-files-536155158c03/*',
      },
      {
        Effect: 'Allow',
        Action: 's3:*',
        Resource: 'arn:aws:s3:::media-permanent-files-3fa46c7e1508/*',
      },
      {
        Effect: 'Allow',
        Action: 'dynamodb:*',
        Resource:
          'arn:aws:dynamodb:eu-west-1:715820034474:table/media-9ee1440f-bcae-4831-9b43-2de05865ce15',
      },
    ],
  },
  custom: {
    webpack: {
      webpackConfig: 'webpack.config.js',
      includeModules: true,
      packager: 'npm',
      excludeFiles: './**/*.test.ts',
    },
  },
  functions: {
    hello: {
      handler: 'hello/handler.main',
      events: [
        {
          http: {
            method: 'get',
            path: 'hello',
          },
        },
      ],
    },
    getPreSignedUploadUrl: {
      handler: 'getPreSignedUploadUrl/handler.main',
      events: [
        {
          http: {
            method: 'get',
            path: 'get-pre-signed-upload-url',
          },
        },
      ],
    },
    resize: {
      handler: 'resize/handler.main',
      events: [
        {
          s3: {
            bucket: 'media-temporary-files-536155158c03',
            event: 's3:ObjectCreated:*',
            forceDeploy: true, // https://www.serverless.com/framework/docs/providers/aws/events/s3#forcing-deploying-of-triggers
            existing: true, // https://www.serverless.com/framework/docs/providers/aws/events/s3#using-existing-buckets
          },
        },
      ],
    },
    persist: {
      handler: 'persist/handler.main',
      events: [
        {
          s3: {
            bucket: 'media-permanent-files-3fa46c7e1508',
            event: 's3:ObjectCreated:*',
            forceDeploy: true, // https://www.serverless.com/framework/docs/providers/aws/events/s3#forcing-deploying-of-triggers
            existing: true, // https://www.serverless.com/framework/docs/providers/aws/events/s3#using-existing-buckets
          },
        },
      ],
    },
    getBatch: {
      handler: 'get-batch/handler.main',
      events: [
        {
          http: {
            method: 'get',
            path: 'get-batch/{batchId}',
            request: {
              parameters: {
                paths: {
                  batchId: true,
                },
              },
            },
          },
        },
      ],
    },
  },
  resources: {
    Resources: {
      MediaTemporaryFiles536155158c03: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: 'media-temporary-files-536155158c03',
          LifecycleConfiguration: {
            Rules: [
              {
                Id: 'ExpireTemporaryObjects',
                Prefix: '/',
                Status: 'Enabled',
                ExpirationInDays: 30,
              },
            ],
          },
          VersioningConfiguration: {
            Status: 'Enabled',
          },
        },
      },
      MediaPermanentFiles3fa46c7e1508: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: 'media-permanent-files-3fa46c7e1508',
          VersioningConfiguration: {
            Status: 'Enabled',
          },
        },
      },
      MediaTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          AttributeDefinitions: [
            {
              AttributeName: 'id',
              AttributeType: 'S',
            },
            {
              AttributeName: 'createdAt',
              AttributeType: 'S',
            },
          ],
          KeySchema: [
            {
              AttributeName: 'id',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'createdAt',
              KeyType: 'RANGE',
            },
          ],
          BillingMode: 'PAY_PER_REQUEST',
          TableName: 'media-9ee1440f-bcae-4831-9b43-2de05865ce15',
        },
      },
    },
  },
}

module.exports = serverlessConfiguration
