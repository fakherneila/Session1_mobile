import React, { useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import {
  IonAlert,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonToast,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { locationOutline, syncOutline, trashOutline } from "ionicons/icons";
import HistoryService, { HistoryEntry } from "../services/HistoryService";
import { syncHistory } from "../services/FirebaseHistoryService";
import { haversineDistance } from "../services/DistanceService";
import "./HistoryPage.css";

type HistoryFilter = "all" | "today" | "hour";

const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${date.getFullYear()}`;
};

const formatPreviousDistance = (meters: number): string =>
  meters < 1000 ? `${meters.toFixed(1)} m` : `${(meters / 1000).toFixed(2)} km`;

const HistoryPage: React.FC = () => {
  const history = useHistory();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"local" | "synced">("local");
  const [toastMessage, setToastMessage] = useState("");

  const loadHistory = async () => {
    setEntries(await HistoryService.getHistory());
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const visibleEntries = useMemo(() => {
    const now = Date.now();
    return entries.filter((entry) => {
      if (filter === "today") {
        return (
          new Date(entry.timestamp).toDateString() === new Date().toDateString()
        );
      }
      if (filter === "hour") {
        return now - entry.timestamp <= 60 * 60 * 1000;
      }
      return true;
    });
  }, [entries, filter]);

  const getFilterCount = (selectedFilter: HistoryFilter): number => {
    const now = Date.now();
    return entries.filter((entry) => {
      if (selectedFilter === "today") {
        return (
          new Date(entry.timestamp).toDateString() === new Date().toDateString()
        );
      }
      if (selectedFilter === "hour") {
        return now - entry.timestamp <= 60 * 60 * 1000;
      }
      return true;
    }).length;
  };

  const handleClearHistory = async () => {
    await HistoryService.clearHistory();
    setEntries([]);
    setSyncStatus("local");
    setIsAlertOpen(false);
  };

  const handleDelete = async (id: string) => {
    await HistoryService.deleteEntry(id);
    setEntries((currentEntries) =>
      currentEntries.filter((entry) => entry.id !== id),
    );
    setSyncStatus("local");
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncHistory(entries);
      if (result.failed > 0) {
        setToastMessage("Échec de la synchronisation");
        return;
      }
      setSyncStatus("synced");
      setToastMessage(`${result.synced} positions synchronisées`);
    } catch {
      setToastMessage("Échec de la synchronisation");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefresh = async (event: CustomEvent) => {
    await loadHistory();
    event.detail.complete();
  };

  const openMapAtEntry = (entry: HistoryEntry) => {
    history.push(
      `/map?lat=${encodeURIComponent(entry.latitude)}&lng=${encodeURIComponent(
        entry.longitude,
      )}&focus=history`,
    );
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Historique</IonTitle>
          <span className={`sync-status-pill ${syncStatus}`} slot="end">
            {syncStatus === "synced" ? "Synchronisé" : "Local uniquement"}
          </span>
          <IonButtons slot="end">
            <IonButton
              aria-label="Effacer l'historique"
              onClick={() => setIsAlertOpen(true)}
              disabled={entries.length === 0}
            >
              <IonIcon slot="icon-only" icon={trashOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="history-content" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent pullingText="Actualiser" />
        </IonRefresher>

        <div
          className="history-filters"
          role="group"
          aria-label="Filtrer l'historique"
        >
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
            type="button"
          >
            Toutes ({getFilterCount("all")})
          </button>
          <button
            className={filter === "today" ? "active" : ""}
            onClick={() => setFilter("today")}
            type="button"
          >
            Aujourd&apos;hui ({getFilterCount("today")})
          </button>
          <button
            className={filter === "hour" ? "active" : ""}
            onClick={() => setFilter("hour")}
            type="button"
          >
            Dernière heure ({getFilterCount("hour")})
          </button>
        </div>

        {visibleEntries.length === 0 ? (
          <div className="history-empty-state">
            <IonIcon icon={locationOutline} />
            <h2>Aucun historique</h2>
            <p>Appuyez sur Obtenir Position pour commencer</p>
          </div>
        ) : (
          <IonList className="history-list">
            {visibleEntries.map((entry, index) => (
              <IonItemSliding key={entry.id}>
                <IonItem
                  button
                  detail
                  className="history-item"
                  onClick={() => openMapAtEntry(entry)}
                >
                  <div className="history-coordinates">
                    <strong>
                      {entry.latitude.toFixed(6)}, {entry.longitude.toFixed(6)}
                    </strong>
                    <span>
                      Précision : ±{(entry.accuracy ?? 0).toFixed(0)} m
                    </span>
                  </div>
                  <div slot="end" className="history-date">
                    <strong>{formatTime(entry.timestamp)}</strong>
                    <span>{formatDate(entry.timestamp)}</span>
                  </div>
                  <div slot="end" className="history-previous-distance">
                    <span>Distance préc.</span>
                    <strong>
                      {index < visibleEntries.length - 1
                        ? formatPreviousDistance(
                            haversineDistance(
                              entry.latitude,
                              entry.longitude,
                              visibleEntries[index + 1].latitude,
                              visibleEntries[index + 1].longitude,
                            ),
                          )
                        : "—"}
                    </strong>
                  </div>
                </IonItem>
                <IonItemOptions side="end">
                  <IonItemOption
                    color="danger"
                    aria-label="Supprimer cette position"
                    onClick={() => void handleDelete(entry.id)}
                  >
                    <IonIcon slot="icon-only" icon={trashOutline} />
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            ))}
          </IonList>
        )}

        <IonButton
          className="sync-button"
          color="secondary"
          expand="block"
          onClick={() => void handleSync()}
          disabled={entries.length === 0 || isSyncing}
        >
          {isSyncing ? (
            <IonSpinner name="crescent" />
          ) : (
            <IonIcon slot="start" icon={syncOutline} />
          )}
          Synchroniser Firebase
        </IonButton>
      </IonContent>

      <IonAlert
        isOpen={isAlertOpen}
        header="Effacer l'historique ?"
        message="Toutes les positions enregistrées seront supprimées."
        buttons={[
          {
            text: "Annuler",
            role: "cancel",
            handler: () => setIsAlertOpen(false),
          },
          {
            text: "Effacer",
            role: "destructive",
            handler: () => void handleClearHistory(),
          },
        ]}
        onDidDismiss={() => setIsAlertOpen(false)}
      />
      <IonToast
        isOpen={toastMessage.length > 0}
        message={toastMessage}
        duration={2500}
        onDidDismiss={() => setToastMessage("")}
      />
    </IonPage>
  );
};

export default HistoryPage;
