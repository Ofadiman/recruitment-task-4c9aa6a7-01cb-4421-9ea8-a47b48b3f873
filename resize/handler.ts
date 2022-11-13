import middy from '@middy/core'
import { Context, S3Event } from 'aws-lambda'
import { s3Client } from '../utils/S3Client'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { s3MetadataAdapter } from '../utils/S3MetadataAdapter'
import { v4 } from 'uuid'
import { PutObjectCommandInput } from '@aws-sdk/client-s3/dist-types/commands/PutObjectCommand'
import { GetObjectCommandInput } from '@aws-sdk/client-s3/dist-types/commands/GetObjectCommand'

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

  const getObjectCommandInput: GetObjectCommandInput = {
    Bucket: s3EventRecord.s3.bucket.name,
    Key: s3EventRecord.s3.object.key,
  }
  console.info(`Get object command input.`)
  console.info(getObjectCommandInput)
  const getObjectCommandOutput = await s3Client.send(new GetObjectCommand(getObjectCommandInput))

  console.log(JSON.stringify(getObjectCommandOutput.Metadata, null, 2))

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

  console.info(`Transforming command output body to byte array.`)
  const uint8Array = await getObjectCommandOutput.Body.transformToByteArray()

  const sizes = s3MetadataAdapter.deserialize<{ x: number; y: number }[]>(sizesMetadata)

  const resizeAndFormatFilePromises = sizes.map((size) => {
    return sharp(uint8Array).resize({ width: size.x, height: size.y }).webp().toBuffer()
  })

  const transformOriginalFilePromise = sharp(uint8Array).webp().toBuffer()
  resizeAndFormatFilePromises.push(transformOriginalFilePromise)

  console.info(`Transforming images.`)
  const resizedAndFormattedFiles = await Promise.all(resizeAndFormatFilePromises)

  const uploadFilesToS3Promises = resizedAndFormattedFiles.map((resizedAndFormattedFile, index) => {
    const putObjectCommandInput: PutObjectCommandInput = {
      Key: `${v4()}.webp`,
      Bucket: 'media-permanent-files-3fa46c7e1508',
      Body: resizedAndFormattedFile,
      Metadata: {
        'batch-id': s3EventRecord.s3.object.key,
      },
    }

    console.info(`Put object command input at index ${index}.`)
    console.info(putObjectCommandInput)

    return s3Client.send(new PutObjectCommand(putObjectCommandInput))
  })

  console.info(`Uploading images to S3.`)
  await Promise.all(uploadFilesToS3Promises)
})
