"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { apiFetch } from "@/lib/api-client"

interface FileEntry {
  fileUrl: string
  assetType: string
}

type Stage = "polling" | "ready" | "failure" | "no-token"

export default function PaymentResultPage() {
  const searchParams = useSearchParams()
  const status = searchParams.get("status")
  const token = searchParams.get("token")

  const [stage, setStage] = useState<Stage>("polling")
  const [files, setFiles] = useState<FileEntry[]>([])

  useEffect(() => {
    if (status !== "success" || !token) {
      setStage(status === "success" ? "no-token" : "failure")
      return
    }

    let cancelled = false
    let attempts = 0
    const MAX_ATTEMPTS = 20 // 40 seconds

    async function poll() {
      try {
        const shareLink = await apiFetch<{ projectStatus: string }>(
          `/share-links/${token}`
        )
        if (shareLink.projectStatus === "PAID") {
          const fileList = await apiFetch<FileEntry[]>(
            `/share-links/${token}/files`
          )
          if (!cancelled) {
            setFiles(fileList)
            setStage("ready")
          }
          return
        }
      } catch {}

      attempts++
      if (attempts >= MAX_ATTEMPTS) {
        if (!cancelled) setStage("no-token")
        return
      }
      if (!cancelled) setTimeout(poll, 2000)
    }

    void poll()
    return () => { cancelled = true }
  }, [status, token])

  if (status !== "success") {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-xl font-semibold">Payment not completed</h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Something went wrong or the payment was cancelled. Go back to the
          share link to try again.
        </p>
        {token && (
          <Link
            href={`/share/${token}`}
            className="inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Go back
          </Link>
        )}
      </div>
    )
  }

  if (stage === "polling") {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl animate-pulse">⏳</div>
        <h1 className="text-xl font-semibold">Confirming payment…</h1>
        <p className="text-sm text-muted-foreground">
          This takes a moment. Please don't close this page.
        </p>
      </div>
    )
  }

  if (stage === "failure" || stage === "no-token") {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h1 className="text-xl font-semibold">Payment received</h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Your payment was successful. The creator will deliver your files
          shortly.
        </p>
      </div>
    )
  }

  return (
    <div className="text-center space-y-4">
      <div className="text-4xl">✅</div>
      <h1 className="text-xl font-semibold">Files unlocked</h1>
      <p className="text-sm text-muted-foreground">
        Your payment is confirmed. Download your files below.
      </p>
      <ul className="space-y-2 mt-4">
        {files.map((f, i) => (
          <li key={i}>
            <a
              href={f.fileUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm underline underline-offset-4 hover:text-foreground"
            >
              Download {f.assetType} {files.length > 1 ? `#${i + 1}` : ""}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
