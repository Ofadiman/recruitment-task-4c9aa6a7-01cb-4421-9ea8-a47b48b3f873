# Recruitment task

The goal of the task is to write an application in Node.js that will allow you to upload a file to any cloud storage (e.g. [AWS S3](https://aws.amazon.com/s3/)) with the ability to resize images and save metadata to any database (e.g. [AWS DynamoDB](https://aws.amazon.com/dynamodb/)).

# Running the application

The application uses a [serverless framework](https://www.serverless.com/) and is designed to run in the cloud. This means that the application cannot be run locally.

To deploy the application to the AWS cloud, you must have the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables configured. You can do it by e.g.

- Exporting variables in your current terminal session.
- Using tools such as `aws-vault` to inject variables into the sub-process.

You can read more about deploying an application using serverless framework in the [official documentation](https://www.serverless.com/framework/docs/providers/aws/guide/deploying).

# Architecture

The application uses event-driven architecture to upload files and save them to the database.

The file is uploaded using a pre-signed URL. This solution allows you to limit the amount of data sent to the server and speed up the upload of the file, because it goes directly to file storage (AWS S3).

# Process overview

1. The client sends an HTTP request to the API Gateway to obtain a pre-signed URL to upload the file and identifier of the request `batchId`.
2. The client uses the received pre-signed URL to upload the file directly to the S3 bucket which holds temporary files. This bucket is configured to automatically delete files after 30 days via [lifecycle rules](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html).
3. Temporary files S3 bucket emits `s3:ObjectCreated:Put` event which triggers AWS Lambda function.
4. The function processes the image to create multiple images with desired dimensions provided by the client and converts their format to `webp` to optimize their use on the web. The function then saves the images to the S3 bucket for permanent files.
5. Permanent files S3 bucket emits `s3:ObjectCreated:Put` event which triggers AWS Lambda function.
6. The function writes the metadata of the image to a dynamodb table.
7. The client can now query all images using the received `batchId`.

# Testing the flow

Automatic flow testing is possible with the script `test-flow.ts`. To execute the script, enter the following command:

- `npx ts-node scripts/test-flow.ts <api-gateway-url>`

You can obtain `<api-gateway-url>` from the AWS console. Assuming that you have deployed your stack to eu-west-1 region:

1. Visit the [API Gateway](https://eu-west-1.console.aws.amazon.com/apigateway/main/apis?region=eu-west-1) website.
2. Navigate to your API configuration page. You can find the API by `staging-media` name.
3. On the left side menu, pick `Stages` option.
4. Select `staging` stage.
5. Copy the `Invoke URL` field value.
