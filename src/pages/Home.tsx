import React, { useState, useRef, useEffect } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonCard,
  IonCardContent,
  IonSpinner,
  IonIcon,
} from "@ionic/react";
import {
  navigateOutline,
  playCircleOutline,
  stopCircleOutline,
  locationOutline,
  alertCircleOutline,
  compassOutline,
  timeOutline,
  layersOutline,
} from "ionicons/icons";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import "./Home.css";

const Home: React.FC = () => {
  const [position, setPosition] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [count, setCount] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const watchIdRef = useRef<string | null>(null);
  const webWatchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<any>(null);

  const formatPosition = (coords: GeolocationCoordinates) => ({
    latitude: coords.latitude,
    longitude: coords.longitude,
    altitude: coords.altitude,
    accuracy: coords.accuracy,
  });

  // ========== EX 3.2 ==========
  const getPosition = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      let coords: GeolocationCoordinates;

      if (Capacitor.isNativePlatform()) {
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== "granted") {
          throw new Error("Permission refusée par l'utilisateur");
        }
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });
        coords = pos.coords as any;
      } else {
        if (!navigator.geolocation) {
          throw new Error(
            "La géolocalisation n'est pas supportée par ce navigateur",
          );
        }
        const pos = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            });
          },
        );
        coords = pos.coords;
      }

      setPosition(formatPosition(coords));
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur de géolocalisation");
    } finally {
      setIsLoading(false);
    }
  };

  // ========== EX 3.3 — Démarrer ==========
  const startTracking = async () => {
    setErrorMessage("");
    setIsLoading(true);
    setCount(0);
    setDuration(0);
    startTimeRef.current = Date.now();
    setIsTracking(true);

    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== "granted") {
          throw new Error("Permission refusée par l'utilisateur");
        }

        watchIdRef.current = await Geolocation.watchPosition(
          { enableHighAccuracy: true },
          (pos, err) => {
            if (err) {
              setErrorMessage(err.message);
              return;
            }
            if (pos) {
              setPosition(formatPosition(pos.coords as any));
              setCount((c) => c + 1);
            }
          },
        );
      } else {
        if (!navigator.geolocation) {
          throw new Error(
            "La géolocalisation n'est pas supportée par ce navigateur",
          );
        }

        webWatchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            setPosition(formatPosition(pos.coords));
            setCount((c) => c + 1);
          },
          (err) => setErrorMessage(err.message),
          { enableHighAccuracy: true },
        );
      }

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      setIsLoading(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors du démarrage du suivi");
      setIsLoading(false);
      setIsTracking(false);
    }
  };

  // ========== EX 3.3 — Arrêter ==========
  const stopTracking = async () => {
    if (watchIdRef.current !== null) {
      await Geolocation.clearWatch({ id: watchIdRef.current });
      watchIdRef.current = null;
    }
    if (webWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(webWatchIdRef.current);
      webWatchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTracking(false);
    setIsLoading(false);
  };

  // ========== EX 3.5 — Cleanup ==========
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch({ id: watchIdRef.current });
      }
      if (webWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(webWatchIdRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatCoord = (v: number | null | undefined, digits = 6) =>
    v === null || v === undefined ? "—" : v.toFixed(digits);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="app-toolbar">
          <IonTitle>
            <div className="toolbar-title">
              <IonIcon icon={compassOutline} className="toolbar-icon" />
              <span>Géolocalisation</span>
            </div>
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="app-content" fullscreen>
        <div className="page-wrapper">
          {/* ===== STATUS BAR ===== */}
          <div className={`status-bar ${isTracking ? "status-tracking" : ""}`}>
            <span className="status-dot" />
            <span className="status-text">
              {isTracking ? "Suivi actif" : "En attente"}
            </span>
            {isTracking && (
              <span className="status-meta">
                {count} pts · {duration}s
              </span>
            )}
          </div>

          {/* ===== ACTIONS ===== */}
          <div className="buttons-container">
            <IonButton
              expand="block"
              className="btn-primary"
              onClick={getPosition}
              disabled={isLoading}
            >
              <IonIcon slot="start" icon={navigateOutline} />
              Obtenir Position
            </IonButton>

            <IonButton
              expand="block"
              className="btn-success"
              onClick={startTracking}
              disabled={isLoading || isTracking}
            >
              <IonIcon slot="start" icon={playCircleOutline} />
              Démarrer Suivi
            </IonButton>

            <IonButton
              expand="block"
              className="btn-danger"
              onClick={stopTracking}
              disabled={!isTracking}
            >
              <IonIcon slot="start" icon={stopCircleOutline} />
              Arrêter Suivi
            </IonButton>
          </div>

          {/* ===== LOADING ===== */}
          {isLoading && (
            <div className="spinner-container">
              <IonSpinner name="crescent" />
              <p>Acquisition du signal…</p>
            </div>
          )}

          {/* ===== POSITION CARD ===== */}
          {position ? (
            <IonCard className="data-card">
              <div className="card-accent" />
              <IonCardContent>
                <div className="card-header">
                  <IonIcon
                    icon={locationOutline}
                    className="card-header-icon"
                  />
                  <h2>Coordonnées actuelles</h2>
                </div>

                <div className="coord-grid">
                  <div className="coord-item">
                    <span className="coord-label">Latitude</span>
                    <span className="coord-value">
                      {formatCoord(position.latitude)}°
                    </span>
                  </div>
                  <div className="coord-item">
                    <span className="coord-label">Longitude</span>
                    <span className="coord-value">
                      {formatCoord(position.longitude)}°
                    </span>
                  </div>
                  <div className="coord-item">
                    <span className="coord-label">Altitude</span>
                    <span className="coord-value">
                      {position.altitude != null
                        ? `${position.altitude.toFixed(1)} m`
                        : "—"}
                    </span>
                  </div>
                  <div className="coord-item">
                    <span className="coord-label">Précision</span>
                    <span className="coord-value">
                      {position.accuracy != null
                        ? `± ${position.accuracy.toFixed(0)} m`
                        : "—"}
                    </span>
                  </div>
                </div>

                {isTracking && (
                  <div className="stats-row">
                    <div className="stat">
                      <IonIcon icon={layersOutline} />
                      <span>{count}</span>
                      <small>positions</small>
                    </div>
                    <div className="stat">
                      <IonIcon icon={timeOutline} />
                      <span>{duration}</span>
                      <small>secondes</small>
                    </div>
                  </div>
                )}
              </IonCardContent>
            </IonCard>
          ) : (
            !isLoading && (
              <div className="empty-state">
                <IonIcon icon={locationOutline} className="empty-icon" />
                <h3>Aucune position</h3>
                <p>
                  Appuyez sur <strong>Obtenir Position</strong> pour commencer
                </p>
              </div>
            )
          )}

          {/* ===== ERROR CARD ===== */}
          {errorMessage && (
            <div className="error-card">
              <IonIcon icon={alertCircleOutline} className="error-icon" />
              <div>
                <h4>Erreur</h4>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
