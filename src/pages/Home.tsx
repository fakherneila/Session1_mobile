import React, { useState, useRef, useEffect } from "react";
import { useHistory } from "react-router-dom";
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
import HistoryService from "../services/HistoryService";
import {
  computeDistance,
  DistanceResult,
  formatBearing,
  haversineDistance,
  TARGET_PLACE,
} from "../services/DistanceService";
import "./Home.css";

const INTERVAL_MS = 10 * 60 * 1000; // Set to 30 * 1000 temporarily to test, then restore to 10 * 60 * 1000

type PositionData = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
};

type CoordinateData = Pick<
  PositionData,
  "latitude" | "longitude" | "altitude" | "accuracy"
>;

const Home: React.FC = () => {
  const history = useHistory();
  const [position, setPosition] = useState<PositionData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [count, setCount] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [distance, setDistance] = useState<DistanceResult | null>(null);
  const [bearing, setBearing] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [trackDistance, setTrackDistance] = useState<number>(0);
  const [trackPoints, setTrackPoints] = useState<number>(0);

  const watchIdRef = useRef<string | null>(null);
  const webWatchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPositionRef = useRef<PositionData | null>(null);
  const previousPositionRef = useRef<PositionData | null>(null);
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const formatPosition = (coords: CoordinateData): PositionData => ({
    latitude: coords.latitude,
    longitude: coords.longitude,
    altitude: coords.altitude,
    accuracy: coords.accuracy,
  });

  const updateDistance = (coords: CoordinateData) => {
    setDistance(computeDistance(coords.latitude, coords.longitude));
    setBearing(formatBearing(coords.latitude, coords.longitude));
  };

  const handleTrackedPosition = (coords: CoordinateData) => {
    const nextPosition = formatPosition(coords);
    const previousPosition = previousPositionRef.current;

    setPosition(nextPosition);
    latestPositionRef.current = nextPosition;
    updateDistance(coords);
    if (previousPosition) {
      setTrackDistance(
        (currentDistance) =>
          currentDistance +
          haversineDistance(
            previousPosition.latitude,
            previousPosition.longitude,
            nextPosition.latitude,
            nextPosition.longitude,
          ),
      );
      setTrackPoints((currentPoints) => currentPoints + 1);
    }
    previousPositionRef.current = nextPosition;
    setCount((currentCount) => currentCount + 1);
    void HistoryService.addEntry({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      altitude: coords.altitude,
    });
  };

  //  EX 3.2
  const getPosition = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      let coords: CoordinateData;

      if (Capacitor.isNativePlatform()) {
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== "granted") {
          throw new Error("Permission refusée par l'utilisateur");
        }
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });
        coords = pos.coords;
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
      updateDistance(coords);
      await HistoryService.addEntry({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        altitude: coords.altitude,
      });
    } catch (reason: unknown) {
      setErrorMessage(
        reason instanceof Error ? reason.message : "Erreur de géolocalisation",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // EX 3.3 — Démarrer
  const startTracking = async () => {
    setErrorMessage("");
    setIsLoading(true);
    setCount(0);
    setDuration(0);
    setTrackDistance(0);
    setTrackPoints(0);
    setSaveStatus("idle");
    latestPositionRef.current = null;
    previousPositionRef.current = null;
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
              handleTrackedPosition(pos.coords);
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
            handleTrackedPosition(pos.coords);
          },
          (err) => setErrorMessage(err.message),
          { enableHighAccuracy: true },
        );
      }

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      intervalRef.current = setInterval(() => {
        const latestPosition = latestPositionRef.current;
        if (!latestPosition) {
          return;
        }

        setSaveStatus("saving");
        void HistoryService.addEntry({
          latitude: latestPosition.latitude,
          longitude: latestPosition.longitude,
          accuracy: latestPosition.accuracy,
          altitude: latestPosition.altitude,
          source: "periodique",
        }).then(() => {
          setSaveStatus("saved");
          if (saveStatusTimeoutRef.current) {
            clearTimeout(saveStatusTimeoutRef.current);
          }
          saveStatusTimeoutRef.current = setTimeout(
            () => setSaveStatus("idle"),
            2000,
          );
        });
      }, INTERVAL_MS);

      setIsLoading(false);
    } catch (reason: unknown) {
      setErrorMessage(
        reason instanceof Error
          ? reason.message
          : "Erreur lors du démarrage du suivi",
      );
      setIsLoading(false);
      setIsTracking(false);
    }
  };

  //   EX 3.3 — Arrêter
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
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
    setIsLoading(false);
  };

  //  EX 3.5 — Cleanup
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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
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
          {/* STATUS BAR  */}
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
            {saveStatus !== "idle" && (
              <span className="save-status-pill">
                {saveStatus === "saving"
                  ? "Enregistrement…"
                  : "Position enregistrée"}
              </span>
            )}
          </div>

          {/*  ACTIONS  */}
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

            <IonButton expand="block" onClick={() => history.push("/map")}>
              Ouvrir la Carte
            </IonButton>

            <IonButton
              expand="block"
              color="tertiary"
              className="btn-history"
              onClick={() => history.push("/history")}
            >
              <IonIcon slot="start" icon={timeOutline} />
              Historique
            </IonButton>
          </div>

          {/* LOADING */}
          {isLoading && (
            <div className="spinner-container">
              <IonSpinner name="crescent" />
              <p>Acquisition du signal…</p>
            </div>
          )}

          {/*  POSITION CARD  */}
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

          {isTracking && (
            <IonCard className="data-card track-stats-card">
              <div className="card-accent" />
              <IonCardContent>
                <div className="card-header">
                  <IonIcon icon={layersOutline} className="card-header-icon" />
                  <h2>Statistiques du suivi</h2>
                </div>
                <div className="track-stats">
                  <span>
                    Points enregistrés: <strong>{trackPoints}</strong>
                  </span>
                  <span>
                    Distance totale:{" "}
                    <strong>{(trackDistance / 1000).toFixed(2)} km</strong>
                  </span>
                  <span>
                    Durée: <strong>{duration} s</strong>
                  </span>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {distance && (
            <IonCard className="data-card distance-card">
              <div className="card-accent" />
              <IonCardContent>
                <div className="card-header">
                  <IonIcon
                    icon={navigateOutline}
                    className="card-header-icon"
                  />
                  <h2>Distance vers la cible</h2>
                </div>

                <div className="distance-target">
                  <span>{TARGET_PLACE.label}</span>
                  <small>
                    {TARGET_PLACE.latitude.toFixed(6)},{" "}
                    {TARGET_PLACE.longitude.toFixed(6)}
                  </small>
                </div>

                <div className="distance-summary">
                  <strong>{distance.formatted}</strong>
                  <span>Direction: {bearing}</span>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {/*  ERROR CARD */}
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
