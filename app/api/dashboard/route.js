import { google } from "googleapis";

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: "Sheet1!A:E",
    });

    const rows = res.data.values || [];

    const data = rows.slice(1).map(row => ({
      name: row[0],
      phone: row[1],
      date: row[2],
      time: row[3],
      status: row[4],
    }));

    const total = data.length;
    const booked = data.filter(d => d.status === "Booked").length;
    const pending = data.filter(d => d.status === "Pending").length;

    return Response.json({
      bookings: data,
      stats: {
        total,
        booked,
        pending,
        score: total ? Math.round((booked / total) * 100) : 0,
      },
    });

  } catch (err) {
    return Response.json({ error: err.message });
  }
}