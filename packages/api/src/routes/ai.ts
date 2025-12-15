import { Hono } from 'hono'

const app = new Hono()

// DeepSeek API configuration
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

// Get meaning using DeepSeek API
async function getDeepSeekMeaning(
  text: string,
  paragraph: string,
  targetLanguage: string
): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    console.warn('DEEPSEEK_API_KEY not configured, falling back to dictionary API')
    return null
  }

  const systemPrompt = targetLanguage === 'zh'
    ? `你是一个专业的词典和语言解释助手。用户会给你一个单词或短语，以及它出现的上下文段落。
请提供：
1. **选中内容释义**：这个词/短语在当前上下文中的含义解释
2. **词性**（如果适用）
3. **段落大意**：简要概括整个上下文段落的主要含义（2-3句话）

回复格式要求：简洁、清晰，使用 Markdown 格式，用中文回复。`
    : `You are a professional dictionary and language explanation assistant. The user will give you a word or phrase along with the context paragraph where it appears.
Please provide:
1. **Selected Text Meaning**: The meaning of the word/phrase in the current context
2. **Part of Speech** (if applicable)
3. **Paragraph Summary**: A brief summary of the overall meaning of the context paragraph (2-3 sentences)

Response format: concise, clear, use Markdown formatting, respond in English.`

  const userPrompt = paragraph
    ? `Word/Phrase: "${text}"\n\nContext: "${paragraph.substring(0, 500)}"`
    : `Word/Phrase: "${text}"`

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 500,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      console.error('DeepSeek API error:', response.status, await response.text())
      return null
    }

    const data = await response.json() as DeepSeekResponse
    return data.choices?.[0]?.message?.content || null
  } catch (error) {
    console.error('DeepSeek API request failed:', error)
    return null
  }
}

// Free Dictionary API for English word definitions (fallback)
async function getEnglishDefinition(word: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
    if (!response.ok) {
      return null
    }
    const data = await response.json()
    if (!Array.isArray(data) || data.length === 0) {
      return null
    }

    const entry = data[0]
    const meanings: string[] = []

    // Get phonetic
    if (entry.phonetic) {
      meanings.push(`**${entry.word}** ${entry.phonetic}`)
    } else {
      meanings.push(`**${entry.word}**`)
    }

    // Get definitions by part of speech
    if (entry.meanings && Array.isArray(entry.meanings)) {
      for (const meaning of entry.meanings) {
        const pos = meaning.partOfSpeech
        meanings.push(`\n*${pos}*`)

        if (meaning.definitions && Array.isArray(meaning.definitions)) {
          const defs = meaning.definitions.slice(0, 3) // Limit to 3 definitions
          for (let i = 0; i < defs.length; i++) {
            const def = defs[i]
            meanings.push(`${i + 1}. ${def.definition}`)
            if (def.example) {
              meanings.push(`   _Example: "${def.example}"_`)
            }
          }
        }
      }
    }

    return meanings.join('\n')
  } catch {
    return null
  }
}

// Simple translation/explanation for phrases or when all APIs fail
function getSimpleExplanation(text: string, paragraph: string, targetLanguage: string): string {
  // For Chinese target, we'll provide a context-based explanation
  if (targetLanguage === 'zh') {
    return `**${text}**\n\n` +
      `_出现在上下文中：_\n"...${paragraph.substring(0, 200)}..."\n\n` +
      `这个词/短语出现在以上文本中。请根据上下文理解其含义。`
  }

  // For English target
  return `**${text}**\n\n` +
    `_Found in context:_\n"...${paragraph.substring(0, 200)}..."\n\n` +
    `This word/phrase appears in the above text. Please interpret based on context.`
}

// POST /api/ai/meaning - Get word/phrase meaning
app.post('/meaning', async (c) => {
  try {
    const body = await c.req.json()
    const { text, paragraph = '', targetLanguage = 'en' } = body

    if (!text || typeof text !== 'string') {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Text is required' } }, 400)
    }

    // Clean the text
    const cleanText = text.trim()

    // First, try DeepSeek API for intelligent explanation
    const deepSeekMeaning = await getDeepSeekMeaning(cleanText, paragraph, targetLanguage)
    if (deepSeekMeaning) {
      return c.json({ meaning: deepSeekMeaning, source: 'deepseek' })
    }

    // Fallback: Try dictionary API for single English words
    const wordCount = cleanText.toLowerCase().split(/\s+/).length
    if (wordCount <= 2) {
      const definition = await getEnglishDefinition(cleanText.toLowerCase())
      if (definition) {
        return c.json({ meaning: definition, source: 'dictionary' })
      }
    }

    // Final fallback: simple explanation
    const explanation = getSimpleExplanation(text, paragraph, targetLanguage)
    return c.json({ meaning: explanation, source: 'fallback' })

  } catch (error) {
    console.error('AI meaning error:', error)
    return c.json({
      error: { code: 'SERVER_ERROR', message: 'Failed to get meaning' }
    }, 500)
  }
})

// POST /api/ai/translate - Translate text using DeepSeek
app.post('/translate', async (c) => {
  try {
    const body = await c.req.json()
    const { text, from = 'auto', to = 'zh' } = body

    if (!text || typeof text !== 'string') {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Text is required' } }, 400)
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return c.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Translation service not configured' } }, 503)
    }

    const targetLang = to === 'zh' ? '中文' : to === 'en' ? 'English' : to
    const systemPrompt = `You are a professional translator. Translate the following text to ${targetLang}. Only output the translation, no explanations.`

    const messages: DeepSeekMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ]

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 1000,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      console.error('DeepSeek translate error:', response.status)
      return c.json({ error: { code: 'SERVICE_ERROR', message: 'Translation failed' } }, 500)
    }

    const data = await response.json() as DeepSeekResponse
    const translation = data.choices?.[0]?.message?.content

    if (!translation) {
      return c.json({ error: { code: 'SERVICE_ERROR', message: 'No translation returned' } }, 500)
    }

    return c.json({ translation, from, to })

  } catch (error) {
    console.error('AI translate error:', error)
    return c.json({
      error: { code: 'SERVER_ERROR', message: 'Failed to translate' }
    }, 500)
  }
})

// POST /api/ai/author-info - Get AI-generated author introduction
app.post('/author-info', async (c) => {
  try {
    const body = await c.req.json()
    const { authorName, bookTitle, targetLanguage = 'en' } = body

    if (!authorName || typeof authorName !== 'string') {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Author name is required' } }, 400)
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return c.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'AI service not configured' } }, 503)
    }

    const systemPrompt = targetLanguage === 'zh'
      ? `你是一个专业的文学顾问。请为用户提供关于作家的简介。
要求：
1. 介绍作者的生平背景（出生年份、国籍等）
2. 主要文学成就和代表作品
3. 写作风格和特点
4. 获得的重要奖项或荣誉

回复要求：
- 简洁明了，300-500字
- 信息准确可靠
- 语言流畅自然`
      : `You are a professional literary consultant. Please provide an introduction about the author.
Requirements:
1. Author's background (birth year, nationality, etc.)
2. Major literary achievements and representative works
3. Writing style and characteristics
4. Important awards or honors received

Response requirements:
- Concise and clear, 150-250 words
- Accurate and reliable information
- Natural and fluent language`

    const userPrompt = bookTitle
      ? `Author: ${authorName}\nContext: Author of "${bookTitle}"`
      : `Author: ${authorName}`

    const messages: DeepSeekMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 800,
        temperature: 0.5
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek author-info error:', response.status, errorText)
      // Handle specific error codes
      if (response.status === 402) {
        return c.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'AI service temporarily unavailable (insufficient credits)' } }, 503)
      }
      return c.json({ error: { code: 'SERVICE_ERROR', message: 'Failed to generate author info' } }, 500)
    }

    const data = await response.json() as DeepSeekResponse
    const introduction = data.choices?.[0]?.message?.content

    if (!introduction) {
      return c.json({ error: { code: 'SERVICE_ERROR', message: 'No introduction returned' } }, 500)
    }

    return c.json({ introduction })

  } catch (error) {
    console.error('AI author-info error:', error)
    return c.json({
      error: { code: 'SERVER_ERROR', message: 'Failed to get author info' }
    }, 500)
  }
})

// POST /api/ai/book-info - Get AI-generated book introduction
app.post('/book-info', async (c) => {
  try {
    const body = await c.req.json()
    const { bookTitle, authorName, targetLanguage = 'en' } = body

    if (!bookTitle || typeof bookTitle !== 'string') {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Book title is required' } }, 400)
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return c.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'AI service not configured' } }, 503)
    }

    const systemPrompt = targetLanguage === 'zh'
      ? `你是一个专业的文学顾问和书籍推荐专家。请为用户提供关于这本书的介绍。
要求：
1. 简要介绍书籍的主题和内容概要（不剧透关键情节）
2. 分析书籍的特色和亮点
3. 适合什么样的读者
4. 在文学史上的地位或影响（如有）

回复要求：
- 简洁明了，300-500字
- 引人入胜，激发阅读兴趣
- 避免剧透
- 语言流畅自然`
      : `You are a professional literary consultant and book recommendation expert. Please provide an introduction about this book.
Requirements:
1. Brief introduction to the book's theme and content summary (no major spoilers)
2. Analysis of the book's features and highlights
3. What kind of readers it's suitable for
4. Its position or influence in literary history (if any)

Response requirements:
- Concise and clear, 150-250 words
- Engaging, sparking reading interest
- Avoid spoilers
- Natural and fluent language`

    const userPrompt = authorName
      ? `Book: "${bookTitle}" by ${authorName}`
      : `Book: "${bookTitle}"`

    const messages: DeepSeekMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 800,
        temperature: 0.5
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek book-info error:', response.status, errorText)
      // Handle specific error codes
      if (response.status === 402) {
        return c.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'AI service temporarily unavailable (insufficient credits)' } }, 503)
      }
      return c.json({ error: { code: 'SERVICE_ERROR', message: 'Failed to generate book info' } }, 500)
    }

    const data = await response.json() as DeepSeekResponse
    const introduction = data.choices?.[0]?.message?.content

    if (!introduction) {
      return c.json({ error: { code: 'SERVICE_ERROR', message: 'No introduction returned' } }, 500)
    }

    return c.json({ introduction })

  } catch (error) {
    console.error('AI book-info error:', error)
    return c.json({
      error: { code: 'SERVER_ERROR', message: 'Failed to get book info' }
    }, 500)
  }
})

// POST /api/ai/summarize - Summarize text using DeepSeek
app.post('/summarize', async (c) => {
  try {
    const body = await c.req.json()
    const { text, language = 'en' } = body

    if (!text || typeof text !== 'string') {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Text is required' } }, 400)
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return c.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Summarization service not configured' } }, 503)
    }

    const systemPrompt = language === 'zh'
      ? '你是一个专业的文本摘要助手。请用简洁的语言总结以下文本的主要内容，保持在3-5个要点。'
      : 'You are a professional text summarization assistant. Summarize the main points of the following text concisely, keeping it to 3-5 key points.'

    const messages: DeepSeekMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text.substring(0, 4000) } // Limit input length
    ]

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 500,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      console.error('DeepSeek summarize error:', response.status)
      return c.json({ error: { code: 'SERVICE_ERROR', message: 'Summarization failed' } }, 500)
    }

    const data = await response.json() as DeepSeekResponse
    const summary = data.choices?.[0]?.message?.content

    if (!summary) {
      return c.json({ error: { code: 'SERVICE_ERROR', message: 'No summary returned' } }, 500)
    }

    return c.json({ summary })

  } catch (error) {
    console.error('AI summarize error:', error)
    return c.json({
      error: { code: 'SERVER_ERROR', message: 'Failed to summarize' }
    }, 500)
  }
})

export { app as aiRoutes }
