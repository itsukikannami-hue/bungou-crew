"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

type Item = {
  id: string
  name: string
  description: string | null
  type: string
  price: number
  effect_type: string
  effect_value: number | null
  duration: number | null
  is_active: boolean
  created_at: string
}

type ItemForm = {
  name: string
  description: string
  type: string
  price: string
  effect_type: string
  effect_value: string
  duration: string
  is_active: boolean
}

const emptyForm: ItemForm = {
  name: "",
  description: "",
  type: "consumable",
  price: "0",
  effect_type: "",
  effect_value: "",
  duration: "",
  is_active: true,
}

export default function AdminItemsPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [items, setItems] = useState<Item[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)

  const [form, setForm] = useState<ItemForm>(emptyForm)

  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)

  const [saving, setSaving] = useState(false)

  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // ========================================
  // 管理者チェック
  // ========================================

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.replace("/login")
          return
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("user_id", user.id)
          .single()

        if (error || !profile?.is_admin) {
          router.replace("/")
          return
        }

        setIsAdmin(true)
        setLoading(false)
      } catch (error) {
        console.error("管理者チェックエラー:", error)
        router.replace("/")
      }
    }

    checkAdmin()
  }, [router])

  // ========================================
  // アイテム取得
  // ========================================

  useEffect(() => {
    if (!isAdmin) return

    fetchItems()
  }, [isAdmin])

  const fetchItems = async () => {
    setItemsLoading(true)
    setErrorMessage("")

    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("アイテム取得エラー:", error)
        setErrorMessage(`アイテム取得に失敗しました: ${error.message}`)
        return
      }

      setItems(data ?? [])
    } catch (error) {
      console.error("アイテム取得例外:", error)
      setErrorMessage("アイテム取得中にエラーが発生しました。")
    } finally {
      setItemsLoading(false)
    }
  }

  // ========================================
  // フォーム変更
  // ========================================

  const updateForm = (
    key: keyof ItemForm,
    value: string | boolean
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  // ========================================
  // 新規追加フォーム
  // ========================================

  const openCreateForm = () => {
    setEditingItemId(null)
    setForm(emptyForm)
    setErrorMessage("")
    setSuccessMessage("")
    setShowForm(true)
  }

  // ========================================
  // 編集フォーム
  // ========================================

  const openEditForm = (item: Item) => {
    setEditingItemId(item.id)

    setForm({
      name: item.name,
      description: item.description ?? "",
      type: item.type,
      price: String(item.price),
      effect_type: item.effect_type,
      effect_value:
        item.effect_value !== null
          ? String(item.effect_value)
          : "",
      duration:
        item.duration !== null
          ? String(item.duration)
          : "",
      is_active: item.is_active,
    })

    setErrorMessage("")
    setSuccessMessage("")
    setShowForm(true)
  }

  // ========================================
  // フォームを閉じる
  // ========================================

  const closeForm = () => {
    if (saving) return

    setShowForm(false)
    setEditingItemId(null)
    setForm(emptyForm)
    setErrorMessage("")
  }

  // ========================================
  // 数値変換
  // ========================================

  const parseNullableNumber = (value: string) => {
    if (value.trim() === "") {
      return null
    }

    const number = Number(value)

    if (!Number.isFinite(number)) {
      return null
    }

    return number
  }

  // ========================================
  // アイテム保存
  // ========================================

  const saveItem = async () => {
    setErrorMessage("")
    setSuccessMessage("")

    // ----------------------------
    // バリデーション
    // ----------------------------

    if (!form.name.trim()) {
      setErrorMessage("アイテム名を入力してください。")
      return
    }

    if (!form.type.trim()) {
      setErrorMessage("タイプを入力してください。")
      return
    }

    if (!form.effect_type.trim()) {
      setErrorMessage("効果タイプを入力してください。")
      return
    }

    const price = Number(form.price)

    if (!Number.isFinite(price) || price < 0) {
      setErrorMessage("価格には0以上の数字を入力してください。")
      return
    }

    const effectValue = parseNullableNumber(form.effect_value)

    if (
      form.effect_value.trim() !== "" &&
      effectValue === null
    ) {
      setErrorMessage("効果値には数字を入力してください。")
      return
    }

    const duration = parseNullableNumber(form.duration)

    if (
      form.duration.trim() !== "" &&
      duration === null
    ) {
      setErrorMessage("期間には数字を入力してください。")
      return
    }

    setSaving(true)

    try {
      const itemData = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        type: form.type.trim(),
        price,
        effect_type: form.effect_type.trim(),
        effect_value: effectValue,
        duration,
        is_active: form.is_active,
      }

      // ========================================
      // 新規追加
      // ========================================

      if (!editingItemId) {
        const { data, error } = await supabase
          .from("items")
          .insert(itemData)
          .select()
          .single()

        if (error) {
          console.error("アイテム追加エラー:", error)

          setErrorMessage(
            `アイテム追加に失敗しました: ${error.message}`
          )

          return
        }

        console.log("アイテム追加成功:", data)

        setSuccessMessage("アイテムを追加しました。")

        setShowForm(false)
        setEditingItemId(null)
        setForm(emptyForm)

        await fetchItems()

        return
      }

      // ========================================
      // 編集
      // ========================================

      const { data, error } = await supabase
        .from("items")
        .update(itemData)
        .eq("id", editingItemId)
        .select()
        .single()

      if (error) {
        console.error("アイテム更新エラー:", error)

        setErrorMessage(
          `アイテム更新に失敗しました: ${error.message}`
        )

        return
      }

      console.log("アイテム更新成功:", data)

      setSuccessMessage("アイテムを更新しました。")

      setShowForm(false)
      setEditingItemId(null)
      setForm(emptyForm)

      await fetchItems()
    } catch (error) {
      console.error("アイテム保存例外:", error)

      setErrorMessage(
        "アイテム保存中にエラーが発生しました。"
      )
    } finally {
      setSaving(false)
    }
  }

  // ========================================
  // 有効 / 無効切り替え
  // ========================================

  const toggleActive = async (item: Item) => {
    setErrorMessage("")
    setSuccessMessage("")

    const nextActive = !item.is_active

    try {
      const { error } = await supabase
        .from("items")
        .update({
          is_active: nextActive,
        })
        .eq("id", item.id)

      if (error) {
        console.error("アイテム状態変更エラー:", error)

        setErrorMessage(
          `状態変更に失敗しました: ${error.message}`
        )

        return
      }

      setItems((prev) =>
        prev.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                is_active: nextActive,
              }
            : currentItem
        )
      )

      setSuccessMessage(
        nextActive
          ? `${item.name}を有効にしました。`
          : `${item.name}を無効にしました。`
      )
    } catch (error) {
      console.error("状態変更例外:", error)

      setErrorMessage(
        "アイテム状態変更中にエラーが発生しました。"
      )
    }
  }

  // ========================================
  // ローディング
  // ========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">
          管理者権限を確認しています...
        </p>
      </main>
    )
  }

  if (!isAdmin) {
    return null
  }

  // ========================================
  // 画面
  // ========================================

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ========================================
            ヘッダー
        ======================================== */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              アイテム管理
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              ブンゴウクルーで使用するアイテムを管理します。
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition"
            >
              管理者画面へ
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-800 transition"
            >
              ＋ アイテム追加
            </button>
          </div>
        </div>

        {/* ========================================
            メッセージ
        ======================================== */}

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {/* ========================================
            編集・追加フォーム
        ======================================== */}

        {showForm && (
          <section className="mt-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingItemId
                  ? "アイテムを編集"
                  : "アイテムを追加"}
              </h2>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="text-gray-500 hover:text-gray-900 text-xl"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* 名前 */}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  アイテム名
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    updateForm("name", e.target.value)
                  }
                  placeholder="例：EXPブースト"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* タイプ */}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  タイプ
                </label>

                <input
                  type="text"
                  value={form.type}
                  onChange={(e) =>
                    updateForm("type", e.target.value)
                  }
                  placeholder="例：consumable"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* 価格 */}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  価格（ポイント）
                </label>

                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) =>
                    updateForm("price", e.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* 効果タイプ */}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  効果タイプ
                </label>

                <input
                  type="text"
                  value={form.effect_type}
                  onChange={(e) =>
                    updateForm("effect_type", e.target.value)
                  }
                  placeholder="例：EXP_MULTIPLIER"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* 効果値 */}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  効果値
                </label>

                <input
                  type="number"
                  value={form.effect_value}
                  onChange={(e) =>
                    updateForm("effect_value", e.target.value)
                  }
                  placeholder="例：2"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* 期間 */}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  期間
                </label>

                <input
                  type="number"
                  min="0"
                  value={form.duration}
                  onChange={(e) =>
                    updateForm("duration", e.target.value)
                  }
                  placeholder="不要なら空欄"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              {/* 説明 */}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  説明
                </label>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    updateForm(
                      "description",
                      e.target.value
                    )
                  }
                  rows={4}
                  placeholder="アイテムの説明を入力してください。"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black resize-none"
                />
              </div>

              {/* 有効 */}

              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      updateForm(
                        "is_active",
                        e.target.checked
                      )
                    }
                    className="w-5 h-5"
                  />

                  <span className="text-sm font-medium text-gray-700">
                    このアイテムを有効にする
                  </span>
                </label>
              </div>
            </div>

            {/* 保存ボタン */}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="px-5 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                キャンセル
              </button>

              <button
                type="button"
                onClick={saveItem}
                disabled={saving}
                className="px-5 py-3 rounded-xl bg-black text-white hover:bg-gray-800 transition disabled:opacity-50"
              >
                {saving
                  ? "保存中..."
                  : editingItemId
                    ? "変更を保存"
                    : "アイテムを追加"}
              </button>
            </div>
          </section>
        )}

        {/* ========================================
            アイテム一覧
        ======================================== */}

        <section className="mt-8">

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              アイテム一覧
            </h2>

            <button
              type="button"
              onClick={fetchItems}
              disabled={itemsLoading}
              className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50"
            >
              {itemsLoading ? "更新中..." : "↻ 更新"}
            </button>
          </div>

          {itemsLoading && items.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
              <p className="text-gray-500">
                アイテムを読み込んでいます...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
              <p className="text-gray-500">
                アイテムがありません。
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

              {/* PC表示 */}

              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">

                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500">
                        アイテム
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500">
                        タイプ
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500">
                        価格
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500">
                        効果
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500">
                        状態
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold text-gray-500">
                        操作
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">

                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">

                        {/* アイテム */}

                        <td className="px-5 py-5">
                          <div>
                            <p className="font-bold text-gray-900">
                              {item.name}
                            </p>

                            {item.description && (
                              <p className="mt-1 text-sm text-gray-500 max-w-md">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* タイプ */}

                        <td className="px-5 py-5">
                          <span className="inline-flex rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                            {item.type}
                          </span>
                        </td>

                        {/* 価格 */}

                        <td className="px-5 py-5">
                          <span className="font-semibold text-gray-900">
                            {item.price.toLocaleString()}
                          </span>

                          <span className="ml-1 text-xs text-gray-500">
                            pt
                          </span>
                        </td>

                        {/* 効果 */}

                        <td className="px-5 py-5">
                          <p className="text-sm font-medium text-gray-900">
                            {item.effect_type}
                          </p>

                          {item.effect_value !== null && (
                            <p className="mt-1 text-xs text-gray-500">
                              効果値：{item.effect_value}
                            </p>
                          )}

                          {item.duration !== null && (
                            <p className="mt-1 text-xs text-gray-500">
                              期間：{item.duration}
                            </p>
                          )}
                        </td>

                        {/* 状態 */}

                        <td className="px-5 py-5">
                          <button
                            type="button"
                            onClick={() => toggleActive(item)}
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition ${
                              item.is_active
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {item.is_active
                              ? "有効"
                              : "無効"}
                          </button>
                        </td>

                        {/* 操作 */}

                        <td className="px-5 py-5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(item)
                            }
                            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                          >
                            編集
                          </button>
                        </td>

                      </tr>
                    ))}

                  </tbody>
                </table>
              </div>

              {/* スマホ表示 */}

              <div className="lg:hidden divide-y divide-gray-100">

                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-5"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>
                        <h3 className="font-bold text-gray-900">
                          {item.name}
                        </h3>

                        {item.description && (
                          <p className="mt-2 text-sm text-gray-500">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          toggleActive(item)
                        }
                        className={`shrink-0 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          item.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {item.is_active
                          ? "有効"
                          : "無効"}
                      </button>

                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">
                          タイプ
                        </p>

                        <p className="mt-1 font-medium text-gray-900">
                          {item.type}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">
                          価格
                        </p>

                        <p className="mt-1 font-medium text-gray-900">
                          {item.price.toLocaleString()} pt
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">
                          効果タイプ
                        </p>

                        <p className="mt-1 font-medium text-gray-900 break-all">
                          {item.effect_type}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">
                          効果値
                        </p>

                        <p className="mt-1 font-medium text-gray-900">
                          {item.effect_value ?? "—"}
                        </p>
                      </div>

                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          openEditForm(item)
                        }
                        className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                      >
                        編集
                      </button>
                    </div>

                  </div>
                ))}

              </div>
            </div>
          )}
        </section>

      </div>
    </main>
  )
}