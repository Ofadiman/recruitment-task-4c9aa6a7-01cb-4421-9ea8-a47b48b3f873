import { stat } from 'fs/promises'
import axios, { AxiosError } from 'axios'
import { createReadStream } from 'fs'

const getPreSignedUploadUrlEndpointUrl = process.argv[2]
if (getPreSignedUploadUrlEndpointUrl === undefined) {
  throw new Error('Argument for pre signed upload url is missing!')
}

const urlSearchParams = new URLSearchParams()
urlSearchParams.append('size', '250x250')
urlSearchParams.append('size', '500x500')
urlSearchParams.append('size', '750x750')

type PreSignedUrlResponseData = { preSignedUrl: string; batchId: string }

const request = async () => {
  console.info(`Getting pre-signed url from lambda.`)
  let preSignedUrlResult!: PreSignedUrlResponseData
  try {
    const response = await axios.get<PreSignedUrlResponseData>(
      `${getPreSignedUploadUrlEndpointUrl}?${urlSearchParams.toString()}`,
    )
    preSignedUrlResult = response.data
  } catch (error) {
    console.error(`Getting pre-signed URL failed.`)
    console.error((error as AxiosError).response!.data)
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
  }
}

void request()
