export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <img src="/eon-logo.svg" alt="E.ON Logo" className="h-8" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="bg-[#E8F5E9] border-l-4 border-[#4CAF50] p-8 rounded-lg mb-6">
            <h1 className="text-2xl font-bold mb-4 text-black">E-Mail bestätigen</h1>
            <p className="text-gray-700 leading-relaxed">
              Wir haben Ihnen eine E-Mail mit einem Bestätigungslink gesendet. Bitte klicken Sie auf den Link, um Ihr
              Konto zu aktivieren.
            </p>
          </div>

          <p className="text-sm text-gray-600">
            Keine E-Mail erhalten? Überprüfen Sie Ihren Spam-Ordner oder versuchen Sie es erneut.
          </p>
        </div>
      </main>
    </div>
  )
}
