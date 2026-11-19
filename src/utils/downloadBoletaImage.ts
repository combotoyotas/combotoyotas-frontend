import {
  BOLETA_WIDTH,
  BOLETA_LEFT_WIDTH,
  BOLETA_RIGHT_WIDTH,
  BOLETA_DEFAULT_HEIGHT,
} from '@/constants/boletaDimensions'

export { BOLETA_WIDTH, BOLETA_DEFAULT_HEIGHT }
export { BOLETA_DEFAULT_HEIGHT as BOLETA_HEIGHT }

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function exportScale(custom?: number): number {
  if (custom) return custom
  return isMobileDevice() ? 2 : 3
}

function resolveTicketElement(options: {
  element?: HTMLElement | null
  elementId?: string
  selector?: string
}): HTMLElement | null {
  if (options.element) {
    return options.element.classList.contains('boleta-ticket')
      ? options.element
      : (options.element.querySelector('.boleta-ticket') as HTMLElement) ?? options.element
  }
  if (options.elementId) {
    const wrapper = document.getElementById(options.elementId)
    if (!wrapper) return null
    return (wrapper.querySelector('.boleta-ticket') as HTMLElement) ?? wrapper
  }
  if (options.selector) {
    const el = document.querySelector(options.selector) as HTMLElement | null
    if (!el) return null
    return el.classList.contains('boleta-ticket')
      ? el
      : (el.querySelector('.boleta-ticket') as HTMLElement) ?? el
  }
  return null
}

function waitForLayoutSettlement(ms = 48): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, ms)))
  })
}

async function waitForImages(el: HTMLElement, timeoutMs = 10000): Promise<void> {
  const imgs = Array.from(el.querySelectorAll('img'))
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve()
            return
          }
          const done = () => resolve()
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
          setTimeout(done, timeoutMs)
        })
    )
  )
}

function readTicketCaptureHeight(ticket: HTMLElement): number {
  const inline = ticket.style.height
  if (inline) {
    const n = parseInt(inline, 10)
    if (Number.isFinite(n) && n > 0) return n
  }
  const h = ticket.offsetHeight
  if (h > 0) return h
  return BOLETA_DEFAULT_HEIGHT
}

/** Clona el ticket fuera de pantalla (sin scale del wrapper) para html2canvas sin deformar flex. */
function mountTicketClone(source: HTMLElement): { clone: HTMLElement; host: HTMLDivElement } {
  const captureHeight = readTicketCaptureHeight(source)
  const clone = source.cloneNode(true) as HTMLElement
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = [
    'position:fixed',
    'left:-14000px',
    'top:0',
    `width:${BOLETA_WIDTH}px`,
    `height:${captureHeight}px`,
    'overflow:hidden',
    'pointer-events:none',
    'opacity:1',
    'z-index:-1',
  ].join(';')

  clone.style.boxSizing = 'border-box'
  clone.style.display = 'flex'
  clone.style.flexDirection = 'row'
  clone.style.width = `${BOLETA_WIDTH}px`
  clone.style.height = `${captureHeight}px`
  clone.style.minWidth = `${BOLETA_WIDTH}px`
  clone.style.maxWidth = `${BOLETA_WIDTH}px`
  clone.style.overflow = 'hidden'
  clone.style.transform = 'none'
  clone.style.position = 'relative'

  const left = clone.querySelector('.boleta-ticket__left') as HTMLElement | null
  const right = clone.querySelector('.boleta-ticket__right') as HTMLElement | null
  if (left) {
    left.style.flexShrink = '0'
    left.style.width = `${BOLETA_LEFT_WIDTH}px`
    left.style.height = `${captureHeight}px`
    left.style.boxSizing = 'border-box'
    left.style.overflow = 'hidden'
  }
  if (right) {
    right.style.flexShrink = '0'
    right.style.width = `${BOLETA_RIGHT_WIDTH}px`
    right.style.height = `${captureHeight}px`
    right.style.position = 'relative'
    right.style.overflow = 'hidden'
    const art = right.querySelector(':scope > img') as HTMLElement | null
    if (art) {
      art.style.width = '100%'
      art.style.height = '100%'
      art.style.objectFit = 'cover'
      art.style.display = 'block'
    }
  }

  host.appendChild(clone)
  document.body.appendChild(host)
  return { clone, host }
}

export type BoletaImageDelivery = 'save' | 'share'

async function tryShareImageFile(file: File, title: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  if (!navigator.canShare?.({ files: [file] })) return false
  try {
    await navigator.share({ files: [file], title })
    return true
  } catch (err) {
    if ((err as Error).name === 'AbortError') return false
    return false
  }
}

async function triggerFileDownload(
  blob: Blob,
  fileName: string,
  delivery: BoletaImageDelivery = 'save'
): Promise<boolean> {
  const mime = blob.type || 'image/jpeg'
  const file = new File([blob], fileName, { type: mime })
  const mobile = isMobileDevice()

  if (delivery === 'share' || (delivery === 'save' && mobile)) {
    const shared = await tryShareImageFile(file, fileName.replace(/\.(jpe?g|png)$/i, ''))
    if (shared) return true
  }

  const url = URL.createObjectURL(blob)

  if (isIOS() && delivery === 'save') {
    const opened = window.open(url, '_blank', 'noopener,noreferrer')
    if (opened) {
      setTimeout(() => URL.revokeObjectURL(url), 120000)
      return true
    }
  }

  try {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.rel = 'noopener'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return true
  } catch {
    window.open(url, '_blank')
    return true
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }
}

export async function captureBoletaTicket(
  ticket: HTMLElement,
  scale?: number
): Promise<HTMLCanvasElement | null> {
  const captureHeight = readTicketCaptureHeight(ticket)
  const { clone, host } = mountTicketClone(ticket)

  try {
    await waitForImages(clone)
    await waitForLayoutSettlement()
    const html2canvas = (await import('html2canvas-pro')).default
    return await html2canvas(clone, {
      width: BOLETA_WIDTH,
      height: captureHeight,
      scale: exportScale(scale),
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    })
  } catch (err) {
    console.error('Error capturando boleta:', err)
    return null
  } finally {
    host.remove()
  }
}

export async function downloadBoletaFromElement(
  ticket: HTMLElement,
  fileName: string,
  scale?: number,
  delivery: BoletaImageDelivery = 'save'
): Promise<boolean> {
  const canvas = await captureBoletaTicket(ticket, scale)
  if (!canvas) return false

  const useJpeg = delivery === 'save' || delivery === 'share'
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), useJpeg ? 'image/jpeg' : 'image/png', 0.92)
  })
  if (!blob) return false

  const base = fileName.replace(/\.(png|jpe?g)$/i, '')
  const name = useJpeg ? `${base}.jpg` : `${base}.png`
  return triggerFileDownload(blob, name, delivery)
}

export async function downloadBoletaImage(options: {
  elementId?: string
  element?: HTMLElement
  selector?: string
  fileName: string
  scale?: number
  delivery?: BoletaImageDelivery
}): Promise<boolean> {
  const ticket = resolveTicketElement(options)
  if (!ticket) return false
  return downloadBoletaFromElement(
    ticket,
    options.fileName,
    options.scale,
    options.delivery ?? 'save'
  )
}