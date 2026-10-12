'use client'

import { useEffect, useState } from 'react'

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

function isSupported() {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
}

export default function PushNotificationButton() {
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('')
  const supported = isSupported()

  useEffect(() => {
    let active = true
    async function checkSubscription() {
      if (!isSupported()) {
        if (active) setChecking(false)
        return
      }
      try {
        const registration = await navigator.serviceWorker.getRegistration('/')
        const subscription = await registration?.pushManager.getSubscription()
        if (active) setEnabled(Notification.permission === 'granted' && !!subscription)
      } catch (error) {
        console.error('[Web Push] 購読状態の確認に失敗:', error)
        if (active) setMessage('通知の状態を確認できませんでした')
      } finally {
        if (active) setChecking(false)
      }
    }
    void checkSubscription()
    return () => { active = false }
  }, [])

  async function enable() {
    if (busy || checking) return
    setBusy(true)
    setMessage('')
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!isSupported() || !key) throw new Error('この環境では通知を利用できません')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('ブラウザで通知が許可されていません')
      const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' })
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeBase64Url(key),
      })
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })
      if (!response.ok) throw new Error('通知先を保存できませんでした。ログイン状態を確認してください')
      setEnabled(true)
      setMessage('このブラウザのPush通知を有効にしました')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '通知を有効にできませんでした')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    if (busy || checking) return
    setBusy(true)
    setMessage('')
    try {
      if (!isSupported()) throw new Error('この環境では通知を利用できません')
      const registration = await navigator.serviceWorker.getRegistration('/')
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        const response = await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        if (!response.ok) throw new Error('通知の解除に失敗しました')
        const removed = await subscription.unsubscribe()
        if (!removed) throw new Error('ブラウザの通知購読を解除できませんでした')
      }
      setEnabled(false)
      setMessage('このブラウザのPush通知を無効にしました')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '解除できませんでした')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <button
          type="button"
          onClick={enabled ? disable : enable}
          disabled={busy || checking || !supported}
          className={enabled
            ? 'rounded-lg border border-orange-600 px-4 py-2 text-orange-700 disabled:opacity-50'
            : 'rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-50'}
        >
          {checking ? '通知状態を確認中...' : busy ? '処理中...' : enabled ? 'Push通知を無効にする' : 'Push通知を有効にする'}
        </button>
      </div>
      <p role="status" className="text-sm">
        {message || (!supported ? 'このブラウザではWeb Pushを利用できません' : '')}
      </p>
    </div>
  )
}
