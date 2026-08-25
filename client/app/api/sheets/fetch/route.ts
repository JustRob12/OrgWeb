import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

function extractSheetDetails(url: string) {
  // Regex for extracting sheet ID and gid
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = url.match(/[#&?]gid=([0-9]+)/);

  const sheetId = idMatch ? idMatch[1] : null;
  const gid = gidMatch ? gidMatch[1] : '0';

  return { sheetId, gid };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sheetUrl = body.url || 'https://docs.google.com/spreadsheets/d/1ddZMsmpNXSCF1BmsWf_ethCaTD_4DAyVf9ERvPgPias/edit?gid=258554365#gid=258554365';

    const { sheetId, gid } = extractSheetDetails(sheetUrl);

    if (!sheetId) {
      return NextResponse.json({ error: 'Invalid Google Sheet URL. Could not extract spreadsheet ID.' }, { status: 400 });
    }

    // 1. Try public export URL first (fastest)
    const exportCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    let csvResponse = await fetch(exportCsvUrl, { cache: 'no-store' });

    if (csvResponse.ok) {
      const csvText = await csvResponse.text();
      const workbook = XLSX.read(csvText, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      return NextResponse.json({
        success: true,
        source: 'public_export',
        sheetId,
        gid,
        totalRows: data.length,
        data,
      });
    }

    // 2. If public export fails (e.g. 401/403/302), try Service Account auth if configured
    const rawEmail = process.env.GOOGLE_CLIENT_EMAIL || '';
    const rawKey = process.env.GOOGLE_PRIVATE_KEY || '';

    const stripQuotes = (val: string) => {
      if (val && val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1);
      if (val && val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
      return val;
    };

    const clientEmail = stripQuotes(rawEmail);
    const privateKey = stripQuotes(rawKey).replace(/\\n/g, '\n');

    if (clientEmail && privateKey) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: clientEmail,
            private_key: privateKey,
          },
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/drive.readonly',
          ],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        
        // Get metadata to find sheet title corresponding to gid
        const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        let targetTitle = meta.data.sheets?.[0]?.properties?.title || 'Sheet1';

        if (gid) {
          const matchedSheet = meta.data.sheets?.find(
            (s) => String(s.properties?.sheetId) === String(gid)
          );
          if (matchedSheet && matchedSheet.properties?.title) {
            targetTitle = matchedSheet.properties.title;
          }
        }

        const sheetValues = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `${targetTitle}!A1:Z`,
        });

        const rows = sheetValues.data.values || [];
        if (rows.length === 0) {
          return NextResponse.json({ success: true, source: 'service_account', totalRows: 0, data: [] });
        }

        const headers = rows[0].map((h: string) => String(h).trim());
        const parsedData = rows.slice(1).map((row: any[]) => {
          const item: Record<string, string> = {};
          headers.forEach((header: string, colIdx: number) => {
            item[header] = row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
          });
          return item;
        });

        return NextResponse.json({
          success: true,
          source: 'service_account',
          sheetId,
          gid,
          sheetTitle: targetTitle,
          totalRows: parsedData.length,
          data: parsedData,
        });
      } catch (serviceErr: any) {
        console.error('Service account fetch failed:', serviceErr?.message || serviceErr);
      }
    }

    // 3. Return informative error if access is restricted
    return NextResponse.json(
      {
        error: 'Google Sheet access denied. Please open the Google Sheet, click Share, and set General Access to "Anyone with the link can view", or share with your service account email.',
        clientEmail: clientEmail || null,
        sheetUrl,
      },
      { status: 403 }
    );
  } catch (error: any) {
    console.error('Fetch Google Sheet API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
