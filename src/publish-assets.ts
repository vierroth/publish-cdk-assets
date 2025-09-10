import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { zip } from "zip-a-folder";

import { Asset } from "./interfaces";
import { Upload } from "@aws-sdk/lib-storage";

export async function publishAsset(
	key: string,
	asset: Asset,
	partition: string,
	account: string,
	region: string,
) {
	console.log(`Publishing ${key}`);

	try {
		if (asset.source.packaging === "zip") {
			console.log(`Compressing ${key}`);
			await zip(asset.source.path!, `${asset.source.path}.zip`);
			asset.source.path = `${asset.source.path}.zip`;
		}

		console.log(`Uploading ${key}`);

		const promises: Promise<any>[] = [];

		asset.destinations.forEach((destination) => {
			const bucketName = destination.bucketName
				.replaceAll("${AWS::Partition}", partition)
				.replaceAll("${AWS::Region}", destination.region || region)
				.replaceAll("${AWS::AccountId}", account);
			const assumeRoleArn = destination
				.assumeRoleArn!.replaceAll("${AWS::Partition}", partition)
				.replaceAll("${AWS::Region}", destination.region || region)
				.replaceAll("${AWS::AccountId}", account);

			const fileStream = fs.createReadStream(asset.source.path!);

			const credentials = fromTemporaryCredentials({
				params: {
					RoleArn: assumeRoleArn,
					RoleSessionName: `upload-cdk-asset-${key}`.substring(0, 64),
					DurationSeconds: 900,
				},
			});

			promises.push(
				new Upload({
					client: new S3Client({
						region: destination.region || region,
						credentials: credentials,
					}),
					params: {
						Bucket: bucketName,
						Key: destination.objectKey,
						Body: fileStream,
					},
					queueSize: 4,
					leavePartsOnError: true,
				}).done(),
			);
		});

		await Promise.all(promises);

		console.log(`Published ${key}`);
	} catch (error) {
		console.log(`Error publishing ${key}`);
		throw error;
	}
}

export async function publishAssets(
	assets: Map<string, Asset>,
	partition: string,
	account: string,
	region: string,
) {
	const promises: Promise<any>[] = [];

	for (var [assetKey, asset] of assets.entries()) {
		promises.push(publishAsset(assetKey, asset, partition, account, region));
	}

	await Promise.all(promises);
}
