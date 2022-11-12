import { stat } from 'fs/promises'
import axios from 'axios'
import { createReadStream } from 'fs'

const getPreSignedUploadUrlEndpointUrl = process.argv[2]
if (getPreSignedUploadUrlEndpointUrl === undefined) {
  throw new Error('Argument for pre signed upload url is missing!')
}

const request = async () => {
  console.info(`Getting pre-signed url from lambda.`)
  const result = await axios.get<{ preSignedUrl: string; batchId: string }>(
    getPreSignedUploadUrlEndpointUrl,
  )

  const pepeFileReadStream = createReadStream('assets/pepe_blanket_1000x1000.jpg')
  const pepeFileStats = await stat('assets/pepe_blanket_1000x1000.jpg')

  try {
    console.info(`Uploading pepe image to S3 using pre-signed url.`)
    await axios.put(result.data.preSignedUrl, pepeFileReadStream, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': pepeFileStats.size,
      },
    })
  } catch (error) {
    console.error(`Upload to S3 failed.`)
    console.error(error)
  }
}

void request()
