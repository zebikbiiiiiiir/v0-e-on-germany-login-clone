export interface GermanProfile {
  fullName: string
  firstName: string
  lastName: string
  street: string
  houseNumber: string
  postalCode: string
  city: string
  fullAddress: string
}

// Comprehensive lists of real German names and locations
const GERMAN_FIRST_NAMES = [
  "Benno",
  "Klaus",
  "Hans",
  "Peter",
  "Michael",
  "Thomas",
  "Andreas",
  "Stefan",
  "Markus",
  "Christian",
  "Daniel",
  "Sebastian",
  "Alexander",
  "Matthias",
  "Martin",
  "Frank",
  "Jürgen",
  "Rainer",
  "Dieter",
  "Wolfgang",
  "Helmut",
  "Bernd",
  "Uwe",
  "Anna",
  "Maria",
  "Elisabeth",
  "Petra",
  "Sabine",
  "Monika",
  "Gabriele",
  "Andrea",
  "Susanne",
  "Karin",
  "Martina",
  "Claudia",
  "Birgit",
  "Angelika",
  "Heike",
  "Ute",
  "Ingrid",
  "Renate",
  "Christa",
  "Gisela",
  "Ursula",
  "Brigitte",
  "Helga",
  "Erika",
]

const GERMAN_LAST_NAMES = [
  "Albuschkat",
  "Müller",
  "Schmidt",
  "Schneider",
  "Fischer",
  "Weber",
  "Meyer",
  "Wagner",
  "Becker",
  "Schulz",
  "Hoffmann",
  "Schäfer",
  "Koch",
  "Bauer",
  "Richter",
  "Klein",
  "Wolf",
  "Schröder",
  "Neumann",
  "Schwarz",
  "Zimmermann",
  "Braun",
  "Krüger",
  "Hofmann",
  "Hartmann",
  "Lange",
  "Schmitt",
  "Werner",
  "Schmitz",
  "Krause",
  "Meier",
  "Lehmann",
  "Schmid",
  "Schulze",
  "Maier",
  "Köhler",
  "Herrmann",
  "König",
  "Walter",
  "Mayer",
  "Huber",
  "Kaiser",
  "Fuchs",
  "Peters",
  "Lang",
  "Scholz",
  "Möller",
  "Weiß",
]

const GERMAN_STREET_NAMES = [
  "Straße der Einheit",
  "Hauptstraße",
  "Bahnhofstraße",
  "Gartenstraße",
  "Schulstraße",
  "Kirchstraße",
  "Dorfstraße",
  "Bergstraße",
  "Waldstraße",
  "Lindenstraße",
  "Marktstraße",
  "Schillerstraße",
  "Goethestraße",
  "Mozartstraße",
  "Beethovenstraße",
  "Kantstraße",
  "Friedrichstraße",
  "Wilhelmstraße",
  "Bismarckstraße",
  "Kaiserstraße",
  "Königstraße",
  "Parkstraße",
  "Rosenstraße",
  "Blumenstraße",
  "Sonnenstraße",
  "Talstraße",
  "Ringstraße",
  "Am Markt",
  "Am Bahnhof",
  "Am Park",
  "An der Kirche",
  "Unter den Linden",
  "Neue Straße",
]

const GERMAN_CITIES = [
  { name: "Tambach-Dietharz", postalCode: "99897" },
  { name: "Berlin", postalCode: "10115" },
  { name: "Hamburg", postalCode: "20095" },
  { name: "München", postalCode: "80331" },
  { name: "Köln", postalCode: "50667" },
  { name: "Frankfurt am Main", postalCode: "60311" },
  { name: "Stuttgart", postalCode: "70173" },
  { name: "Düsseldorf", postalCode: "40210" },
  { name: "Dortmund", postalCode: "44135" },
  { name: "Essen", postalCode: "45127" },
  { name: "Leipzig", postalCode: "04109" },
  { name: "Bremen", postalCode: "28195" },
  { name: "Dresden", postalCode: "01067" },
  { name: "Hannover", postalCode: "30159" },
  { name: "Nürnberg", postalCode: "90402" },
  { name: "Duisburg", postalCode: "47051" },
  { name: "Bochum", postalCode: "44787" },
  { name: "Wuppertal", postalCode: "42103" },
  { name: "Bielefeld", postalCode: "33602" },
  { name: "Bonn", postalCode: "53111" },
  { name: "Münster", postalCode: "48143" },
  { name: "Karlsruhe", postalCode: "76133" },
  { name: "Mannheim", postalCode: "68159" },
  { name: "Augsburg", postalCode: "86150" },
  { name: "Wiesbaden", postalCode: "65183" },
  { name: "Gelsenkirchen", postalCode: "45879" },
  { name: "Mönchengladbach", postalCode: "41061" },
  { name: "Braunschweig", postalCode: "38100" },
  { name: "Chemnitz", postalCode: "09111" },
  { name: "Kiel", postalCode: "24103" },
  { name: "Aachen", postalCode: "52062" },
  { name: "Halle (Saale)", postalCode: "06108" },
  { name: "Magdeburg", postalCode: "39104" },
  { name: "Freiburg im Breisgau", postalCode: "79098" },
  { name: "Krefeld", postalCode: "47798" },
  { name: "Lübeck", postalCode: "23552" },
  { name: "Oberhausen", postalCode: "46045" },
  { name: "Erfurt", postalCode: "99084" },
  { name: "Mainz", postalCode: "55116" },
  { name: "Rostock", postalCode: "18055" },
]

/**
 * Simple hash function to convert string to number
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Deterministic random selection from array based on seed
 */
function selectFromArray<T>(array: T[], seed: number, offset = 0): T {
  const index = (seed + offset) % array.length
  return array[index]
}

/**
 * Generate a deterministic German profile based on user ID
 * Same user ID will always generate the same profile
 */
export function generateGermanProfile(userId: string): GermanProfile {
  const hash = hashString(userId)

  // Generate name components
  const firstName = selectFromArray(GERMAN_FIRST_NAMES, hash, 0)
  const lastName = selectFromArray(GERMAN_LAST_NAMES, hash, 1)
  const fullName = `${firstName} ${lastName}`

  // Generate address components
  const street = selectFromArray(GERMAN_STREET_NAMES, hash, 2)
  const houseNumber = String(1 + (hash % 199)) // House numbers 1-199
  const city = selectFromArray(GERMAN_CITIES, hash, 3)

  const fullAddress = `${street} ${houseNumber}, ${city.postalCode} ${city.name}`

  return {
    fullName,
    firstName,
    lastName,
    street,
    houseNumber,
    postalCode: city.postalCode,
    city: city.name,
    fullAddress,
  }
}
