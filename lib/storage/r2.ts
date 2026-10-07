import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface UploadResult {
  url: string;
  key: string;
}

function getR2Client() {
  const accountId  = process.env.R2_ACCOUNT_ID;
  const accessKeyId     = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/** Upload a raw Buffer directly to R2 */
export async function uploadAudioBuffer(
  buffer: Buffer,
  userId: string,
  filename?: string,
  contentType = "audio/mpeg"
): Promise<UploadResult> {
  const bucket    = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;
  const s3        = getR2Client();

  if (!s3 || !bucket || !publicUrl) {
    // Dev fallback — return a data URL
    const b64 = buffer.toString("base64");
    return {
      url: `data:${contentType};base64,${b64}`,
      key: `dev/${userId}/${filename ?? `${Date.now()}.mp3`}`,
    };
  }

  const key = `generations/${userId}/${filename ?? `${Date.now()}.mp3`}`;

  await s3.send(
    new PutObjectCommand({
      Bucket:      bucket,
      Key:         key,
      Body:        buffer,
      ContentType: contentType,
    })
  );

  return {
    url: `${publicUrl.replace(/\/$/, "")}/${key}`,
    key,
  };
}

export async function uploadAudioFromUrl(
  sourceUrl: string,
  userId: string,
  filename?: string
): Promise<UploadResult> {
  const bucket    = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;
  const s3        = getR2Client();

  // Dev / unconfigured fallback — return source URL unchanged
  if (!s3 || !bucket || !publicUrl) {
    return {
      url: sourceUrl,
      key: `dev/${userId}/${filename ?? `${Date.now()}.mp3`}`,
    };
  }

  const audioRes = await fetch(sourceUrl);
  if (!audioRes.ok) throw new Error(`Failed to fetch audio: ${audioRes.statusText}`);
  const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

  const key = `generations/${userId}/${filename ?? `${Date.now()}.mp3`}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: audioBuffer,
      ContentType: "audio/mpeg",
    })
  );

  return {
    url: `${publicUrl.replace(/\/$/, "")}/${key}`,
    key,
  };
}
