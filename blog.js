// Public blog: reads ONLY published posts from Supabase (RLS enforces that).
// No write capability here at all — this is read-only.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://qqncjqapqaubbbnkzhjb.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbmNqcWFwcWF1YmJibmt6aGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MTIyMDksImV4cCI6MjA5MzM4ODIwOX0.ZTSlyALClHBUbVWW2G8zMB6fgyDuPCrgyU4n5HM1JyM'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

const listEl = document.getElementById('list')
const singleEl = document.getElementById('single')

function fmt(ts) {
  return new Date(ts).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

async function showList() {
  singleEl.hidden = true
  listEl.hidden = false
  const { data, error } = await supabase
    .from('puzzle44_posts')
    .select('slug,title,excerpt,created_at')
    .order('created_at', { ascending: false })
  const muted = (text) => { listEl.replaceChildren(); const p = document.createElement('p'); p.className = 'muted'; p.textContent = text; listEl.appendChild(p) }
  if (error) { muted('Error: ' + error.message); return }
  if (!data.length) { muted('No posts yet.'); return }
  listEl.replaceChildren()
  for (const p of data) {
    const card = document.createElement('a')
    card.className = 'post-card'
    card.href = '#' + encodeURIComponent(p.slug)
    const h = document.createElement('h3'); h.textContent = p.title
    const ex = document.createElement('p'); ex.textContent = p.excerpt
    const dt = document.createElement('span'); dt.className = 'meta'; dt.textContent = fmt(p.created_at)
    card.append(h, ex, dt)
    listEl.appendChild(card)
  }
}

async function showPost(slug) {
  const { data, error } = await supabase
    .from('puzzle44_posts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error || !data) { showList(); return }
  listEl.hidden = true
  singleEl.hidden = false
  document.getElementById('s-title').textContent = data.title
  document.getElementById('s-meta').textContent = fmt(data.created_at)
  // Render body paragraphs with textContent (no innerHTML of user data = no XSS)
  const bodyEl = document.getElementById('s-body')
  bodyEl.replaceChildren()
  for (const para of (data.body || '').split('\n\n')) {
    const p = document.createElement('p'); p.textContent = para
    bodyEl.appendChild(p)
  }
}

function route() {
  const hash = decodeURIComponent(location.hash.slice(1))
  if (hash) showPost(hash); else showList()
}

document.getElementById('back').addEventListener('click', (e) => { e.preventDefault(); location.hash = '' })
window.addEventListener('hashchange', route)
route()
