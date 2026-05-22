const AWS = require('aws-sdk');
const Sharp = require('sharp');

const s3 = new AWS.S3();
const RESIZED_BUCKET = process.env.RESIZED_BUCKET || 'my-minijira-resized-bucket';

exports.handler = async (event) => {
    const record = event.Records[0];
    const sourceBucket = record.s3.bucket.name;
    const sourceKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    if (sourceBucket === RESIZED_BUCKET) return;

    try {
        const s3Object = await s3.getObject({ Bucket: sourceBucket, Key: sourceKey }).promise();
        const imageBuffer = s3Object.Body;

        const resizedBuffer = await Sharp(imageBuffer)
            .resize(200, 200, { fit: 'inside' })
            .jpeg()
            .toBuffer();

        await s3.putObject({
            Bucket: RESIZED_BUCKET,
            Key: sourceKey,
            Body: resizedBuffer,
            ContentType: 'image/jpeg',
        }).promise();

        console.log(`Resized image saved: ${sourceKey}`);
    } catch (err) {
        console.error('Error processing image:', err);
        throw err;
    }
};