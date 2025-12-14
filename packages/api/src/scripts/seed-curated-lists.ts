/**
 * Seed Curated Lists - Generate 50+ external book lists (2020-2025)
 *
 * Run with: npx tsx src/scripts/seed-curated-lists.ts
 */

import { db } from '../db/client'
import { curatedLists, curatedListItems } from '../db/schema'
import { sql } from 'drizzle-orm'

// List type definitions
interface ListSource {
  type: string
  name: string
  logoUrl?: string
  baseUrl?: string
  description: string
  categories?: string[]
}

const LIST_SOURCES: ListSource[] = [
  {
    type: 'amazon_best',
    name: 'Amazon',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
    baseUrl: 'https://www.amazon.com/b?node=8192263011',
    description: 'Amazon editors\' picks for the best books of the year',
    categories: ['fiction', 'nonfiction', 'mystery', 'science_fiction', 'biography', 'history', 'business'],
  },
  {
    type: 'nyt_bestseller',
    name: 'New York Times',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg',
    baseUrl: 'https://www.nytimes.com/books/best-sellers/',
    description: 'The New York Times Best Sellers list',
    categories: ['fiction', 'nonfiction'],
  },
  {
    type: 'bill_gates',
    name: 'Bill Gates',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Bill_Gates_2018.jpg',
    baseUrl: 'https://www.gatesnotes.com/Books',
    description: 'Books recommended by Bill Gates',
  },
  {
    type: 'goodreads_choice',
    name: 'Goodreads',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Goodreads_logo.svg',
    baseUrl: 'https://www.goodreads.com/choiceawards',
    description: 'Goodreads Choice Awards - voted by readers',
    categories: ['fiction', 'mystery', 'fantasy', 'romance', 'science_fiction', 'horror', 'nonfiction', 'memoir', 'history', 'science'],
  },
  {
    type: 'pulitzer',
    name: 'Pulitzer Prize',
    logoUrl: 'https://www.pulitzer.org/sites/default/files/main_images/pulitzerprizes_0.png',
    baseUrl: 'https://www.pulitzer.org/prize-winners-by-category',
    description: 'Pulitzer Prize winners and finalists',
    categories: ['fiction', 'nonfiction', 'biography', 'history', 'poetry'],
  },
  {
    type: 'booker',
    name: 'Booker Prize',
    logoUrl: 'https://thebookerprizes.com/sites/default/files/styles/large/public/booker-logo.png',
    baseUrl: 'https://thebookerprizes.com/',
    description: 'The Booker Prize for Fiction',
  },
  {
    type: 'national_book',
    name: 'National Book Foundation',
    logoUrl: 'https://www.nationalbook.org/wp-content/themes/developer/images/nba-logo.svg',
    baseUrl: 'https://www.nationalbook.org/national-book-awards/',
    description: 'National Book Award winners and finalists',
    categories: ['fiction', 'nonfiction', 'poetry', 'young_adult'],
  },
  {
    type: 'oprah_book_club',
    name: "Oprah's Book Club",
    logoUrl: 'https://www.oprahdaily.com/images/oprah-book-club-logo.png',
    baseUrl: 'https://www.oprah.com/app/books.html',
    description: "Oprah Winfrey's book club selections",
  },
  {
    type: 'reese_book_club',
    name: "Reese's Book Club",
    logoUrl: 'https://reesesbookclub.com/images/logo.png',
    baseUrl: 'https://reesesbookclub.com/',
    description: "Reese Witherspoon's book club picks featuring women-centered stories",
  },
  {
    type: 'obama_reading',
    name: 'Barack Obama',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/President_Barack_Obama.jpg',
    baseUrl: 'https://barackobama.medium.com/',
    description: "Barack Obama's annual reading recommendations",
  },
  {
    type: 'time_100',
    name: 'TIME Magazine',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/TIME_logo.svg',
    baseUrl: 'https://time.com/collection/must-read-books/',
    description: 'TIME\'s list of must-read books',
  },
  {
    type: 'npr_books',
    name: 'NPR',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/National_Public_Radio_logo.svg',
    baseUrl: 'https://apps.npr.org/best-books/',
    description: 'NPR\'s Best Books of the Year',
    categories: ['fiction', 'nonfiction', 'science_fiction', 'mystery'],
  },
  {
    type: 'guardian_best',
    name: 'The Guardian',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/The_Guardian.svg',
    baseUrl: 'https://www.theguardian.com/books/best-books',
    description: 'The Guardian\'s best books of the year',
    categories: ['fiction', 'nonfiction'],
  },
  {
    type: 'economist_books',
    name: 'The Economist',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/65/The_Economist_Logo.svg',
    baseUrl: 'https://www.economist.com/culture/books-of-the-year',
    description: 'The Economist\'s Books of the Year',
  },
  {
    type: 'financial_times',
    name: 'Financial Times',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Financial_Times_corporate_logo.svg',
    baseUrl: 'https://www.ft.com/books',
    description: 'Financial Times Best Books of the Year',
    categories: ['business', 'economics', 'politics'],
  },
]

// Sample books data for each year (real books with actual ISBNs)
const BOOKS_BY_YEAR: Record<number, Array<{
  title: string
  author: string
  isbn?: string
  description?: string
  coverUrl?: string
  amazonUrl?: string
  goodreadsUrl?: string
}>> = {
  2024: [
    { title: 'The Women', author: 'Kristin Hannah', isbn: '978-1250178633', description: 'A powerful novel about women who served in the Vietnam War' },
    { title: 'James', author: 'Percival Everett', isbn: '978-0385550369', description: 'A reimagining of Huckleberry Finn from Jim\'s perspective' },
    { title: 'All Fours', author: 'Miranda July', isbn: '978-0593490181', description: 'A provocative novel about a woman\'s transformative road trip' },
    { title: 'The God of the Woods', author: 'Liz Moore', isbn: '978-0593418918', description: 'A gripping mystery set in the Adirondacks' },
    { title: 'Intermezzo', author: 'Sally Rooney', isbn: '978-0374602635', description: 'Two brothers navigate grief and love after their father\'s death' },
    { title: 'Martyr!', author: 'Kaveh Akbar', isbn: '978-0593537022', description: 'A young Iranian-American poet searches for meaning' },
    { title: 'The Ministry of Time', author: 'Kaliane Bradley', isbn: '978-1501137471', description: 'A genre-bending romance about time travel' },
    { title: 'Long Island', author: 'Colm Toibin', isbn: '978-1476785080', description: 'The sequel to Brooklyn, following Eilis decades later' },
    { title: 'The Anxious Generation', author: 'Jonathan Haidt', isbn: '978-0593655030', description: 'How smartphones rewired childhood' },
    { title: 'Supercommunicators', author: 'Charles Duhigg', isbn: '978-0593243916', description: 'The power of conversation and how to unlock it' },
  ],
  2023: [
    { title: 'Fourth Wing', author: 'Rebecca Yarros', isbn: '978-1649374042', description: 'A fantasy romance set in a dragon rider academy' },
    { title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', isbn: '978-0593321201', description: 'Two friends collaborate on video games across decades' },
    { title: 'Hello Beautiful', author: 'Ann Napolitano', isbn: '978-0593243725', description: 'A multigenerational family saga in Chicago' },
    { title: 'The Covenant of Water', author: 'Abraham Verghese', isbn: '978-0802162175', description: 'An epic spanning three generations in South India' },
    { title: 'Demon Copperhead', author: 'Barbara Kingsolver', isbn: '978-0063251922', description: 'A modern retelling of David Copperfield in Appalachia' },
    { title: 'Lessons in Chemistry', author: 'Bonnie Garmus', isbn: '978-0385547345', description: 'A female chemist becomes a TV cooking show host in the 1960s' },
    { title: 'Trust', author: 'Hernan Diaz', isbn: '978-0593420317', description: 'A puzzle of wealth, power, and narrative in 1920s New York' },
    { title: 'Spare', author: 'Prince Harry', isbn: '978-0593593806', description: 'The Duke of Sussex\'s memoir' },
    { title: 'Outlive', author: 'Peter Attia', isbn: '978-0593236598', description: 'The science and art of longevity' },
    { title: 'The Wager', author: 'David Grann', isbn: '978-0385534260', description: 'A tale of shipwreck, mutiny, and murder' },
  ],
  2022: [
    { title: 'It Ends with Us', author: 'Colleen Hoover', isbn: '978-1501110368', description: 'A romance dealing with domestic violence' },
    { title: 'Where the Crawdads Sing', author: 'Delia Owens', isbn: '978-0735219090', description: 'A murder mystery in the North Carolina marshland' },
    { title: 'Verity', author: 'Colleen Hoover', isbn: '978-1538724736', description: 'A psychological thriller about a writer\'s dark secrets' },
    { title: 'The Seven Husbands of Evelyn Hugo', author: 'Taylor Jenkins Reid', isbn: '978-1501161933', description: 'A Hollywood icon reveals her glamorous and scandalous life' },
    { title: 'Atomic Habits', author: 'James Clear', isbn: '978-0735211292', description: 'Tiny changes, remarkable results' },
    { title: 'The Light We Carry', author: 'Michelle Obama', isbn: '978-0593237465', description: 'Overcoming in uncertain times' },
    { title: 'Sea of Tranquility', author: 'Emily St. John Mandel', isbn: '978-0593321447', description: 'A novel spanning centuries and dimensions' },
    { title: 'The Maid', author: 'Nita Prose', isbn: '978-0593356159', description: 'A hotel maid with a unique perspective solves a mystery' },
    { title: 'Greenlights', author: 'Matthew McConaughey', isbn: '978-0593139134', description: 'The actor\'s unconventional memoir' },
    { title: 'Cloud Cuckoo Land', author: 'Anthony Doerr', isbn: '978-1982168438', description: 'An interconnected novel spanning centuries' },
  ],
  2021: [
    { title: 'The Midnight Library', author: 'Matt Haig', isbn: '978-0525559474', description: 'Between life and death, a library of alternate lives' },
    { title: 'Malibu Rising', author: 'Taylor Jenkins Reid', isbn: '978-1524798659', description: 'A legendary party on a California beach' },
    { title: 'The Four Winds', author: 'Kristin Hannah', isbn: '978-1250178602', description: 'An epic novel of the Dust Bowl era' },
    { title: 'Project Hail Mary', author: 'Andy Weir', isbn: '978-0593135204', description: 'A lone astronaut must save Earth' },
    { title: 'Klara and the Sun', author: 'Kazuo Ishiguro', isbn: '978-0593311295', description: 'An AI companion observes human nature' },
    { title: 'The Last Thing He Told Me', author: 'Laura Dave', isbn: '978-1501171345', description: 'A woman uncovers her husband\'s secret past' },
    { title: 'Beautiful World, Where Are You', author: 'Sally Rooney', isbn: '978-0374602604', description: 'Four young people navigate love and friendship' },
    { title: 'The Invisible Life of Addie LaRue', author: 'V.E. Schwab', isbn: '978-0765387561', description: 'A woman makes a Faustian bargain to live forever' },
    { title: 'A Promised Land', author: 'Barack Obama', isbn: '978-1524763169', description: 'Obama\'s presidential memoir' },
    { title: 'Think Again', author: 'Adam Grant', isbn: '978-1984878106', description: 'The power of knowing what you don\'t know' },
  ],
  2020: [
    { title: 'Where the Crawdads Sing', author: 'Delia Owens', isbn: '978-0735219090', description: 'A murder mystery in the North Carolina marshland' },
    { title: 'The Vanishing Half', author: 'Brit Bennett', isbn: '978-0525536291', description: 'Twin sisters choose to live in different worlds' },
    { title: 'Anxious People', author: 'Fredrik Backman', isbn: '978-1501160837', description: 'A failed bank robber takes hostages at an open house' },
    { title: 'Mexican Gothic', author: 'Silvia Moreno-Garcia', isbn: '978-0525620785', description: 'A young woman investigates her cousin\'s mysterious illness' },
    { title: 'The City We Became', author: 'N.K. Jemisin', isbn: '978-0316509848', description: 'New York City awakens as a living entity' },
    { title: 'Caste', author: 'Isabel Wilkerson', isbn: '978-0593230251', description: 'The origins of our discontents' },
    { title: 'Untamed', author: 'Glennon Doyle', isbn: '978-1984801258', description: 'A memoir of self-discovery' },
    { title: 'The Splendid and the Vile', author: 'Erik Larson', isbn: '978-0593172834', description: 'Churchill\'s first year as Prime Minister' },
    { title: 'Becoming', author: 'Michelle Obama', isbn: '978-1524763138', description: 'The former First Lady\'s memoir' },
    { title: 'Educated', author: 'Tara Westover', isbn: '978-0399590504', description: 'A memoir of survival and education' },
  ],
  2025: [
    { title: 'Wind and Truth', author: 'Brandon Sanderson', isbn: '978-0765326386', description: 'The epic conclusion to the first arc of The Stormlight Archive' },
    { title: 'Sunrise on the Reaping', author: 'Suzanne Collins', isbn: '978-1338871814', description: 'A Hunger Games prequel about Haymitch\'s Games' },
    { title: 'The Book of Bill', author: 'Alex Hirsch', isbn: '978-1368104807', description: 'The Gravity Falls tie-in from Bill Cipher\'s perspective' },
    { title: 'Onyx Storm', author: 'Rebecca Yarros', isbn: '978-1649374172', description: 'The third installment in the Empyrean series' },
    { title: 'The Women', author: 'Kristin Hannah', isbn: '978-1250178633', description: 'A powerful novel about women who served in the Vietnam War' },
    { title: 'The Atlas Complex', author: 'Olivie Blake', isbn: '978-1250855091', description: 'The conclusion to The Atlas Six trilogy' },
    { title: 'House of Flame and Shadow', author: 'Sarah J. Maas', isbn: '978-1635574104', description: 'Crescent City series continues' },
    { title: 'Counting Miracles', author: 'Nicholas Sparks', isbn: '978-0593449592', description: 'A new romance from Nicholas Sparks' },
    { title: 'Be Ready When the Luck Happens', author: 'Ina Garten', isbn: '978-0593799741', description: 'The Barefoot Contessa\'s memoir' },
    { title: 'The Anthropocene Reviewed', author: 'John Green', isbn: '978-0525555216', description: 'Essays on a human-centered planet' },
  ],
}

// Category descriptions
const CATEGORY_NAMES: Record<string, string> = {
  fiction: 'Fiction',
  nonfiction: 'Nonfiction',
  mystery: 'Mystery & Thriller',
  science_fiction: 'Science Fiction',
  fantasy: 'Fantasy',
  romance: 'Romance',
  horror: 'Horror',
  biography: 'Biography & Memoir',
  history: 'History',
  science: 'Science & Technology',
  business: 'Business & Economics',
  economics: 'Economics',
  politics: 'Politics',
  poetry: 'Poetry',
  young_adult: 'Young Adult',
  memoir: 'Memoir',
}

async function seedCuratedLists() {
  console.log('🌱 Seeding curated lists...\n')

  const years = [2020, 2021, 2022, 2023, 2024, 2025]
  let listCount = 0
  let itemCount = 0

  for (const source of LIST_SOURCES) {
    for (const year of years) {
      // Some sources have categories
      const categories = source.categories || [null]

      for (const category of categories) {
        const categoryName = category ? CATEGORY_NAMES[category] || category : null
        const title = category
          ? `${source.name} Best ${categoryName} ${year}`
          : `${source.name} Best Books ${year}`

        const subtitle = category
          ? `Top ${categoryName} picks of ${year}`
          : `Top book recommendations of ${year}`

        // Insert the list
        const [insertedList] = await db.insert(curatedLists).values({
          listType: source.type,
          title,
          subtitle,
          description: source.description,
          sourceName: source.name,
          sourceUrl: source.baseUrl,
          sourceLogoUrl: source.logoUrl,
          year,
          category,
          bookCount: 0,
          viewCount: Math.floor(Math.random() * 10000) + 1000,
          saveCount: Math.floor(Math.random() * 500) + 50,
          sortOrder: listCount,
          isFeatured: listCount < 10, // First 10 are featured
          isActive: true,
        }).returning()

        listCount++

        // Get books for this year
        const yearBooks = BOOKS_BY_YEAR[year] || BOOKS_BY_YEAR[2024]

        // Shuffle and pick 5-10 books for variety
        const shuffled = [...yearBooks].sort(() => Math.random() - 0.5)
        const selectedBooks = shuffled.slice(0, Math.floor(Math.random() * 5) + 5)

        // Insert items (all as unavailable since we don't have real book IDs)
        for (let i = 0; i < selectedBooks.length; i++) {
          const book = selectedBooks[i]
          await db.insert(curatedListItems).values({
            listId: insertedList.id,
            bookType: 'ebook',
            bookId: null, // Not available in our library
            externalTitle: book.title,
            externalAuthor: book.author,
            externalDescription: book.description,
            isbn: book.isbn,
            amazonUrl: book.amazonUrl || `https://www.amazon.com/s?k=${encodeURIComponent(book.title + ' ' + book.author)}`,
            goodreadsUrl: book.goodreadsUrl || `https://www.goodreads.com/search?q=${encodeURIComponent(book.title)}`,
            position: i + 1,
            editorNote: i === 0 ? 'Editor\'s top pick' : null,
          })
          itemCount++
        }

        // Update book count
        await db.update(curatedLists)
          .set({ bookCount: selectedBooks.length })
          .where(sql`id = ${insertedList.id}`)

        console.log(`  ✓ ${title} (${selectedBooks.length} books)`)
      }
    }
  }

  console.log(`\n✅ Created ${listCount} curated lists with ${itemCount} book items`)
}

// Run the seeder
seedCuratedLists()
  .then(() => {
    console.log('\n🎉 Seeding completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
