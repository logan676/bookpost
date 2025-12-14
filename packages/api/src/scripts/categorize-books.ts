/**
 * Batch Book Categorization Script
 * Analyzes existing ebooks and magazines and assigns them to categories
 *
 * Uses DeepSeek AI for intelligent categorization when DEEPSEEK_API_KEY is set,
 * falls back to keyword matching otherwise.
 *
 * Run with: npx tsx src/scripts/categorize-books.ts
 *
 * Options:
 *   --dry-run     Preview changes without writing to database
 *   --ebooks      Only categorize ebooks
 *   --magazines   Only categorize magazines
 *   --limit=N     Limit to N books
 *   --no-ai       Force keyword matching even if API key is available
 */

import 'dotenv/config'
import OpenAI from 'openai'
import { db } from '../db/client'
import { ebooks, magazines, ebookCategories, bookCategories } from '../db/schema'
import { eq, sql } from 'drizzle-orm'

// Category info type
interface CategoryInfo {
  id: number
  slug: string
  name: string
  nameEn: string | null
  description: string | null
  bookTypes: string | null
}

interface CategoryMatch {
  slug: string
  score: number
  matchedKeywords?: string[]
}

interface BookInfo {
  id: number
  title: string
  author?: string | null
  description?: string | null
}

// AI Categorization Service (DeepSeek)
class AICategorizer {
  private client: OpenAI
  private categories: CategoryInfo[]

  constructor(categories: CategoryInfo[]) {
    this.client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
    })
    this.categories = categories
  }

  async categorize(book: BookInfo, bookType: 'ebook' | 'magazine'): Promise<CategoryMatch[]> {
    const applicableCategories = this.categories.filter(c =>
      c.bookTypes?.includes(bookType)
    )

    const categoryList = applicableCategories.map(c =>
      `- ${c.slug}: ${c.name} (${c.nameEn || ''}) - ${c.description || ''}`
    ).join('\n')

    const bookInfo = [
      `Title: ${book.title}`,
      book.author ? `Author: ${book.author}` : null,
      book.description ? `Description: ${book.description.slice(0, 500)}` : null,
    ].filter(Boolean).join('\n')

    try {
      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `You are a book categorization expert. Analyze this book and select the most appropriate categories.

Book Information:
${bookInfo}

Available Categories:
${categoryList}

Return ONLY a JSON array of category slugs (1-3 categories), ordered by relevance. Most relevant first.
Example: ["fiction", "mystery", "psychology"]

Your response must be ONLY the JSON array, nothing else.`
        }]
      })

      // Parse response
      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('Empty response from DeepSeek')
      }

      const slugs: string[] = JSON.parse(content.trim())

      // Convert to CategoryMatch format with scores
      return slugs.slice(0, 3).map((slug, index) => ({
        slug,
        score: 100 - (index * 20), // First = 100, Second = 80, Third = 60
      }))

    } catch (error) {
      console.error(`  AI categorization failed: ${error}`)
      return []
    }
  }
}

// Keyword-based Categorization (fallback)
const KEYWORD_CATEGORY_MAP: Record<string, string[]> = {
  'fiction': ['小说', '长篇', '短篇', 'novel', 'fiction', '故事'],
  'mystery': ['悬疑', '推理', '侦探', '案件', '凶手', '谋杀', '密室', '东野圭吾', '阿加莎', 'mystery', 'detective', 'thriller', '福尔摩斯', 'sherlock'],
  'sci-fi': ['科幻', '星际', '太空', '机器人', '未来', '外星', '三体', '刘慈欣', 'sci-fi', 'science fiction', '赛博朋克', 'cyberpunk'],
  'fantasy': ['奇幻', '魔法', '魔幻', '巫师', '龙', '精灵', '剑与魔法', 'fantasy', 'magic', '托尔金', '哈利波特', '指环王'],
  'romance': ['言情', '爱情', '浪漫', '情感', '恋爱', 'romance', 'love story', '琼瑶', '婚姻'],
  'literature': ['文学', '散文', '诗歌', '诗集', '随笔', '杂文', '文集', 'literature', 'essay', 'poetry', '鲁迅', '茅盾', '巴金'],
  'history': ['历史', '朝代', '帝国', '王朝', '革命', '古代', '近代', '明朝', '清朝', '汉朝', '唐朝', 'history', 'historical'],
  'philosophy': ['哲学', '思想', '伦理', '存在主义', '形而上学', '逻辑', 'philosophy', '尼采', '柏拉图', '亚里士多德', '康德'],
  'psychology': ['心理学', '心理', '精神分析', '认知', '行为', '情绪', '抑郁', '焦虑', 'psychology', 'mental', '弗洛伊德', '荣格'],
  'technology': ['技术', '编程', '计算机', '软件', '代码', '开发', '算法', '数据结构', 'python', 'java', 'javascript', 'technology', 'programming', 'computer', '人工智能', 'AI', '机器学习'],
  'science': ['科学', '物理', '化学', '生物', '数学', '科普', '量子', '进化', '宇宙', '天文', 'science', 'physics', 'chemistry', 'biology'],
  'economics': ['经济', '经济学', '金融', '投资', '股票', '货币', '市场', 'economics', 'economy', 'finance', 'investment'],
  'business': ['商业', '管理', '营销', '创业', '企业', 'MBA', '领导力', '战略', 'business', 'management', 'marketing', 'startup', 'entrepreneur'],
  'art': ['艺术', '绘画', '设计', '摄影', '美术', '建筑', '音乐', '电影', 'art', 'design', 'photography', 'architecture', 'music'],
  'biography': ['传记', '自传', '回忆录', '人物', '生平', '一生', 'biography', 'autobiography', 'memoir'],
  'self-help': ['自我提升', '成长', '成功', '习惯', '高效', '时间管理', '思维', 'self-help', 'self-improvement', 'success', 'habit', 'productivity'],
  'travel': ['旅游', '旅行', '游记', '指南', '攻略', '目的地', 'travel', 'guide', 'trip'],
  'fashion': ['时尚', '潮流', '服装', '穿搭', '美妆', '时装', 'fashion', 'style', 'beauty', 'vogue'],
  'lifestyle': ['生活', '家居', '装修', '美食', '烹饪', '园艺', '手工', 'lifestyle', 'home', 'cooking', 'recipe', 'DIY'],
  'health': ['健康', '养生', '医学', '医疗', '保健', '疾病', '营养', '健身', '运动', 'health', 'medical', 'fitness', 'nutrition', 'wellness'],
  'education': ['教育', '学习', '教学', '课程', '学校', '考试', '培训', 'education', 'learning', 'teaching', 'school'],
  'children': ['儿童', '童书', '绘本', '少儿', '亲子', '幼儿', '青少年', 'children', 'kids', 'picture book', '童话'],
}

const CATEGORY_PRIORITY: Record<string, number> = {
  'mystery': 3, 'sci-fi': 3, 'fantasy': 3, 'romance': 3,
  'fiction': 2, 'literature': 2, 'history': 2, 'philosophy': 2, 'psychology': 2,
  'technology': 2, 'science': 2, 'economics': 2, 'business': 2, 'art': 2,
  'biography': 2, 'self-help': 2, 'travel': 2, 'fashion': 2, 'lifestyle': 2,
  'health': 2, 'education': 2, 'children': 2,
}

function keywordCategorize(book: BookInfo): CategoryMatch[] {
  const textToAnalyze = [book.title, book.author, book.description].filter(Boolean).join(' ').toLowerCase()
  const matches: CategoryMatch[] = []

  for (const [slug, keywords] of Object.entries(KEYWORD_CATEGORY_MAP)) {
    const matchedKeywords: string[] = []
    let score = 0

    for (const keyword of keywords) {
      if (textToAnalyze.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword)
        score += keyword.length + 5
      }
    }

    if (matchedKeywords.length > 0) {
      score *= (CATEGORY_PRIORITY[slug] || 1)
      matches.push({ slug, score, matchedKeywords })
    }
  }

  return matches.sort((a, b) => b.score - a.score)
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const ebooksOnly = args.includes('--ebooks')
  const magazinesOnly = args.includes('--magazines')
  const noAi = args.includes('--no-ai')
  const limitArg = args.find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

  // Check for AI capability
  const hasApiKey = !!process.env.DEEPSEEK_API_KEY
  const useAi = hasApiKey && !noAi

  console.log('='.repeat(60))
  console.log('Book Categorization Script')
  console.log('='.repeat(60))
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`)
  console.log(`Categorization: ${useAi ? '🤖 AI (DeepSeek)' : '📝 Keyword Matching'}`)
  if (!hasApiKey) console.log(`  (Set DEEPSEEK_API_KEY for AI categorization)`)
  if (limit) console.log(`Limit: ${limit} books`)
  console.log('')

  // Load categories from database
  const categories = await db.select({
    id: ebookCategories.id,
    slug: ebookCategories.slug,
    name: ebookCategories.name,
    nameEn: ebookCategories.nameEn,
    description: ebookCategories.description,
    bookTypes: ebookCategories.bookTypes,
  }).from(ebookCategories)

  const categoryBySlug = new Map(categories.map(c => [c.slug, c]))
  console.log(`Loaded ${categories.length} categories from database`)

  // Initialize AI categorizer if available
  let aiCategorizer: AICategorizer | null = null
  if (useAi) {
    aiCategorizer = new AICategorizer(categories)
  }

  let totalProcessed = 0
  let totalCategorized = 0
  let totalSkipped = 0

  // Process ebooks
  if (!magazinesOnly) {
    console.log('\n--- Processing Ebooks ---')
    const allEbooks = await db.select().from(ebooks)
    const ebooksToProcess = limit ? allEbooks.slice(0, limit) : allEbooks

    console.log(`Found ${allEbooks.length} ebooks, processing ${ebooksToProcess.length}...`)

    for (const ebook of ebooksToProcess) {
      const book: BookInfo = {
        id: ebook.id,
        title: ebook.title,
        author: ebook.author,
        description: ebook.description,
      }

      // Get category matches
      let matches: CategoryMatch[]
      if (aiCategorizer) {
        matches = await aiCategorizer.categorize(book, 'ebook')
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      } else {
        matches = keywordCategorize(book)
      }

      if (matches.length === 0) {
        console.log(`\n[Ebook #${ebook.id}] "${ebook.title}" - No categories matched`)
        totalSkipped++
        continue
      }

      const topMatches = matches.slice(0, 3)
      console.log(`\n[Ebook #${ebook.id}] "${ebook.title}"`)
      console.log(`  Author: ${ebook.author || 'Unknown'}`)
      console.log(`  Categories: ${topMatches.map(m => `${m.slug}(${m.score})`).join(', ')}`)

      if (!dryRun) {
        for (let i = 0; i < topMatches.length; i++) {
          const match = topMatches[i]
          const category = categoryBySlug.get(match.slug)

          if (!category) {
            console.log(`  Warning: Category "${match.slug}" not found in database`)
            continue
          }

          if (!category.bookTypes?.includes('ebook')) {
            console.log(`  Skipping "${match.slug}" - not applicable to ebooks`)
            continue
          }

          try {
            await db.insert(bookCategories).values({
              bookId: ebook.id,
              bookType: 'ebook',
              categoryId: category.id,
              isPrimary: i === 0,
            }).onConflictDoNothing()

            await db.update(ebookCategories)
              .set({ ebookCount: sql`${ebookCategories.ebookCount} + 1` })
              .where(eq(ebookCategories.id, category.id))
          } catch (error: any) {
            if (error.code !== '23505') {
              console.error(`  Error: ${error.message}`)
            }
          }
        }
      }

      totalProcessed++
      totalCategorized++
    }
  }

  // Process magazines - grouped by publisher/series for efficiency
  if (!ebooksOnly) {
    console.log('\n--- Processing Magazines ---')
    const allMagazines = await db.select().from(magazines)

    // Extract publisher/series name from magazine title
    // Handles various formats: "Fortune USA-2020-01", "BBC Wildlife 01.2022", "Forbes - August 2024"
    function extractPublisher(title: string): string {
      let name = title
        // Remove date patterns: -2020-01, 2020-01, -2020-12&2021-01
        .replace(/[-\s]?\d{4}[-/]\d{2}(&\d{2})?/g, '')
        // Remove patterns like: 01.2022, 12.2022
        .replace(/\s?\d{2}\.\d{4}/g, '')
        // Remove patterns like: 01.02 2023, 06.07 2023
        .replace(/\s?\d{2}\.\d{2}\s?\d{4}/g, '')
        // Remove patterns like: - August 2024, - March 2024
        .replace(/\s?-?\s?(January|February|March|April|May|June|July|August|September|October|November|December)\s?\d{4}/gi, '')
        // Remove year-only patterns at end: 2023, 2024
        .replace(/\s+\d{4}[_]?$/g, '')
        // Remove trailing special words
        .replace(/\s+(Special|Spring|Summer|Fall|Winter|Garden For Wildlife)$/gi, '')
        // Remove regional suffixes for grouping: USA, ME, EU, Asia
        .replace(/\s+(USA|ME|EU|Asia|UK|India)$/gi, '')
        // Normalize common typos
        .replace(/Wildilfe/g, 'Wildlife')
        // Clean up extra whitespace and trailing punctuation
        .replace(/[-_\s]+$/g, '')
        .trim()

      return name
    }

    // Group magazines by publisher
    const magazinesByPublisher = new Map<string, typeof allMagazines>()
    for (const mag of allMagazines) {
      const publisher = extractPublisher(mag.title)
      if (!magazinesByPublisher.has(publisher)) {
        magazinesByPublisher.set(publisher, [])
      }
      magazinesByPublisher.get(publisher)!.push(mag)
    }

    const publishers = Array.from(magazinesByPublisher.keys())
    console.log(`Found ${allMagazines.length} magazines in ${publishers.length} series/publishers`)
    console.log(`Processing by publisher (1 AI call per series)...\n`)

    // Cache for publisher -> categories mapping
    const publisherCategories = new Map<string, CategoryMatch[]>()

    for (const publisher of publishers) {
      const mags = magazinesByPublisher.get(publisher)!
      const representative = mags[0] // Use first magazine as representative

      // Get categories for this publisher (AI call once per publisher)
      let matches: CategoryMatch[]
      if (aiCategorizer) {
        matches = await aiCategorizer.categorize({
          id: representative.id,
          title: publisher, // Use publisher name for better categorization
          description: representative.description,
        }, 'magazine')
        await new Promise(resolve => setTimeout(resolve, 200))
      } else {
        matches = keywordCategorize({
          id: representative.id,
          title: publisher,
          description: representative.description,
        })
      }

      publisherCategories.set(publisher, matches)

      if (matches.length === 0) {
        console.log(`[${publisher}] (${mags.length} issues) - No categories matched`)
        totalSkipped += mags.length
        continue
      }

      const topMatches = matches.slice(0, 2)
      console.log(`[${publisher}] (${mags.length} issues) → ${topMatches.map(m => m.slug).join(', ')}`)

      // Apply categories to all magazines in this publisher group (batch insert)
      if (!dryRun) {
        // Build batch insert values
        const insertValues: { bookId: number; bookType: string; categoryId: number; isPrimary: boolean }[] = []

        for (const magazine of mags) {
          for (let i = 0; i < topMatches.length; i++) {
            const match = topMatches[i]
            const category = categoryBySlug.get(match.slug)

            if (!category) continue
            if (!category.bookTypes?.includes('magazine')) continue

            insertValues.push({
              bookId: magazine.id,
              bookType: 'magazine',
              categoryId: category.id,
              isPrimary: i === 0,
            })
          }
        }

        // Batch insert all at once
        if (insertValues.length > 0) {
          try {
            await db.insert(bookCategories).values(insertValues).onConflictDoNothing()
          } catch (error: any) {
            if (error.code !== '23505') {
              console.error(`  Batch error: ${error.message}`)
            }
          }
        }

        // Update category counts once per publisher (batch update)
        for (const match of topMatches) {
          const category = categoryBySlug.get(match.slug)
          if (category && category.bookTypes?.includes('magazine')) {
            await db.update(ebookCategories)
              .set({ magazineCount: sql`${ebookCategories.magazineCount} + ${mags.length}` })
              .where(eq(ebookCategories.id, category.id))
          }
        }
      }

      totalProcessed += mags.length
      totalCategorized += mags.length
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('Summary')
  console.log('='.repeat(60))
  console.log(`Total books processed: ${totalProcessed}`)
  console.log(`Books categorized: ${totalCategorized}`)
  console.log(`Books skipped (no matches): ${totalSkipped}`)

  if (dryRun) {
    console.log('\n[DRY RUN] No changes were made to the database.')
    console.log('Run without --dry-run to apply changes.')
  }
}

main()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
