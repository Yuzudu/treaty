'use client'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Loader2, User, Play, Clock, MessageSquare, PlusCircle, Pin, Box } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useShareProject } from '../hooks/useShareProject'
import { useShareAnnotations } from '../hooks/useShareAnnotations'
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection'
import type { ShareLink } from '../types'

interface SharePreviewProps {
  shareLink: ShareLink
}

export function SharePreview({ shareLink }: SharePreviewProps) {
  const { data: projectData, isLoading: projectLoading } = useShareProject(shareLink.token)
  const isProtected = useScreenshotProtection()

  const [nickname, setNickname] = useState('')
  const [isNameSet, setIsNameSet] = useState(false)
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null)
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null)
  
  // Annotation tool mode: pin or bounding box
  const [toolMode, setToolMode] = useState<'pin' | 'box'>('pin')

  // React-Query annotations hooks
  const { data: annotations = [], addAnnotation, isAdding } = useShareAnnotations(shareLink.token, activeAssetId ?? '')

  // UI state for placingPoint Pin
  const [newPin, setNewPin] = useState<{ x: number; y: number } | null>(null)

  // UI state for drawing boxes
  const [isDrawing, setIsDrawing] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [tempBox, setTempBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [newBox, setNewBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  const [commentText, setCommentText] = useState('')
  const [videoTimestamp, setVideoTimestamp] = useState<number | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)

  // Load nickname from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('treaty_collaborator_name')
    if (saved) {
      setNickname(saved)
      setIsNameSet(true)
    }
  }, [])

  // Auto-select first asset
  useEffect(() => {
    if (projectData?.assets?.length && !activeAssetId) {
      setActiveAssetId(projectData.assets[0].id)
    }
  }, [projectData, activeAssetId])

  if (projectLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading preview assets...</p>
      </div>
    )
  }

  const assetsList = projectData?.assets ?? []
  const activeAsset = assetsList.find((a: any) => a.id === activeAssetId)

  const handleSaveNickname = () => {
    if (!nickname.trim()) {
      toast.error('Nickname cannot be empty')
      return
    }
    localStorage.setItem('treaty_collaborator_name', nickname.trim())
    setIsNameSet(true)
    toast.success(`Welcome, ${nickname}! You can now leave feedback.`)
  }

  const handleResetNickname = () => {
    setIsNameSet(false)
  }

  // Point Pin click handler
  const handleMediaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (toolMode !== 'pin') return
    if (!isNameSet) {
      toast.error('Please set your name/nickname at the top first!')
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setNewPin({ x, y })
    setNewBox(null)
    setTempBox(null)
    setCommentText('')

    if (activeAsset?.assetType === 'video' && videoRef.current) {
      setVideoTimestamp(videoRef.current.currentTime)
    } else {
      setVideoTimestamp(null)
    }
  }

  // Bounding box draw start
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (toolMode !== 'box') return
    if (!isNameSet) {
      toast.error('Please set your name/nickname at the top first!')
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setIsDrawing(true)
    setDragStart({ x, y })
    setTempBox({ x, y, width: 0, height: 0 })
    setNewPin(null)
    setNewBox(null)
  }

  // Bounding box draw move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !dragStart || toolMode !== 'box') return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    const boxX = Math.min(dragStart.x, x)
    const boxY = Math.min(dragStart.y, y)
    const boxW = Math.abs(dragStart.x - x)
    const boxH = Math.abs(dragStart.y - y)

    setTempBox({ x: boxX, y: boxY, width: boxW, height: boxH })
  }

  // Bounding box draw release
  const handleMouseUp = () => {
    if (!isDrawing || toolMode !== 'box') return
    setIsDrawing(false)

    if (tempBox && tempBox.width > 1.5 && tempBox.height > 1.5) {
      setNewBox(tempBox)
      setCommentText('')
      if (activeAsset?.assetType === 'video' && videoRef.current) {
        setVideoTimestamp(videoRef.current.currentTime)
      } else {
        setVideoTimestamp(null)
      }
    } else {
      setTempBox(null)
      setNewBox(null)
    }
    setDragStart(null)
  }

  const handleSaveAnnotation = () => {
    if (!commentText.trim()) {
      toast.error('Please enter a comment')
      return
    }
    if (!activeAssetId) return

    const payload: any = {
      collaboratorName: nickname,
      commentText: commentText.trim(),
    }

    if (newPin) {
      payload.coordinates = {
        coordX: newPin.x.toFixed(2),
        coordY: newPin.y.toFixed(2),
        boundingBox: null,
      }
    } else if (newBox) {
      payload.coordinates = {
        coordX: newBox.x.toFixed(2),
        coordY: newBox.y.toFixed(2),
        boundingBox: {
          x: parseFloat(newBox.x.toFixed(2)),
          y: parseFloat(newBox.y.toFixed(2)),
          width: parseFloat(newBox.width.toFixed(2)),
          height: parseFloat(newBox.height.toFixed(2)),
        },
      }
    }

    if (videoTimestamp !== null) {
      payload.video = {
        timestampSeconds: videoTimestamp.toFixed(3),
        duration: 0,
      }
    }

    addAnnotation(payload, {
      onSuccess: () => {
        toast.success('Annotation added!')
        setNewPin(null)
        setNewBox(null)
        setTempBox(null)
        setCommentText('')
        setVideoTimestamp(null)
      },
      onError: (err) => {
        toast.error((err as Error).message)
      },
    })
  }

  const formatVideoTime = (secondsStr: string | null) => {
    if (!secondsStr) return ''
    const seconds = parseFloat(secondsStr)
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnnotationClick = (ann: any) => {
    if (ann.video?.timestampSeconds && videoRef.current) {
      videoRef.current.currentTime = parseFloat(ann.video.timestampSeconds)
      videoRef.current.play().catch(() => {})
    }
  }

  // Format expiration date with 24-hour military time
  const formattedExpiration = shareLink.expiresAt
    ? `${new Date(shareLink.expiresAt).toLocaleDateString()} ${new Date(shareLink.expiresAt).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    : ''

  return (
    <div className="space-y-6">
      {/* Collaborator Identification Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-muted/40 border border-border/40 rounded-xl p-4 gap-4">
        {!isNameSet ? (
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Enter your name to annotate:</span>
            </div>
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="e.g. Jane (Client Reviewer)"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="max-w-xs"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
              />
              <Button onClick={handleSaveNickname} size="sm">
                Join Review
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Reviewing as: <strong className="text-foreground">{nickname}</strong></span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleResetNickname} className="h-7 text-xs">
              Change Name
            </Button>
          </div>
        )}
        <div className="text-xs text-muted-foreground font-semibold self-end sm:self-auto bg-muted px-2.5 py-1 rounded-md border border-border/60">
          Expires: {formattedExpiration}
        </div>
      </div>

      {/* Main Workspace Layout */}
      {assetsList.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground bg-muted/20 border border-dashed rounded-xl">
          No assets are currently uploaded to this project.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Asset Selection and Interactive Viewer */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Toolbar: Switcher & Mode selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-3">
              {/* Multiple Assets Switcher */}
              <div className="flex flex-wrap gap-2">
                {assetsList.map((asset: any, idx: number) => (
                  <button
                    key={asset.id}
                    onClick={() => {
                      setActiveAssetId(asset.id)
                      setNewPin(null)
                      setNewBox(null)
                      setTempBox(null)
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                      activeAssetId === asset.id
                        ? 'bg-primary text-primary-foreground border-primary shadow'
                        : 'bg-card border-border hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    Asset {idx + 1} ({asset.assetType})
                  </button>
                ))}
              </div>

              {/* Tool Mode selector */}
              <div className="flex items-center bg-muted/60 border border-border/40 rounded-lg p-0.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setToolMode('pin')
                    setNewBox(null)
                    setTempBox(null)
                  }}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
                    toolMode === 'pin'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Drop a pin marker"
                >
                  <Pin className="h-3.5 w-3.5" />
                  <span>Pin</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setToolMode('box')
                    setNewPin(null)
                  }}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
                    toolMode === 'box'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Draw a rectangle box"
                >
                  <Box className="h-3.5 w-3.5" />
                  <span>Box</span>
                </button>
              </div>
            </div>

            {/* Media Container Viewer */}
            <div 
              className="relative w-full h-[55vh] rounded-2xl overflow-hidden bg-muted border border-border/40 flex items-center justify-center select-none"
              onContextMenu={(e) => e.preventDefault()}
            >
              {isProtected ? (
                <div className="flex flex-col items-center justify-center border border-destructive/20 bg-destructive/5 text-destructive p-8 text-center rounded-xl gap-3 max-w-md mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 animate-pulse">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                  <p className="text-xs font-semibold">Screenshot Protection Shield Active</p>
                  <p className="text-[10px] text-muted-foreground">Focus the browser window to see preview files.</p>
                </div>
              ) : activeAsset ? (
                <div 
                  className={`relative w-full h-full flex items-center justify-center ${
                    toolMode === 'box' ? 'cursor-nwse-resize' : 'cursor-crosshair'
                  }`}
                  onClick={handleMediaClick}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* Media Content */}
                  {activeAsset.assetType === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeAsset.watermarkedUrl ?? '/placeholder.png'}
                      alt="Watermarked Preview"
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={activeAsset.fileUrl ?? activeAsset.watermarkedUrl ?? undefined}
                      controls
                      className="w-full h-full object-contain"
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  )}

                  {/* Render Existing Point Pins */}
                  {annotations.map((ann: any) => {
                    if (!ann.coordinates?.coordX || !ann.coordinates?.coordY || ann.coordinates?.boundingBox) return null
                    const x = parseFloat(ann.coordinates.coordX)
                    const y = parseFloat(ann.coordinates.coordY)

                    return (
                      <div
                        key={ann.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAnnotationClick(ann)
                        }}
                        onMouseEnter={() => setHoveredAnnotationId(ann.id)}
                        onMouseLeave={() => setHoveredAnnotationId(null)}
                        style={{ left: `${x}%`, top: `${y}%` }}
                        className="absolute w-6 h-6 -ml-3 -mt-3 bg-red-500/90 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white cursor-pointer hover:scale-125 hover:bg-red-600 transition-all z-10 font-bold text-[10px] group"
                      >
                        📌
                        {hoveredAnnotationId === ann.id && (
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 bg-card border border-border p-2.5 rounded-xl shadow-xl text-left text-xs text-foreground font-normal min-w-[150px] max-w-[240px] pointer-events-none select-none">
                            <div className="font-bold border-b border-border/40 pb-1 mb-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                              {ann.collaboratorName}
                            </div>
                            <div className="break-words leading-relaxed text-muted-foreground">
                              {ann.commentText}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Render Existing Bounding Box Overlays */}
                  {annotations.map((ann: any) => {
                    if (!ann.coordinates?.boundingBox) return null
                    const { x, y, width: w, height: h } = ann.coordinates.boundingBox

                    return (
                      <div
                        key={ann.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAnnotationClick(ann)
                        }}
                        onMouseEnter={() => setHoveredAnnotationId(ann.id)}
                        onMouseLeave={() => setHoveredAnnotationId(null)}
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          width: `${w}%`,
                          height: `${h}%`,
                        }}
                        className="absolute border-2 border-red-500 bg-red-500/10 hover:bg-red-500/25 transition-all cursor-pointer z-10 rounded shadow-sm flex items-center justify-center"
                      >
                        {hoveredAnnotationId === ann.id && (
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 bg-card border border-border p-2.5 rounded-xl shadow-xl text-left text-xs text-foreground font-normal min-w-[150px] max-w-[240px] pointer-events-none select-none">
                            <div className="font-bold border-b border-border/40 pb-1 mb-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                              {ann.collaboratorName}
                            </div>
                            <div className="break-words leading-relaxed text-muted-foreground">
                              {ann.commentText}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Render Temporary Live Drawing Box */}
                  {isDrawing && tempBox && (
                    <div
                      style={{
                        left: `${tempBox.x}%`,
                        top: `${tempBox.y}%`,
                        width: `${tempBox.width}%`,
                        height: `${tempBox.height}%`,
                      }}
                      className="absolute border-2 border-dashed border-red-500 bg-red-500/15 pointer-events-none"
                    />
                  )}

                  {/* Locked Bounding Box Overlay for comment input */}
                  {!isDrawing && newBox && (
                    <div
                      style={{
                        left: `${newBox.x}%`,
                        top: `${newBox.y}%`,
                        width: `${newBox.width}%`,
                        height: `${newBox.height}%`,
                      }}
                      className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none"
                    />
                  )}

                  {/* Form Placement Form Popover (for Pin) */}
                  {newPin && (
                    <div
                      style={{ left: `${newPin.x}%`, top: `${newPin.y}%` }}
                      className="absolute z-20 bg-card border border-border p-3.5 rounded-xl shadow-xl flex flex-col gap-2.5 w-60 -translate-x-1/2 mt-4"
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onMouseMove={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          New Pin Comment
                        </span>
                        {videoTimestamp !== null && (
                          <span className="text-[10px] bg-red-50 text-red-500 font-semibold px-1.5 py-0.5 rounded border border-red-100 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatVideoTime(videoTimestamp.toString())}
                          </span>
                        )}
                      </div>
                      <textarea
                        className="w-full text-xs p-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        placeholder="Feedback comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={2}
                        autoFocus
                      />
                      <div className="flex justify-end gap-1.5">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs" 
                          onClick={() => setNewPin(null)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm" 
                          className="h-7 text-xs px-3 bg-primary text-primary-foreground" 
                          onClick={handleSaveAnnotation} 
                          disabled={isAdding}
                        >
                          {isAdding ? 'Adding...' : 'Add Pin'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Form Placement Form Popover (for Box) */}
                  {!isDrawing && newBox && (
                    <div
                      style={{ 
                        left: `${newBox.x + newBox.width / 2}%`, 
                        top: `${newBox.y + newBox.height}%` 
                      }}
                      className="absolute z-20 bg-card border border-border p-3.5 rounded-xl shadow-xl flex flex-col gap-2.5 w-60 -translate-x-1/2 mt-4"
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onMouseMove={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          New Box Comment
                        </span>
                        {videoTimestamp !== null && (
                          <span className="text-[10px] bg-red-50 text-red-500 font-semibold px-1.5 py-0.5 rounded border border-red-100 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatVideoTime(videoTimestamp.toString())}
                          </span>
                        )}
                      </div>
                      <textarea
                        className="w-full text-xs p-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        placeholder="Feedback comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={2}
                        autoFocus
                      />
                      <div className="flex justify-end gap-1.5">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs" 
                          onClick={() => {
                            setNewBox(null)
                            setTempBox(null)
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm" 
                          className="h-7 text-xs px-3 bg-primary text-primary-foreground" 
                          onClick={handleSaveAnnotation} 
                          disabled={isAdding}
                        >
                          {isAdding ? 'Adding...' : 'Add Comment'}
                        </Button>
                      </div>
                    </div>
                  )}

                </div>
              ) : null}
            </div>
            
            <p className="text-[10px] text-center text-muted-foreground">
              💡 Hint: {
                toolMode === 'pin' 
                  ? 'Click anywhere on the asset preview above to drop a point pin.'
                  : 'Click and drag anywhere on the asset preview above to outline a feedback box.'
              }
            </p>
          </div>

          {/* Right Column: Sidebar Feedback Feed */}
          <div className="lg:col-span-1 border border-border/40 bg-card/45 rounded-2xl flex flex-col h-[55vh] lg:h-[60vh] overflow-hidden">
            <div className="p-4 border-b border-border/40 flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>Feedback Feed ({annotations.length})</span>
              </h3>
            </div>
            
            {/* Scrollable feed items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {annotations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-2">
                  <PlusCircle className="h-8 w-8 text-muted-foreground/45 animate-pulse" />
                  <p className="text-xs text-muted-foreground font-medium">No comments placed yet</p>
                  <p className="text-[10px] text-muted-foreground max-w-[150px]">
                    {toolMode === 'pin'
                      ? 'Click on the preview to leave the first pin comment!'
                      : 'Click and drag on the preview to outline the first feedback area!'
                    }
                  </p>
                </div>
              ) : (
                annotations.map((ann: any) => (
                  <div
                    key={ann.id}
                    onClick={() => handleAnnotationClick(ann)}
                    className={`group border border-border/60 hover:border-primary/45 p-3 rounded-xl bg-background/90 shadow-sm transition-all duration-150 ${
                      ann.video?.timestampSeconds ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">
                          {ann.collaboratorName}
                        </span>
                        <span className="text-[9px] text-muted-foreground border border-border px-1 py-0.2 rounded bg-muted/30">
                          {ann.coordinates?.boundingBox ? 'box' : 'pin'}
                        </span>
                      </div>
                      {ann.video?.timestampSeconds && (
                        <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded flex items-center gap-1 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Play className="h-2.5 w-2.5 fill-current" />
                          {formatVideoTime(ann.video.timestampSeconds)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed break-words">
                      {ann.commentText}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
