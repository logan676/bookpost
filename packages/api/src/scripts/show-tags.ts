import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  const client = await pool.connect()
  try {
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('              数据库 Tags 数据总览')
    console.log('═══════════════════════════════════════════════════════════════\n')

    const result = await client.query(`
      SELECT id, name, name_en as "nameEn", slug, tags,
             ebook_count as "ebookCount", magazine_count as "magazineCount",
             is_active as "isActive"
      FROM ebook_categories
      ORDER BY id
    `)

    console.table(result.rows.map(r => ({
      id: r.id,
      name: r.name,
      nameEn: r.nameEn || '-',
      slug: r.slug || '-',
      tags: r.tags || '(无)',
      books: r.ebookCount + r.magazineCount,
      active: r.isActive ? '✅' : '❌'
    })))

    // Summary by tag type
    const withTags = result.rows.filter(r => r.tags)
    const withoutTags = result.rows.filter(r => r.tags === null)

    console.log('\n📊 统计：')
    console.log(`   有 tags 的分类: ${withTags.length}`)
    console.log(`   无 tags 的分类: ${withoutTags.length}`)
    console.log(`   总计: ${result.rows.length}`)

    // Group by tags
    console.log('\n📋 按 Tags 分组：\n')

    const tagGroups: Record<string, any[]> = {}
    for (const row of result.rows) {
      const key = row.tags || '(无 tags)'
      if (!tagGroups[key]) tagGroups[key] = []
      tagGroups[key].push(row)
    }

    for (const [tag, rows] of Object.entries(tagGroups).sort()) {
      console.log(`【${tag}】(${rows.length}个)`)
      for (const r of rows) {
        console.log(`   - [${r.id}] ${r.name}`)
      }
      console.log('')
    }

  } finally {
    client.release()
    await pool.end()
  }
}

main()
