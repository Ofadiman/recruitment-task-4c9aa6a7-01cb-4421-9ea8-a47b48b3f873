import middy from '@middy/core'
import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { z } from 'zod'
import { dynamodbClient } from '../utils/DynamoDBClient'
import { ScanCommand } from '@aws-sdk/client-dynamodb'

const batchParamsSchema = z
  .object({
    batchId: z.string(),
  })
  .strict()

export const main = middy(
  async (event: APIGatewayEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    console.info(`Event path parameters.`)
    console.log(event.pathParameters)

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
      TableName: 'media-9ee1440f-bcae-4831-9b43-2de05865ce15',
    })
    const scanCommandOutput = await dynamodbClient.send(scanCommand)
    console.info(`Scan command.`)
    console.info(scanCommand)

    return {
      statusCode: 200,
      body: JSON.stringify(scanCommandOutput.Items),
    }
  },
)
