import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import stream from 'stream';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const rawEmail = process.env.GOOGLE_CLIENT_EMAIL || '';
    const rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
    const rawFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

    const stripQuotes = (val: string) => {
      if (val && val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1);
      if (val && val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
      return val;
    };

    const GOOGLE_CLIENT_EMAIL = stripQuotes(rawEmail);
    const GOOGLE_PRIVATE_KEY = stripQuotes(rawKey);
    const GOOGLE_DRIVE_FOLDER_ID = stripQuotes(rawFolderId);

    if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Google credentials not configured on server. Please check your .env.local file.' }, { status: 500 });
    }

    // Fix the private key formatting if it was copied with literal \n
    let formattedPrivateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: formattedPrivateKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Convert Next.js File object to a Node.js readable stream
    const buffer = Buffer.from(await file.arrayBuffer());
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    // Prepare API body
    const requestBody: any = {
      name: file.name,
    };
    
    // Only set parents if we have a valid ID string
    if (GOOGLE_DRIVE_FOLDER_ID && GOOGLE_DRIVE_FOLDER_ID.trim() !== '') {
      requestBody.parents = [GOOGLE_DRIVE_FOLDER_ID];
    }

    // Upload to Google Drive!
    const response = await drive.files.create({
      requestBody,
      media: {
        mimeType: file.type || 'application/octet-stream',
        body: bufferStream,
      },
      // Request these fields back from Google Drive once uploaded
      fields: 'id, name, webViewLink, webContentLink',
    });

    return NextResponse.json({
      success: true,
      file: response.data
    });
  } catch (error: any) {
    console.error('Google Drive Upload Error:', error);
    
    let errorMessage = error.message || 'Failed to upload to Google Drive';
    if (error.code === 403 || error.status === 403) {
       errorMessage = '403 Forbidden: Ensure the Google Drive API is enabled in Google Cloud AND the service account email (' + process.env.GOOGLE_CLIENT_EMAIL + ') is added as an Editor to the Google Drive folder. Original error: ' + errorMessage;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
