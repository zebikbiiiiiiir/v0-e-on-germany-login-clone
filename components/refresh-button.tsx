"use client"

export function RefreshButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="bg-[#E20015] hover:bg-[#C00012] text-white font-bold py-3 px-6 rounded-lg transition-colors"
    >
      Refresh Page
    </button>
  )
}
