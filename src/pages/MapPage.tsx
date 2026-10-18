import React, { useCallback, useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import L from "leaflet";
import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonSpinner,
} from "@ionic/react";
import {
  addOutline,
  arrowBackOutline,
  closeOutline,
  navigateOutline,
  playOutline,
  stopOutline,
} from "ionicons/icons";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import {
  computeBearingDegrees,
  computeDistance,
  formatBearing,
  DistanceResult,
} from "../services/DistanceService";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import "./MapPage.css";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })
  ._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_POSITION: [number, number] = [36.8065, 10.1815];
const DEFAULT_DESTINATION_LABEL = "Point sur la carte";

const DESTINATION_ICON = L.divIcon({
  className: "destination-marker",
  html: '<span class="destination-marker-dot"></span>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const START_ICON = L.divIcon({
  className: "tracking-marker tracking-marker-start",
  html: '<span class="tracking-marker-dot"></span>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const END_ICON = L.divIcon({
  className: "tracking-marker tracking-marker-end",
  html: '<span class="tracking-marker-dot"></span>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const createDistanceIcon = (formattedDistance: string): L.DivIcon =>
  L.divIcon({
    className: "distance-pill-marker",
    html: `<span class="distance-pill">${formattedDistance}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

const parseHistoryPosition = (
  search: string,
): { position: [number, number]; isHistoryFocus: boolean } | null => {
  const params = new URLSearchParams(search);
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lng"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    position: [latitude, longitude],
    isHistoryFocus: params.get("focus") === "history",
  };
};

type MapControllerProps = {
  position: [number, number] | null;
};

const MapController: React.FC<MapControllerProps> = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);

  useEffect(() => {
    if (position) {
      map.setView(position, 16, { animate: true });
    }
  }, [map, position]);

  return null;
};

type MapClickHandlerProps = {
  picking: boolean;
  onPick: (position: [number, number]) => void;
};

const MapClickHandler: React.FC<MapClickHandlerProps> = ({
  picking,
  onPick,
}) => {
  useMapEvents({
    click: (event) => {
      if (picking) {
        onPick([event.latlng.lat, event.latlng.lng]);
      }
    },
  });

  return null;
};

type FitBoundsControllerProps = {
  userPos: [number, number] | null;
  destPos: [number, number] | null;
  onFit: () => void;
};

const FitBoundsController: React.FC<FitBoundsControllerProps> = ({
  userPos,
  destPos,
  onFit,
}) => {
  const map = useMap();

  const fitBoth = useCallback(() => {
    if (!userPos || !destPos) {
      return;
    }

    map.fitBounds(L.latLngBounds([userPos, destPos]), {
      padding: [80, 80],
      maxZoom: 16,
      animate: true,
    });
    onFit();
  }, [destPos, map, onFit, userPos]);

  useEffect(() => {
    if (!userPos || !destPos) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      map.fitBounds(L.latLngBounds([userPos, destPos]), {
        padding: [80, 80],
        maxZoom: 16,
      });
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [destPos, map, userPos]);

  return (
    <IonButton
      className="directions-btn"
      fill="solid"
      color="warning"
      aria-label="Afficher l'itinéraire"
      onClick={fitBoth}
      disabled={!userPos || !destPos}
    >
      <IonIcon slot="icon-only" icon={navigateOutline} />
    </IonButton>
  );
};

const MapPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const initialHistory = parseHistoryPosition(location.search);
  const [userPos, setUserPos] = useState<[number, number] | null>(
    initialHistory?.position ?? null,
  );
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const [destPos, setDestPos] = useState<[number, number] | null>(null);
  const [destLabel, setDestLabel] = useState(DEFAULT_DESTINATION_LABEL);
  const [distance, setDistance] = useState<DistanceResult | null>(null);
  const [bearing, setBearing] = useState("");
  const [bearingDegrees, setBearingDegrees] = useState(0);
  const [picking, setPicking] = useState(false);
  const [pickAlert, setPickAlert] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isHistoryPosition, setIsHistoryPosition] = useState(
    initialHistory !== null,
  );
  const [isPulsing, setIsPulsing] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [trackPositions, setTrackPositions] = useState<[number, number][]>([]);
  const [startPos, setStartPos] = useState<[number, number] | null>(null);
  const [endPos, setEndPos] = useState<[number, number] | null>(null);
  const trackingWatchIdRef = React.useRef<string | null>(null);
  const webTrackingWatchIdRef = React.useRef<number | null>(null);

  const updateDistance = useCallback(
    (nextUserPos: [number, number], nextDestPos: [number, number]) => {
      setDistance(
        computeDistance(
          nextUserPos[0],
          nextUserPos[1],
          nextDestPos[0],
          nextDestPos[1],
        ),
      );
      setBearing(
        formatBearing(
          nextUserPos[0],
          nextUserPos[1],
          nextDestPos[0],
          nextDestPos[1],
        ),
      );
      setBearingDegrees(
        computeBearingDegrees(
          nextUserPos[0],
          nextUserPos[1],
          nextDestPos[0],
          nextDestPos[1],
        ),
      );
    },
    [],
  );

  const fetchLocation = async () => {
    setIsLoading(true);
    setError("");
    setIsHistoryPosition(false);

    try {
      let latitude: number;
      let longitude: number;
      let currentAccuracy: number;

      if (Capacitor.isNativePlatform()) {
        const permissions = await Geolocation.requestPermissions();
        if (permissions.location !== "granted") {
          throw new Error("Permission de localisation refusée");
        }

        const currentPosition = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });
        latitude = currentPosition.coords.latitude;
        longitude = currentPosition.coords.longitude;
        currentAccuracy = currentPosition.coords.accuracy;
      } else {
        if (!navigator.geolocation) {
          throw new Error(
            "La géolocalisation n'est pas supportée par ce navigateur",
          );
        }

        const currentPosition = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            });
          },
        );
        latitude = currentPosition.coords.latitude;
        longitude = currentPosition.coords.longitude;
        currentAccuracy = currentPosition.coords.accuracy;
      }

      const nextUserPos: [number, number] = [latitude, longitude];
      setUserPos(nextUserPos);
      setUserAccuracy(currentAccuracy);

      if (destPos) {
        updateDistance(nextUserPos, destPos);
      }
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Impossible d'obtenir votre position",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePick = useCallback(
    (nextDestPos: [number, number]) => {
      if (!userPos) {
        setPickAlert("Position en cours d'acquisition…");
        return;
      }

      setDestPos(nextDestPos);
      setDestLabel(DEFAULT_DESTINATION_LABEL);
      setPicking(false);
      updateDistance(userPos, nextDestPos);
    },
    [updateDistance, userPos],
  );

  const clearDestination = () => {
    setDestPos(null);
    setDestLabel(DEFAULT_DESTINATION_LABEL);
    setDistance(null);
    setBearing("");
    setBearingDegrees(0);
    setPicking(false);
  };

  const updateTrackPosition = useCallback((nextPosition: [number, number]) => {
    setUserPos(nextPosition);
    setTrackPositions((currentPositions) => {
      if (currentPositions.length === 0) {
        setStartPos(nextPosition);
      }
      return [...currentPositions, nextPosition];
    });
  }, []);

  const startMapTracking = async () => {
    setError("");
    setTrackPositions([]);
    setStartPos(null);
    setEndPos(null);
    setIsTracking(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const permissions = await Geolocation.requestPermissions();
        if (permissions.location !== "granted") {
          throw new Error("Permission de localisation refusée");
        }
        trackingWatchIdRef.current = await Geolocation.watchPosition(
          { enableHighAccuracy: true },
          (position, watchError) => {
            if (watchError) {
              setError(watchError.message);
            } else if (position) {
              updateTrackPosition([
                position.coords.latitude,
                position.coords.longitude,
              ]);
            }
          },
        );
      } else {
        if (!navigator.geolocation) {
          throw new Error(
            "La géolocalisation n'est pas supportée par ce navigateur",
          );
        }
        webTrackingWatchIdRef.current = navigator.geolocation.watchPosition(
          (position) =>
            updateTrackPosition([
              position.coords.latitude,
              position.coords.longitude,
            ]),
          (watchError) => setError(watchError.message),
          { enableHighAccuracy: true },
        );
      }
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Impossible de démarrer le suivi",
      );
      setIsTracking(false);
    }
  };

  const stopMapTracking = async () => {
    if (trackingWatchIdRef.current) {
      await Geolocation.clearWatch({ id: trackingWatchIdRef.current });
      trackingWatchIdRef.current = null;
    }
    if (webTrackingWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(webTrackingWatchIdRef.current);
      webTrackingWatchIdRef.current = null;
    }
    setTrackPositions((currentPositions) => {
      if (currentPositions.length > 0) {
        setEndPos(currentPositions[currentPositions.length - 1]);
      }
      return currentPositions;
    });
    setIsTracking(false);
  };

  const handleFit = useCallback(() => {
    setIsPulsing(true);
    window.setTimeout(() => setIsPulsing(false), 1500);
  }, []);

  useEffect(() => {
    if (!initialHistory) {
      void fetchLocation();
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userPos && destPos) {
      updateDistance(userPos, destPos);
    }
  }, [destPos, updateDistance, userPos]);

  useEffect(() => {
    if (!pickAlert) {
      return;
    }

    const timeoutId = window.setTimeout(() => setPickAlert(""), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [pickAlert]);

  useEffect(() => {
    return () => {
      if (trackingWatchIdRef.current) {
        void Geolocation.clearWatch({ id: trackingWatchIdRef.current });
      }
      if (webTrackingWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(webTrackingWatchIdRef.current);
      }
    };
  }, []);

  const mapCenter = userPos ?? DEFAULT_POSITION;
  const midpoint: [number, number] | null =
    userPos && destPos
      ? [(userPos[0] + destPos[0]) / 2, (userPos[1] + destPos[1]) / 2]
      : null;
  const mapClassName = `leaflet-map${picking ? " picking-cursor" : ""}`;

  return (
    <IonPage>
      <IonContent fullscreen scrollY={false} className="map-content">
        <div className="map-wrapper">
          <MapContainer
            center={mapCenter}
            zoom={initialHistory?.isHistoryFocus || userPos ? 16 : 13}
            zoomControl={false}
            className={mapClassName}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            <MapClickHandler picking={picking} onPick={handlePick} />

            {destPos && (
              <Marker position={destPos} icon={DESTINATION_ICON}>
                <Popup>
                  <button
                    type="button"
                    className="popup-close-btn"
                    aria-label="Effacer la destination"
                    onClick={clearDestination}
                  >
                    ×
                  </button>
                  <strong>Destination</strong>
                  <br />
                  Latitude: {destPos[0].toFixed(6)}
                  <br />
                  Longitude: {destPos[1].toFixed(6)}
                  <br />
                  Distance: {distance?.formatted ?? "—"}
                  <br />
                  Direction: {bearing || "—"}
                </Popup>
              </Marker>
            )}

            {userPos && destPos && (
              <>
                <Polyline
                  positions={[userPos, destPos]}
                  pathOptions={{
                    color: "#4f46e5",
                    weight: 3,
                    opacity: 0.75,
                    dashArray: "6 8",
                  }}
                />
                {midpoint && distance && (
                  <Marker
                    position={midpoint}
                    icon={createDistanceIcon(distance.formatted)}
                    interactive={false}
                  />
                )}
              </>
            )}

            {trackPositions.length > 1 && (
              <Polyline
                positions={trackPositions}
                pathOptions={{ color: "#10b981", weight: 4, opacity: 0.9 }}
              />
            )}

            {startPos && <Marker position={startPos} icon={START_ICON} />}
            {endPos && <Marker position={endPos} icon={END_ICON} />}

            {userPos && (
              <Marker position={userPos}>
                <Popup>
                  <strong>
                    {isHistoryPosition
                      ? "Position historique"
                      : "Votre position"}
                  </strong>
                  <br />
                  Latitude: {userPos[0].toFixed(6)}
                  <br />
                  Longitude: {userPos[1].toFixed(6)}
                  <br />
                  Précision: ±{(userAccuracy ?? 0).toFixed(0)} m
                </Popup>
              </Marker>
            )}

            <MapController position={userPos} />
            <FitBoundsController
              userPos={userPos}
              destPos={destPos}
              onFit={handleFit}
            />
          </MapContainer>

          {picking && <div className="picking-overlay" aria-hidden="true" />}

          <IonButton
            className="map-back-btn"
            fill="solid"
            aria-label="Retour à l'accueil"
            onClick={() => history.push("/home")}
          >
            <IonIcon slot="icon-only" icon={arrowBackOutline} />
          </IonButton>

          {picking && (
            <div className="pick-pill">
              Appuyez sur la carte pour choisir la destination
            </div>
          )}

          <IonButton
            className="tracking-btn"
            fill="solid"
            color={isTracking ? "danger" : "success"}
            aria-label={isTracking ? "Arrêter le suivi" : "Démarrer le suivi"}
            onClick={() =>
              void (isTracking ? stopMapTracking() : startMapTracking())
            }
          >
            <IonIcon
              slot="icon-only"
              icon={isTracking ? stopOutline : playOutline}
            />
          </IonButton>

          {pickAlert && <div className="position-alert">{pickAlert}</div>}

          {isLoading && (
            <div className="map-overlay" role="status">
              <IonSpinner name="crescent" />
              <span>Localisation en cours…</span>
            </div>
          )}

          {error && !isLoading && <div className="map-error">{error}</div>}

          {distance && destPos && (
            <div
              className={`distance-card${isPulsing ? " pulse-distance" : ""}`}
            >
              <div className="distance-card-row distance-main-row">
                <span>Distance</span>
                <strong>{distance.formatted}</strong>
              </div>
              <div className="distance-card-row">
                <span>Direction</span>
                <span className="direction-pill">
                  <span
                    className="direction-arrow"
                    style={{ transform: `rotate(${bearingDegrees}deg)` }}
                  >
                    ↑
                  </span>
                  {bearing}
                </span>
              </div>
              <div className="distance-card-row destination-row">
                <span>Destination</span>
                <strong>
                  {destLabel}: {destPos[0].toFixed(6)}, {destPos[1].toFixed(6)}
                </strong>
              </div>
            </div>
          )}

          <IonButton
            className="pick-btn"
            fill="solid"
            color="primary"
            aria-label="Choisir une destination"
            onClick={() => setPicking((currentPicking) => !currentPicking)}
            disabled={isLoading || !userPos}
          >
            <IonIcon slot="icon-only" icon={addOutline} />
          </IonButton>

          {destPos && (
            <IonButton
              className="clear-btn"
              fill="solid"
              color="medium"
              aria-label="Effacer la destination"
              onClick={clearDestination}
            >
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          )}

          <IonButton
            className="locate-btn"
            fill="solid"
            aria-label="Recentrer sur ma position"
            onClick={() => void fetchLocation()}
            disabled={isLoading}
          >
            <IonIcon slot="icon-only" icon={navigateOutline} />
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default MapPage;
