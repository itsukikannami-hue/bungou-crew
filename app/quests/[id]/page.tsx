"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { createNotification } from "@/lib/notification"

type Quest = {
  id: string
  quest_type_id: string
  requester_id: string
  title: string
  description: string
  reward_per_person: number
  max_participants: number
  deadline: string
  status: string
  target_url: string | null
  created_at: string
  updated_at: string
}

type QuestType = {
  id: string
  name: string
}

type QuestDetail = Quest & {
  quest_type: QuestType | null
}

export default function QuestDetailPage() {
  const params = useParams()
  const questId = params.id as string

  const [quest, setQuest] = useState<QuestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [userId, setUserId] = useState<string | null>(null)

  const [messages, setMessages] = useState<
  {
    id: string
    quest_id: string
    sender_id: string
    message: string
    created_at: string
  }[]
>([])

const [messageText, setMessageText] = useState("")
const [sendingMessage, setSendingMessage] = useState(false)
const [isParticipant, setIsParticipant] = useState(false)
const [participantId, setParticipantId] = useState<string | null>(null)

  const [applicationMessage, setApplicationMessage] = useState("")
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  
  const [applicationCount, setApplicationCount] = useState(0)
  const [submissionContent, setSubmissionContent] = useState("")
const [submissionStatus, setSubmissionStatus] = useState<string | null>(null)
const [submitting, setSubmitting] = useState(false)
type QuestSubmission = {
  id: string
  quest_id: string
  participant_id: string
  content: string
  status: string
  submitted_at: string
  reviewed_at: string | null
  updated_at: string
  revision_comment: string | null
  feedback_public: boolean
  feedback_post_id: string | null
}

const [submission, setSubmission] =
  useState<QuestSubmission | null>(null)

const [loadingSubmission, setLoadingSubmission] =
  useState(false)

  const [revisionComment, setRevisionComment] = useState("")
const [requestingRevision, setRequestingRevision] = useState(false)
const [approvingSubmission, setApprovingSubmission] = useState(false)
const [confirmingReward, setConfirmingReward] = useState(false)
const [rewardConfirmed, setRewardConfirmed] = useState(false)
const [feedbackPublished, setFeedbackPublished] = useState(false)
const [publishingFeedback, setPublishingFeedback] = useState(false)

const [reportOpen, setReportOpen] = useState(false)
const [reportReason, setReportReason] = useState("")
const [reportDescription, setReportDescription] = useState("")
const [reporting, setReporting] = useState(false)
const [reported, setReported] = useState(false)

  type Applicant = {
    id: string
    quest_id: string
    applicant_id: string
    message: string | null
    status: string
    applied_at: string
    profile: {
      user_id: string
      username: string | null
      avatar_url: string | null
    } | null
  }
  
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loadingApplicants, setLoadingApplicants] = useState(false)
  const [acceptingApplicantId, setAcceptingApplicantId] = useState<string | null>(null)

  useEffect(() => {
    if (!questId || !userId || !quest) return
  
    // 依頼者だけが提出物を確認する
    if (userId !== quest.requester_id) return
  
    const fetchSubmission = async () => {
      try {
        setLoadingSubmission(true)
  
        const { data, error } = await supabase
        .from("quest_submissions")
        .select(`
        id,
        quest_id,
        participant_id,
        content,
        status,
        submitted_at,
        reviewed_at,
        updated_at,
        revision_comment,
        feedback_public,
        feedback_post_id
      `)
        .eq("quest_id", questId)
        .order("submitted_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle()
  
        if (error) {
          console.error(
            "成果物取得エラー:",
            error
          )
          return
        }
  
        setSubmission(data as QuestSubmission | null)
      } catch (error) {
        console.error(
          "成果物取得エラー:",
          error
        )
      } finally {
        setLoadingSubmission(false)
      }
    }
  
    fetchSubmission()
  }, [questId, userId, quest])

  useEffect(() => {
    if (!questId) return

    const fetchQuest = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        setUserId(user?.id ?? null)

        const { data, error } = await supabase
          .from("quests")
          .select(`
            *,
            quest_type:quest_types (
              id,
              name
            )
          `)
          .eq("id", questId)
          .maybeSingle()

        if (error) {
          console.error("クエスト詳細取得エラー:", error)
          return
        }

        setQuest(data as QuestDetail | null)

      } catch (error) {
        console.error("クエスト詳細取得エラー:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchQuest()
  }, [questId])



  // 応募状況取得
  useEffect(() => {
    if (!questId || !userId) return

    const fetchApplicationStatus = async () => {

      const { data, error } = await supabase
        .from("quest_applications")
        .select("id, status")
        .eq("quest_id", questId)
        .eq("applicant_id", userId)
        .maybeSingle()

      if (error) {
        console.error("応募状況取得エラー:", error)
        return
      }

      if (data) {
        setApplied(true)
      }
    }

    fetchApplicationStatus()
  }, [questId, userId])

  // 通報済みか確認
useEffect(() => {
  if (!questId || !userId) return

  const fetchReportStatus = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("id")
      .eq("reporter_id", userId)
      .eq("target_type", "quest")
      .eq("target_id", questId)
      .maybeSingle()

    if (error) {
      console.error("通報状況取得エラー:", error)
      return
    }

    setReported(!!data)
  }

  fetchReportStatus()
}, [questId, userId])

  useEffect(() => {
    if (!questId || !userId) return
  
    const fetchParticipant = async () => {
      const { data, error } = await supabase
      .from("quest_participants")
      .select("id, status")
      .eq("quest_id", questId)
      .eq("user_id", userId)
      .eq("status", "accepted")
      .maybeSingle()
    
    if (error) {
      console.error("参加者確認エラー:", error)
      return
    }
    
    if (data) {
      setIsParticipant(true)
      setParticipantId(data.id)
    } else {
      setIsParticipant(false)
      setParticipantId(null)
    }
    }
  
    fetchParticipant()
  }, [questId, userId])

// 成果物提出状況取得
useEffect(() => {
  if (!questId || !userId || !isParticipant || !participantId) {
    return
  }

  const fetchSubmission = async () => {
    try {
      const { data, error } = await supabase
      .from("quest_submissions")
      .select(`
      id,
      quest_id,
      participant_id,
      content,
      status,
      submitted_at,
      reviewed_at,
      updated_at,
      revision_comment,
      feedback_public,
      feedback_post_id
    `)
      .eq("quest_id", questId)
      .eq("participant_id", participantId)
      .order("submitted_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

        if (error) {
          console.error("成果物提出状況取得エラー:", error)
          console.error("error.message:", error.message)
          console.error("error.code:", error.code)
          console.error("error.details:", error.details)
          console.error("error.hint:", error.hint)
          return
        }

      if (data) {
        setSubmission(data as QuestSubmission)

        setSubmissionContent(data.content ?? "")
        setSubmissionStatus(data.status ?? null)
      } else {
        setSubmission(null)

        setSubmissionContent("")
        setSubmissionStatus(null)
      }
    } catch (error) {
      console.error("成果物提出状況取得エラー:", error)
    }
  }

  fetchSubmission()
}, [
  questId,
  userId,
  isParticipant,
  participantId,
])
  useEffect(() => {
    if (!questId || !userId) return
  
    const canAccessMessages =
      userId === quest?.requester_id || isParticipant
  
    if (!canAccessMessages) return
  
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("quest_messages")
        .select(`
          id,
          quest_id,
          sender_id,
          message,
          created_at
        `)
        .eq("quest_id", questId)
        .order("created_at", {
          ascending: true,
        })
  
      if (error) {
        console.error("メッセージ取得エラー:", error)
        return
      }
  
      setMessages(data ?? [])
    }
  
    fetchMessages()
  }, [
    questId,
    userId,
    quest?.requester_id,
    isParticipant,
  ])


// 応募人数取得
useEffect(() => {
  if (!questId) return

  const fetchApplicationCount = async () => {
    const { count, error } = await supabase
      .from("quest_applications")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("quest_id", questId)
      .eq("status", "pending")

    if (error) {
      console.error("応募人数取得エラー:", error)
      return
    }

    setApplicationCount(count ?? 0)
  }

  fetchApplicationCount()
}, [questId, applied])


// 応募者一覧取得
useEffect(() => {
  if (!questId || !userId || !quest) return

  // 依頼者本人だけが応募者一覧を取得
  if (userId !== quest.requester_id) return

  const fetchApplicants = async () => {
    try {
      setLoadingApplicants(true)

      // ① 応募者一覧を取得
      const {
        data: applicationData,
        error: applicationError,
      } = await supabase
        .from("quest_applications")
        .select(`
          id,
          quest_id,
          applicant_id,
          message,
          status,
          applied_at
        `)
        .eq("quest_id", questId)
        .order("applied_at", {
          ascending: true,
        })

      if (applicationError) {
        console.error(
          "応募者一覧取得エラー:",
          applicationError
        )
        return
      }

      if (!applicationData || applicationData.length === 0) {
        setApplicants([])
        return
      }

      // ② 応募者のuser_idを取得
      const applicantIds = applicationData.map(
        (application) => application.applicant_id
      )

      // ③ profilesを別取得
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(`
          user_id,
          username,
          avatar_url
        `)
        .in("user_id", applicantIds)

      if (profileError) {
        console.error(
          "応募者プロフィール取得エラー:",
          profileError
        )

        // プロフィールが取得できなくても
        // 応募者一覧自体は表示する
        setApplicants(
          applicationData.map((application) => ({
            ...application,
            profile: null,
          })) as Applicant[]
        )

        return
      }

      // ④ 応募情報とプロフィールを結合
      const applicantsWithProfiles = applicationData.map(
        (application) => {
          const profile =
            profileData?.find(
              (profile) =>
                profile.user_id === application.applicant_id
            ) ?? null

          return {
            ...application,
            profile,
          }
        }
      )

      setApplicants(
        applicantsWithProfiles as Applicant[]
      )

    } catch (error) {
      console.error(
        "応募者一覧取得エラー:",
        error
      )
    } finally {
      setLoadingApplicants(false)
    }
  }

  fetchApplicants()
}, [questId, userId, quest])

  const handleApply = async () => {
    if (!userId) {
      alert("ログインが必要です。")
      return
    }
  
    if (!quest) return
  
    if (applying) return
  
    if (userId === quest.requester_id) {
      alert("自分が作成したクエストには応募できません。")
      return
    }
  
    if (quest.status !== "open") {
      alert("このクエストは現在応募を受け付けていません。")
      return
    }
  
    if (new Date(quest.deadline) <= new Date()) {
      alert("このクエストは応募期限を過ぎています。")
      return
    }

  
    if (applicationMessage.length > 2000) {
      alert("応募メッセージは2000文字以内にしてください。")
      return
    }
  
    try {
      setApplying(true)
  
      const { data, error } = await supabase.rpc(
        "apply_to_quest",
        {
          p_quest_id: quest.id,
          p_message: applicationMessage.trim() || null,
        }
      )
  
      if (error) {
        console.error("クエスト応募エラー:", error)
        alert(error.message)
        return
      }
  
      if (!data?.success) {
        alert("応募に失敗しました。")
        return
      }
  
      setApplied(true)
      setApplicationCount((count) => count + 1)
      setApplicationMessage("")
      
      await createNotification(
        quest.requester_id,
        "quest_application",
        `「${quest.title}」にクエストの応募がありました。`,
        userId,
        undefined,
        `/quests/${quest.id}`
      )
  
      alert("クエストに応募しました。")
    } catch (error) {
      console.error("クエスト応募エラー:", error)
      alert("応募中にエラーが発生しました。")
    } finally {
      setApplying(false)
    }
  }

  const handleAcceptApplicant = async (
    applicationId: string,
    applicantId: string,
    applicantName: string
  ) => {
    if (!userId || !quest) {
      return
    }
  
    if (userId !== quest.requester_id) {
      alert("この操作を行う権限がありません。")
      return
    }
  
    if (acceptingApplicantId) {
      return
    }
  
    const confirmed = window.confirm(
      `${applicantName}さんにこのクエストを依頼しますか？\n\n受注者を決定すると、他の応募者は不採用になります。`
    )
  
    if (!confirmed) {
      return
    }
  
    try {
      setAcceptingApplicantId(applicationId)
  
      const { data, error } = await supabase.rpc(
        "accept_quest_applicant",
        {
          p_application_id: applicationId,
        }
      )
  
      if (error) {
        console.error("受注者決定エラー:", error)
        alert(error.message || "受注者の決定に失敗しました。")
        return
      }
  
      console.log("受注者決定結果:", data)

      await createNotification(
        applicantId,
        "quest_accepted",
        `「${quest.title}」の受注者に決定しました。`,
        userId,
        undefined,
        `/quests/${quest.id}`
      )
  
      alert(`${applicantName}さんに依頼しました。`)
  
      // クエスト情報を再取得
      const { data: updatedQuest, error: questError } = await supabase
        .from("quests")
        .select(`
          *,
          quest_type:quest_types (
            id,
            name
          )
        `)
        .eq("id", questId)
        .maybeSingle()
  
      if (questError) {
        console.error("クエスト再取得エラー:", questError)
      } else {
        setQuest(updatedQuest as QuestDetail | null)
      }
  
// 応募者一覧を再取得
const {
  data: updatedApplications,
  error: applicantsError,
} = await supabase
  .from("quest_applications")
  .select(`
    id,
    quest_id,
    applicant_id,
    message,
    status,
    applied_at
  `)
  .eq("quest_id", questId)
  .order("applied_at", {
    ascending: true,
  })

if (applicantsError) {
  console.error(
    "応募者一覧再取得エラー:",
    applicantsError
  )
} else if (!updatedApplications || updatedApplications.length === 0) {
  setApplicants([])
} else {
  // 応募者IDを取得
  const applicantIds = updatedApplications.map(
    (application) => application.applicant_id
  )

  // プロフィール取得
  const {
    data: updatedProfiles,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      user_id,
      username,
      avatar_url
    `)
    .in("user_id", applicantIds)

  if (profileError) {
    console.error(
      "応募者プロフィール再取得エラー:",
      profileError
    )

    setApplicants(
      updatedApplications.map((application) => ({
        ...application,
        profile: null,
      })) as Applicant[]
    )
  } else {
    const applicantsWithProfiles =
      updatedApplications.map((application) => {
        const profile =
          updatedProfiles?.find(
            (profile) =>
              profile.user_id === application.applicant_id
          ) ?? null

        return {
          ...application,
          profile,
        }
      })

    setApplicants(
      applicantsWithProfiles as Applicant[]
    )
  }
}

    } catch (error) {
      console.error("受注者決定エラー:", error)
      alert("受注者の決定に失敗しました。")
    } finally {
      setAcceptingApplicantId(null)
    }
  }

  const handleSubmitWork = async () => {
    if (!userId) {
      alert("ログインが必要です。")
      return
    }
  
    if (!quest) return
  
    if (!isParticipant) {
      alert("このクエストの受注者ではありません。")
      return
    }
  
    if (!participantId) {
      alert("受注者情報を取得できませんでした。")
      return
    }
  
    if (submitting) return
  
    // すでに提出済みの場合
    // 修正依頼がある場合のみ再提出可能
    if (
      submission &&
      submission.status !== "revision_requested"
    ) {
      alert(
        "すでに成果物を提出済みです。修正依頼がある場合のみ再提出できます。"
      )
      return
    }
  
    const content = submissionContent.trim()
  
    if (!content) {
      alert("成果物を入力してください。")
      return
    }
  
    if (content.length > 10000) {
      alert("成果物は10000文字以内にしてください。")
      return
    }
  
    try {
      setSubmitting(true)
  
      let data
      let error
  
      // =========================
      // 修正依頼後の再提出
      // =========================
      if (
        submission &&
        submission.status === "revision_requested"
      ) {
        const result = await supabase
          .from("quest_submissions")
          .update({
            content,
            status: "submitted",
            reviewed_at: null,
            revision_comment: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", submission.id)
          .select(`
          id,
          quest_id,
          participant_id,
          content,
          status,
          submitted_at,
          reviewed_at,
          updated_at,
          revision_comment,
          feedback_public,
          feedback_post_id
        `)
          .single()
  
        data = result.data
        error = result.error
      }
  
      // =========================
      // 初回提出
      // =========================
      else {
        const result = await supabase
          .from("quest_submissions")
          .insert({
            quest_id: quest.id,
            participant_id: participantId,
            content,
            status: "submitted",
          })
          .select(`
          id,
          quest_id,
          participant_id,
          content,
          status,
          submitted_at,
          reviewed_at,
          updated_at,
          revision_comment,
          feedback_public,
          feedback_post_id
        `)
          .single()
  
        data = result.data
        error = result.error
      }
  
      if (error) {
        console.error("成果物提出エラー:", error)
        alert(error.message)
        return
      }
  
      if (!data) {
        alert("成果物の保存結果を取得できませんでした。")
        return
      }

      await createNotification(
        quest.requester_id,
        "quest_submission",
        `「${quest.title}」の成果物が提出されました。`,
        userId,
        undefined,
        `/quests/${quest.id}`
      )
  
      // stateを更新
      setSubmission(data as QuestSubmission)
  
      setSubmissionContent(data.content)
      setSubmissionStatus(data.status)
  
      alert("成果物を提出しました。")
    } catch (error) {
      console.error("成果物提出エラー:", error)
      alert("成果物の提出に失敗しました。")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestRevision = async () => {
    if (!userId || !quest || !submission) {
      return
    }
  
    if (userId !== quest.requester_id) {
      alert("この操作を行う権限がありません。")
      return
    }
  
    const comment = revisionComment.trim()
  
    if (!comment) {
      alert("修正内容を入力してください。")
      return
    }
  
    if (comment.length > 2000) {
      alert("修正内容は2000文字以内にしてください。")
      return
    }
  
    if (requestingRevision) return
  
    try {
      setRequestingRevision(true)
  
      const { data, error } = await supabase
        .from("quest_submissions")
        .update({
          status: "revision_requested",
          revision_comment: comment,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submission.id)
        .select(`
        id,
        quest_id,
        participant_id,
        content,
        status,
        submitted_at,
        reviewed_at,
        updated_at,
        revision_comment,
        feedback_public,
        feedback_post_id
      `)
        .single()
  
      if (error) {
        console.error("修正依頼エラー:", error)
        alert(error.message)
        return
      }
  
      setSubmission({
        ...data,
        revision_comment: data.revision_comment,
      } as QuestSubmission & {
        revision_comment: string | null
      })

      await createNotification(
        submission.participant_id
          ? (
              await supabase
                .from("quest_participants")
                .select("user_id")
                .eq("id", submission.participant_id)
                .maybeSingle()
            ).data?.user_id ?? ""
          : "",
        "quest_revision_requested",
        `「${quest.title}」の成果物に修正依頼が届きました。`,
        userId,
        undefined,
        `/quests/${quest.id}`
      )
  
      setRevisionComment("")
  
      alert("修正を依頼しました。")
    } catch (error) {
      console.error("修正依頼エラー:", error)
      alert("修正依頼に失敗しました。")
    } finally {
      setRequestingRevision(false)
    }
  }


  const handleApproveSubmission = async () => {
    if (!userId || !quest || !submission) {
      return
    }
  
    if (userId !== quest.requester_id) {
      alert("この操作を行う権限がありません。")
      return
    }
  
    if (submission.status !== "submitted") {
      alert("承認できる成果物がありません。")
      return
    }
  
    if (approvingSubmission) {
      return
    }
  
    const confirmed = window.confirm(
      "この成果物を承認しますか？\n\n承認すると、成果物の確認が完了します。"
    )
  
    if (!confirmed) {
      return
    }
  
    try {
      setApprovingSubmission(true)
  
      const { data, error } = await supabase
        .from("quest_submissions")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          revision_comment: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", submission.id)
        .eq("status", "submitted")
        .select(`
        id,
        quest_id,
        participant_id,
        content,
        status,
        submitted_at,
        reviewed_at,
        updated_at,
        revision_comment,
        feedback_public,
        feedback_post_id
      `)
        .single()
  
      if (error) {
        console.error("成果物承認エラー:", error)
        alert(error.message || "成果物の承認に失敗しました。")
        return
      }
  
      if (!data) {
        alert("成果物の承認結果を取得できませんでした。")
        return
      }
  
      // 承認後の成果物を画面に反映
      setSubmission(data as QuestSubmission)
      setSubmissionContent(data.content ?? "")
      setSubmissionStatus(data.status ?? null)
  
      // 受注者の user_id を取得
      const { data: participantData, error: participantError } =
        await supabase
          .from("quest_participants")
          .select("user_id")
          .eq("id", submission.participant_id)
          .maybeSingle()
  
      if (participantError) {
        console.error(
          "受注者情報取得エラー:",
          participantError
        )
      } else if (participantData?.user_id) {
        // 受注者へ承認通知
        await createNotification(
          participantData.user_id,
          "quest_submission_approved",
          `「${quest.title}」の成果物が承認されました。`,
          userId,
          undefined,
          `/quests/${quest.id}`
        )
      }
  
      alert("成果物を承認しました。")
    } catch (error) {
      console.error("成果物承認エラー:", error)
      alert("成果物の承認に失敗しました。")
    } finally {
      setApprovingSubmission(false)
    }
  }
  
  const handlePublishFeedback = async () => {
    if (!userId || !quest || !submission) {
      return
    }
  
    // 感想を公開できるのは依頼者
    if (userId !== quest.requester_id) {
      alert("感想を公開できるのは依頼者本人のみです。")
      return
    }
  
    if (submission.status !== "approved") {
      alert("承認済みの感想のみ公開できます。")
      return
    }
  
    if (
      quest.quest_type?.name !== "感想依頼" &&
      quest.quest_type?.name !== "読後レビュー依頼"
    ) {
      alert("このクエストは感想公開の対象ではありません。")
      return
    }
  
    if (submission.feedback_public || submission.feedback_post_id) {
      setFeedbackPublished(true)
      return
    }
  
    if (publishingFeedback) {
      return
    }
  
    const confirmed = window.confirm(
      "この感想をタイムラインに公開しますか？\n\n公開すると、ブンゴウクルーのタイムラインで他のユーザーも読めるようになります。"
    )
  
    if (!confirmed) {
      return
    }
  
    try {
      setPublishingFeedback(true)
  
      const { data, error } = await supabase.rpc(
        "publish_quest_feedback",
        {
          p_submission_id: submission.id,
        }
      )
  
      if (error) {
        console.error("感想公開エラー:", error)
        alert(error.message || "感想の公開に失敗しました。")
        return
      }
  
      if (!data?.success) {
        alert(
          data?.message ||
          "感想の公開に失敗しました。"
        )
        return
      }
  
      // DB上の公開状態を画面にも反映
      setFeedbackPublished(true)
  
      setSubmission((current) =>
        current
          ? {
              ...current,
              feedback_public: true,
              feedback_post_id: data.post_id ?? current.feedback_post_id,
            }
          : current
      )
  
      alert("感想をタイムラインに公開しました。")
  
    } catch (error) {
      console.error("感想公開エラー:", error)
      alert("感想の公開に失敗しました。")
    } finally {
      setPublishingFeedback(false)
    }
  }

  const handleCancelQuest = async () => {
    if (!userId) {
      alert("ログインが必要です。")
      return
    }
  
    if (!quest) {
      return
    }
  
    if (userId !== quest.requester_id) {
      alert("この操作を行う権限がありません。")
      return
    }
  
    if (quest.status !== "open") {
      alert("このクエストはキャンセルできません。")
      return
    }
  
    const confirmed = window.confirm(
      "このクエストをキャンセルしますか？\n\n予約されている報酬は返金されます。"
    )
  
    if (!confirmed) {
      return
    }
  
    try {
      const { data, error } = await supabase.rpc(
        "cancel_quest",
        {
          p_quest_id: quest.id,
        }
      )
  
      if (error) {
        console.error("クエストキャンセルエラー:", error)
        alert(error.message || "クエストのキャンセルに失敗しました。")
        return
      }
  
      console.log("クエストキャンセル結果:", data)
  
      if (!data?.success) {
        alert(
          data?.message ||
          "クエストのキャンセルに失敗しました。"
        )
        return
      }
  
      alert("クエストをキャンセルしました。")
  
      // クエスト情報を再取得
      const {
        data: updatedQuest,
        error: questError,
      } = await supabase
        .from("quests")
        .select(`
          *,
          quest_type:quest_types (
            id,
            name
          )
        `)
        .eq("id", quest.id)
        .maybeSingle()
  
      if (questError) {
        console.error(
          "クエスト再取得エラー:",
          questError
        )
        return
      }
  
      setQuest(updatedQuest as QuestDetail | null)
  
    } catch (error) {
      console.error(
        "クエストキャンセルエラー:",
        error
      )
  
      alert("クエストのキャンセルに失敗しました。")
    }
  }

  const handleConfirmReward = async () => {
    if (!userId || !quest || !submission) {
      return
    }
  
    if (userId !== quest.requester_id) {
      alert("この操作を行う権限がありません。")
      return
    }
  
    if (submission.status !== "approved") {
      alert("成果物が承認されていません。")
      return
    }
  
    if (confirmingReward || rewardConfirmed) {
      return
    }
  
    const confirmed = window.confirm(
      `報酬 ${quest.reward_per_person.toLocaleString()} pt を確定しますか？\n\n確定すると受注者にポイントが付与され、クエストが完了します。`
    )
  
    if (!confirmed) {
      return
    }
  
    try {
      setConfirmingReward(true)
  
      const { data, error } = await supabase.rpc(
        "confirm_quest_reward",
        {
          p_quest_id: quest.id,
          p_participant_id: submission.participant_id,
        }
      )
  
      if (error) {
        console.error("報酬確定エラー:", error)
        alert(error.message || "報酬の確定に失敗しました。")
        return
      }
  
      if (!data?.success) {
        alert("報酬の確定に失敗しました。")
        return
      }
  
      setRewardConfirmed(true)
  
      // クエスト情報を再取得
      const {
        data: updatedQuest,
        error: questError,
      } = await supabase
        .from("quests")
        .select(`
          *,
          quest_type:quest_types (
            id,
            name
          )
        `)
        .eq("id", quest.id)
        .maybeSingle()
  
      if (questError) {
        console.error(
          "クエスト再取得エラー:",
          questError
        )
      } else {
        setQuest(updatedQuest as QuestDetail | null)
      }
  
      // 受注者へ通知
      if (data.user_id) {
        await createNotification(
          data.user_id,
          "quest_reward_confirmed",
          `「${quest.title}」の報酬 ${quest.reward_per_person.toLocaleString()} pt が確定しました。`,
          userId,
          undefined,
          `/quests/${quest.id}`
        )
      }
  
      alert(
        `報酬 ${quest.reward_per_person.toLocaleString()} pt を確定しました。`
      )
    } catch (error) {
      console.error("報酬確定エラー:", error)
      alert("報酬の確定に失敗しました。")
    } finally {
      setConfirmingReward(false)
    }
  }

  const handleSubmitReport = async () => {
    if (!userId) {
      alert("ログインが必要です。")
      return
    }
  
    if (!quest) {
      return
    }
  
    if (reporting) {
      return
    }
  
    if (reported) {
      alert("このクエストはすでに通報済みです。")
      setReportOpen(false)
      return
    }
  
    if (!reportReason) {
      alert("通報理由を選択してください。")
      return
    }
  
    const description = reportDescription.trim()
  
    if (description.length > 2000) {
      alert("詳細説明は2000文字以内にしてください。")
      return
    }
  
    try {
      setReporting(true)
  
      const { error } = await supabase
        .from("reports")
        .insert({
          reporter_id: userId,
          target_type: "quest",
          target_id: quest.id,
          reason: reportReason,
          description: description || null,
          status: "pending",
        })
  
      if (error) {
        console.error("クエスト通報エラー:", error)
        alert(error.message || "通報に失敗しました。")
        return
      }
  
      setReported(true)
      setReportOpen(false)
      setReportReason("")
      setReportDescription("")
  
      alert("通報を受け付けました。")
    } catch (error) {
      console.error("クエスト通報エラー:", error)
      alert("通報に失敗しました。")
    } finally {
      setReporting(false)
    }
  }

  const handleSendMessage = async () => {
    if (!userId) {
      alert("ログインが必要です。")
      return
    }

    if (!quest) return

    if (sendingMessage) return

    const text = messageText.trim()

    if (!text) {
      alert("メッセージを入力してください。")
      return
    }

    if (text.length > 2000) {
      alert("メッセージは2000文字以内にしてください。")
      return
    }

    const canSend =
      userId === quest.requester_id || isParticipant

    if (!canSend) {
      alert("このクエストのメッセージを送信する権限がありません。")
      return
    }

    try {
      setSendingMessage(true)

      const { data, error } = await supabase
        .from("quest_messages")
        .insert({
          quest_id: quest.id,
          sender_id: userId,
          message: text,
        })
        .select(`
          id,
          quest_id,
          sender_id,
          message,
          created_at
        `)
        .single()

      if (error) {
        console.error("メッセージ送信エラー:", error)
        alert(error.message)
        return
      }

      setMessages((current) => [
        ...current,
        data,
      ])

      setMessageText("")

      // =========================
      // メッセージ通知
      // =========================

      let notificationUserId: string | null = null

      // 依頼者が送信した場合
      // → 受注者へ通知
      if (userId === quest.requester_id) {
        const { data: participantData, error: participantError } =
          await supabase
            .from("quest_participants")
            .select("user_id")
            .eq("quest_id", quest.id)
            .eq("status", "accepted")
            .maybeSingle()

        if (participantError) {
          console.error(
            "受注者情報取得エラー:",
            participantError
          )
        } else {
          notificationUserId =
            participantData?.user_id ?? null
        }
      }

      // 受注者が送信した場合
      // → 依頼者へ通知
      else if (isParticipant) {
        notificationUserId = quest.requester_id
      }

      // 自分自身には通知しない
      if (
        notificationUserId &&
        notificationUserId !== userId
      ) {
        await createNotification(
          notificationUserId,
          "quest_message",
          `「${quest.title}」に新しいメッセージが届きました。`,
          userId,
          undefined,
          `/quests/${quest.id}`
        )
      }

    } catch (error) {
      console.error("メッセージ送信エラー:", error)
      alert("メッセージの送信に失敗しました。")
    } finally {
      setSendingMessage(false)
    }
  }


  const formatDeadline = (deadline: string) => {
    return new Date(deadline).toLocaleString("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }




  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-gray-500">
            クエストを読み込んでいます...
          </p>
        </div>
      </main>
    )
  }


  if (!quest) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl">

          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">

            <h1 className="text-xl font-bold text-gray-900">
              クエストが見つかりません
            </h1>

            <p className="mt-3 text-sm text-gray-500">
              このクエストは存在しないか、
              削除された可能性があります。
            </p>

            <Link
              href="/quests"
              className="mt-6 inline-block rounded-xl bg-black px-5 py-3 font-bold text-white hover:bg-gray-800"
            >
              クエスト一覧へ戻る
            </Link>

          </div>

        </div>
      </main>
    )
  }


  const isRequester = userId === quest.requester_id

  const isDeadlinePassed =
    new Date(quest.deadline) <= new Date()

    const canApply =
    quest.status === "open" &&
    !isRequester &&
    !isDeadlinePassed &&
    !applied

  return (
    <main className="min-h-screen bg-gray-50 p-6">

      <div className="mx-auto max-w-3xl">

        {/* 戻る */}
        <Link
          href="/quests"
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← クエスト一覧に戻る
        </Link>


        {/* クエストカード */}
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          {/* クエスト種類 */}
          <div className="text-sm font-bold text-purple-600">
            {quest.quest_type?.name ?? "クエスト"}
          </div>


          {/* タイトル */}
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {quest.title}
          </h1>




          {/* 応募者一覧 */}
{userId === quest.requester_id && (
  <section className="mt-8">

    <h2 className="text-lg font-bold text-gray-900">
      応募者
    </h2>

    {loadingApplicants ? (

      <div className="mt-3 rounded-2xl bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-500">
          応募者を読み込んでいます...
        </p>
      </div>

    ) : applicants.length === 0 ? (

      <div className="mt-3 rounded-2xl bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-500">
          まだ応募者はいません。
        </p>
      </div>

    ) : (

      <div className="mt-3 space-y-4">

        {applicants.map((applicant) => {

          const applicantName =
            applicant.profile?.username ||
            "名前未設定"

          const isAccepted =
            applicant.status === "accepted"

          const isPending =
            applicant.status === "pending"

          return (
            <div
              key={applicant.id}
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >

              {/* ユーザー情報 */}
              <div className="flex items-center gap-3">

                {applicant.profile?.avatar_url ? (
                  <img
                    src={applicant.profile.avatar_url}
                    alt={applicantName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                    {applicantName.charAt(0)}
                  </div>
                )}

                <div>
                  <p className="font-bold text-gray-900">
                    {applicantName}
                  </p>

                  <p className="text-xs text-gray-400">
                    応募日時：
                    {new Date(
                      applicant.applied_at
                    ).toLocaleString("ja-JP")}
                  </p>
                </div>

              </div>


              {/* ステータス */}
              <div className="mt-4">

                {isAccepted ? (

                  <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    受注者に決定
                  </span>

                ) : isPending ? (

                  <span className="inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                    応募中
                  </span>

                ) : (

                  <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                    {applicant.status}
                  </span>

                )}

              </div>


              {/* 応募メッセージ */}
              {applicant.message && (
                <div className="mt-4 rounded-xl bg-gray-50 p-4">

                  <p className="text-xs font-bold text-gray-500">
                    応募メッセージ
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {applicant.message}
                  </p>

                </div>
              )}


              {/* 受注者決定 */}
              {isPending && (
                <button
                  type="button"
                  onClick={() =>
                    handleAcceptApplicant(
                      applicant.id,
                      applicant.applicant_id,
                      applicantName
                    )
                  }
                  disabled={
                    acceptingApplicantId !== null
                  }
                  className="mt-4 w-full rounded-xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {acceptingApplicantId === applicant.id
                    ? "依頼しています..."
                    : "この人に依頼する"}
                </button>
              )}

            </div>
          )
        })}

      </div>

    )}

  </section>
)}

          {/* クエストメッセージ */}
{userId &&
  quest &&
  (userId === quest.requester_id || isParticipant) && (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-gray-900">
        クエストメッセージ
      </h2>

      <div className="mt-3 rounded-2xl border border-gray-200 bg-white">

        {/* メッセージ一覧 */}
        <div className="max-h-96 space-y-3 overflow-y-auto p-4">

          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              まだメッセージはありません。
            </p>
          ) : (
            messages.map((message) => {
              const isMine =
                message.sender_id === userId

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isMine
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      isMine
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {message.message}
                    </p>

                    <p
                      className={`mt-1 text-xs ${
                        isMine
                          ? "text-gray-300"
                          : "text-gray-500"
                      }`}
                    >
                      {new Date(
                        message.created_at
                      ).toLocaleString("ja-JP", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )
            })
          )}

        </div>

        {/* メッセージ入力 */}
        <div className="border-t border-gray-200 p-4">

          <textarea
            value={messageText}
            onChange={(e) =>
              setMessageText(e.target.value)
            }
            rows={3}
            maxLength={2000}
            placeholder="依頼者・受注者へのメッセージを入力してください。"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          />

          <div className="mt-2 flex items-center justify-between">

            <span className="text-xs text-gray-400">
              {messageText.length}/2000
            </span>

            <button
              type="button"
              onClick={handleSendMessage}
              disabled={
                sendingMessage ||
                !messageText.trim()
              }
              className="rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {sendingMessage
                ? "送信中..."
                : "送信"}
            </button>

          </div>

        </div>

      </div>
    </section>
  )}

{/* 提出された成果物 */}
{userId === quest.requester_id && (
  <section className="mt-8">

    <h2 className="text-lg font-bold text-gray-900">
      提出された成果物
    </h2>

    {loadingSubmission ? (

      <div className="mt-3 rounded-2xl bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-500">
          成果物を読み込んでいます...
        </p>
      </div>

    ) : !submission ? (

      <div className="mt-3 rounded-2xl bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-500">
          まだ成果物は提出されていません。
        </p>
      </div>

    ) : (

      <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-5">

        <div className="flex items-center justify-between gap-3">

        <span
  className={`rounded-full px-3 py-1 text-xs font-bold ${
    submission.status === "approved"
      ? "bg-green-100 text-green-700"
      : submission.status === "revision_requested"
        ? "bg-orange-100 text-orange-700"
        : "bg-blue-100 text-blue-700"
  }`}
>
  {submission.status === "approved"
    ? "承認済み"
    : submission.status === "revision_requested"
      ? "修正依頼"
      : "提出済み"}
</span>

          <span className="text-xs text-gray-400">
            {new Date(
              submission.submitted_at
            ).toLocaleString("ja-JP")}
          </span>

        </div>

        <div className="mt-5">

          <p className="text-xs font-bold text-gray-500">
            成果物
          </p>

          <div className="mt-2 rounded-xl bg-gray-50 p-5">

            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
              {submission.content}
            </p>

          </div>

        </div>

      </div>

    )}

  </section>
)}

{submission && submission.status === "approved" && (
  <div className="mt-5 rounded-xl bg-green-50 p-4">
    <p className="font-bold text-green-700">
      ✓ 成果物の確認が完了しました
    </p>
  </div>
)}

{submission &&
  submission.status === "approved" &&
  userId === quest.requester_id &&
  !rewardConfirmed &&
  quest.status === "in_progress" && (
    <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-5">

      <h3 className="font-bold text-gray-900">
        報酬を確定する
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        成果物の確認が完了しています。
        問題がなければ報酬を確定してください。
      </p>

      <div className="mt-4 rounded-xl bg-white p-4">

        <div className="flex items-center justify-between">

          <span className="text-sm text-gray-500">
            受注者への報酬
          </span>

          <span className="text-xl font-bold text-gray-900">
            {quest.reward_per_person.toLocaleString()} pt
          </span>

        </div>

      </div>

      <button
        type="button"
        onClick={handleConfirmReward}
        disabled={confirmingReward}
        className="mt-4 w-full rounded-xl bg-yellow-500 px-5 py-4 font-bold text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {confirmingReward
          ? "報酬を確定しています..."
          : "💰 報酬を確定する"}
      </button>

    </div>
)}

{quest.status === "completed" && (
  <div className="mt-6 rounded-2xl bg-green-50 p-5">

    <div className="flex items-center gap-2">
      <span className="text-lg">💰</span>

      <h3 className="font-bold text-green-700">
        報酬確定済み
      </h3>
    </div>

    <div className="mt-3 rounded-xl bg-white p-4">

      <div className="flex items-center justify-between">

        <span className="text-sm text-gray-500">
          確定報酬
        </span>

        <span className="text-xl font-bold text-gray-900">
          {quest.reward_per_person.toLocaleString()} pt
        </span>

      </div>

    </div>

    <p className="mt-3 text-sm text-green-700">
      クエストが完了しました。
    </p>

  </div>
)}

{/* 感想公開 */}
{quest.status === "completed" &&
  submission &&
  submission.status === "approved" &&
  userId === quest.requester_id &&
  (quest.quest_type?.name === "感想依頼" ||
    quest.quest_type?.name === "読後レビュー依頼") && (
    <section className="mt-6">

      {submission.feedback_public ? (

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">

          <div className="flex items-center gap-2">
            <span className="text-lg">
              📢
            </span>

            <h3 className="font-bold text-blue-700">
              感想をタイムラインに公開しました
            </h3>
          </div>

          <p className="mt-3 text-sm leading-6 text-blue-700">
            この感想はブンゴウクルーのタイムラインで公開されています。
          </p>

        </div>

      ) : (

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">

          <div className="flex items-center gap-2">

            <span className="text-lg">
              💬
            </span>

            <h3 className="font-bold text-gray-900">
              感想をタイムラインに公開する
            </h3>

          </div>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            受注者が書いてくれた感想を、
            ブンゴウクルーのタイムラインに公開できます。
          </p>

          <div className="mt-4 rounded-xl bg-white p-4">

            <p className="text-xs font-bold text-gray-500">
              公開される感想
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700">
              {submission.content}
            </p>

          </div>

          <button
            type="button"
            onClick={handlePublishFeedback}
            disabled={publishingFeedback}
            className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {publishingFeedback
              ? "タイムラインに公開しています..."
              : "📢 感想をタイムラインに公開する"}
          </button>

          <p className="mt-3 text-center text-xs text-gray-500">
            公開すると、ブンゴウクルーの他のユーザーもこの感想を読むことができます。
          </p>

        </div>

      )}

    </section>
  )}

{submission &&
  submission.status === "submitted" &&
  userId === quest.requester_id && (
    <div className="mt-6 border-t border-gray-200 pt-5">

      <h3 className="font-bold text-gray-900">
        成果物を確認する
      </h3>

      <p className="mt-2 text-sm text-gray-500">
        成果物を確認して、問題がなければ承認してください。
      </p>

      {/* 承認 */}
      <button
        type="button"
        onClick={handleApproveSubmission}
        disabled={approvingSubmission || requestingRevision}
        className="mt-4 w-full rounded-xl bg-green-600 px-5 py-4 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {approvingSubmission
          ? "承認しています..."
          : "✓ 成果物を承認する"}
      </button>

      {/* 修正依頼 */}
      <div className="mt-6 border-t border-gray-200 pt-5">

        <h4 className="font-bold text-gray-900">
          修正を依頼する
        </h4>

        <textarea
          value={revisionComment}
          onChange={(e) =>
            setRevisionComment(e.target.value)
          }
          rows={5}
          maxLength={2000}
          placeholder="修正してほしい内容を入力してください。"
          className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
        />

        <div className="mt-1 text-right text-xs text-gray-400">
          {revisionComment.length}/2000
        </div>

        <button
          type="button"
          onClick={handleRequestRevision}
          disabled={
            requestingRevision ||
            approvingSubmission ||
            !revisionComment.trim()
          }
          className="mt-4 w-full rounded-xl bg-orange-500 px-5 py-3 font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {requestingRevision
            ? "修正を依頼しています..."
            : "修正を依頼する"}
        </button>

      </div>

    </div>
)}

{submission &&
  submission.status === "revision_requested" &&
  isParticipant && (
  <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">

    <div className="flex items-center gap-2">
      <span className="text-lg">⚠️</span>

      <h3 className="font-bold text-orange-800">
        修正が必要です
      </h3>
    </div>

    <p className="mt-3 text-sm font-bold text-gray-700">
      依頼者からの修正内容
    </p>

    <div className="mt-2 rounded-xl bg-white p-4">
      <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
        {submission.revision_comment ||
          "修正内容が指定されていません。"}
      </p>
    </div>

  </div>
)}


{/* 成果物提出 */}
{isParticipant && (
  <section className="mt-8">

    <h2 className="text-lg font-bold text-gray-900">
      成果物を提出する
    </h2>

    {submissionStatus === "approved" ? (

      /* =========================
         承認済み
         ========================= */
      <div className="mt-3 rounded-2xl bg-green-50 p-6">

        <div className="flex items-center justify-between">

          <p className="font-bold text-green-700">
            成果物が承認されました
          </p>

          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
            承認済み
          </span>

        </div>

        <div className="mt-4 rounded-xl bg-white p-4">

          <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {submissionContent}
          </p>

        </div>

        <p className="mt-4 text-sm text-green-700">
          依頼者による成果物の確認が完了しました。
        </p>

        {userId === quest.requester_id &&
  (quest.quest_type?.name === "感想依頼" ||
    quest.quest_type?.name === "読後レビュー依頼") && (
  <div className="mt-5 border-t border-green-200 pt-5">

    <h3 className="font-bold text-gray-900">
      感想をタイムラインに公開
    </h3>

    <p className="mt-2 text-sm leading-6 text-gray-600">
      この感想をタイムラインに公開できます。
      公開すると、他のユーザーもこの感想を読むことができます。
    </p>

    {feedbackPublished ? (
      <div className="mt-4 rounded-xl bg-green-100 p-4">
        <p className="font-bold text-green-700">
          ✓ タイムラインに公開しました
        </p>
      </div>
    ) : (
      <button
        type="button"
        onClick={handlePublishFeedback}
        disabled={publishingFeedback}
        className="mt-4 w-full rounded-xl bg-purple-600 px-5 py-4 font-bold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {publishingFeedback
          ? "公開しています..."
          : "📢 タイムラインに公開する"}
      </button>
    )}

  </div>
)}

      </div>

    ) : submissionStatus === "submitted" ? (

      /* =========================
         提出済み・確認待ち
         ========================= */
      <div className="mt-3 rounded-2xl bg-blue-50 p-6">

        <div className="flex items-center justify-between">

          <p className="font-bold text-blue-700">
            成果物を提出済みです
          </p>

          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
            確認待ち
          </span>

        </div>

        <div className="mt-4 rounded-xl bg-white p-4">

          <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {submissionContent}
          </p>

        </div>

        <p className="mt-4 text-sm text-blue-700">
          依頼者が成果物を確認しています。
        </p>

      </div>

    ) : (

      /* =========================
         未提出 / 修正依頼後
         ========================= */
      <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-5">

        <textarea
          value={submissionContent}
          onChange={(e) =>
            setSubmissionContent(e.target.value)
          }
          rows={10}
          maxLength={10000}
          placeholder={
            submissionStatus === "revision_requested"
              ? "修正した成果物を入力してください。"
              : "成果物を入力してください。"
          }
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
        />

        <div className="mt-1 text-right text-xs text-gray-400">
          {submissionContent.length}/10000
        </div>

        <button
          type="button"
          onClick={handleSubmitWork}
          disabled={
            submitting ||
            !submissionContent.trim()
          }
          className="mt-4 w-full rounded-xl bg-black px-5 py-4 font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {submitting
            ? "提出しています..."
            : submissionStatus === "revision_requested"
              ? "修正版を提出する"
              : "成果物を提出する"}
        </button>

      </div>

    )}

  </section>
)}

          {/* 依頼内容 */}
          <section className="mt-8">

            <h2 className="text-lg font-bold text-gray-900">
              依頼内容
            </h2>

            <div className="mt-3 rounded-xl bg-gray-50 p-5">

              <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                {quest.description}
              </p>

            </div>

          </section>


          {/* クエスト情報 */}
          <section className="mt-8">

            <h2 className="text-lg font-bold text-gray-900">
              クエスト情報
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {/* 報酬 */}
              <div className="rounded-xl bg-gray-50 p-4">

                <p className="text-xs text-gray-500">
                  1人あたり報酬
                </p>

                <p className="mt-1 text-xl font-bold text-gray-900">
                  {quest.reward_per_person.toLocaleString()} pt
                </p>

              </div>




{/* 募集人数 */}
<div className="rounded-xl bg-gray-50 p-4">
  <p className="text-xs text-gray-500">
    募集人数
  </p>

  <p className="mt-1 text-xl font-bold text-gray-900">
    {quest.max_participants}人
  </p>
</div>

{/* 応募者数 */}
<div className="rounded-xl bg-gray-50 p-4">
  <p className="text-xs text-gray-500">
    現在の応募者
  </p>

  <p className="mt-1 text-xl font-bold text-gray-900">
    {applicationCount}人
  </p>
</div>


              {/* 期限 */}
              <div className="rounded-xl bg-gray-50 p-4">

                <p className="text-xs text-gray-500">
                  期限
                </p>

                <p className="mt-1 text-sm font-bold text-gray-900">
                  {formatDeadline(quest.deadline)}
                </p>

              </div>

            </div>

          </section>

          {isRequester && quest.status === "open" && (
  <section className="mt-8">
    <button
      type="button"
      onClick={handleCancelQuest}
      className="w-full rounded-xl border border-red-300 bg-white px-5 py-4 font-bold text-red-600 hover:bg-red-50"
    >
      クエストをキャンセルする
    </button>
  </section>
)}


          {/* 対象URL */}
          {quest.target_url && (
            <section className="mt-8">

              <h2 className="text-lg font-bold text-gray-900">
                対象作品
              </h2>

              <a
                href={quest.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block break-all rounded-xl bg-gray-50 p-4 text-sm text-blue-600 underline hover:text-blue-800"
              >
                {quest.target_url}
              </a>

            </section>
          )}


          {/* 応募 */}
          <section className="mt-8">

            {applied ? (

              <div className="rounded-2xl bg-green-50 p-6 text-center">

                <div className="text-2xl">
                  ✓
                </div>

                <p className="mt-2 font-bold text-green-700">
                  このクエストに応募済みです
                </p>

                <p className="mt-2 text-sm text-green-600">
                  依頼者が応募内容を確認しています。
                </p>

              </div>

            ) : isRequester ? (

              <div className="rounded-2xl bg-gray-50 p-6 text-center">

                <p className="font-bold text-gray-700">
                  自分が作成したクエストです
                </p>

              </div>

            ) : isDeadlinePassed ? (

              <div className="rounded-2xl bg-gray-50 p-6 text-center">

                <p className="font-bold text-gray-600">
                  応募受付終了
                </p>

              </div>


            ) : quest.status !== "open" ? (

              <div className="rounded-2xl bg-gray-50 p-6 text-center">

                <p className="font-bold text-gray-600">
                  現在応募できません
                </p>

              </div>

            ) : (

              <div>

                <h2 className="text-lg font-bold text-gray-900">
                  クエストに応募する
                </h2>


                {/* 応募メッセージ */}
                <textarea
                  value={applicationMessage}
                  onChange={(e) =>
                    setApplicationMessage(e.target.value)
                  }
                  rows={6}
                  maxLength={2000}
                  placeholder="依頼者へのメッセージがあれば入力してください。"
                  className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                />


                <div className="mt-1 text-right text-xs text-gray-400">
                  {applicationMessage.length}/2000
                </div>


                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!canApply || applying}
                  className="mt-4 w-full rounded-xl bg-black px-5 py-4 font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {applying
                    ? "応募しています..."
                    : "このクエストに応募する"}
                </button>

              </div>

            )}

          </section>

          {/* 通報 */}
<section className="mt-10 border-t border-gray-200 pt-6">

{reported ? (

  <div className="rounded-xl bg-gray-50 p-4 text-center">

    <p className="text-sm font-bold text-gray-600">
      このクエストは通報済みです
    </p>

    <p className="mt-1 text-xs text-gray-500">
      ご報告ありがとうございます。
    </p>

  </div>

) : (

  <button
    type="button"
    onClick={() => setReportOpen(true)}
    disabled={!userId}
    className="w-full rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
  >
    ⚠️ このクエストを通報する
  </button>

)}

</section>

        </div>

        </div>

{/* 通報モーダル */}
{reportOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">

      <div className="flex items-center justify-between">

        <h2 className="text-lg font-bold text-gray-900">
          クエストを通報
        </h2>

        <button
          type="button"
          onClick={() => setReportOpen(false)}
          disabled={reporting}
          className="text-xl text-gray-400 hover:text-gray-700"
        >
          ×
        </button>

      </div>

      <p className="mt-3 text-sm leading-6 text-gray-600">
        このクエストに問題がある場合は、理由を選択して通報してください。
      </p>

      {/* 通報理由 */}
      <div className="mt-5">

        <label className="text-sm font-bold text-gray-900">
          通報理由
        </label>

        <select
  value={reportReason}
  onChange={(e) =>
    setReportReason(e.target.value)
  }
  disabled={reporting}
  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
>
  <option value="">
    通報理由を選択してください
  </option>

  <option value="spam">
    スパム・宣伝
  </option>

  <option value="harassment">
    嫌がらせ・迷惑行為
  </option>

  <option value="fraud">
    詐欺・不正行為
  </option>

  <option value="inappropriate">
    不適切な内容
  </option>

  <option value="copyright">
    著作権侵害
  </option>

  <option value="other">
    その他
  </option>
</select>

      </div>

      {/* 詳細説明 */}
      <div className="mt-5">

        <label className="text-sm font-bold text-gray-900">
          詳細説明
          <span className="ml-2 text-xs font-normal text-gray-400">
            任意
          </span>
        </label>

        <textarea
          value={reportDescription}
          onChange={(e) =>
            setReportDescription(e.target.value)
          }
          disabled={reporting}
          rows={5}
          maxLength={2000}
          placeholder="問題だと思った点を具体的に入力してください。"
          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
        />

        <div className="mt-1 text-right text-xs text-gray-400">
          {reportDescription.length}/2000
        </div>

      </div>

      {/* 注意 */}
      <div className="mt-5 rounded-xl bg-gray-50 p-4">

        <p className="text-xs leading-5 text-gray-500">
          通報内容は運営が確認します。
          虚偽の通報や悪意のある通報はお控えください。
        </p>

      </div>

      {/* ボタン */}
      <div className="mt-5 flex gap-3">

        <button
          type="button"
          onClick={() => setReportOpen(false)}
          disabled={reporting}
          className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          キャンセル
        </button>

        <button
          type="button"
          onClick={handleSubmitReport}
          disabled={
            reporting ||
            !reportReason
          }
          className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {reporting
            ? "通報しています..."
            : "通報する"}
        </button>

      </div>

    </div>

  </div>
)}    

    </main>
  )
}