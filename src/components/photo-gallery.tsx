"use client";

import { useState, useRef } from "react";
import { Camera, X, Upload, ZoomIn } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Photo {
  id: string;
  url: string;
  caption: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  jobId: string;
  canDelete?: boolean;
}

export function PhotoGallery({ photos: initialPhotos, jobId, canDelete }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", caption);

    const res = await fetch(`/api/jobs/${jobId}/photos`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const photo = await res.json();
      setPhotos((prev) => [photo, ...prev]);
      setCaption("");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(photoId: string) {
    if (!confirm("Delete this photo?")) return;
    const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    }
  }

  return (
    <div>
      <div className="bg-gray-50 rounded-xl p-4 mb-4 border-2 border-dashed border-gray-200">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleUpload}
          className="hidden"
          id="photo-upload"
        />
        <div className="flex gap-2 mb-3">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Optional caption..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <label
          htmlFor="photo-upload"
          className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl text-white font-semibold cursor-pointer transition-colors ${
            uploading ? "bg-gray-400 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600 active:bg-orange-700"
          }`}
        >
          {uploading ? (
            <>
              <Upload size={20} className="animate-bounce" />
              Uploading...
            </>
          ) : (
            <>
              <Camera size={20} />
              Take Photo / Upload
            </>
          )}
        </label>
      </div>

      {photos.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No photos yet</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption || "Job photo"}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightbox(photo)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {canDelete && (
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              )}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1.5 truncate">
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.caption}
              className="w-full rounded-lg max-h-[80vh] object-contain"
            />
            <div className="text-white mt-3">
              {lightbox.caption && <p className="font-medium">{lightbox.caption}</p>}
              <p className="text-gray-400 text-sm">
                {formatDate(lightbox.uploadedAt)} · {lightbox.uploadedBy}
              </p>
            </div>
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
