import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const billId = searchParams.get("billId")

  if (!billId) {
    return NextResponse.json({ error: "Bill ID required" }, { status: 400 })
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: bill } = await supabase.from("bills").select("*").eq("id", billId).eq("user_id", user.id).single()

  if (!bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 })
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Rechnung ${bill.bill_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; color: #000; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 3px solid #E20015; padding-bottom: 20px; }
          .logo { font-size: 32px; font-weight: bold; color: #E20015; }
          .invoice-title { font-size: 24px; font-weight: bold; margin-bottom: 30px; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 14px; font-weight: bold; color: #666; margin-bottom: 10px; text-transform: uppercase; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .info-item { margin-bottom: 15px; }
          .info-label { font-size: 12px; color: #666; margin-bottom: 5px; }
          .info-value { font-size: 14px; font-weight: 600; }
          .amount-box { background: #F5F5F5; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; }
          .amount-label { font-size: 14px; color: #666; margin-bottom: 10px; }
          .amount-value { font-size: 36px; font-weight: bold; color: #E20015; }
          .details-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .details-table th { background: #F5F5F5; padding: 12px; text-align: left; font-size: 12px; color: #666; text-transform: uppercase; }
          .details-table td { padding: 12px; border-bottom: 1px solid #E5E5E5; font-size: 14px; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #E5E5E5; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">E.ON</div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: #666;">E.ON Energie Deutschland GmbH</div>
            <div style="font-size: 12px; color: #666;">Brienner Straße 40</div>
            <div style="font-size: 12px; color: #666;">80333 München</div>
          </div>
        </div>

        <div class="invoice-title">Rechnung ${bill.bill_number}</div>

        <div class="section">
          <div class="section-title">Kundeninformationen</div>
          <div class="info-item">
            <div class="info-label">Name</div>
            <div class="info-value">${profile?.full_name || user.email}</div>
          </div>
          <div class="info-item">
            <div class="info-label">E-Mail</div>
            <div class="info-value">${user.email}</div>
          </div>
          ${
            profile?.address
              ? `
          <div class="info-item">
            <div class="info-label">Adresse</div>
            <div class="info-value">${profile.address}</div>
            <div class="info-value">${profile.postal_code || ""} ${profile.city || ""}</div>
          </div>
          `
              : ""
          }
        </div>

        <div class="amount-box">
          <div class="amount-label">Rechnungsbetrag</div>
          <div class="amount-value">€${Number(bill.amount).toFixed(2)}</div>
        </div>

        <div class="section">
          <div class="section-title">Rechnungsdetails</div>
          <table class="details-table">
            <thead>
              <tr>
                <th>Beschreibung</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Rechnungsnummer</td>
                <td>${bill.bill_number}</td>
              </tr>
              <tr>
                <td>Rechnungsdatum</td>
                <td>${new Date(bill.bill_date).toLocaleDateString("de-DE")}</td>
              </tr>
              <tr>
                <td>Fälligkeitsdatum</td>
                <td>${new Date(bill.due_date).toLocaleDateString("de-DE")}</td>
              </tr>
              <tr>
                <td>Typ</td>
                <td>${bill.bill_type === "electricity" ? "Strom" : bill.bill_type === "gas" ? "Gas" : bill.bill_type === "water" ? "Wasser" : "Sonstiges"}</td>
              </tr>
              ${
                bill.consumption_kwh
                  ? `
              <tr>
                <td>Verbrauch</td>
                <td>${bill.consumption_kwh} kWh</td>
              </tr>
              `
                  : ""
              }
              ${
                bill.period_start && bill.period_end
                  ? `
              <tr>
                <td>Abrechnungszeitraum</td>
                <td>${new Date(bill.period_start).toLocaleDateString("de-DE")} - ${new Date(bill.period_end).toLocaleDateString("de-DE")}</td>
              </tr>
              `
                  : ""
              }
              <tr>
                <td>Status</td>
                <td>${bill.status === "paid" ? "Bezahlt" : bill.status === "pending" ? "Ausstehend" : bill.status === "overdue" ? "Überfällig" : "Storniert"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>© 2025 E.ON Energie Deutschland GmbH</p>
          <p style="margin-top: 10px;">Diese Rechnung wurde elektronisch erstellt und ist ohne Unterschrift gültig.</p>
        </div>
      </body>
    </html>
  `

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  })
}
