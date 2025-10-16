export function generateAccountNumbers(userId: string) {
  // Use user ID as seed for consistent but unique numbers
  const seed = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)

  // Generate Vertragskonto (9 digits)
  const vertragskonto = (400000000 + ((seed * 123456) % 600000000)).toString().slice(0, 9)

  // Generate Zählernummer (13 characters: 1EFR + 10 digits)
  const zahlerBase = (1000000000 + ((seed * 987654) % 9000000000)).toString().slice(0, 10)
  const zahlernummer = `1EFR${zahlerBase}`

  // Generate Marktlokations-ID (11 digits)
  const marktlokation = (50000000000 + ((seed * 456789) % 50000000000)).toString().slice(0, 11)

  return {
    vertragskonto,
    zahlernummer,
    marktlokation,
  }
}
