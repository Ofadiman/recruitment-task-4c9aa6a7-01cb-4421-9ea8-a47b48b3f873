import middy from '@middy/core'
import { Context, S3Event } from 'aws-lambda'
import { dynamodbClient } from '../utils/DynamoDBClient'
import { PutItemCommand } from '@aws-sdk/client-dynamodb'
import { s3Client } from '../utils/S3Client'
import { HeadObjectCommand } from '@aws-sdk/client-s3'

const firstOrThrow = <Type>(array: Type[]): Type => {
  const element = array[0]
  if (!element) {
    throw new Error(`Array is empty.`)
  }

  return element
}

export const main = middy(async (event: S3Event, _context: Context) => {
  const s3EventRecord = firstOrThrow(event.Records)
  console.log(JSON.stringify(s3EventRecord, null, 2))

  const headObjectCommand = new HeadObjectCommand({
    Bucket: s3EventRecord.s3.bucket.name,
    Key: s3EventRecord.s3.object.key,
  })
  console.info(`Head object command input.`)
  console.info(headObjectCommand)

  const headObjectCommandOutput = await s3Client.send(headObjectCommand)
  console.info(`Head object command input.`)
  console.info(headObjectCommandOutput)

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
    TableName: 'media-9ee1440f-bcae-4831-9b43-2de05865ce15',
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
  console.info(`Put item command input.`)
  console.info(putItemCommand)

  await dynamodbClient.send(putItemCommand)
})
