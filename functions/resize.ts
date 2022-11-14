import middy from '@middy/core'
import { Context, S3Event } from 'aws-lambda'
import { s3Client } from '../utils/S3Client'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { s3MetadataAdapter } from '../utils/S3MetadataAdapter'
import { v4 } from 'uuid'
import { PutObjectCommandInput } from '@aws-sdk/client-s3/dist-types/commands/PutObjectCommand'
import { GetObjectCommandInput } from '@aws-sdk/client-s3/dist-types/commands/GetObjectCommand'
import getenv from 'getenv'
import { S3_PERMANENT_FILES_BUCKET_NAME_KEY } from '../env'
import { firstOrThrow } from '../utils/firstOrThrow'

export const main = middy(async (event: S3Event, _context: Context) => {
  const s3EventRecord = firstOrThrow(event.Records)

  const getObjectCommandInput: GetObjectCommandInput = {
    Bucket: s3EventRecord.s3.bucket.name,
    Key: s3EventRecord.s3.object.key,
  }

  const getObjectCommand = new GetObjectCommand(getObjectCommandInput)
  const getObjectCommandOutput = await s3Client.send(getObjectCommand)
  if (!getObjectCommandOutput.Body) {
    console.info(`Output body is empty.`)
    return
  }

  if (!getObjectCommandOutput.Metadata) {
    console.info(`Object does not have any metadata.`)
    return
  }

  const sizesMetadata = getObjectCommandOutput.Metadata['sizes']
  if (!sizesMetadata) {
    console.info(`Object is missing "sizes" metadata key.`)
    return
  }

  const batchIdMetadata = getObjectCommandOutput.Metadata['batch-id']
  if (!batchIdMetadata) {
    console.info(`Object is missing "batch-id" metadata key.`)
    return
  }

  const uint8Array = await getObjectCommandOutput.Body.transformToByteArray()

  const sizes = s3MetadataAdapter.deserialize<{ x: number; y: number }[]>(sizesMetadata)

  const resizeAndFormatFilePromises = sizes.map((size) => {
    return sharp(uint8Array).resize({ width: size.x, height: size.y }).webp().toBuffer()
  })

  const transformOriginalFilePromise = sharp(uint8Array).webp().toBuffer()
  resizeAndFormatFilePromises.push(transformOriginalFilePromise)

  const resizedAndFormattedFiles = await Promise.all(resizeAndFormatFilePromises)

  const uploadFilesToS3Promises = resizedAndFormattedFiles.map((resizedAndFormattedFile) => {
    const putObjectCommandInput: PutObjectCommandInput = {
      Key: `${v4()}.webp`,
      Bucket: getenv(S3_PERMANENT_FILES_BUCKET_NAME_KEY),
      Body: resizedAndFormattedFile,
      Metadata: {
        'batch-id': batchIdMetadata,
      },
    }

    const putObjectCommand = new PutObjectCommand(putObjectCommandInput)
    return s3Client.send(putObjectCommand)
  })

  await Promise.all(uploadFilesToS3Promises)
})
