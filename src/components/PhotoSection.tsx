import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeftRight, Camera, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ProgressPhoto } from '../db/schema'
import { addPhoto, deletePhoto, listPhotos, today } from '../db/repository'
import { useT } from '../i18n'
import { formatShortDay } from '../lib/format'
import { compressImage } from '../lib/image'
import ConfirmDialog from './ConfirmDialog'
import Sheet from './Sheet'

/** Object URL for a stored blob, revoked when the blob changes or unmounts. */
function usePhotoUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])
  return url
}

/**
 * Progress photos live on the Body screen: the scale wobbles daily, but a
 * monthly photo next to the first one doesn't lie. Everything stays on-device
 * like the rest of the data; photos ride along in backups.
 */
export default function PhotoSection({ profileId }: { profileId: string }) {
  const { t, locale } = useT()
  const fileInput = useRef<HTMLInputElement>(null)
  const [viewing, setViewing] = useState<ProgressPhoto | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const photos = useLiveQuery(() => listPhotos(profileId), [profileId]) ?? []

  const onFileChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setSaving(true)
    setError(null)
    try {
      const blob = await compressImage(file)
      await addPhoto(profileId, { date: today(), blob })
    } catch {
      // A HEIC the canvas cannot decode, or a photo too large to hold in
      // memory, throws here. Without a catch it surfaced as an unhandled
      // rejection: the button came back to life and nothing else happened, so
      // the only reading available was that the app had ignored the tap.
      setError(t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="section-title">{t('body.photos')}</h2>
        {photos.length >= 2 && (
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            className="-me-2 flex items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium text-brand-500 active:bg-ink-600"
          >
            <ArrowLeftRight size={13} />
            {t('body.compare')}
          </button>
        )}
      </div>

      {photos.length === 0 ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => fileInput.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed
                     border-ink-400 py-6 text-sm font-medium text-brand-500
                     active:bg-ink-700 disabled:opacity-50"
        >
          <Camera size={22} />
          {saving ? t('body.photoSaving') : t('body.addPhoto')}
          <span className="px-6 text-center text-xs font-normal leading-relaxed text-ink-300">
            {t('body.photosHint')}
          </span>
        </button>
      ) : (
        <div className="scroll-area flex gap-2 overflow-x-auto pb-1">
          {/* Newest first: the photo you just took should be the first thing you see. */}
          {[...photos].reverse().map((photo) => (
            <PhotoThumb key={photo.id} photo={photo} onOpen={() => setViewing(photo)} />
          ))}
          <button
            type="button"
            disabled={saving}
            onClick={() => fileInput.current?.click()}
            aria-label={t('body.addPhoto')}
            className="flex h-32 w-24 shrink-0 items-center justify-center rounded-xl border
                       border-dashed border-ink-500 text-brand-500 active:bg-ink-700
                       disabled:opacity-50"
          >
            <Camera size={20} />
          </button>
        </div>
      )}

      {error && <p className="mt-2 px-1 text-xs text-danger-400">{error}</p>}

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        onChange={onFileChosen}
        className="hidden"
      />

      {viewing && (
        <Sheet
          open
          onClose={() => setViewing(null)}
          title={formatShortDay(new Date(`${viewing.date}T00:00:00`), locale)}
          tall
        >
          <FullPhoto photo={viewing} />
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink-600
                       py-3 text-sm font-medium text-danger-400 active:bg-ink-500"
          >
            <Trash2 size={16} />
            {t('common.delete')}
          </button>
        </Sheet>
      )}

      {compareOpen && (
        <CompareSheet photos={photos} onClose={() => setCompareOpen(false)} />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={t('body.deletePhotoConfirm')}
        body={t('common.confirmDelete')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          if (viewing) void deletePhoto(viewing.id)
          setViewing(null)
        }}
      />
    </section>
  )
}

function PhotoThumb({ photo, onOpen }: { photo: ProgressPhoto; onOpen: () => void }) {
  const { locale } = useT()
  const url = usePhotoUrl(photo.blob)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative h-32 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-700 active:opacity-80"
    >
      {url && <img src={url} alt={photo.date} className="h-full w-full object-cover" />}
      <span
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent
                   px-1.5 pb-1 pt-3 text-[10px] font-medium text-white"
      >
        {formatShortDay(new Date(`${photo.date}T00:00:00`), locale)}
      </span>
    </button>
  )
}

function FullPhoto({ photo }: { photo: ProgressPhoto }) {
  const url = usePhotoUrl(photo.blob)
  return url ? (
    <img src={url} alt={photo.date} className="w-full rounded-2xl object-contain" />
  ) : (
    <div className="h-64 w-full rounded-2xl bg-ink-700" />
  )
}

/**
 * Before/after, defaulting to first photo against the latest — the comparison
 * everyone actually wants. The arrows walk either side through the timeline.
 */
function CompareSheet({ photos, onClose }: { photos: ProgressPhoto[]; onClose: () => void }) {
  const { t } = useT()
  const [leftIndex, setLeftIndex] = useState(0)
  const [rightIndex, setRightIndex] = useState(photos.length - 1)

  return (
    <Sheet open onClose={onClose} title={t('body.compare')} tall>
      <div className="grid grid-cols-2 gap-3">
        <CompareColumn
          photos={photos}
          index={leftIndex}
          onStep={(delta) =>
            setLeftIndex((index) => Math.max(0, Math.min(photos.length - 1, index + delta)))
          }
        />
        <CompareColumn
          photos={photos}
          index={rightIndex}
          onStep={(delta) =>
            setRightIndex((index) => Math.max(0, Math.min(photos.length - 1, index + delta)))
          }
        />
      </div>
    </Sheet>
  )
}

function CompareColumn({
  photos,
  index,
  onStep,
}: {
  photos: ProgressPhoto[]
  index: number
  onStep: (delta: number) => void
}) {
  const { t, locale } = useT()
  const photo = photos[index]
  const url = usePhotoUrl(photo?.blob)

  if (!photo) return null

  return (
    <div>
      <div className="aspect-[3/4] overflow-hidden rounded-xl bg-ink-700">
        {url && <img src={url} alt={photo.date} className="h-full w-full object-cover" />}
      </div>
      <div className="mt-2 flex items-center justify-between">
        {/* Physical arrows, not logical: they step through time, and the
            timeline direction is the array order in both languages. */}
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onStep(-1)}
          aria-label={t('common.previous')}
          className="icon-btn-sm bg-ink-600 text-ink-200 active:bg-ink-500 disabled:opacity-30"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="tabular text-xs font-medium text-ink-200">
          {formatShortDay(new Date(`${photo.date}T00:00:00`), locale)}
        </span>
        <button
          type="button"
          disabled={index === photos.length - 1}
          onClick={() => onStep(1)}
          aria-label={t('common.next')}
          className="icon-btn-sm bg-ink-600 text-ink-200 active:bg-ink-500 disabled:opacity-30"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
