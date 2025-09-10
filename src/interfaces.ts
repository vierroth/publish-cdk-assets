import { FileSource, FileDestination } from "aws-cdk-lib/cloud-assembly-schema";

export interface Source extends FileSource {
	path?: string;
}

export interface Asset {
	source: Source;
	destinations: FileDestination[];
}
