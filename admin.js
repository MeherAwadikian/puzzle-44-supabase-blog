// Admin panel: all writes go through key-gated SECURITY DEFINER RPCs
// (puzzle44_admin_*). The admin key is held only in this tab's memory for the
// session; it is never stored and never grants direct table access.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://qqncjqapqaubbbnkzhjb.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbmNqcWFwcWF1YmJibmt6aGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MTIyMDksImV4cCI6MjA5MzM4ODIwOX0.ZTSlyALClHBUbVWW2G8zMB6fgyDuPCrgyU4n5HM1JyM'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

let adminKey = null
const $ = (id) => document.getElementById(id)

async function unlock() {
  const key = $('key').value.trim()
  if (!key) return
  // Validate by attempting the list RPC; unauthorized keys raise an error.
  const { data, error } = await supabase.rpc('puzzle44_admin_list', { p_key: key })
  if (error) { $('gate-msg').textContent = 'Invalid key.'; return }
  adminKey = key
  $('gate').hidden = true
  $('panel').hidden = false
  renderList(data)
}

function renderList(posts) {
  const wrap = $('admin-list')
  wrap.replaceChildren()
  if (!posts.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'No posts.'; wrap.appendChild(p); return }
  for (const post of posts) {
    const row = document.createElement('div')
    row.className = 'admin-row'
    const info = document.createElement('div')
    const t = document.createElement('strong'); t.textContent = post.title
    const meta = document.createElement('span'); meta.className = 'meta'
    meta.textContent = ` ${post.slug} · ${post.status}`
    info.append(t, meta)
    const actions = document.createElement('div')
    const edit = document.createElement('button'); edit.className = 'ghost'; edit.textContent = 'Edit'
    edit.onclick = () => loadIntoForm(post)
    const del = document.createElement('button'); del.className = 'ghost danger'; del.textContent = 'Delete'
    del.onclick = () => removePost(post.id)
    actions.append(edit, del)
    row.append(info, actions)
    wrap.appendChild(row)
  }
}

function loadIntoForm(post) {
  $('editing-id').value = post.id
  $('f-slug').value = post.slug
  $('f-title').value = post.title
  $('f-excerpt').value = post.excerpt
  $('f-body').value = post.body
  $('f-status').value = post.status
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function refresh() {
  const { data, error } = await supabase.rpc('puzzle44_admin_list', { p_key: adminKey })
  if (!error) renderList(data)
}

async function save(e) {
  e.preventDefault()
  const { error } = await supabase.rpc('puzzle44_admin_upsert', {
    p_key: adminKey,
    p_slug: $('f-slug').value.trim(),
    p_title: $('f-title').value.trim(),
    p_excerpt: $('f-excerpt').value.trim(),
    p_body: $('f-body').value,
    p_status: $('f-status').value,
  })
  $('save-msg').textContent = error ? ('Error: ' + error.message) : 'Saved.'
  if (!error) { $('form').reset(); $('editing-id').value = ''; refresh() }
}

async function removePost(id) {
  const { error } = await supabase.rpc('puzzle44_admin_delete', { p_key: adminKey, p_id: id })
  if (!error) refresh()
}

$('unlock').addEventListener('click', unlock)
$('key').addEventListener('keydown', (e) => { if (e.key === 'Enter') unlock() })
$('form').addEventListener('submit', save)
$('reset').addEventListener('click', () => { $('form').reset(); $('editing-id').value = '' })
