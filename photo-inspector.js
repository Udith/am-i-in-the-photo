const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const rekognition = new AWS.Rekognition();
const s3 = new AWS.S3();
const { USER_IMAGE_PREFIX } = require('./Constants.js');

exports.handler = async (event) => {

    let userImage = await getUserImage();

    let images = (event.Records || []).map(record => {
        return {
            bucketName: record.s3.bucket.name,
            imageKey: record.s3.object.key
        };
    })

    await Promise.all(images.map(image => compareImage(userImage, image)));

    return true;
};

async function getUserImage() {
    try {
        console.log("Retrieving user image name");
        let data = await s3.listObjects({
            Bucket: "my-pictures-udith",
            MaxKeys: 1,
            Prefix: USER_IMAGE_PREFIX
        }).promise();

        let contents = data.Contents || [];
        if (contents.length > 0) {
            return {
                bucketName: data.Name,
                imageKey: contents[0].Key
            };
        } else {
            throw new Error("User image not found");
        }

    } catch (err) {
        console.log("Failed to retrieve user image name", err);
        throw err;
    };
}

async function compareImage(userImage, newImage) {
    try {
        console.log("Comparing images", `${userImage.bucketName}/${userImage.imageKey}`, `${newImage.bucketName}/${newImage.imageKey}`);
        let data = await rekognition.compareFaces({
            SourceImage: {
                S3Object: {
                    Bucket: userImage.bucketName,
                    Name: userImage.imageKey
                }
            },
            TargetImage: {
                S3Object: {
                    Bucket: newImage.bucketName,
                    Name: newImage.imageKey
                }
            }
        }).promise();

        let userInImage = (data.FaceMatches.length > 0);
        if (userInImage) {
            console.log("User is present in the image. Updating DDB table");
            try {
                let data = await ddb.put({
                    TableName: "PicturesIamIn",
                    Item: {
                        imageKey: newImage.imageKey,
                        timestamp: Date.now()
                    }
                }).promise();

            } catch (err) {
                console.log("Failed to update DDB table", err);
                throw err;
            };

        } else {
            console.log("User is not in the image");
        }

    } catch (err) {
        console.log("Failed to compare images", userImage.imageKey, newImage.imageKey);
        throw err;
    };

}