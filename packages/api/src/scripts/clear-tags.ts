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
    console.log('              清除指定分类的 Tags')
    console.log('═══════════════════════════════════════════════════════════════\n')

    // 要清除 tags 的分类 IDs
    // 第一组: 推荐新书、每日更新、阅读经典、高分书籍、英文书单、系列、纽约、榜单、本周新书合辑、收费资源
    // 第二组: 旅游、时尚、生活 (这些本来就没有 tags，但确保清空)
    const idsToCleart = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 43, 44, 45]

    // 显示将要清除的分类
    console.log('📋 将清除以下分类的 tags:\n')
    const before = await client.query(`
      SELECT id, name, tags FROM ebook_categories
      WHERE id = ANY($1::int[])
      ORDER BY id
    `, [idsToCleart])
    console.table(before.rows)

    // 执行清除
    const result = await client.query(`
      UPDATE ebook_categories
      SET tags = NULL
      WHERE id = ANY($1::int[])
      RETURNING id, name, tags
    `, [idsToCleart])

    console.log('\n✅ 已清除 tags:\n')
    console.table(result.rows)

    console.log(`\n共清除了 ${result.rowCount} 个分类的 tags`)

  } finally {
    client.release()
    await pool.end()
  }
}

main()
