import middy from '@middy/core'
import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { z } from 'zod'
import { dynamodbClient } from '../utils/DynamoDBClient'
import { ScanCommand } from '@aws-sdk/client-dynamodb'
import getenv from 'getenv'
import { DYNAMODB_METADATA_TABLE_KEY } from '../env'

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
      TableName: getenv(DYNAMODB_METADATA_TABLE_KEY),
    })
    const scanCommandOutput = await dynamodbClient.send(scanCommand)

    return {
      statusCode: 200,
      body: JSON.stringify(scanCommandOutput.Items),
    }
  },
)
