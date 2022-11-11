import middy from '@middy/core'
import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'

export const main = middy(
  async (_event: APIGatewayEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'works',
      }),
    }
  },
)
