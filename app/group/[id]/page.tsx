import GroupChat from "@/components/GroupChat"

interface Props {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {

  const { id } = await params

  console.log("params.id:", id)

  return <GroupChat groupId={id} />
}