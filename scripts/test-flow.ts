import { stat } from 'fs/promises'
import axios, { AxiosError } from 'axios'
import { createReadStream } from 'fs'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'

dayjs.extend(duration)

const apiGatewayUrl = process.argv[2]
if (apiGatewayUrl === undefined) {
  throw new Error('Api gateway url is missing!')
}

const urlSearchParams = new URLSearchParams()
urlSearchParams.append('size', '250x250')
urlSearchParams.append('size', '500x500')
urlSearchParams.append('size', '750x750')
urlSearchParams.append('name', 'pepe_blanket.jpg')

void (async () => {
  console.info(`Getting pre-signed url from lambda.`)
  let preSignedUrlResult!: { preSignedUrl: string; batchId: string }
  try {
    const response = await axios.get<{ preSignedUrl: string; batchId: string }>(
      `${apiGatewayUrl}/get-pre-signed-upload-url?${urlSearchParams.toString()}`,
    )
    preSignedUrlResult = response.data
  } catch (error) {
    console.error(`Getting pre-signed URL failed.`)
    console.error((error as AxiosError).response!.data)
    return
  }

  const pepeFileReadStream = createReadStream('assets/pepe_blanket_1000x1000.jpg')
  const pepeFileStats = await stat('assets/pepe_blanket_1000x1000.jpg')

  console.info(`Uploading pepe image to S3 using pre-signed url.`)
  try {
    await axios.put(preSignedUrlResult.preSignedUrl, pepeFileReadStream, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': pepeFileStats.size,
      },
    })
  } catch (error) {
    console.error(`Upload to S3 failed.`)
    console.error((error as AxiosError).response!.data)
    return
  }

  const delayBeforeDynamoDBRead = dayjs.duration(10, 'seconds')
  console.info(
    `Waiting ${delayBeforeDynamoDBRead.asSeconds()} seconds before getting image metadata from dynamodb.`,
  )
  setTimeout(() => {
    void (async () => {
      try {
        const response = await axios.get(`${apiGatewayUrl}/get-batch/${preSignedUrlResult.batchId}`)
        console.info(`Image metadata from dynamodb.`)
        console.info(response.data)
      } catch (error) {
        console.error(`Getting metadata from dynamodb failed.`)
        console.error((error as AxiosError).response!.data)
        return
      }
    })()
  }, delayBeforeDynamoDBRead.asMilliseconds())
})()
