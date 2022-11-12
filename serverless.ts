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
    },
  },
}

module.exports = serverlessConfiguration
