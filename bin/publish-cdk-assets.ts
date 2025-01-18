#!/usr/bin/env node
import path from "path";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

import { getNestedAssets } from "./../src";
import { publishAssets } from "./../src";

require("yargs")
  .command(
    "* <path>",
    "Publish CDK assets listed in manifest.json at <path>",
    {
      r: {
        alias: ["region"],
        type: "string",
        default: process.env.AWS_REGION,
      },
    },
    async (argv: any) => {
      const client = new STSClient({});
      const [, partition, , , account] = (
        await client.send(new GetCallerIdentityCommand({}))
      ).Arn!.split(":");

      await publishAssets(
        getNestedAssets(path.resolve(argv.path)),
        partition,
        account,
        argv.region,
      );
    },
  )
  .command(
    "ls <path>",
    "List all CDK assets found in manifest.json at <path>",
    {},
    async (argv: any) => {
      getNestedAssets(path.resolve(argv.path)).forEach((asset, assetKey) => {
        console.log(assetKey);
        console.log(asset.source.path);
      });
    },
  )
  .help()
  .alias("help", "h").argv;
