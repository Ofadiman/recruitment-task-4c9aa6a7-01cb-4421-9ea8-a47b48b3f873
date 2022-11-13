import middy from '@middy/core'
import { Context, S3Event } from 'aws-lambda'

const firstOrThrow = <Type>(array: Type[]): Type => {
  const element = array[0]
  if (!element) {
    throw new Error(`Array is empty.`)
  }

  return element
}

export const main = middy(async (event: S3Event, _context: Context) => {
  console.log(firstOrThrow(event.Records).s3.object)
})
