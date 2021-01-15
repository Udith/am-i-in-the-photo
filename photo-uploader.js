const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const mime = require('mime-types');
const { USER_IMAGE_PREFIX } = require('./Constants.js');

exports.handler = async (event) => {

    let fileContent = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
    let contentType = event.headers['content-type'] || event.headers['Content-Type'];
    let extension = contentType ? mime.extension(contentType) : '';

    let path = event.rawPath;

    let imageKey;
    switch (path) {
        case "/uploadMyPhoto": {
            // Uploading user's image that should be used for the comparison 
            imageKey = getImageKey(USER_IMAGE_PREFIX, extension);
            break;
        }
        case "/uploadPhoto": {
            // Uploading a generic image that should be checked for the presence of the user
            imageKey = getImageKey(`photos/${Date.now()}`, extension);
            break;
        }
        default: {
            console.log("Unknown API path", path);
            throw new Error("Unknown API path");
        }
    }

    let uploaded = await uploadPhotoToS3(imageKey, fileContent);
    return { uploaded, imageKey: uploaded ? imageKey : undefined };
};

function getImageKey(imageName, extension) {
    return extension ? `${imageName}.${extension}` : imageName;
}

async function uploadPhotoToS3(imageKey, imageContent) {
    try {
        await s3.putObject({
            Bucket: "my-pictures-udith",
            Key: imageKey,
            Body: imageContent,
            Metadata: {}
        }).promise();
        console.log("Successfully uploaded image", imageKey);
        return true;

    } catch (err) {
        console.log("Failed to upload image", imageKey, err);
        return false;
    };
}