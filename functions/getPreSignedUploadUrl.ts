import middy from '@middy/core'
import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 } from 'uuid'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { s3MetadataAdapter } from '../utils/S3MetadataAdapter'
import { s3Client } from '../utils/S3Client'
import { z } from 'zod'
import getenv from 'getenv'
import { S3_TEMPORARY_FILES_BUCKET_KEY } from '../env'

dayjs.extend(duration)

const dimensionSchema = z.preprocess((value) => Number(value), z.number().int().gte(100).lte(1000))
const sizeStringSchema = z.string().refine(
  (value) => {
    const [x, y] = value.split('x')
    const parseXResult = dimensionSchema.safeParse(x)
    if (!parseXResult.success) {
      return false
    }
    const parsedYResult = dimensionSchema.safeParse(y)
    if (!parsedYResult.success) {
      return false
    }

    return true
  },
  {
    message: `Incorrect size string format.`,
  },
)

const queryParametersSchema = z
  .object({
    name: z.array(z.string()),
    size: z.array(sizeStringSchema).transform((value) => {
      return value.map((item) => {
        const [x, y] = item.split('x')
        return {
          x: Number.parseInt(x!),
          y: Number.parseInt(y!),
        }
      })
    }),
  })
  .strict()

export const main = middy(
  async (event: APIGatewayEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    const queryStringParseResult = queryParametersSchema.safeParse(
      event.multiValueQueryStringParameters,
    )
    if (!queryStringParseResult.success) {
      return {
        statusCode: 400,
        body: JSON.stringify(queryStringParseResult.error.flatten()),
      }
    }

    const batchId = v4()
    const putObjectCommand = new PutObjectCommand({
      Bucket: getenv(S3_TEMPORARY_FILES_BUCKET_KEY),
      Key: queryStringParseResult.data.name[0],
      Metadata: {
        sizes: s3MetadataAdapter.serialize(queryStringParseResult.data.size),
        'batch-id': batchId,
      },
    })

    const preSignedUrl = await getSignedUrl(s3Client, putObjectCommand, {
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
