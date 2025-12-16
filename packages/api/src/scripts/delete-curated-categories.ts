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
    console.log('              删除运营榜单分类 (ID 21-30)')
    console.log('═══════════════════════════════════════════════════════════════\n')

    // 显示将要删除的分类
    console.log('📋 将删除以下分类:\n')
    const before = await client.query(`
      SELECT id, name, ebook_count as "ebookCount"
      FROM ebook_categories
      WHERE id BETWEEN 21 AND 30
      ORDER BY id
    `)
    console.table(before.rows)

    // 开始事务
    await client.query('BEGIN')

    // Step 1: 清除 ebooks 表中的 category_id 引用
    const clearEbookRefs = await client.query(`
      UPDATE ebooks
      SET category_id = NULL
      WHERE category_id BETWEEN 21 AND 30
      RETURNING id, title
    `)
    console.log(`\n📚 已清除 ${clearEbookRefs.rowCount} 本书的 category_id 引用`)

    // Step 2: 删除 book_categories 关联
    const deleteLinks = await client.query(`
      DELETE FROM book_categories
      WHERE category_id BETWEEN 21 AND 30
      RETURNING book_id, category_id
    `)
    console.log(`\n🔗 已删除 ${deleteLinks.rowCount} 条 book_categories 关联`)

    // Step 3: 删除 ebook_categories 记录
    const deleteCategories = await client.query(`
      DELETE FROM ebook_categories
      WHERE id BETWEEN 21 AND 30
      RETURNING id, name
    `)
    console.log(`\n🗑️  已删除 ${deleteCategories.rowCount} 条分类记录:`)
    console.table(deleteCategories.rows)

    // 提交事务
    await client.query('COMMIT')

    console.log('\n✅ 删除完成!')

    // 显示剩余分类
    console.log('\n📊 剩余分类:')
    const remaining = await client.query(`
      SELECT id, name, slug, tags
      FROM ebook_categories
      ORDER BY id
    `)
    console.table(remaining.rows)

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ 删除失败，已回滚:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main()
