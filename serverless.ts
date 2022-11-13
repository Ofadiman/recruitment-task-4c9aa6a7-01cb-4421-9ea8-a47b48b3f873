import type { AWS } from '@serverless/typescript'
import {
  DYNAMODB_METADATA_TABLE_KEY,
  S3_PERMANENT_FILES_BUCKET_KEY,
  S3_TEMPORARY_FILES_BUCKET_KEY,
} from './env'

const stage = '${opt:stage}'
const dynamoDBTableName = `recruitment-task-metadata-${stage}`
const s3TemporaryFilesBucketName = `recruitment-task-temporary-files-${stage}`
const s3PermanentFilesBucketName = `recruitment-task-permanent-files-${stage}`

const serverlessConfiguration: AWS = {
  service: 'media',
  frameworkVersion: '3',
  plugins: ['serverless-plugin-typescript'],
  provider: {
    region: 'eu-west-1',
    name: 'aws',
    runtime: 'nodejs16.x',
    environment: {
      [S3_TEMPORARY_FILES_BUCKET_KEY]: s3TemporaryFilesBucketName,
      [S3_PERMANENT_FILES_BUCKET_KEY]: s3PermanentFilesBucketName,
      [DYNAMODB_METADATA_TABLE_KEY]: dynamoDBTableName,
    },
    // ${opt:*} or ${env:} syntax does not work in "iamRoleStatements", so for now I will leave "Resource" option set to "*".
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: 's3:*',
        Resource: '*',
      },
      {
        Effect: 'Allow',
        Action: 's3:*',
        Resource: `*`,
      },
      {
        Effect: 'Allow',
        Action: 'dynamodb:*',
        Resource: `*`,
      },
    ],
  },
  functions: {
    hello: {
      handler: 'functions/hello.main',
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
      handler: 'functions/getPreSignedUploadUrl.main',
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
      handler: 'functions/resize.main',
      events: [
        {
          s3: {
            bucket: s3TemporaryFilesBucketName,
            event: 's3:ObjectCreated:*',
            forceDeploy: true, // https://www.serverless.com/framework/docs/providers/aws/events/s3#forcing-deploying-of-triggers
            existing: true, // https://www.serverless.com/framework/docs/providers/aws/events/s3#using-existing-buckets
          },
        },
      ],
    },
    persist: {
      handler: 'functions/persist.main',
      events: [
        {
          s3: {
            bucket: s3PermanentFilesBucketName,
            event: 's3:ObjectCreated:*',
            forceDeploy: true, // https://www.serverless.com/framework/docs/providers/aws/events/s3#forcing-deploying-of-triggers
            existing: true, // https://www.serverless.com/framework/docs/providers/aws/events/s3#using-existing-buckets
          },
        },
      ],
    },
    getBatch: {
      handler: 'functions/getBatch.main',
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
      S3TemporaryFiles: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: s3TemporaryFilesBucketName,
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
      S3PermanentFiles: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: s3PermanentFilesBucketName,
          VersioningConfiguration: {
            Status: 'Enabled',
          },
        },
      },
      FilesTable: {
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
          TableName: dynamoDBTableName,
        },
      },
    },
  },
}

module.exports = serverlessConfiguration
