export function format(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function groupByDate(items: { created: string }[]): Record<string, typeof items> {
  const groups: Record<string, typeof items> = {}
  const now = new Date()
  items.forEach(item => {
    const d = new Date(item.created)
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / 86400000)
    let key: string
    if (days === 0) key = 'Today'
    else if (days === 1) key = 'Yesterday'
    else key = formatDate(item.created)
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  })
  return groups
}

export function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
