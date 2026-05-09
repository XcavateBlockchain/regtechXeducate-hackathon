import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { awsUploader } from "@metaplex-foundation/umi-uploader-aws";
import { appEnv } from "@/constants/app-env";
import { s3 } from "./s3";

const umi = createUmi(appEnv.SOLANA_RPC_URL).use(
  awsUploader(s3, appEnv.AWS_S3_BUCKET_NAME),
);

export async function metadataUpload({
  name,
  description,
  file,
}: {
  file: unknown;
  name: string;
  description: string;
}) {
  const uri = await umi.uploader.uploadJson({
    name,
    description,
    image: file,
    attributes: [],
  });
  return uri;
}
