import middy from '@middy/core'
import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 } from 'uuid'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { s3MetadataAdapter } from '../utils/S3MetadataAdapter'
import { s3Client } from '../utils/S3Client'

dayjs.extend(duration)

export const main = middy(
  async (event: APIGatewayEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    console.log(`event.queryStringParameters`)
    console.log(event.queryStringParameters)

    const batchId = v4()
    const command = new PutObjectCommand({
      Bucket: 'media-temporary-files-536155158c03',
      Key: batchId,
      Metadata: {
        sizes: s3MetadataAdapter.serialize([
          { x: 320, y: 320 },
          { x: 640, y: 640 },
        ]),
      },
    })

    const preSignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: dayjs.duration(1, 'minute').asSeconds(),
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        preSignedUrl,
        batchId,
      }),
    }
  },
)
