export function extractNameFromEmail(email: string): { fullName: string; isValid: boolean } {
  if (!email || !email.includes("@")) {
    return { fullName: "", isValid: false }
  }

  const localPart = email.split("@")[0]
  const cleaned = localPart.replace(/[0-9]/g, "").replace(/[^a-zA-Z._-]/g, "")
  const parts = cleaned.split(/[._-]/).filter((part) => part.length > 0)
  const validParts = parts.filter((part) => part.length >= 2 && /^[a-zA-Z]+$/.test(part))

  if (validParts.length === 0) {
    return { fullName: "", isValid: false }
  }

  const capitalizedParts = validParts.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
  const fullName = capitalizedParts.join(" ")

  const isValid = validParts.length >= 1 && fullName.length >= 2 && fullName.length <= 50

  return { fullName, isValid }
}
