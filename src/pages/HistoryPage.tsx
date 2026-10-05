import React, { useEffect, useState } from "react";
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
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { locationOutline, trashOutline } from "ionicons/icons";
import HistoryService, { HistoryEntry } from "../services/HistoryService";
import "./HistoryPage.css";

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

const HistoryPage: React.FC = () => {
  const history = useHistory();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const loadHistory = async () => {
    setEntries(await HistoryService.getHistory());
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const handleClearHistory = async () => {
    await HistoryService.clearHistory();
    setEntries([]);
    setIsAlertOpen(false);
  };

  const handleDelete = async (id: string) => {
    await HistoryService.deleteEntry(id);
    setEntries((currentEntries) =>
      currentEntries.filter((entry) => entry.id !== id),
    );
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

        {entries.length === 0 ? (
          <div className="history-empty-state">
            <IonIcon icon={locationOutline} />
            <h2>Aucun historique</h2>
            <p>Appuyez sur Obtenir Position pour commencer</p>
          </div>
        ) : (
          <IonList className="history-list">
            {entries.map((entry) => (
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
    </IonPage>
  );
};

export default HistoryPage;
