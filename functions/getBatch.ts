import middy from '@middy/core'
import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { z } from 'zod'
import { dynamodbClient } from '../utils/DynamoDBClient'
import { ScanCommand } from '@aws-sdk/client-dynamodb'
import getenv from 'getenv'
import { DYNAMODB_METADATA_TABLE_NAME_KEY, S3_PERMANENT_FILES_BUCKET_URL_KEY } from '../env'

type DynamoDBMediaItem = {
  createdAt: { S: string }
  id: { S: string }
  batchId: { S: string }
}

const batchParamsSchema = z
  .object({
    batchId: z.string(),
  })
  .strict()

export const main = middy(
  async (event: APIGatewayEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    const parsePathParamsResult = batchParamsSchema.safeParse(event.pathParameters)
    if (!parsePathParamsResult.success) {
      return {
        statusCode: 400,
        body: JSON.stringify(parsePathParamsResult.error.flatten()),
      }
    }

    const scanCommand = new ScanCommand({
      FilterExpression: 'batchId = :batchId',
      ExpressionAttributeValues: {
        ':batchId': {
          S: parsePathParamsResult.data.batchId,
        },
      },
      TableName: getenv(DYNAMODB_METADATA_TABLE_NAME_KEY),
    })
    const scanCommandOutput = await dynamodbClient.send(scanCommand)

    if (!scanCommandOutput.Items) {
      return {
        statusCode: 200,
        body: JSON.stringify([]),
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(
        (scanCommandOutput.Items as DynamoDBMediaItem[]).map((item) => ({
          createdAt: item.createdAt.S,
          batchId: item.batchId.S,
          url: `${getenv(S3_PERMANENT_FILES_BUCKET_URL_KEY)}${item.id.S}`,
        })),
      ),
    }
  },
)
