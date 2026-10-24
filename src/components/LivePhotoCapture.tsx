import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Check, RotateCcw, X } from 'lucide-react'
import type { FaceLandmarker } from '@mediapipe/tasks-vision'

// =====================================================
// LIVE PROFILE PHOTO CAPTURE
// =====================================================
//
// - Live front camera only (getUserMedia). No file picker,
//   gallery, drag-and-drop or existing-image upload.
// - On-device MediaPipe Face Landmarker. No video frames leave
//   the browser; only the single JPEG the user confirms is sent.
// - Flow: position one forward-facing face -> one short
//   randomized challenge (blink twice / smile / move closer and
//   back) verified from landmarks across frames -> the manual
//   "Capture Photo" button is enabled while the face is still
//   forward-facing and clear -> preview (Retake / Confirm & Save).
// - Nothing is saved until the user clicks Confirm & Save.
//
// IMPORTANT: this is a basic anti-spoofing step. It makes
// static printed photos and still images on a phone screen
// harder to pass, but it does NOT reliably stop prerecorded
// video, virtual cameras or deliberate attacks, and it does NOT
// verify identity. Stronger protection needs a dedicated
// server-side liveness service.
// =====================================================

// The WASM runtime version must match the installed
// @mediapipe/tasks-vision version in package.json.
const MEDIAPIPE_VERSION = '0.10.21'

const WASM_BASE_URL =
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`

const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

// ---------- Tunable thresholds ----------
const OUTPUT_SIZE = 640 // saved photo is OUTPUT_SIZE x OUTPUT_SIZE
const JPEG_QUALITY = 0.9
const DETECT_INTERVAL_MS = 80 // position / ready stages
// The challenge stage runs on every animation frame so a quick
// blink is not missed.

// Consecutive good frames needed before "Start liveness check"
// is enabled (also used to average the neutral-face baseline).
const MIN_ALIGN_FRAMES = 3
// A face detected within this window is used to centre the crop;
// otherwise the centre of the frame is used.
const FACE_CROP_MAX_AGE_MS = 1500

const MIN_VIDEO_HEIGHT = 480

const MIN_BRIGHTNESS = 70 // mean luma 0-255 inside the face
const MAX_BRIGHTNESS = 205
const MIN_CONTRAST = 28 // luma std-dev inside the face
const BACKLIGHT_RATIO = 0.6 // face / whole-frame brightness
const MIN_SHARPNESS = 22 // Laplacian variance on a 96x96 face crop

const MIN_FACE_HEIGHT = 0.38 // face height / frame side
const MAX_FACE_HEIGHT = 0.72 // leaves room to move closer

const CHALLENGE_TIMEOUT_MS = 9000
const FACE_LOST_MS = 1500
const CHALLENGE_YAW_MAX = 0.22 // keep roughly facing the camera

const BLINK_CLOSED_RATIO = 0.62 // EAR vs. open-eye baseline
const BLINK_OPEN_RATIO = 0.8
const BLINKS_REQUIRED = 2
const SMILE_RATIO = 1.12 // mouth width vs. neutral baseline
const SMILE_RELAX_RATIO = 1.05
const SMILE_FRAMES = 3
const CLOSER_RATIO = 1.15 // face height vs. starting size
const CLOSER_BACK_RATIO = 1.06
const CLOSER_FRAMES = 2

// ---------- Types ----------
type Pt = { x: number; y: number; z?: number }

type Phase = 'loading' | 'capturing' | 'preview' | 'saving' | 'error'

type Stage = 'align' | 'challenge' | 'ready' | 'failed'

type ChallengeKey = 'blink' | 'smile' | 'closer'

interface Challenge {
  key: ChallengeKey
  label: string
  hint: string
}

const CHALLENGES: Challenge[] = [
  {
    key: 'blink',
    label: 'Blink twice',
    hint: 'Close and open your eyes two times.',
  },
  {
    key: 'smile',
    label: 'Smile briefly',
    hint: 'Show a smile, then relax your face.',
  },
  {
    key: 'closer',
    label: 'Move closer, then back',
    hint: 'Lean toward the camera, then return to where you started.',
  },
]

const STAGE_LABELS = ['Position', 'Challenge', 'Photo']

interface FaceMetrics {
  yaw: number
  pitch: number
  roll: number
  offsetX: number
  offsetY: number
  heightFrac: number
  inside: boolean
  faceBox: { x: number; y: number; w: number; h: number }
}

interface QualityMetrics {
  brightness: number
  contrast: number
  sharpness: number
  frameBrightness: number
}

interface Props {
  open: boolean
  onClose: () => void
  /** Persist the confirmed JPEG. Throw to show an error and allow retry. */
  onSave: (photo: Blob) => Promise<void>
}

interface ChallengeState {
  kind: ChallengeKey
  startedAt: number
  lastFaceAt: number
  blinks: number
  eyesClosed: boolean
  smileFrames: number
  smiling: boolean
  nearFrames: number
  near: boolean
}

interface Baseline {
  ear: number
  mouth: number
  height: number
}

// =====================================================
// GEOMETRY
// =====================================================

function computeMetrics(
  lm: Pt[],
  vw: number,
  vh: number
): FaceMetrics | null {
  if (lm.length < 468) {
    return null
  }

  const side = Math.min(vw, vh)
  const cropX = (vw - side) / 2
  const cropY = (vh - side) / 2

  let minX = 1
  let maxX = 0
  let minY = 1
  let maxY = 0

  for (const p of lm) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }

  const boxX = minX * vw
  const boxY = minY * vh
  const boxW = (maxX - minX) * vw
  const boxH = (maxY - minY) * vh

  const offsetX = (boxX + boxW / 2 - cropX) / side - 0.5
  const offsetY = (boxY + boxH / 2 - cropY) / side - 0.5

  const margin = 0.02 * side

  const inside =
    boxX >= cropX + margin &&
    boxX + boxW <= cropX + side - margin &&
    boxY >= cropY + margin &&
    boxY + boxH <= cropY + side - margin

  // Yaw: nose tip position between the two cheek edges.
  // Measured in raw (un-mirrored) camera coordinates, so a
  // positive value means the user turned to THEIR left.
  const cheekA = lm[234]
  const cheekB = lm[454]
  const nose = lm[1]

  const left = Math.min(cheekA.x, cheekB.x)
  const right = Math.max(cheekA.x, cheekB.x)

  const yaw =
    right - left > 0.0001
      ? (nose.x - left) / (right - left) - 0.5
      : 0

  // Pitch: nose tip position between the eye line and chin.
  // Smaller = head tilted up, larger = tilted down.
  const eyeY = (lm[33].y + lm[263].y) / 2
  const chinY = lm[152].y

  const pitch =
    chinY - eyeY > 0.0001 ? (nose.y - eyeY) / (chinY - eyeY) : 0.6

  // Roll: slope of the eye line, in degrees.
  let roll =
    (Math.atan2(
      (lm[263].y - lm[33].y) * vh,
      (lm[263].x - lm[33].x) * vw
    ) *
      180) /
    Math.PI

  if (roll > 90) roll -= 180
  if (roll < -90) roll += 180

  const heightPx = Math.abs(lm[152].y - lm[10].y) * vh

  return {
    yaw,
    pitch,
    roll,
    offsetX,
    offsetY,
    heightFrac: heightPx / side,
    inside,
    faceBox: { x: boxX, y: boxY, w: boxW, h: boxH },
  }
}

// =====================================================
// IMAGE QUALITY (brightness, contrast, sharpness)
// =====================================================

function measureQuality(
  video: HTMLVideoElement,
  box: { x: number; y: number; w: number; h: number },
  work: HTMLCanvasElement
): QualityMetrics | null {
  const ctx = work.getContext('2d', { willReadFrequently: true })

  if (!ctx) {
    return null
  }

  const SIZE = 96

  work.width = SIZE
  work.height = SIZE

  // Face region (slightly inset to avoid hair / background).
  const insetX = box.w * 0.1
  const insetY = box.h * 0.1

  const sx = Math.max(0, box.x + insetX)
  const sy = Math.max(0, box.y + insetY)
  const sw = Math.min(video.videoWidth - sx, box.w - insetX * 2)
  const sh = Math.min(video.videoHeight - sy, box.h - insetY * 2)

  if (sw < 16 || sh < 16) {
    return null
  }

  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, SIZE, SIZE)

  const face = ctx.getImageData(0, 0, SIZE, SIZE).data

  const gray = new Float32Array(SIZE * SIZE)

  let sum = 0

  for (let i = 0; i < SIZE * SIZE; i += 1) {
    const g =
      0.299 * face[i * 4] +
      0.587 * face[i * 4 + 1] +
      0.114 * face[i * 4 + 2]

    gray[i] = g
    sum += g
  }

  const mean = sum / (SIZE * SIZE)

  let variance = 0

  for (let i = 0; i < gray.length; i += 1) {
    variance += (gray[i] - mean) * (gray[i] - mean)
  }

  const contrast = Math.sqrt(variance / gray.length)

  // Variance of the Laplacian (higher = sharper).
  let lapSum = 0
  let lapSumSq = 0
  let lapCount = 0

  for (let y = 1; y < SIZE - 1; y += 1) {
    for (let x = 1; x < SIZE - 1; x += 1) {
      const i = y * SIZE + x

      const lap =
        gray[i - SIZE] +
        gray[i + SIZE] +
        gray[i - 1] +
        gray[i + 1] -
        4 * gray[i]

      lapSum += lap
      lapSumSq += lap * lap
      lapCount += 1
    }
  }

  const lapMean = lapSum / lapCount
  const sharpness = lapSumSq / lapCount - lapMean * lapMean

  // Whole-frame brightness (for backlight detection).
  const FRAME = 24

  work.width = FRAME
  work.height = FRAME

  const ctx2 = work.getContext('2d', { willReadFrequently: true })

  if (!ctx2) {
    return null
  }

  ctx2.drawImage(video, 0, 0, FRAME, FRAME)

  const frame = ctx2.getImageData(0, 0, FRAME, FRAME).data

  let frameSum = 0

  for (let i = 0; i < FRAME * FRAME; i += 1) {
    frameSum +=
      0.299 * frame[i * 4] +
      0.587 * frame[i * 4 + 1] +
      0.114 * frame[i * 4 + 2]
  }

  return {
    brightness: mean,
    contrast,
    sharpness,
    frameBrightness: frameSum / (FRAME * FRAME),
  }
}

function lightingProblem(q: QualityMetrics): string | null {
  if (q.brightness < MIN_BRIGHTNESS) {
    return 'Too dark. Face a light source or move to a brighter place.'
  }

  if (q.brightness > MAX_BRIGHTNESS) {
    return 'Too bright. Avoid direct light on your face.'
  }

  if (
    q.frameBrightness > 120 &&
    q.brightness < q.frameBrightness * BACKLIGHT_RATIO
  ) {
    return 'The light is behind you. Face the light instead.'
  }

  if (q.contrast < MIN_CONTRAST) {
    return 'Your face is not clear. Improve the lighting.'
  }

  return null
}

// =====================================================
// LIVENESS HELPERS (landmark-based, on-device)
// =====================================================

function pxDist(a: Pt, b: Pt, vw: number, vh: number): number {
  return Math.hypot((a.x - b.x) * vw, (a.y - b.y) * vh)
}

// Eye aspect ratio (average of both eyes). Drops sharply on a blink.
function eyeAspectRatio(lm: Pt[], vw: number, vh: number): number {
  const d = (i: number, j: number) => pxDist(lm[i], lm[j], vw, vh)

  const right = (d(160, 144) + d(158, 153)) / (2 * d(33, 133) || 1)
  const left = (d(385, 380) + d(387, 373)) / (2 * d(362, 263) || 1)

  return (right + left) / 2
}

// Mouth width relative to the distance between the outer eye
// corners. Grows when smiling and is independent of camera distance.
function mouthWidthRatio(lm: Pt[], vw: number, vh: number): number {
  const eyes = pxDist(lm[33], lm[263], vw, vh)

  return eyes > 1 ? pxDist(lm[61], lm[291], vw, vh) / eyes : 0
}

function pickChallenge(previous?: ChallengeKey): Challenge {
  const pool = CHALLENGES.filter((c) => c.key !== previous)
  const buf = new Uint32Array(1)

  crypto.getRandomValues(buf)

  return pool[buf[0] % pool.length]
}

function describeCameraError(error: unknown): string {
  const name = (error as { name?: string })?.name

  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera permission was denied. Allow camera access in your browser settings and try again.'
  }

  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found on this device.'
  }

  if (name === 'NotReadableError') {
    return 'The camera is in use by another app. Close it and try again.'
  }

  return (
    (error as Error)?.message ||
    'Could not start the camera or face detection. Please try again.'
  )
}

// =====================================================
// COMPONENT
// =====================================================

export default function LivePhotoCapture({
  open,
  onClose,
  onSave,
}: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [stage, setStage] = useState<Stage>('align')
  const [challenge, setChallenge] = useState<Challenge>(CHALLENGES[0])
  const [holdProgress, setHoldProgress] = useState(0)
  const [message, setMessage] = useState('Starting camera…')
  const [poseOk, setPoseOk] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [startReady, setStartReady] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [saveError, setSaveError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const rafRef = useRef<number>(0)
  const workCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Mutable flow state (kept in refs so the animation loop never
  // reads stale React state).
  const runningRef = useRef(false)
  const stageRef = useRef<Stage>('align')
  const challengeRef = useRef<Challenge>(CHALLENGES[0])
  const challengeStateRef = useRef<ChallengeState | null>(null)
  const holdRef = useRef(0)
  const startReadyRef = useRef(false)
  const lastFaceRef = useRef<{ metrics: FaceMetrics; at: number } | null>(
    null
  )
  const lastDetectRef = useRef(0)
  const lastTimestampRef = useRef(0)
  const alignSumRef = useRef({ ear: 0, mouth: 0, height: 0, n: 0 })
  const baselineRef = useRef<Baseline>({ ear: 0, mouth: 0, height: 0 })
  const bestFrameRef = useRef<{
    canvas: HTMLCanvasElement
    sharpness: number
  } | null>(null)
  const photoBlobRef = useRef<Blob | null>(null)
  const previewUrlRef = useRef('')

  // -----------------------------------------------
  // CAMERA / MODEL TEARDOWN
  // -----------------------------------------------

  const stopCamera = useCallback(() => {
    runningRef.current = false

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }

    const stream = streamRef.current

    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    const video = videoRef.current

    if (video) {
      video.pause()
      video.srcObject = null
    }
  }, [])

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = ''
    }

    setPreviewUrl('')
  }, [])

  const teardown = useCallback(() => {
    stopCamera()

    if (landmarkerRef.current) {
      try {
        landmarkerRef.current.close()
      } catch {
        // ignore
      }

      landmarkerRef.current = null
    }

    bestFrameRef.current = null
    photoBlobRef.current = null
    challengeStateRef.current = null
    lastFaceRef.current = null
    startReadyRef.current = false

    releasePreview()
  }, [stopCamera, releasePreview])

  // -----------------------------------------------
  // LOAD MODEL (once per open)
  // -----------------------------------------------

  const loadModel = useCallback(async () => {
    if (landmarkerRef.current) {
      return
    }

    const vision = await import('@mediapipe/tasks-vision')

    const fileset = await vision.FilesetResolver.forVisionTasks(
      WASM_BASE_URL
    )

    const baseOptions = (delegate: 'GPU' | 'CPU') => ({
      modelAssetPath: FACE_MODEL_URL,
      delegate,
    })

    try {
      landmarkerRef.current =
        await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: baseOptions('GPU'),
          runningMode: 'VIDEO',
          numFaces: 2,
        })
    } catch {
      // Some devices do not support the GPU delegate.
      landmarkerRef.current =
        await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: baseOptions('CPU'),
          runningMode: 'VIDEO',
          numFaces: 2,
        })
    }
  }, [])

  // -----------------------------------------------
  // START CAMERA
  // -----------------------------------------------

  const startCamera = useCallback(async () => {
    if (
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      throw new Error(
        'This browser cannot access the camera. Use a modern browser over HTTPS.'
      )
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    })

    streamRef.current = stream

    const video = videoRef.current

    if (!video) {
      stream.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      throw new Error('Camera view is not ready.')
    }

    video.srcObject = stream

    await video.play()
  }, [])

  // -----------------------------------------------
  // CAPTURE
  // -----------------------------------------------

  const finishCapture = useCallback(async () => {
    runningRef.current = false

    const best = bestFrameRef.current

    stopCamera()

    if (!best) {
      setErrorText('Could not capture a clear photo. Please try again.')
      setPhase('error')
      return
    }

    const blob: Blob | null = await new Promise((resolve) =>
      best.canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    )

    if (!blob) {
      setErrorText('Could not create the photo. Please try again.')
      setPhase('error')
      return
    }

    photoBlobRef.current = blob

    releasePreview()

    const url = URL.createObjectURL(blob)

    previewUrlRef.current = url

    setPreviewUrl(url)
    setSaveError('')
    setPhase('preview')
  }, [stopCamera, releasePreview])

  const captureCandidate = useCallback(
    (
      video: HTMLVideoElement,
      metrics: FaceMetrics,
      quality: QualityMetrics
    ) => {
      const vw = video.videoWidth
      const vh = video.videoHeight

      // Square crop centred on the face, with room around it.
      const faceCx = metrics.faceBox.x + metrics.faceBox.w / 2
      const faceCy = metrics.faceBox.y + metrics.faceBox.h / 2

      const side = Math.min(
        Math.min(vw, vh),
        Math.max(metrics.faceBox.h * 1.8, 256)
      )

      const sx = Math.min(Math.max(0, faceCx - side / 2), vw - side)
      const sy = Math.min(Math.max(0, faceCy - side / 2), vh - side)

      const canvas = document.createElement('canvas')

      canvas.width = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE

      const ctx = canvas.getContext('2d')

      if (!ctx) {
        return
      }

      // Un-mirrored: the saved photo shows the true orientation.
      ctx.drawImage(
        video,
        sx,
        sy,
        side,
        side,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      )

      const current = bestFrameRef.current

      if (!current || quality.sharpness > current.sharpness) {
        bestFrameRef.current = {
          canvas,
          sharpness: quality.sharpness,
        }
      }
    },
    []
  )

  // -----------------------------------------------
  // FLOW HELPERS
  // -----------------------------------------------

  const changeStage = useCallback((next: Stage) => {
    stageRef.current = next
    setStage(next)
  }, [])

  const resetFlow = useCallback(() => {
    // Always pick a different challenge from the previous attempt.
    const next = pickChallenge(challengeRef.current.key)

    challengeRef.current = next
    challengeStateRef.current = null
    holdRef.current = 0
    alignSumRef.current = { ear: 0, mouth: 0, height: 0, n: 0 }
    bestFrameRef.current = null
    photoBlobRef.current = null
    startReadyRef.current = false

    stageRef.current = 'align'
    setStartReady(false)

    setChallenge(next)
    setStage('align')
    setHoldProgress(0)
    setPoseOk(false)
    setSaveError('')
    setMessage('Look straight at the camera.')
  }, [])

  const failChallenge = useCallback(
    (reason: string) => {
      holdRef.current = 0
      challengeStateRef.current = null

      setHoldProgress(0)
      setPoseOk(false)
      setMessage(reason)

      changeStage('failed')
    },
    [changeStage]
  )

  const retryChallenge = useCallback(() => {
    resetFlow()
  }, [resetFlow])

  // -----------------------------------------------
  // PER-FRAME CHECKS
  // -----------------------------------------------

  // Position / quality gate shared by the "align" and "ready"
  // stages. Returns a user-facing problem or the measurements.
  const checkPosition = (
    video: HTMLVideoElement,
    lm: Pt[]
  ):
    | { problem: string }
    | { metrics: FaceMetrics; quality: QualityMetrics } => {
    const metrics = computeMetrics(lm, video.videoWidth, video.videoHeight)

    if (!metrics) {
      return { problem: 'Face not clear. Please adjust your position.' }
    }

    if (!metrics.inside) {
      return { problem: 'Keep your whole face inside the frame.' }
    }

    if (
      Math.abs(metrics.offsetX) > 0.14 ||
      Math.abs(metrics.offsetY) > 0.14
    ) {
      return { problem: 'Centre your face in the frame.' }
    }

    if (metrics.heightFrac < MIN_FACE_HEIGHT) {
      return { problem: 'Move closer to the camera.' }
    }

    if (metrics.heightFrac > MAX_FACE_HEIGHT) {
      return { problem: 'Move a little further from the camera.' }
    }

    const work =
      workCanvasRef.current ||
      (workCanvasRef.current = document.createElement('canvas'))

    const quality = measureQuality(video, metrics.faceBox, work)

    if (!quality) {
      return { problem: 'Face not clear. Please adjust your position.' }
    }

    const light = lightingProblem(quality)

    if (light) {
      return { problem: light }
    }

    if (quality.sharpness < MIN_SHARPNESS) {
      return {
        problem: 'Image is blurry. Hold still and wipe the camera lens.',
      }
    }

    if (
      Math.abs(metrics.yaw) > 0.08 ||
      metrics.pitch < 0.38 ||
      metrics.pitch > 0.8 ||
      Math.abs(metrics.roll) > 12
    ) {
      return {
        problem: 'Look straight at the camera and keep your head level.',
      }
    }

    return { metrics, quality }
  }

  const runChallengeFrame = (
    video: HTMLVideoElement,
    faces: Pt[][],
    now: number
  ) => {
    const c = challengeStateRef.current

    if (!c) {
      return
    }

    if (now - c.startedAt > CHALLENGE_TIMEOUT_MS) {
      const reasons: Record<ChallengeKey, string> = {
        blink:
          'We could not detect two blinks in time. Look at the camera and blink clearly.',
        smile:
          'We could not detect a smile in time. Try a clear smile, then relax.',
        closer:
          'We could not detect the movement in time. Lean in toward the camera, then return.',
      }

      failChallenge(reasons[c.kind])
      return
    }

    if (faces.length === 0) {
      if (now - c.lastFaceAt > FACE_LOST_MS) {
        failChallenge(
          'We lost sight of your face. Keep it in view and try again.'
        )
      }

      return
    }

    if (faces.length > 1) {
      failChallenge('More than one face detected. Only you should be visible.')
      return
    }

    c.lastFaceAt = now

    const lm = faces[0]
    const vw = video.videoWidth
    const vh = video.videoHeight
    const metrics = computeMetrics(lm, vw, vh)

    if (!metrics) {
      return
    }

    if (Math.abs(metrics.yaw) > CHALLENGE_YAW_MAX) {
      setMessage('Keep facing the camera.')
      return
    }

    const base = baselineRef.current
    let passed = false

    if (c.kind === 'blink') {
      const ear = eyeAspectRatio(lm, vw, vh)

      if (!c.eyesClosed && ear < base.ear * BLINK_CLOSED_RATIO) {
        c.eyesClosed = true
      } else if (c.eyesClosed && ear > base.ear * BLINK_OPEN_RATIO) {
        c.eyesClosed = false
        c.blinks += 1

        if (c.blinks < BLINKS_REQUIRED) {
          setMessage(`Blink ${c.blinks} of ${BLINKS_REQUIRED} done. Once more.`)
        }
      }

      passed = c.blinks >= BLINKS_REQUIRED
    } else if (c.kind === 'smile') {
      const ratio = mouthWidthRatio(lm, vw, vh) / (base.mouth || 1)

      if (!c.smiling) {
        c.smileFrames = ratio >= SMILE_RATIO ? c.smileFrames + 1 : 0

        if (c.smileFrames >= SMILE_FRAMES) {
          c.smiling = true
          setMessage('Good. Now relax your face.')
        }
      } else if (ratio <= SMILE_RELAX_RATIO) {
        passed = true
      }
    } else {
      const ratio = metrics.heightFrac / (base.height || 1)

      if (!c.near) {
        c.nearFrames = ratio >= CLOSER_RATIO ? c.nearFrames + 1 : 0

        if (c.nearFrames >= CLOSER_FRAMES) {
          c.near = true
          setMessage('Now move back to where you started.')
        }
      } else if (ratio <= CLOSER_BACK_RATIO) {
        passed = true
      }
    }

    if (!passed) {
      return
    }

    // Challenge verified: the user may now capture the photo.
    challengeStateRef.current = null
    holdRef.current = 0
    bestFrameRef.current = null

    setHoldProgress(0)
    setPoseOk(false)
    setMessage('Liveness check passed. Tap Capture Photo when ready.')

    changeStage('ready')
  }

  const evaluateFrame = useCallback(() => {
    const video = videoRef.current
    const landmarker = landmarkerRef.current

    if (
      !video ||
      !landmarker ||
      video.readyState < 2 ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      return
    }

    // A valid video frame is available: manual capture is allowed.
    setCameraReady(true)

    const current = stageRef.current

    if (current === 'failed') {
      return
    }

    if (
      video.videoHeight < MIN_VIDEO_HEIGHT &&
      video.videoWidth < MIN_VIDEO_HEIGHT
    ) {
      setPoseOk(false)
      setMessage('Camera resolution is too low for a clear photo.')
      return
    }

    const now = performance.now()

    // MediaPipe requires strictly increasing timestamps.
    if (now <= lastTimestampRef.current) {
      return
    }

    lastTimestampRef.current = now

    const result = landmarker.detectForVideo(video, now)
    const faces = (result.faceLandmarks || []) as Pt[][]

    // Remember the latest single face so a manual capture can be
    // centred on it, whatever the validation outcome.
    if (faces.length === 1) {
      const m = computeMetrics(faces[0], video.videoWidth, video.videoHeight)

      if (m) {
        lastFaceRef.current = { metrics: m, at: now }
      }
    }

    if (current === 'challenge') {
      runChallengeFrame(video, faces, now)
      return
    }

    // ----- "ready" stage: warnings only; capture is always allowed -----
    if (current === 'ready') {
      const warn = (text: string) => {
        setPoseOk(false)
        setMessage(`${text} You can still capture.`)
      }

      if (faces.length === 0) {
        return warn('No face detected.')
      }

      if (faces.length > 1) {
        return warn('More than one face detected.')
      }

      const readyCheck = checkPosition(video, faces[0])

      if ('problem' in readyCheck) {
        return warn(readyCheck.problem)
      }

      setPoseOk(true)
      setMessage('All checks passed. Tap Capture Photo.')
      return
    }

    // ----- "align" stage -----
    const fail = (text: string) => {
      holdRef.current = 0
      alignSumRef.current = { ear: 0, mouth: 0, height: 0, n: 0 }
      startReadyRef.current = false
      setStartReady(false)
      setHoldProgress(0)
      setPoseOk(false)
      setMessage(text)
    }

    if (faces.length === 0) {
      return fail('No face detected. Move into the frame.')
    }

    if (faces.length > 1) {
      return fail('More than one face detected. Only you should be visible.')
    }

    const checked = checkPosition(video, faces[0])

    if ('problem' in checked) {
      return fail(checked.problem)
    }

    const { metrics } = checked

    // Neutral-face baseline for the challenge checks.
    const sums = alignSumRef.current

    sums.ear += eyeAspectRatio(faces[0], video.videoWidth, video.videoHeight)
    sums.mouth += mouthWidthRatio(
      faces[0],
      video.videoWidth,
      video.videoHeight
    )
    sums.height += metrics.heightFrac
    sums.n += 1

    // Position is good. The user decides when to begin the
    // liveness check; nothing advances automatically.
    const ready = sums.n >= MIN_ALIGN_FRAMES

    startReadyRef.current = ready

    setStartReady(ready)
    setPoseOk(true)
    setHoldProgress(Math.min(1, sums.n / MIN_ALIGN_FRAMES))
    setMessage(
      ready
        ? 'Face looks good. Tap "Start liveness check".'
        : 'Good. Hold still…'
    )
  }, [changeStage, resetFlow]) // eslint-disable-line react-hooks/exhaustive-deps

  const startLoop = useCallback(() => {
    runningRef.current = true

    const tick = (now: number) => {
      if (!runningRef.current) {
        return
      }

      rafRef.current = requestAnimationFrame(tick)

      const interval =
        stageRef.current === 'challenge' ? 0 : DETECT_INTERVAL_MS

      if (now - lastDetectRef.current < interval) {
        return
      }

      lastDetectRef.current = now

      try {
        evaluateFrame()
      } catch (error) {
        console.error('Face detection error:', error)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [evaluateFrame])

  // -----------------------------------------------
  // OPEN / CLOSE LIFECYCLE
  // -----------------------------------------------

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    resetFlow()
    setCameraReady(false)
    setErrorText('')
    setPhase('loading')
    setMessage('Starting camera…')

    ;(async () => {
      try {
        await Promise.all([loadModel(), startCamera()])

        if (cancelled) {
          return
        }

        setPhase('capturing')
        setMessage('Look straight at the camera.')

        startLoop()
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error('Live photo capture error:', error)

        stopCamera()

        setErrorText(describeCameraError(error))
        setPhase('error')
      }
    })()

    return () => {
      cancelled = true
      teardown()
    }
  }, [open, resetFlow, loadModel, startCamera, startLoop, stopCamera, teardown])

  // Close with Escape.
  useEffect(() => {
    if (!open) {
      return
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && phase !== 'saving') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [open, phase, onClose])

  // -----------------------------------------------
  // ACTIONS
  // -----------------------------------------------

  // User-started liveness check (needs a good, steady face first).
  const handleStartChallenge = () => {
    const sums = alignSumRef.current

    if (
      stageRef.current !== 'align' ||
      !startReadyRef.current ||
      sums.n < MIN_ALIGN_FRAMES
    ) {
      return
    }

    baselineRef.current = {
      ear: sums.ear / sums.n,
      mouth: sums.mouth / sums.n,
      height: sums.height / sums.n,
    }

    const active = challengeRef.current
    const now = performance.now()

    challengeStateRef.current = {
      kind: active.key,
      startedAt: now,
      lastFaceAt: now,
      blinks: 0,
      eyesClosed: false,
      smileFrames: 0,
      smiling: false,
      nearFrames: 0,
      near: false,
    }

    startReadyRef.current = false

    setStartReady(false)
    setPoseOk(false)
    setHoldProgress(0)
    setMessage(active.hint)

    changeStage('challenge')
  }

  // Manual capture: always available once a video frame exists.
  // Validation results are warnings only and never block it.
  const handleCapture = () => {
    const video = videoRef.current

    if (
      !video ||
      video.readyState < 2 ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setMessage('The camera is still loading. Please wait a moment.')
      return
    }

    const last = lastFaceRef.current
    const side = Math.min(video.videoWidth, video.videoHeight)

    // Centre the crop on a recently detected face; otherwise use
    // the centre of the frame.
    const metrics: FaceMetrics =
      last && performance.now() - last.at < FACE_CROP_MAX_AGE_MS
        ? last.metrics
        : {
            yaw: 0,
            pitch: 0.6,
            roll: 0,
            offsetX: 0,
            offsetY: 0,
            heightFrac: 0.55,
            inside: true,
            faceBox: {
              x: (video.videoWidth - side / 1.8) / 2,
              y: (video.videoHeight - side / 1.8) / 2,
              w: side / 1.8,
              h: side / 1.8,
            },
          }

    bestFrameRef.current = null
    captureCandidate(video, metrics, {
      brightness: 0,
      contrast: 0,
      sharpness: 0,
      frameBrightness: 0,
    })

    void finishCapture()
  }

  const handleRetake = async () => {
    releasePreview()
    resetFlow()
    setCameraReady(false)
    setErrorText('')
    setPhase('loading')
    setMessage('Starting camera…')

    try {
      await loadModel()
      await startCamera()

      setPhase('capturing')
      setMessage('Look straight at the camera.')

      startLoop()
    } catch (error) {
      stopCamera()

      setErrorText(describeCameraError(error))
      setPhase('error')
    }
  }

  const handleConfirm = async () => {
    const blob = photoBlobRef.current

    if (!blob) {
      return
    }

    setSaveError('')
    setPhase('saving')

    try {
      await onSave(blob)

      teardown()
      onClose()
    } catch (error) {
      setSaveError(
        (error as Error)?.message ||
          'Failed to save the photo. Please try again.'
      )

      setPhase('preview')
    }
  }

  if (!open) {
    return null
  }

  // -----------------------------------------------
  // RENDER
  // -----------------------------------------------

  const showVideo = phase === 'loading' || phase === 'capturing'
  const stageIndex = stage === 'align' ? 0 : stage === 'ready' ? 2 : 1
  const failed = stage === 'failed'
  const guideColor = failed
    ? '#DC2626'
    : poseOk
      ? '#10B981'
      : 'rgba(255,255,255,0.85)'

  const title =
    stage === 'align'
      ? 'Look straight at the camera'
      : stage === 'challenge'
        ? challenge.label
        : stage === 'ready'
          ? 'Ready to capture'
          : 'Challenge not completed'

  const centered = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as const

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Take a live profile photo"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(2,6,23,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          maxHeight: '100%',
          overflowY: 'auto',
          background: 'var(--bg)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: 20,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600,
            }}
          >
            <Camera size={18} />
            Live profile photo
          </div>

          <button
            type="button"
            aria-label="Close camera"
            disabled={phase === 'saving'}
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ---------- CAMERA VIEW ---------- */}
        <div style={{ display: showVideo ? 'block' : 'none' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: 16,
              overflow: 'hidden',
              background: '#000',
            }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
              }}
            />

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              <ellipse
                cx="50"
                cy="50"
                rx="29"
                ry="38"
                fill="none"
                stroke={guideColor}
                strokeWidth="1.2"
                strokeDasharray={poseOk ? '0' : '4 3'}
              />
            </svg>

            {phase === 'loading' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.55)',
                  color: 'white',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  padding: 16,
                }}
              >
                Starting camera and loading face detection…
              </div>
            )}
          </div>

          {/* Progress: Position -> Challenge -> Photo */}
          <div
            style={{ display: 'flex', gap: 6, marginTop: 14 }}
            aria-label={`Step ${stageIndex + 1} of ${STAGE_LABELS.length}`}
          >
            {STAGE_LABELS.map((label, index) => (
              <div
                key={label}
                title={label}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  background:
                    index < stageIndex
                      ? '#10B981'
                      : index === stageIndex
                        ? failed
                          ? '#DC2626'
                          : 'var(--blue)'
                        : 'var(--border)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {index === stageIndex && !failed && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: `${holdProgress * 100}%`,
                      background: '#10B981',
                      transition: 'width 90ms linear',
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, fontWeight: 600 }}>
            {STAGE_LABELS[stageIndex]}: {title}
          </div>

          <div
            aria-live="polite"
            role={failed ? 'alert' : undefined}
            style={{
              marginTop: 4,
              fontSize: '0.88rem',
              color: failed
                ? '#DC2626'
                : poseOk
                  ? '#059669'
                  : 'var(--text-muted)',
              minHeight: 38,
            }}
          >
            {message}
          </div>

          {stage === 'align' && (
            <button
              type="button"
              className="btn-ghost"
              disabled={!startReady || phase !== 'capturing'}
              onClick={handleStartChallenge}
              style={{
                width: '100%',
                marginTop: 6,
                padding: '12px 16px',
                fontWeight: 600,
                ...centered,
                opacity: startReady && phase === 'capturing' ? 1 : 0.45,
                cursor:
                  startReady && phase === 'capturing'
                    ? 'pointer'
                    : 'not-allowed',
              }}
            >
              Start liveness check
            </button>
          )}

          <button
            type="button"
            className="btn-primary"
            disabled={!cameraReady || phase !== 'capturing'}
            onClick={handleCapture}
            style={{
              width: '100%',
              marginTop: 6,
              padding: '12px 16px',
              fontWeight: 600,
              ...centered,
              opacity: cameraReady && phase === 'capturing' ? 1 : 0.45,
              cursor:
                cameraReady && phase === 'capturing'
                  ? 'pointer'
                  : 'not-allowed',
            }}
          >
            <Camera size={16} />
            Capture Photo
          </button>

          <div
            style={{
              marginTop: 8,
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
            }}
          >
            {cameraReady && phase === 'capturing'
              ? 'You can capture at any time. For a clearer photo, face the light and look straight at the camera. The liveness check is optional.'
              : 'The camera is still loading. Capture Photo will be available in a moment.'}
          </div>

          {failed && (
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
                style={{ flex: 1 }}
              >
                Close
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={retryChallenge}
                style={{ flex: 1, ...centered }}
              >
                <RotateCcw size={15} />
                Try again
              </button>
            </div>
          )}
        </div>

        {/* ---------- PREVIEW ---------- */}
        {(phase === 'preview' || phase === 'saving') && (
          <div>
            <div
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: 16,
                overflow: 'hidden',
                background: '#000',
              }}
            >
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Preview of your new profile photo"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              )}
            </div>

            <p
              style={{
                margin: '12px 0 0',
                fontSize: '0.88rem',
                color: 'var(--text-muted)',
              }}
            >
              Check that your face is clear. Use this photo as your
              profile picture?
            </p>

            {saveError && (
              <p
                role="alert"
                style={{
                  margin: '10px 0 0',
                  fontSize: '0.88rem',
                  color: '#DC2626',
                }}
              >
                {saveError}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                type="button"
                className="btn-ghost"
                disabled={phase === 'saving'}
                onClick={handleRetake}
                style={{ flex: 1, ...centered }}
              >
                <RotateCcw size={15} />
                Retake
              </button>

              <button
                type="button"
                className="btn-primary"
                disabled={phase === 'saving'}
                onClick={handleConfirm}
                style={{ flex: 1, ...centered }}
              >
                <Check size={15} />
                {phase === 'saving' ? 'Saving…' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        )}

        {/* ---------- ERROR ---------- */}
        {phase === 'error' && (
          <div>
            <p
              role="alert"
              style={{
                margin: '8px 0 16px',
                color: '#DC2626',
                fontSize: '0.92rem',
              }}
            >
              {errorText}
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
                style={{ flex: 1 }}
              >
                Close
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={handleRetake}
                style={{ flex: 1 }}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <p
          style={{
            margin: '14px 0 0',
            fontSize: '0.75rem',
            color: 'var(--text-subtle)',
          }}
        >
          The camera runs on your device and stops when you finish. These
          checks help capture a clear, live photo. They do not verify your
          identity and cannot guarantee protection against spoofing.
        </p>
      </div>
    </div>
  )
}
