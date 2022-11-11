import type { AWS } from '@serverless/typescript'

const serverlessConfiguration: AWS = {
  service: 'media',
  frameworkVersion: '3',
  plugins: ['serverless-plugin-typescript'],
  provider: {
    region: 'eu-west-1',
    name: 'aws',
    runtime: 'nodejs16.x',
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
}

module.exports = serverlessConfiguration
