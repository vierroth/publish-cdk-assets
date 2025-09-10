import path from "path";
import {
	Manifest,
	AssetManifestProperties,
	NestedCloudAssemblyProperties,
	ArtifactType,
} from "aws-cdk-lib/cloud-assembly-schema";

import { Asset } from "./interfaces";

export function getNestedAssets(manifestPath: string) {
	const assets = new Map<string, Asset>();

	const { artifacts } = Manifest.loadAssemblyManifest(
		path.join(manifestPath, "manifest.json"),
	);

	for (var artifactKey in artifacts) {
		const artifact = artifacts[artifactKey];

		if (artifact.type === ArtifactType.ASSET_MANIFEST) {
			const properties = artifact.properties as AssetManifestProperties;

			const { files } = Manifest.loadAssetManifest(
				path.join(manifestPath, properties.file),
			);

			for (var fileKey in files) {
				const file = files[fileKey];

				const asset = assets.get(fileKey) || {
					source: {
						...file.source,
						path: file.source.path
							? path.isAbsolute(file.source.path)
								? file.source.path
								: path.join(manifestPath, file.source.path)
							: undefined,
					},
					destinations: [],
				};
				asset.destinations.push(
					...Object.entries(file.destinations).map(([, value]) => value),
				);
				assets.set(fileKey, asset);
			}
		} else if (artifact.type === ArtifactType.NESTED_CLOUD_ASSEMBLY) {
			const properties = artifact.properties as NestedCloudAssemblyProperties;

			getNestedAssets(
				path.isAbsolute(properties.directoryName)
					? properties.directoryName
					: path.join(manifestPath, properties.directoryName),
			).forEach((file, fileKey) => {
				const asset = assets.get(fileKey) || {
					source: {
						...file.source,
						path: file.source.path
							? path.isAbsolute(file.source.path)
								? file.source.path
								: path.join(manifestPath, file.source.path)
							: undefined,
					},
					destinations: [],
				};
				asset.destinations.push(
					...Object.entries(file.destinations).map(([, value]) => value),
				);
				assets.set(fileKey, asset);
			});
		}
	}

	return assets;
}
