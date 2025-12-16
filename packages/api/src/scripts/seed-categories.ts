/**
 * Seed Categories Script
 * Populates the database with predefined book categories
 *
 * Run with: npx tsx src/scripts/seed-categories.ts
 */

import 'dotenv/config'
import { db } from '../db/client'
import { ebookCategories } from '../db/schema'
import { eq } from 'drizzle-orm'

// Category definitions from design document
const CATEGORIES = [
  // Primary categories for ebooks
  {
    name: '小说',
    nameEn: 'Fiction',
    slug: 'fiction',
    icon: 'book.closed',
    themeColor: '#3B82F6', // Blue
    sortOrder: 1,
    bookTypes: 'ebook',
    description: '虚构的文学作品，包括各类小说',
  },
  {
    name: '文学',
    nameEn: 'Literature',
    slug: 'literature',
    icon: 'text.book.closed',
    themeColor: '#8B5CF6', // Purple
    sortOrder: 2,
    bookTypes: 'ebook',
    description: '经典文学、散文、诗歌等',
  },
  {
    name: '历史',
    nameEn: 'History',
    slug: 'history',
    icon: 'clock.arrow.circlepath',
    themeColor: '#D97706', // Amber
    sortOrder: 3,
    bookTypes: 'ebook,magazine',
    description: '历史事件、人物与文化',
  },
  {
    name: '哲学',
    nameEn: 'Philosophy',
    slug: 'philosophy',
    icon: 'brain.head.profile',
    themeColor: '#7C3AED', // Violet
    sortOrder: 4,
    bookTypes: 'ebook',
    description: '哲学思想与理论',
  },
  {
    name: '心理学',
    nameEn: 'Psychology',
    slug: 'psychology',
    icon: 'heart.text.square',
    themeColor: '#EC4899', // Pink
    sortOrder: 5,
    bookTypes: 'ebook,magazine',
    description: '心理学研究与自我认知',
  },
  {
    name: '技术',
    nameEn: 'Technology',
    slug: 'technology',
    icon: 'cpu',
    themeColor: '#059669', // Emerald
    sortOrder: 6,
    bookTypes: 'ebook,magazine',
    description: '计算机、编程与技术',
  },
  {
    name: '科学',
    nameEn: 'Science',
    slug: 'science',
    icon: 'atom',
    themeColor: '#0EA5E9', // Sky
    sortOrder: 7,
    bookTypes: 'ebook,magazine',
    description: '自然科学与科普',
  },
  {
    name: '经济',
    nameEn: 'Economics',
    slug: 'economics',
    icon: 'chart.line.uptrend.xyaxis',
    themeColor: '#10B981', // Green
    sortOrder: 8,
    bookTypes: 'ebook,magazine',
    description: '经济学理论与实践',
  },
  {
    name: '商业',
    nameEn: 'Business',
    slug: 'business',
    icon: 'briefcase',
    themeColor: '#6366F1', // Indigo
    sortOrder: 9,
    bookTypes: 'ebook,magazine',
    description: '商业管理与创业',
  },
  {
    name: '艺术',
    nameEn: 'Art',
    slug: 'art',
    icon: 'paintpalette',
    themeColor: '#F43F5E', // Rose
    sortOrder: 10,
    bookTypes: 'ebook,magazine',
    description: '艺术、设计与美学',
  },
  {
    name: '传记',
    nameEn: 'Biography',
    slug: 'biography',
    icon: 'person.text.rectangle',
    themeColor: '#78716C', // Stone
    sortOrder: 11,
    bookTypes: 'ebook',
    description: '名人传记与回忆录',
  },
  {
    name: '自我提升',
    nameEn: 'Self-Help',
    slug: 'self-help',
    icon: 'arrow.up.heart',
    themeColor: '#F59E0B', // Yellow
    sortOrder: 12,
    bookTypes: 'ebook',
    description: '个人成长与自我提升',
  },
  {
    name: '旅游',
    nameEn: 'Travel',
    slug: 'travel',
    icon: 'airplane',
    themeColor: '#14B8A6', // Teal
    sortOrder: 13,
    bookTypes: 'magazine',
    description: '旅游指南与游记',
  },
  {
    name: '时尚',
    nameEn: 'Fashion',
    slug: 'fashion',
    icon: 'sparkles',
    themeColor: '#A855F7', // Purple
    sortOrder: 14,
    bookTypes: 'magazine',
    description: '时尚与潮流',
  },
  {
    name: '生活',
    nameEn: 'Lifestyle',
    slug: 'lifestyle',
    icon: 'house',
    themeColor: '#84CC16', // Lime
    sortOrder: 15,
    bookTypes: 'magazine',
    description: '生活方式与家居',
  },
  {
    name: '健康',
    nameEn: 'Health',
    slug: 'health',
    icon: 'heart.circle',
    themeColor: '#EF4444', // Red
    sortOrder: 16,
    bookTypes: 'ebook,magazine',
    description: '健康与养生',
  },
  {
    name: '教育',
    nameEn: 'Education',
    slug: 'education',
    icon: 'graduationcap',
    themeColor: '#2563EB', // Blue
    sortOrder: 17,
    bookTypes: 'ebook',
    description: '教育与学习',
  },
  {
    name: '儿童',
    nameEn: 'Children',
    slug: 'children',
    icon: 'figure.2.and.child.holdinghands',
    themeColor: '#FBBF24', // Amber
    sortOrder: 18,
    bookTypes: 'ebook',
    description: '儿童读物与绘本',
  },
  // Sub-categories under 小说 (Fiction)
  {
    name: '悬疑',
    nameEn: 'Mystery',
    slug: 'mystery',
    icon: 'magnifyingglass',
    themeColor: '#4B5563', // Gray
    sortOrder: 19,
    bookTypes: 'ebook',
    description: '悬疑推理小说',
  },
  {
    name: '科幻',
    nameEn: 'Sci-Fi',
    slug: 'sci-fi',
    icon: 'sparkle',
    themeColor: '#06B6D4', // Cyan
    sortOrder: 20,
    bookTypes: 'ebook',
    description: '科幻小说',
  },
  {
    name: '奇幻',
    nameEn: 'Fantasy',
    slug: 'fantasy',
    icon: 'wand.and.stars',
    themeColor: '#9333EA', // Purple
    sortOrder: 21,
    bookTypes: 'ebook',
    description: '奇幻与魔幻小说',
  },
  {
    name: '言情',
    nameEn: 'Romance',
    slug: 'romance',
    icon: 'heart',
    themeColor: '#FB7185', // Pink
    sortOrder: 22,
    bookTypes: 'ebook',
    description: '言情与爱情小说',
  },
  // Sub-categories under 技术 (Technology)
  {
    name: '人工智能',
    nameEn: 'Artificial Intelligence',
    slug: 'artificial-intelligence',
    icon: 'brain',
    themeColor: '#8B5CF6', // Purple
    sortOrder: 23,
    bookTypes: 'ebook',
    description: '人工智能、机器学习与深度学习',
  },
  {
    name: '凯文凯利系列',
    nameEn: 'Kevin Kelly Series',
    slug: 'kevin-kelly',
    icon: 'lightbulb',
    themeColor: '#F59E0B', // Amber
    sortOrder: 24,
    bookTypes: 'ebook',
    description: '凯文·凯利经典作品系列：失控、必然、科技想要什么等',
  },
]

// Sub-categories mapping (parentSlug -> childSlugs)
const SUBCATEGORIES: Record<string, string[]> = {
  'fiction': ['mystery', 'sci-fi', 'fantasy', 'romance'],
  'technology': ['artificial-intelligence', 'kevin-kelly'],
}

async function seedCategories() {
  console.log('Starting category seeding...')

  try {
    // First, insert all categories
    for (const cat of CATEGORIES) {
      // Check if category already exists
      const existing = await db
        .select()
        .from(ebookCategories)
        .where(eq(ebookCategories.slug, cat.slug))
        .limit(1)

      if (existing.length > 0) {
        console.log(`Category "${cat.name}" (${cat.slug}) already exists, updating...`)
        await db
          .update(ebookCategories)
          .set({
            name: cat.name,
            displayName: cat.name,
            nameEn: cat.nameEn,
            description: cat.description,
            icon: cat.icon,
            themeColor: cat.themeColor,
            sortOrder: cat.sortOrder,
            bookTypes: cat.bookTypes,
            isActive: true,
          })
          .where(eq(ebookCategories.slug, cat.slug))
      } else {
        console.log(`Creating category "${cat.name}" (${cat.slug})...`)
        await db.insert(ebookCategories).values({
          name: cat.name,
          displayName: cat.name,
          nameEn: cat.nameEn,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          themeColor: cat.themeColor,
          sortOrder: cat.sortOrder,
          bookTypes: cat.bookTypes,
          level: 1,
          isActive: true,
        })
      }
    }

    // Now set up parent-child relationships
    console.log('\nSetting up category hierarchy...')

    for (const [parentSlug, childSlugs] of Object.entries(SUBCATEGORIES)) {
      // Get parent category
      const [parent] = await db
        .select()
        .from(ebookCategories)
        .where(eq(ebookCategories.slug, parentSlug))
        .limit(1)

      if (!parent) {
        console.warn(`Parent category "${parentSlug}" not found, skipping children`)
        continue
      }

      // Update children
      for (const childSlug of childSlugs) {
        console.log(`  Setting "${childSlug}" as child of "${parentSlug}"...`)
        await db
          .update(ebookCategories)
          .set({
            parentId: parent.id,
            level: 2,
          })
          .where(eq(ebookCategories.slug, childSlug))
      }
    }

    console.log('\nCategory seeding completed successfully!')

    // Print summary
    const allCategories = await db.select().from(ebookCategories)
    const topLevel = allCategories.filter(c => c.parentId === null)
    const subCategories = allCategories.filter(c => c.parentId !== null)

    console.log(`\nSummary:`)
    console.log(`  Total categories: ${allCategories.length}`)
    console.log(`  Top-level categories: ${topLevel.length}`)
    console.log(`  Sub-categories: ${subCategories.length}`)
    console.log(`  Ebook categories: ${allCategories.filter(c => c.bookTypes?.includes('ebook')).length}`)
    console.log(`  Magazine categories: ${allCategories.filter(c => c.bookTypes?.includes('magazine')).length}`)

  } catch (error) {
    console.error('Error seeding categories:', error)
    process.exit(1)
  }
}

// Run the seed function
seedCategories().then(() => {
  console.log('\nDone!')
  process.exit(0)
})
