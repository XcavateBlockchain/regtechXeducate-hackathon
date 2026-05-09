import { S3Client } from "@aws-sdk/client-s3";
import { appEnv } from "@/constants/app-env";

export const s3 = new S3Client({
  region: appEnv.XCAV_AWS_REGION,
  credentials: {
    accessKeyId: appEnv.AWS_S3_ACCESS_KEY,
    secretAccessKey: appEnv.AWS_S3_SECRET_ACCESS_KEY,
  },
});
