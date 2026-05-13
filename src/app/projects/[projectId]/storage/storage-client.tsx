"use client";

import { useState } from "react";

import styles from "../../../page.module.css";

type StorageBucket = {
  id: string;
  name: string;
  files: Array<{
    name: string;
    type: string;
    size: string;
    modified: string;
    notes: string;
  }>;
};

const STORAGE_BUCKETS: StorageBucket[] = [
  {
    id: "avatars",
    name: "avatars",
    files: [
      { name: "user-01.png", type: "image/png", size: "84 KB", modified: "5 minutes ago", notes: "Profile image for active user." },
      { name: "user-02.jpg", type: "image/jpeg", size: "112 KB", modified: "18 minutes ago", notes: "Fallback avatar for imported user." },
    ],
  },
  {
    id: "product-images",
    name: "product-images",
    files: [
      { name: "watch-hero-01.webp", type: "image/webp", size: "1.2 MB", modified: "2 minutes ago", notes: "Hero asset used on the landing page." },
      { name: "launch-campaign.mp4", type: "video/mp4", size: "145.2 MB", modified: "Yesterday", notes: "Campaign clip stored for reuse." },
    ],
  },
  {
    id: "logs-archive",
    name: "logs-archive",
    files: [
      { name: "2026-05-01.log", type: "text/plain", size: "4.4 MB", modified: "2 days ago", notes: "Archived deployment log bundle." },
      { name: "2026-05-02.log", type: "text/plain", size: "2.1 MB", modified: "Yesterday", notes: "Archived runtime log bundle." },
    ],
  },
  {
    id: "user-uploads",
    name: "user-uploads",
    files: [
      { name: "receipt.pdf", type: "application/pdf", size: "280 KB", modified: "1 hour ago", notes: "Uploaded receipt awaiting review." },
      { name: "profile-cover.png", type: "image/png", size: "620 KB", modified: "Yesterday", notes: "User-uploaded cover image." },
    ],
  },
];

export function StorageClient({ projectId: _projectId }: { projectId: string }) {
  const [selectedBucketId, setSelectedBucketId] = useState(STORAGE_BUCKETS[1].id);
  const [selectedFileName, setSelectedFileName] = useState(STORAGE_BUCKETS[1].files[0].name);

  const selectedBucket = STORAGE_BUCKETS.find((bucket) => bucket.id === selectedBucketId) ?? STORAGE_BUCKETS[0];
  const selectedFile = selectedBucket.files.find((file) => file.name === selectedFileName) ?? selectedBucket.files[0];

  return (
    <section className={styles.serviceConsole}>
      <div className={styles.serviceDetailSplit}>
        <div className={styles.serviceDetailNav}>
          {STORAGE_BUCKETS.map((bucket) => (
            <button
              key={bucket.id}
              type="button"
              className={`${styles.serviceDetailNavButton} ${selectedBucketId === bucket.id ? styles.serviceDetailNavButtonActive : ""}`}
              onClick={() => {
                setSelectedBucketId(bucket.id);
                setSelectedFileName(bucket.files[0]?.name ?? "");
              }}
              aria-pressed={selectedBucketId === bucket.id}
            >
              {bucket.name}
            </button>
          ))}
        </div>

        <div className={styles.serviceDetailPanel}>
          <div className={styles.storageHeader}>
            <div>
              <h3 className={styles.serviceSectionTitle}>{selectedBucket.name}</h3>
              <p className={styles.projectCardDate}>Select a file on the left to review its details.</p>
            </div>
            <div className={styles.storageHeaderActions}>
              <button type="button" className={styles.serviceActionButton}>New Folder</button>
              <button type="button" className={styles.primaryButton}>Upload File</button>
            </div>
          </div>

          <div className={styles.serviceDetailSplit}>
            <div className={styles.serviceDetailNav}>
              {selectedBucket.files.map((file) => (
                <button
                  key={file.name}
                  type="button"
                  className={`${styles.apiKeyItem} ${selectedFileName === file.name ? styles.serviceDetailNavButtonActive : ""}`}
                  onClick={() => setSelectedFileName(file.name)}
                >
                  <div>
                    <p className={styles.createFormTitle}>{file.name}</p>
                    <p className={styles.projectCardDate}>{file.size}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className={styles.serviceDetailPanel}>
              {selectedFile ? (
                <>
                  <div className={styles.serviceMetaGrid}>
                    <div className={styles.serviceMetaCard}>
                      <p className={styles.serviceMetaLabel}>Type</p>
                      <p className={styles.serviceMetaValue}>{selectedFile.type}</p>
                    </div>
                    <div className={styles.serviceMetaCard}>
                      <p className={styles.serviceMetaLabel}>Size</p>
                      <p className={styles.serviceMetaValue}>{selectedFile.size}</p>
                    </div>
                    <div className={styles.serviceMetaCard}>
                      <p className={styles.serviceMetaLabel}>Last Modified</p>
                      <p className={styles.serviceMetaValue}>{selectedFile.modified}</p>
                    </div>
                    <div className={styles.serviceMetaCard}>
                      <p className={styles.serviceMetaLabel}>Notes</p>
                      <p className={styles.serviceMetaValue}>{selectedFile.notes}</p>
                    </div>
                  </div>

                  <div className={styles.storageTable}>
                    <div className={styles.storageRowHead}><span>Name</span><span>Type</span><span>Size</span><span>Last Modified</span></div>
                    <div className={styles.storageRow}><span>{selectedFile.name}</span><span>{selectedFile.type}</span><span>{selectedFile.size}</span><span>{selectedFile.modified}</span></div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
