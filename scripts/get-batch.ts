import axios, { AxiosError } from 'axios'

const getBatchUrlEndpoint = process.argv[2]
if (getBatchUrlEndpoint === undefined) {
  throw new Error('Argument for pre signed upload url is missing!')
}

const batchId = process.argv[3]
if (batchId === undefined) {
  throw new Error('Argument for pre signed upload url is missing!')
}

const request = async () => {
  console.info(`Getting batch from lambda.`)

  try {
    const response = await axios.get(`${getBatchUrlEndpoint}/${batchId}`)

    console.info(response.data)
  } catch (error) {
    console.error(`Getting batch from lambda failed.`)
    console.error((error as AxiosError).response!.data)
  }
}

void request()
