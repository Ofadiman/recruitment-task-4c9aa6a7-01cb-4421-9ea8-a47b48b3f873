import middy from '@middy/core'
import { Context, S3Event } from 'aws-lambda'
import { dynamodbClient } from '../utils/DynamoDBClient'
import { PutItemCommand } from '@aws-sdk/client-dynamodb'
import { s3Client } from '../utils/S3Client'
import { HeadObjectCommand } from '@aws-sdk/client-s3'
import getenv from 'getenv'
import { DYNAMODB_METADATA_TABLE_KEY } from '../env'
import { firstOrThrow } from '../utils/firstOrThrow'

export const main = middy(async (event: S3Event, _context: Context) => {
  const s3EventRecord = firstOrThrow(event.Records)

  const headObjectCommand = new HeadObjectCommand({
    Bucket: s3EventRecord.s3.bucket.name,
    Key: s3EventRecord.s3.object.key,
  })
  const headObjectCommandOutput = await s3Client.send(headObjectCommand)
  if (!headObjectCommandOutput.Metadata) {
    console.info(`Object does not have any metadata.`)
    return
  }

  const batchIdMetadata = headObjectCommandOutput.Metadata['batch-id']
  if (!batchIdMetadata) {
    console.info(`Object is missing "batch-id" metadata key.`)
    return
  }

  const putItemCommand = new PutItemCommand({
    TableName: getenv(DYNAMODB_METADATA_TABLE_KEY),
    Item: {
      id: {
        S: s3EventRecord.s3.object.key,
      },
      createdAt: {
        S: new Date().toISOString(),
      },
      batchId: {
        S: batchIdMetadata,
      },
    },
  })

  await dynamodbClient.send(putItemCommand)
})
