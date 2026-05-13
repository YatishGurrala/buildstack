"use client";

import { useState } from "react";

import styles from "../../../page.module.css";

type SettingsPanelId = "general" | "environment" | "danger";

type EnvironmentVariable = {
  name: string;
  scope: string;
  description: string;
  value: string;
};

type DangerAction = {
  id: "pause" | "delete";
  title: string;
  description: string;
  cta: string;
};

const ENVIRONMENT_VARIABLES: EnvironmentVariable[] = [
  {
    name: "DATABASE_URL",
    scope: "Production scope",
    description: "Primary database connection string for this project.",
    value: "postgresql://...",
  },
  {
    name: "STRIPE_SECRET_KEY",
    scope: "All environments",
    description: "Secret key used for payment processing.",
    value: "sk_live_...",
  },
];

const DANGER_ACTIONS: DangerAction[] = [
  {
    id: "pause",
    title: "Pause Project",
    description: "Stop all active functions and services.",
    cta: "Pause",
  },
  {
    id: "delete",
    title: "Delete Project",
    description: "Permanently remove this project and its data.",
    cta: "Delete",
  },
];

export function SettingsClient({ projectId }: { projectId: string }) {
  const [selectedSettingsPanel, setSelectedSettingsPanel] = useState<SettingsPanelId>("general");
  const [selectedEnvironmentName, setSelectedEnvironmentName] = useState(ENVIRONMENT_VARIABLES[0].name);
  const [selectedDangerAction, setSelectedDangerAction] = useState(DANGER_ACTIONS[0].id);

  const selectedEnvironment = ENVIRONMENT_VARIABLES.find((item) => item.name === selectedEnvironmentName) ?? ENVIRONMENT_VARIABLES[0];
  const selectedDanger = DANGER_ACTIONS.find((item) => item.id === selectedDangerAction) ?? DANGER_ACTIONS[0];

  return (
    <section className={styles.serviceConsole}>
      <div className={styles.serviceDetailSplit}>
        <div className={styles.serviceDetailNav}>
          <button
            type="button"
            className={`${styles.serviceDetailNavButton} ${selectedSettingsPanel === "general" ? styles.serviceDetailNavButtonActive : ""}`}
            onClick={() => setSelectedSettingsPanel("general")}
            aria-pressed={selectedSettingsPanel === "general"}
          >
            General
          </button>
          <button
            type="button"
            className={`${styles.serviceDetailNavButton} ${selectedSettingsPanel === "environment" ? styles.serviceDetailNavButtonActive : ""}`}
            onClick={() => setSelectedSettingsPanel("environment")}
            aria-pressed={selectedSettingsPanel === "environment"}
          >
            Environment
          </button>
          <button
            type="button"
            className={`${styles.serviceDetailNavButton} ${selectedSettingsPanel === "danger" ? styles.serviceDetailNavButtonActive : ""}`}
            onClick={() => setSelectedSettingsPanel("danger")}
            aria-pressed={selectedSettingsPanel === "danger"}
          >
            Danger Zone
          </button>
        </div>

        <div className={styles.serviceDetailPanel}>
          {selectedSettingsPanel === "general" ? (
            <div className={styles.serviceSection}>
              <h3 className={styles.serviceSectionTitle}>General Settings</h3>
              <div className={styles.serviceMetaGrid}>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Project Name</p>
                  <p className={styles.serviceMetaValue}>Buildstack Production</p>
                </div>
                <div className={styles.serviceMetaCard}>
                  <p className={styles.serviceMetaLabel}>Project ID</p>
                  <p className={styles.serviceMetaValue}>{projectId}</p>
                </div>
              </div>
            </div>
          ) : null}

          {selectedSettingsPanel === "environment" ? (
            <div className={styles.serviceDetailSplit}>
              <div className={styles.serviceDetailNav}>
                {ENVIRONMENT_VARIABLES.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    className={`${styles.serviceDetailNavButton} ${selectedEnvironmentName === item.name ? styles.serviceDetailNavButtonActive : ""}`}
                    onClick={() => setSelectedEnvironmentName(item.name)}
                    aria-pressed={selectedEnvironmentName === item.name}
                  >
                    {item.name}
                  </button>
                ))}
              </div>

              <div className={styles.serviceDetailPanel}>
                <h3 className={styles.serviceSectionTitle}>{selectedEnvironment.name}</h3>
                <div className={styles.serviceMetaGrid}>
                  <div className={styles.serviceMetaCard}>
                    <p className={styles.serviceMetaLabel}>Scope</p>
                    <p className={styles.serviceMetaValue}>{selectedEnvironment.scope}</p>
                  </div>
                  <div className={styles.serviceMetaCard}>
                    <p className={styles.serviceMetaLabel}>Current value</p>
                    <p className={styles.serviceMetaValue}>{selectedEnvironment.value}</p>
                  </div>
                  <div className={styles.serviceMetaCard}>
                    <p className={styles.serviceMetaLabel}>Details</p>
                    <p className={styles.serviceMetaValue}>{selectedEnvironment.description}</p>
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.serviceActionButton}>Edit</button>
                </div>
              </div>
            </div>
          ) : null}

          {selectedSettingsPanel === "danger" ? (
            <div className={styles.serviceDetailSplit}>
              <div className={styles.serviceDetailNav}>
                {DANGER_ACTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.serviceDetailNavButton} ${selectedDangerAction === item.id ? styles.serviceDetailNavButtonActive : ""}`}
                    onClick={() => setSelectedDangerAction(item.id)}
                    aria-pressed={selectedDangerAction === item.id}
                  >
                    {item.title}
                  </button>
                ))}
              </div>

              <div className={styles.serviceDetailPanel}>
                <h3 className={styles.serviceSectionTitle}>{selectedDanger.title}</h3>
                <div className={styles.serviceMetaGrid}>
                  <div className={styles.serviceMetaCard}>
                    <p className={styles.serviceMetaLabel}>Effect</p>
                    <p className={styles.serviceMetaValue}>{selectedDanger.description}</p>
                  </div>
                  <div className={styles.serviceMetaCard}>
                    <p className={styles.serviceMetaLabel}>Action</p>
                    <p className={styles.serviceMetaValue}>{selectedDanger.cta}</p>
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.dangerButton}>{selectedDanger.cta}</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
