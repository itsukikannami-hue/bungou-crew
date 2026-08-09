import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabaseServer"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "ログインが必要です。",
        },
        {
          status: 401,
        }
      )
    }

    const body = await request.json()

    const itemId = body.itemId

    if (!itemId) {
      return NextResponse.json(
        {
          error: "アイテムが指定されていません。",
        },
        {
          status: 400,
        }
      )
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "use_item",
      {
        p_item_id: itemId,
      }
    )

    if (error) {
      console.error(
        "アイテム使用エラー:",
        error
      )

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })

  } catch (error) {
    console.error(
      "アイテム使用APIエラー:",
      error
    )

    return NextResponse.json(
      {
        error:
          "アイテム使用処理に失敗しました。",
      },
      {
        status: 500,
      }
    )
  }
}