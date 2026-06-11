"use client"

import dynamic from "next/dynamic"

const CreateTaskClient = dynamic(() => import("./CreateTaskClient"), { ssr: false })

export default function CreateTaskPage() {
  return <CreateTaskClient />
}
