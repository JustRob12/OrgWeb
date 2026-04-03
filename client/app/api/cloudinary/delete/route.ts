import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { public_id, resource_type = 'image' } = await request.json();

    if (!public_id) {
      return NextResponse.json({ error: 'No public_id provided' }, { status: 400 });
    }

    const cloudinaryUrl = process.env.CLOUDINARY_URL || '';
    if (!cloudinaryUrl.startsWith('cloudinary://')) {
      return NextResponse.json({ error: 'Cloudinary URL not configured.' }, { status: 500 });
    }

    // Parse cloudinary://API_KEY:API_SECRET@CLOUD_NAME
    const url = new URL(cloudinaryUrl);
    const api_key = url.username;
    const api_secret = url.password;
    const cloud_name = url.hostname;

    if (!api_key || !api_secret || !cloud_name) {
      return NextResponse.json({ error: 'Invalid Cloudinary URL configuration.' }, { status: 500 });
    }

    // Generate SHA1 Signature
    const timestamp = Math.round((new Date).getTime() / 1000);
    const signatureText = `public_id=${public_id}&timestamp=${timestamp}${api_secret}`;
    const signature = crypto.createHash('sha1').update(signatureText).digest('hex');

    // POST to Cloudinary Destroy API
    const formData = new FormData();
    formData.append('public_id', public_id);
    formData.append('api_key', api_key);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);

    // Helper function to try deleting with a specific resource type
    const tryDestroy = async (type: string) => {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/${type}/destroy`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    };

    // Since 'auto' upload can classify files unexpectedly (e.g. PDFs as images),
    // we should try the requested resource type first, then fallback to others if 'not found'.
    const typesToTry = [resource_type, resource_type === 'image' ? 'raw' : 'image', 'video'];
    
    let lastError = null;
    let successData = null;

    for (const type of typesToTry) {
      const response = await tryDestroy(type);
      if (response.ok && response.data.result === 'ok') {
        successData = response.data;
        break; // Successfully deleted
      }
      if (!response.ok) {
        lastError = response; // Only record structural errors, not 'not found'
      }
    }

    if (!successData && lastError) {
      return NextResponse.json({ error: lastError.data?.error?.message || 'Failed to delete on Cloudinary' }, { status: lastError.status });
    }

    // It either deleted or didn't exist anywhere (already deleted). 
    return NextResponse.json({ success: true, result: successData ? successData.result : 'not found' });

  } catch (error: any) {
    console.error('Cloudinary Deletion Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
