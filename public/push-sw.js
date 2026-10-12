self.addEventListener('push', (event) => {
    if (!event.data) return
    let data
    try { data = event.data.json() } catch { return }
    const url = typeof data.url === 'string' && data.url.startsWith('/')
      ? data.url
      : '/'
  
    event.waitUntil(
      self.registration.showNotification(data.title || 'ブンゴウクルー', {
        body: data.body || '新しい通知があります',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url },
      })
    )
  })
  
  self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const url = new URL(event.notification.data?.url || '/', self.location.origin)
    if (url.origin !== self.location.origin) return
  
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
        for (const client of windows) {
          if (client.url === url.href && 'focus' in client) return client.focus()
        }
        return clients.openWindow(url.href)
      })
    )
  })