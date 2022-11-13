import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

export const dynamodbClient = new DynamoDBClient({
  region: 'eu-west-1',
})
