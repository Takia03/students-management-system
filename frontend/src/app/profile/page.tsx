"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getProfile,
  getProfileImageUrl,
  uploadProfilePicture,
  type UserProfile,
  getGalleryPhotos,
  uploadGalleryPhotos,
  type GalleryPhoto,
} from "@/api/studentsApi";
import "./profile.css";
import JSZip from "jszip";

function GraduationIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="m4 24 28-14 28 14-28 14L4 24Z" />
      <path d="M16 30v14c9 8 23 8 32 0V30M60 24v17" />
      <circle cx="60" cy="44" r="3" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="21" r="13" />
      <path d="M8 58c1-14 10-22 24-22s23 8 24 22H8z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18M8 14h2M14 14h2M8 17h2" />
    </svg>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingProfileImageUrl, setPendingProfileImageUrl] = useState<
    string | null
  >(null);
  const [uploadError, setUploadError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryPhoto[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);

  useEffect(() => {
    let active = true;

    getProfile()
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch((err: unknown) => {
        if (active && err instanceof Error) setError(err.message);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getGalleryPhotos()
      .then((photos) => {
        if (active) setGalleryImages(photos);
      })
      .catch((err: unknown) => {
        if (active && err instanceof Error) {
          setUploadError(err.message);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const initial = profile?.name?.charAt(0).toUpperCase() ?? "?";

  async function handlePictureChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const updatedProfile = await uploadProfilePicture(file);
      setProfile(updatedProfile);
      if (updatedProfile.profile_image_url) {
        setPendingProfileImageUrl(updatedProfile.profile_image_url);
      } else {
        setUploading(false);
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Could not upload image.",
      );
      setUploading(false);
    }
  }

  async function handleGalleryChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) return;

    const imageFiles: File[] = [];
    let skippedFiles = false;

    try {
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          imageFiles.push(file);
          continue;
        }

        if (
          file.name.toLowerCase().endsWith(".zip") ||
          file.type === "application/zip"
        ) {
          const zip = await JSZip.loadAsync(file);
          const zipEntries = Object.values(zip.files) as JSZip.JSZipObject[];
          console.log("ZIP entries:", zipEntries.map((entry) => entry.name));
          const imageEntries = zipEntries.filter(
            (entry) =>
              !entry.dir &&
              /\.(jpe?g|jfif|png|gif|webp)$/i.test(entry.name),
          );
          console.log(
            "Matched image entries:",
            imageEntries.map((entry) => entry.name),
          );
          if (
            zipEntries.some((entry) => !entry.dir) &&
            imageEntries.length === 0
          ) {
            skippedFiles = true;
          }

          for (const entry of imageEntries) {
            const blob = await entry.async("blob");
            const name = entry.name.split("/").pop() || "image";
            const extension = name.split(".").pop()?.toLowerCase();
            const mimeType =
              extension === "jpg" ||
              extension === "jpeg" ||
              extension === "jfif"
                ? "image/jpeg"
                : extension === "png"
                  ? "image/png"
                  : extension === "webp"
                    ? "image/webp"
                    : "image/gif";
            imageFiles.push(new File([blob], name, { type: mimeType }));
          }

          continue;
        }

        skippedFiles = true;
      }
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Could not read the selected ZIP file.",
      );
      return;
    }
    if (skippedFiles) {
      setUploadError("Some files were skipped because they are not images.");
    } else {
      setUploadError("");
    }

    if (imageFiles.length === 0) return;

    setGalleryUploading(true);

    try {
      const savedPhotos = await uploadGalleryPhotos(imageFiles);
      setGalleryImages((current) => [...savedPhotos, ...current]);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Could not upload gallery photos.",
      );
    } finally {
      setGalleryUploading(false);
    }
  }

  const createdAt = profile
    ? new Date(profile.created_at).toLocaleString()
    : "";

  return (
    <div className="profile-page">
      <div className="profile-page__container">
        <Link className="profile-page__back-top" href="/students">
          <span aria-hidden="true">←</span> Back
        </Link>

        {error ? (
          <p className="profile-page__error" role="alert">
            {error}
          </p>
        ) : profile ? (
          <>
            <section className="profile-hero" aria-labelledby="profile-name">
              <div className="profile-hero__banner" aria-hidden="true">
                <span className="profile-hero__sparkle profile-hero__sparkle--one">
                  ✦
                </span>
                <span className="profile-hero__sparkle profile-hero__sparkle--two">
                  ✦
                </span>
                <GraduationIcon />
              </div>

              <div className="profile-hero__body">
                <div className="profile-hero__picture-column">
                  <div className="profile-hero__avatar">
                    {profile.profile_image_url ? (
                      <img
                        src={getProfileImageUrl(profile.profile_image_url)}
                        alt={`${profile.name}'s profile`}
                        onLoad={() => {
                          if (
                            pendingProfileImageUrl === profile.profile_image_url
                          ) {
                            setPendingProfileImageUrl(null);
                            setUploading(false);
                          }
                        }}
                        onError={() => {
                          if (
                            pendingProfileImageUrl === profile.profile_image_url
                          ) {
                            setPendingProfileImageUrl(null);
                            setUploading(false);
                            setUploadError(
                              "Picture uploaded, but it could not be displayed.",
                            );
                          }
                        }}
                      />
                    ) : (
                      <UserIcon />
                    )}
                  </div>

                  <input
                    ref={fileInput}
                    className="profile-page__file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handlePictureChange}
                  />

                  <button
                    className="profile-page__upload"
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={uploading}
                  >
                    {uploading
                      ? pendingProfileImageUrl
                        ? "Loading picture..."
                        : "Uploading..."
                      : profile.profile_image_url
                        ? "Change picture"
                        : "Upload picture"}
                  </button>
                </div>

                <div className="profile-hero__info">
                  <h1 id="profile-name">{profile.name}</h1>

                  <div className="profile-hero__student">
                    <span>
                      Student ID: {profile.student_id ?? "Not assigned"}
                    </span>
                    <span className="profile-hero__status">
                      <i aria-hidden="true" />
                      {profile.student_id ? "Active Student" : "Account"}
                    </span>
                  </div>

                  <div className="profile-hero__meta">
                    <span>
                      <i>
                        <MailIcon />
                      </i>
                      {profile.email}
                    </span>
                    <span>
                      <i>
                        <CalendarIcon />
                      </i>
                      {createdAt}
                    </span>
                  </div>

                  {uploadError && (
                    <p className="profile-page__error" role="alert">
                      {uploadError}
                    </p>
                  )}
                  <p className="profile-hero__hint">
                    JPG, PNG, WEBP or GIF · up to 5 MB
                  </p>
                </div>
              </div>
            </section>

            <div className="profile-content-card">
              <section className="profile-card" aria-labelledby="account-title">
                <h2 id="account-title" className="profile-card__title">
                  <span className="profile-card__heading-icon">
                    <UserIcon />
                  </span>
                  Account Details
                </h2>

                <dl className="profile-details">
                  <div>
                    <dt>Name</dt>
                    <dd>{profile.name}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{profile.email}</dd>
                  </div>
                  <div>
                    <dt>Student ID</dt>
                    <dd>{profile.student_id ?? "Not assigned"}</dd>
                  </div>
                  <div>
                    <dt>Created At</dt>
                    <dd>{createdAt}</dd>
                  </div>
                </dl>
              </section>

              {/* <aside className="profile-card profile-quick-info">
                <h2 className="profile-card__title">
                  <span className="profile-card__bars" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  Quick Info
                </h2>

                <div className="profile-quick-info__illustration">
                  <GraduationIcon />
                </div>
                <h3>Student Profile</h3>
                <p>View your account details</p>
              </aside> */}
            </div>

            <section
              className="profile-card profile-gallaery"
              aria-labelledby="gallery-title"
            >
              <div className="profile-gallery__header">
                <div>
                  <h2 id="gallery-title" className="profile-card__title">
                    PHOTO GALLERY
                  </h2>
                </div>

                <input
                  ref={galleryInput}
                  className="profile-page__file-input"
                  type="file"
                  accept="image/*,.zip"
                  multiple
                  onChange={handleGalleryChange}
                />

                <button
                  className="profile-page__upload"
                  type="button"
                  onClick={() => galleryInput.current?.click()}
                  disabled={galleryUploading}
                >
                  {galleryUploading ? "Uploading..." : "Add photos"}
                </button>
              </div>
              {galleryImages.length > 0 ? (
                <div className="profile-gallery__grid">
                  {galleryImages.map((image) => (
                    <figure className="profile-gallery__item" key={image.id}>
                      <img
                        src={getProfileImageUrl(image.image_url)}
                        alt="Gallery photo"
                      />
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="profile-gallery__empty">No Photos Added</p>
              )}
            </section>
          </>
        ) : (
          <p className="profile-page__loading" role="status">
            Loading profile...
          </p>
        )}
      </div>
    </div>
  );
}
