import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export default async function AdminVisitorsPage() {
  const supabase = createAdminClient()

  // Get all visitor activity logs
  const { data: activities } = await supabase
    .from("user_activity_log")
    .select(`
      *,
      profiles:user_id (
        email,
        full_name,
        account_number
      )
    `)
    .order("created_at", { ascending: false })
    .limit(500)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/eon-logo.svg" alt="E.ON Logo" className="h-8" />
            <span className="text-2xl font-bold text-[#E20015]">Visitor Tracking</span>
          </div>
          <a href="/admin" className="text-sm font-medium text-gray-600 hover:text-[#E20015]">
            ← Back to Dashboard
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">All Visitor Activity</h2>
            <p className="text-sm text-gray-600 mt-1">Total visits: {activities?.length || 0}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Browser</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activities?.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(activity.created_at).toLocaleDateString("de-DE")}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(activity.created_at).toLocaleTimeString("de-DE")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {activity.profiles ? (
                        <>
                          <div className="text-sm font-medium text-gray-900">{activity.profiles.full_name}</div>
                          <div className="text-xs text-gray-500">{activity.profiles.email}</div>
                          <div className="text-xs text-gray-400 font-mono">{activity.profiles.account_number}</div>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">Anonymous</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {activity.activity_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-900">{activity.ip_address}</span>
                    </td>
                    <td className="px-6 py-4">
                      {activity.location_info ? (
                        <>
                          <div className="text-sm text-gray-900">{activity.location_info.city}</div>
                          <div className="text-xs text-gray-500">
                            {activity.location_info.region}, {activity.location_info.country}
                          </div>
                          {activity.location_info.isp && (
                            <div className="text-xs text-gray-400">{activity.location_info.isp}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {activity.browser_info ? (
                        <>
                          <div className="text-sm text-gray-900">{activity.browser_info.name}</div>
                          <div className="text-xs text-gray-500">v{activity.browser_info.version}</div>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {activity.device_info ? (
                        <>
                          <div className="text-sm text-gray-900 capitalize">{activity.device_info.type}</div>
                          <div className="text-xs text-gray-500">{activity.device_info.os}</div>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {activity.flagged ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          High ({activity.risk_score})
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Low ({activity.risk_score || 0})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
