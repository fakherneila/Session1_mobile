import React, { useState } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  IonIcon,
} from "@ionic/react";
import { location, play, stop } from "ionicons/icons";
import "./Home.css";

const Home: React.FC = () => {
  const [position, setPosition] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const getPosition = () => {
    /* logique */
  };
  const startTracking = () => {
    /* logique */
  };
  const stopTracking = () => {
    /* logique */
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Application Géolocalisation</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {isLoading && (
          <div className="spinner-container">
            <IonSpinner name="crescent" />
            <p>Chargement en cours...</p>
          </div>
        )}

        <div className="buttons-container">
          <IonButton expand="block" color="primary" onClick={getPosition}>
            <IonIcon slot="start" icon={location} />
            Obtenir Position
          </IonButton>
          <IonButton expand="block" color="success" onClick={startTracking}>
            <IonIcon slot="start" icon={play} />
            Démarrer Suivi
          </IonButton>
          <IonButton expand="block" color="danger" onClick={stopTracking}>
            <IonIcon slot="start" icon={stop} />
            Arrêter Suivi
          </IonButton>
        </div>

        {position && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle> Coordonnées</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>
                <strong>Latitude :</strong> {position.latitude}
              </p>
              <p>
                <strong>Longitude :</strong> {position.longitude}
              </p>
              <p>
                <strong>Altitude :</strong> {position.altitude} m
              </p>
            </IonCardContent>
          </IonCard>
        )}

        {errorMessage && (
          <IonCard color="danger">
            <IonCardHeader>
              <IonCardTitle> Erreur</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>{errorMessage}</IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Home;
