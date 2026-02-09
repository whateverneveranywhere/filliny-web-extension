# Create Blog Post

Generate a high-quality, SEO-optimized, revenue-driving blog post for Filliny and seed it in the local database.

## CRITICAL RULES

- **Domain**: Filliny uses `filliny.io` — NEVER use `filliny.com` anywhere
- **Internal links**: ALWAYS use relative paths (`/pricing`, `/install-extension`) — NEVER absolute URLs for internal CTAs
- **No duplicates**: Read ALL existing blog post SQL files in `apps/api/src/db/blog-posts/` before writing
- **Humanize**: The post must sound like a real human wrote it, not AI. Run the `/humanizer` skill mentally on every paragraph.

## Step 1: Load skills

Before writing anything, invoke these skills using the Skill tool to load their full knowledge:

```
/marketing-psychology
/copywriting
/humanizer
/seo-audit
/pricing-strategy
/marketing-ideas
/social-content
```

Also reference these skills mentally (no need to invoke if context is clear):
- `/analytics-tracking` — PostHog event naming
- `/email-sequence` — structure for email repurposing
- `/software-architecture` — valid Lexical JSON structure
- `/audit-website` — content structure and readability

## Step 2: Analyze existing posts

Read ALL `.sql` files in `apps/api/src/db/blog-posts/` and extract from EVERY existing blog post:
- Title, slug, topic angle
- Copywriting framework used (documented in SQL comments: PAS, AIDA, BAB, etc.)
- Psychology biases used (documented in SQL comments)
- Target keywords (documented in SQL comments)
- Categories assigned
- Content format (personal story, educational, listicle, comparison, how-to, etc.)

Files are numbered sequentially: `001-slug.sql`, `002-slug.sql`, etc. Note the highest number for the new post.

The new post MUST differ from ALL existing posts on:
1. Topic and angle
2. Copywriting framework
3. Primary keyword cluster
4. Content format
5. At least 2 different categories

## Step 3: Plan the post

Select a topic based on gaps. Consider these high-value angles:
- Problem-aware searches ("chrome autofill not working", "form filling taking too long")
- Use-case specific ("freelancer form filling", "online shopping checkout automation")
- Comparison/review format ("best form filler extensions compared")
- How-to/educational ("how to automate online forms in 2026")
- Listicle ("X things wasting your time online that AI can fix")

If the user provides a topic via $ARGUMENTS, use that instead.

Document your plan:
- Title (under 70 chars, includes primary keyword)
- Framework (PAS, AIDA, BAB, 4Ps, StoryBrand — different from existing)
- 3-5 cognitive biases to apply and where
- 3-5 primary keywords + 5-10 long-tail keywords
- 2-3 categories from: productivity, job-search, ai-tools, chrome-extensions, time-management
- Content format

## Step 4: Write the post

**Structure:**
- 8-12 H2 sections with keyword-rich subheadings
- H3 subsections where needed for depth
- Mix of: paragraphs, bullet lists, numbered lists, blockquotes, horizontal rules
- Internal links to `/pricing` and `/install-extension` using relative paths
- Bold (format: 1) key statistics and claims
- Italic (format: 2) for emotional/reflective passages
- Code format (format: 16) for technical terms like field names
- Blockquotes for pull-quotes (shareable on social)
- Reading time: 6-10 minutes (1500-2500 words)

**Tone:**
- First person or second person (match the angle)
- Conversational, opinionated, specific
- Concrete numbers, not vague claims
- Short paragraphs (2-3 sentences max)
- Vary sentence length dramatically
- No corporate jargon

**Humanizer checklist (MANDATORY — run on every paragraph):**
- NO: "delve", "landscape", "tapestry", "crucial", "leverage", "comprehensive", "robust", "utilize", "facilitate", "streamline", "realm", "beacon", "paradigm", "holistic", "synergy", "Additionally", "Moreover", "Furthermore"
- NO sentences starting with "In today's..."
- NO "Not only...but also..." or "It's not just about...it's about..."
- NO triple parallel structures overused ("X, Y, and Z" sparingly)
- NO excessive em dashes (max 2 per entire post)
- NO promotional superlatives without data ("groundbreaking", "revolutionary")
- YES: Imperfect sentences (fragments, starting with "And" or "But")
- YES: At least one honest admission or self-deprecating moment (Pratfall Effect)
- YES: Varied paragraph lengths (1-sentence paragraphs mixed with longer)
- YES: Specific numbers over vague claims ("38%" not "many")

**Psychology to weave in (pick 3-5, document which and where):**
- Loss Aversion — frame what they lose by not acting
- Anchoring — show higher number first, then the real price
- Social Proof — usage stats, testimonials, "I found this on Reddit"
- Zero-Price Effect — emphasize the free tier is genuinely useful
- Pratfall Effect — admit a small flaw to build trust
- Endowment Effect — free trial creates ownership feeling
- Status-Quo Bias — acknowledge current tool is fine IF it works
- Mental Accounting — reframe cost as cents/day vs dollars/month
- Goal-Gradient — show how close they are to setup completion
- Contrast Effect — before/after comparisons with real numbers
- Commitment & Consistency — small step (free install) leads to bigger commitment
- Curiosity Gap — title creates need to read more

## Step 5: Generate seed SQL

Create a NEW SQL file at `apps/api/src/db/blog-posts/NNN-slug.sql` where:
- `NNN` = next sequential number (e.g., `005` if the last file is `004-*.sql`)
- `slug` = the post's URL slug (e.g., `best-form-fillers-compared`)

Each blog post lives in its own file. NEVER append to an existing file.

Follow this exact pattern:

```sql
-- ============================================================================
-- BLOG POST #N
-- ============================================================================
-- Title: "Your Title Here"
-- Framework: FRAMEWORK_NAME (Description)
-- Psychology: Bias1, Bias2, Bias3, Bias4, Bias5
-- Target Keywords: keyword1, keyword2, keyword3, keyword4, keyword5
-- ============================================================================

INSERT OR IGNORE INTO blog_post (
  id, slug, title, excerpt, description, author_id,
  content, _status, featured, meta, published_at, reading_time
) VALUES (
  'slug-based-id',
  'slug-based-id',
  'Post Title',
  'Short excerpt under 200 chars',
  'SEO description 150-300 chars',
  'b7e8f9a0-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
  '...LEXICAL JSON...',
  'published',
  0,
  '{"metaTitle":"Under 60 chars | Filliny","metaDescription":"Under 155 chars.","noIndex":false}',
  '2026-MM-DDTHH:MM:SS.000Z',
  N
);

-- Post #N Category Associations
INSERT OR IGNORE INTO blog_post_category (post_id, category_id)
SELECT 'slug-based-id', id FROM blog_category WHERE slug = 'category-slug-1'
UNION ALL
SELECT 'slug-based-id', id FROM blog_category WHERE slug = 'category-slug-2'
UNION ALL
SELECT 'slug-based-id', id FROM blog_category WHERE slug = 'category-slug-3';
```

### Available Authors

| Author | ID | Best For |
|--------|----|----------|
| Alex Rivera | `b7e8f9a0-1c2d-4e5f-8a9b-0c1d2e3f4a5b` | Productivity, general content |
| Maya Chen | `c8f9a0b1-2d3e-4f5a-9b0c-1d2e3f4a5b6c` | Tech reviews, comparisons |
| Jordan Blake | `d9a0b1c2-3e4f-5a6b-0c1d-2e3f4a5b6c7d` | Job search, career content |

Rotate authors across posts for diversity. Default to Alex Rivera if no specific angle applies.

### Lexical JSON reference

The `content` field is a single-line JSON string. Every node must follow these exact schemas.

Use ALL relevant block types in every post. A good post should include most of these:
- Headings (h2, h3) for structure
- Paragraphs for body text
- Bullet lists for feature lists, comparisons
- Numbered lists for steps, rankings
- Checklist for setup guides, requirements
- Blockquotes for pull-quotes, social-shareable stats
- Code blocks for technical terms, field names, error messages
- Horizontal rules for section breaks
- Links for CTAs and internal navigation
- Banner/callout blocks for mid-article CTAs or important notices
- Varied text formatting: bold for stats, italic for reflections, strikethrough for before/after, inline code for technical terms

---

#### BLOCK NODES (children of root)

**Heading:**
```json
{"type":"heading","version":1,"tag":"h2","direction":null,"format":"","indent":0,"children":[...INLINE NODES...]}
```
Tags: "h2", "h3", "h4", "h5", "h6" (never h1 — the page title is h1)

**Paragraph:**
```json
{"type":"paragraph","version":1,"direction":null,"format":"","indent":0,"children":[...INLINE NODES...]}
```

**Bullet list:**
```json
{"type":"list","version":1,"listType":"bullet","tag":"ul","start":null,"direction":null,"format":"","indent":0,"children":[...LISTITEM NODES...]}
```

**Numbered list:**
```json
{"type":"list","version":1,"listType":"number","tag":"ol","start":1,"direction":null,"format":"","indent":0,"children":[...LISTITEM NODES...]}
```

**Checklist:** (great for setup guides, requirements, comparison checklists)
```json
{"type":"list","version":1,"listType":"check","tag":"ul","start":null,"direction":null,"format":"","indent":0,"children":[
  {"type":"listitem","version":1,"value":1,"checked":true,"direction":null,"format":"","indent":0,"children":[...INLINE NODES...]},
  {"type":"listitem","version":1,"value":2,"checked":false,"direction":null,"format":"","indent":0,"children":[...INLINE NODES...]}
]}
```
Use `"checked":true` for completed/supported items, `"checked":false` for missing/unsupported.

**List item:**
```json
{"type":"listitem","version":1,"value":1,"checked":null,"direction":null,"format":"","indent":0,"children":[...INLINE NODES...]}
```
CRITICAL: `"checked":null` for regular lists, `true`/`false` for checklists. `"start":null` for bullet lists. These MUST be `null`, not omitted.

**Blockquote:** (use for pull-quotes, shareable stats, social-friendly snippets)
```json
{"type":"quote","version":1,"direction":null,"format":"","indent":0,"children":[...INLINE NODES...]}
```

**Code block:** (use for technical comparisons, field name examples, error messages)
```json
{"type":"code","version":1,"direction":null,"format":"","indent":0,"language":null,"children":[...INLINE NODES...]}
```
Optional `"language":"javascript"` or `"language":"html"` for syntax context.

**Horizontal rule:** (use to separate major sections)
```json
{"type":"horizontalrule","version":1}
```

**Banner/Callout block:** (use for mid-article CTAs, important notices, warnings)
```json
{"type":"block","version":1,"format":"","fields":{"blockType":"banner","blockName":"Try It Free","content":"Install Filliny and get 5 free form fills. No credit card required."}}
```
blockType can be `"banner"` or `"callout"`. `blockName` is the header, `content` is the body text.

---

#### INLINE NODES (children of paragraphs, headings, quotes, list items)

**Text node:**
```json
{"type":"text","version":1,"text":"Your text here","format":0,"style":"","mode":"normal","detail":0}
```

**Text format bitmask** (can combine with bitwise OR):
| Value | Format | Use case |
|-------|--------|----------|
| 0 | normal | Body text |
| 1 | **bold** | Key stats, claims, important terms |
| 2 | *italic* | Reflective passages, emphasis, editorial voice |
| 4 | ~~strikethrough~~ | Before/after comparisons ("~~6 hours~~ 47 minutes") |
| 8 | underline | Rarely — use for special emphasis |
| 16 | `code` | Technical terms, field names, HTML attributes |
| 3 | **bold + italic** | Combine: 1+2=3 for maximum emphasis |
| 5 | **bold + strikethrough** | Combine: 1+4=5 for struck-through stats |

**Link node:** (goes inside paragraph/heading/quote/listitem children)
```json
{"type":"link","version":1,"fields":{"url":"/pricing","linkType":"custom","newTab":false},"direction":null,"format":"","indent":0,"children":[{"type":"text","version":1,"text":"Pro plan","format":1,"style":"","mode":"normal","detail":0}]}
```
IMPORTANT: Internal links use relative URLs (`/pricing`, `/install-extension`) and `"newTab":false`. External links use full URLs and `"newTab":true`.

**Linebreak:** (for line breaks within a single paragraph)
```json
{"type":"linebreak","version":1}
```

---

#### ROOT STRUCTURE

```json
{"root":{"type":"root","version":1,"format":"","indent":0,"direction":null,"children":[...BLOCK NODES...]}}
```

The entire content JSON must be on a single line in the SQL string.

### SQL string escaping

In SQL strings, single quotes must be escaped as `''` (two single quotes). Example:
- `don't` → `don''t`
- `it's` → `it''s`
- `"Mr."` is fine (double quotes don't need escaping)

## Step 6: Seed all environments

After creating the new post file, seed it to all environments:

```bash
cd apps/api

# Seed the individual post file to local
wrangler d1 execute DB --local --file=./src/db/blog-posts/NNN-slug.sql

# Or seed ALL blog data (author + categories + all posts) to local
bun run db:seed:blog:local
```

To seed preview/prod:
```bash
bun run db:seed:blog:preview
bun run db:seed:blog:prod
```

The `db:seed:blog:*` scripts run `seed-blog.sh` which seeds the author & categories first, then iterates through all files in `blog-posts/` alphabetically.

## Step 7: Verify rendering

Check that:
- The post appears in the blog list at `/blog` (dev server must be running)
- The post loads at `/blog/{slug}` with full body content rendered
- All Lexical content blocks render (headings, paragraphs, lists, quotes, links, horizontal rules)
- Categories display correctly on the post card
- Internal links work (relative `/pricing`, `/install-extension`)

---

## Filliny product context

**What it does:**
- AI-powered Chrome extension that fills online forms
- AI reads form context (labels, layout, relationships) — not just HTML field names
- Works on modern React/Vue/Angular sites where browser autofill fails
- Multiple filling profiles (work, personal, freelance)
- Customizable tone and point of view for open-ended fields
- Test mode and vision mode to verify before submitting
- AES-256 encryption, never stores passwords or credit cards, never trains on user data

**Pricing:**
- Free: 5 fills, 1 profile, 3 websites — no credit card
- Pro Monthly: $12/month — 2M tokens (~2,800 fills), 10 profiles, 20 websites
- Pro Annual: $99/year (save $45) — same as Pro Monthly

**Key value props:**
- Saves 5+ hours per week
- 98% field accuracy
- 30-second setup
- Works on: job apps (Workday, Greenhouse, Lever), e-commerce checkout, government forms, surveys, travel bookings, insurance quotes, school applications
- 30-day money-back guarantee

**Domain:** filliny.io (NEVER filliny.com)

**Target keyword clusters to rotate across posts:**
- AI form filler, autofill Chrome extension, form filling automation
- Auto fill job applications, best form filler extension
- Chrome autofill alternative, chrome autofill not working
- Smart form filler, online form automation, AI autofill
- Save time on forms, fastest form filler, form filling tool

**Available categories:** productivity, job-search, ai-tools, chrome-extensions, time-management, ecommerce
