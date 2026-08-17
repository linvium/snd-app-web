'use client'

import { useMemo, useRef, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CameraIcon, Loader2Icon, RefreshCwIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { MAX_IMAGE_BYTES, MAX_LISTING_IMAGES } from '@/types/listing'
import type { ListingImage } from '@/types/listing'
import {
  useDeleteListingImage,
  useReorderListingImages,
  useUploadListingImage,
} from '@/hooks/listings'

const READY_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

function jpegFileName(name: string): string {
  return name.replace(/\.[^.]+$/, '') + '.jpg'
}

async function convertHeic(file: File): Promise<File> {
  const heic2any = (await import('heic2any')).default as (options: {
    blob: Blob
    toType: string
    quality?: number
  }) => Promise<Blob | Blob[]>
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
  const blob = Array.isArray(converted) ? converted[0] : converted
  return new File([blob], jpegFileName(file.name), { type: 'image/jpeg' })
}

async function reencodeToJpeg(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('Nismo mogli da obradimo sliku.')
  }
  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Nismo mogli da obradimo sliku.'))),
      'image/jpeg',
      0.92
    )
  })
  return new File([blob], jpegFileName(file.name), { type: 'image/jpeg' })
}

async function prepareImageFile(file: File): Promise<File> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Slika sme da ima najviše 10 MB.')
  }

  const type = file.type.toLowerCase()
  const isHeic =
    type.includes('heic') || type.includes('heif') || /\.hei[cf]$/i.test(file.name)

  if (isHeic) {
    try {
      return await convertHeic(file)
    } catch {
      try {
        return await reencodeToJpeg(file)
      } catch {
        throw new Error('HEIC slike nisu podržane. Sačuvaj sliku kao JPEG ili PNG.')
      }
    }
  }

  if (READY_TYPES.has(type)) return file

  try {
    return await reencodeToJpeg(file)
  } catch {
    try {
      return await convertHeic(file)
    } catch {
      throw new Error('Koristi JPEG, PNG, WebP ili AVIF sliku.')
    }
  }
}

interface PendingUpload {
  key: string
  previewUrl: string
  status: 'uploading' | 'error'
  error?: string
  file: File
}

function SortableThumb({
  image,
  isCover,
  isRemoving,
  slotIndex,
  onRemove,
}: {
  image: ListingImage
  isCover: boolean
  isRemoving: boolean
  slotIndex: number
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
    disabled: isRemoving,
  })

  return (
    <div
      ref={setNodeRef}
      data-testid={`photo-slot-${slotIndex}`}
      data-image-id={image.id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted',
        isDragging && 'z-10 opacity-80',
        isRemoving && 'opacity-70'
      )}
      {...attributes}
      {...listeners}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.thumbnail_url} alt="" className="size-full object-cover" />
      {isCover && !isRemoving ? (
        <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
          Naslovna
        </span>
      ) : null}
      {isRemoving ? (
        <div className="absolute inset-0 grid place-items-center bg-black/55">
          <div className="flex flex-col items-center gap-1.5 text-white">
            <Loader2Icon className="size-6 animate-spin" aria-hidden />
            <span className="text-[12px] font-medium">Uklanjanje…</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          className="absolute top-1.5 right-1.5 grid size-7 cursor-pointer place-items-center rounded-full bg-black/70 text-white hover:bg-black/85"
          aria-label="Ukloni sliku"
          data-testid="photo-remove"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  )
}

export function PhotosStep({
  listingId,
  images,
  error,
}: {
  listingId: string
  images: ListingImage[]
  error?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingUpload[]>([])
  const [removingIds, setRemovingIds] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const upload = useUploadListingImage(listingId)
  const remove = useDeleteListingImage(listingId)
  const reorder = useReorderListingImages(listingId)
  const imagesRef = useRef(images)
  imagesRef.current = images
  const queueRef = useRef<File[]>([])
  const activeRef = useRef(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const filled = images.length + pending.filter((item) => item.status === 'uploading').length
  const emptySlots = Math.max(0, MAX_LISTING_IMAGES - filled)

  const slots = useMemo(() => {
    const items: Array<
      | { type: 'image'; image: ListingImage }
      | { type: 'pending'; pending: PendingUpload }
      | { type: 'empty'; key: string }
    > = [
      ...images.map((image) => ({ type: 'image' as const, image })),
      ...pending.map((item) => ({ type: 'pending' as const, pending: item })),
      ...Array.from({ length: emptySlots }, (_, index) => ({
        type: 'empty' as const,
        key: `empty-${index}`,
      })),
    ]
    return items.slice(0, MAX_LISTING_IMAGES)
  }, [images, pending, emptySlots])

  const pumpQueue = () => {
    while (queueRef.current.length > 0 && activeRef.current < 3) {
      const file = queueRef.current.shift()
      if (!file) break
      void startUpload(file)
    }
  }

  const startUpload = async (file: File) => {
    activeRef.current += 1
    const key = `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`
    const previewUrl = URL.createObjectURL(file)
    setPending((current) => [...current, { key, previewUrl, status: 'uploading', file }])

    try {
      const prepared = await prepareImageFile(file)
      const result = await upload.mutateAsync(prepared)
      if (result.is_portrait) {
        toast.warning('Uspravne slike nisu idealne. Biće iskadrirane na 4:3.')
      }
      setPending((current) => current.filter((item) => item.key !== key))
      URL.revokeObjectURL(previewUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Otpremanje nije uspelo.'
      toast.error(message)
      setPending((current) =>
        current.map((item) =>
          item.key === key ? { ...item, status: 'error', error: message } : item
        )
      )
    } finally {
      activeRef.current -= 1
      pumpQueue()
    }
  }

  const addFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList)
    const remaining = MAX_LISTING_IMAGES - images.length - pending.length - queueRef.current.length
    if (remaining <= 0) {
      toast.error('Možeš dodati najviše 8 slika.')
      return
    }
    const accepted = incoming.slice(0, remaining)
    if (incoming.length > remaining) {
      toast.error('Možeš dodati najviše 8 slika.')
    }
    queueRef.current.push(...accepted)
    void pumpQueue()
  }

  const openPicker = () => {
    if (images.length + pending.length >= MAX_LISTING_IMAGES) {
      toast.error('Možeš dodati najviše 8 slika.')
      return
    }
    inputRef.current?.click()
  }

  const retry = (item: PendingUpload) => {
    setPending((current) => current.filter((entry) => entry.key !== item.key))
    URL.revokeObjectURL(item.previewUrl)
    queueRef.current.push(item.file)
    void pumpQueue()
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = imagesRef.current.map((image) => image.id)
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(ids, oldIndex, newIndex)
    void reorder.mutateAsync(next)
  }

  return (
    <div>
      <p className="mt-0 mb-3 text-[13px] leading-5 text-muted-foreground">
        Postavi slike u pejzažnom formatu (4:3). Da bi slike dobro izgledale, treba da budu položene.
        Uspravne slike neće biti prikazane u celini.
      </p>

      <input
        ref={inputRef}
        type="file"
        data-testid="photo-file-input"
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif,.avif"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) addFiles(event.target.files)
          event.target.value = ''
        }}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={images.map((image) => image.id)} strategy={rectSortingStrategy}>
          <div
            data-testid="photo-grid"
            className={cn(
              'grid grid-cols-2 gap-2 sm:grid-cols-4',
              isDragging && 'rounded-lg ring-3 ring-brand-100'
            )}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragging(false)
              if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files)
            }}
          >
            {slots.map((slot, index) => {
              if (slot.type === 'image') {
                return (
                  <SortableThumb
                    key={slot.image.id}
                    image={slot.image}
                    isCover={index === 0}
                    slotIndex={index}
                    isRemoving={removingIds.includes(slot.image.id)}
                    onRemove={() => {
                      const imageId = slot.image.id
                      if (removingIds.includes(imageId)) return
                      setRemovingIds((current) => [...current, imageId])
                      remove.mutate(imageId, {
                        onError: (err) => {
                          const message =
                            err instanceof Error ? err.message : 'Nismo mogli da uklonimo sliku.'
                          toast.error(message)
                        },
                        onSettled: () => {
                          setRemovingIds((current) => current.filter((id) => id !== imageId))
                        },
                      })
                    }}
                  />
                )
              }

              if (slot.type === 'pending') {
                return (
                  <div
                    key={slot.pending.key}
                    data-testid={`photo-slot-${index}`}
                    className={cn(
                      'relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted',
                      slot.pending.status === 'error' ? 'border-destructive' : 'border-border'
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slot.pending.previewUrl} alt="" className="size-full object-cover opacity-60" />
                    <div className="absolute inset-0 grid place-items-center bg-black/40 p-2">
                      {slot.pending.status === 'uploading' ? (
                        <Loader2Icon className="size-7 animate-spin text-white" data-testid="photo-upload-progress" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => retry(slot.pending)}
                          className="flex max-w-full flex-col items-center gap-1 text-white"
                          aria-label="Pokušaj ponovo"
                        >
                          <span className="grid size-10 place-items-center rounded-full bg-black/70">
                            <RefreshCwIcon className="size-5" />
                          </span>
                          {slot.pending.error ? (
                            <span className="line-clamp-3 text-center text-[11px] leading-4">
                              {slot.pending.error}
                            </span>
                          ) : null}
                        </button>
                      )}
                    </div>
                  </div>
                )
              }

              return (
                <button
                  key={slot.key}
                  type="button"
                  data-testid={`photo-slot-${index}`}
                  onClick={openPicker}
                  className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-100 text-zinc-400 hover:border-brand-500 hover:text-brand-600"
                  aria-label="Dodaj sliku"
                >
                  <CameraIcon className="size-7" strokeWidth={1.5} />
                </button>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      {error ? <p className="mt-2 mb-0 text-[13px] text-destructive">{error}</p> : null}
    </div>
  )
}
